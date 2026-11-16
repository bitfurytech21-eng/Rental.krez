-- Portal domain tables (`wallets`, `documents`, `compliance_steps`, `users` view)
-- and server-enforced bank account holder ownership for withdrawals.

begin;

-- 1. Store verified bank account holder name on user_profiles and enforce own-name updates
alter table public.user_profiles
  add column if not exists bank_account_holder text;

grant update (
  bank_account_holder
) on table public.user_profiles to authenticated;

-- Compatibility public.users read view (respects caller RLS via security_invoker)
create or replace view public.users with (security_invoker = true) as
select
  up.id,
  up.email,
  up.full_name,
  up.country,
  up.country_code,
  up.phone_number,
  up.account_type,
  up.kyc_status,
  up.account_status,
  up.bank_iban,
  up.bank_account_holder,
  up.created_at,
  up.updated_at
from public.user_profiles up;

-- 2. Dedicated Wallets table synchronized from user_profiles
create table if not exists public.wallets (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  currency text not null default 'EUR',
  available_balance numeric(14,2) not null default 0.00 check (available_balance >= 0.00),
  reserved_balance numeric(14,2) not null default 0.00 check (reserved_balance >= 0.00),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

drop policy if exists "Users view own wallet" on public.wallets;
create policy "Users view own wallet" on public.wallets
  for select using (auth.uid() = user_id);

drop policy if exists "Admins view wallets" on public.wallets;
create policy "Admins view wallets" on public.wallets
  for select using (public.is_admin(auth.uid()));

revoke insert, update, delete on table public.wallets from anon, authenticated;
grant select on table public.wallets to authenticated;

insert into public.wallets (user_id, currency, available_balance, updated_at)
select id, 'EUR', wallet_balance, now()
from public.user_profiles
on conflict (user_id) do update
  set available_balance = excluded.available_balance,
      updated_at = excluded.updated_at;

create or replace function public.sync_wallet_from_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wallets (user_id, currency, available_balance, updated_at)
  values (new.id, 'EUR', coalesce(new.wallet_balance, 0.00), now())
  on conflict (user_id) do update
    set available_balance = coalesce(new.wallet_balance, 0.00),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_wallet_from_user_profile on public.user_profiles;
create trigger trg_sync_wallet_from_user_profile
  after insert or update of wallet_balance on public.user_profiles
  for each row execute function public.sync_wallet_from_user_profile();

-- 3. Dedicated Documents table
create table if not exists public.documents (
  id text primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  category text not null check (category in ('kyc_identity', 'proof_of_address', 'accredited_proof', 'statement', 'tax')),
  document_type text not null,
  title text not null,
  file_name text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  file_data_url text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_documents_user_uploaded on public.documents(user_id, uploaded_at desc);

alter table public.documents enable row level security;

drop policy if exists "Users view own documents" on public.documents;
create policy "Users view own documents" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own documents" on public.documents;
create policy "Users insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admins manage all documents" on public.documents;
create policy "Admins manage all documents" on public.documents
  for all using (public.is_admin(auth.uid()));

grant select, insert on table public.documents to authenticated;

-- 4. Dedicated Compliance Steps table
create table if not exists public.compliance_steps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  step_key text not null check (step_key in ('kyc_identity', 'proof_of_address', 'accredited_proof')),
  title text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_review', 'verified', 'rejected')),
  notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint uq_compliance_steps_user_key unique (user_id, step_key)
);

create index if not exists idx_compliance_steps_user on public.compliance_steps(user_id);

alter table public.compliance_steps enable row level security;

drop policy if exists "Users view own compliance_steps" on public.compliance_steps;
create policy "Users view own compliance_steps" on public.compliance_steps
  for select using (auth.uid() = user_id);

drop policy if exists "Admins manage all compliance_steps" on public.compliance_steps;
create policy "Admins manage all compliance_steps" on public.compliance_steps
  for all using (public.is_admin(auth.uid()));

revoke insert, update, delete on table public.compliance_steps from anon, authenticated;
grant select on table public.compliance_steps to authenticated;

-- 5. Strengthen kretz_request_withdrawal RPC to also validate KYC, registered IBAN, and own-name holder in Postgres
create or replace function public.kretz_request_withdrawal(
  p_user_id uuid, p_amount numeric, p_method text, p_destination text,
  p_reference text, p_transaction_id text, p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.user_profiles;
  v_tx public.payment_transactions;
  v_clean_registered text;
  v_clean_requested text;
  v_norm_legal text;
  v_norm_holder text;
begin
  if p_amount is null or p_amount < 250 or p_amount > 5000000 then
    raise exception 'INVALID_WITHDRAWAL_AMOUNT' using errcode = '22023';
  end if;
  if p_destination is null or length(trim(p_destination)) < 15 then
    raise exception 'INVALID_WITHDRAWAL_DESTINATION' using errcode = '22023';
  end if;
  if p_idempotency_key is not null then
    select * into v_tx from public.payment_transactions
      where user_id = p_user_id and type = 'withdrawal' and idempotency_key = p_idempotency_key;
    if found then return to_jsonb(v_tx); end if;
  end if;
  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;

  if v_profile.kyc_status <> 'verified' and v_profile.kyc_status <> 'approved' then
    raise exception 'WITHDRAWAL_KYC_REQUIRED' using errcode = '42501';
  end if;

  v_clean_registered := upper(regexp_replace(coalesce(v_profile.bank_iban, ''), '\s+', '', 'g'));
  v_clean_requested := upper(regexp_replace(coalesce(p_destination, ''), '\s+', '', 'g'));
  if v_clean_registered = '' or v_clean_requested <> v_clean_registered then
    raise exception 'WITHDRAWAL_DESTINATION_MISMATCH' using errcode = '42501';
  end if;

  v_norm_legal := lower(trim(regexp_replace(coalesce(v_profile.full_name, ''), '\s+', ' ', 'g')));
  v_norm_holder := lower(trim(regexp_replace(coalesce(v_profile.bank_account_holder, v_profile.full_name, ''), '\s+', ' ', 'g')));
  if v_norm_legal = '' or v_norm_holder <> v_norm_legal then
    raise exception 'WITHDRAWAL_HOLDER_NAME_MISMATCH' using errcode = '42501';
  end if;

  if v_profile.wallet_balance < p_amount then
    raise exception 'INSUFFICIENT_FUNDS' using errcode = '22023';
  end if;

  update public.user_profiles set wallet_balance = wallet_balance - p_amount, updated_at = now()
    where id = p_user_id returning * into v_profile;
  insert into public.payment_transactions
    (id,user_id,type,amount,currency,status,payment_method,reference,notes,idempotency_key,metadata)
  values
    (p_transaction_id,p_user_id,'withdrawal',p_amount,'EUR','pending',trim(p_method),p_reference,
     'Funds reserved pending withdrawal review.',p_idempotency_key,
     jsonb_build_object('destination',v_clean_requested,'account_holder',v_profile.full_name))
  returning * into v_tx;
  insert into public.withdrawal_requests
    (id,user_id,amount,currency,method,destination,status,reference)
  values (p_transaction_id,p_user_id,p_amount,'EUR',trim(p_method),v_clean_requested,'pending',p_reference);
  insert into public.ledger_entries
    (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
  values
    (p_user_id,p_transaction_id,'withdrawal',-p_amount,'EUR',v_profile.wallet_balance,
     'Funds reserved for withdrawal ' || p_reference,p_idempotency_key);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  select p_user_id,email,'investor','WITHDRAWAL_REQUESTED','payment_transaction',v_tx.id,
    'Withdrawal request submitted for ' || p_amount::text || ' EUR.'
    from public.user_profiles where id = p_user_id;
  return to_jsonb(v_tx);
end;
$$;

commit;
