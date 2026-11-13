-- Durable persistence and atomic financial operations for Kretz.
-- Apply after the existing enterprise financial schema migration.
-- All money-moving RPCs are SECURITY DEFINER and executable only by service_role.

begin;

alter table public.payment_transactions
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_payment_transactions_user_idempotency
  on public.payment_transactions(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  transaction_id text references public.payment_transactions(id) on delete restrict,
  entry_type text not null check (entry_type in ('deposit','withdrawal','investment','refund','adjustment','dividend','fee')),
  amount numeric(14,2) not null check (amount <> 0),
  currency text not null default 'EUR',
  balance_after numeric(14,2) not null check (balance_after >= 0),
  description text not null,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_ledger_entries_idempotency
  on public.ledger_entries(user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_ledger_entries_user_created
  on public.ledger_entries(user_id, created_at desc);
alter table public.ledger_entries enable row level security;
drop policy if exists "Users can view own ledger entries" on public.ledger_entries;
create policy "Users can view own ledger entries" on public.ledger_entries
  for select using (auth.uid() = user_id);
drop policy if exists "Admins can view ledger entries" on public.ledger_entries;
create policy "Admins can view ledger entries" on public.ledger_entries
  for select using (public.is_admin(auth.uid()));

-- Add profile fields used by the existing account settings UI without replacing data.
alter table public.user_profiles
  add column if not exists phone_number text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists avatar_url text,
  add column if not exists bank_iban text,
  add column if not exists crypto_deposit_address text,
  add column if not exists tax_id text,
  add column if not exists date_of_birth date;

-- Durable deposit request. No balance is credited until an admin approves it.
create or replace function public.kretz_request_deposit(
  p_user_id uuid, p_amount numeric, p_method text, p_reference text,
  p_transaction_id text, p_tx_hash text default null, p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_tx public.payment_transactions;
begin
  if p_amount is null or p_amount < 100 or p_amount > 100000000 then
    raise exception 'INVALID_DEPOSIT_AMOUNT' using errcode = '22023';
  end if;
  if p_method is null or length(trim(p_method)) = 0 then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;
  if p_idempotency_key is not null then
    select * into v_tx from public.payment_transactions
      where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then return to_jsonb(v_tx); end if;
  end if;
  insert into public.payment_transactions
    (id,user_id,type,amount,currency,status,payment_method,reference,tx_hash,notes,idempotency_key)
  values
    (p_transaction_id,p_user_id,'deposit',p_amount,'EUR','pending',trim(p_method),p_reference,p_tx_hash,
     'Deposit request awaiting independent settlement verification.',p_idempotency_key)
  returning * into v_tx;
  return to_jsonb(v_tx);
end;
$$;

-- Withdrawals reserve wallet funds atomically before the request is exposed to admins.
create or replace function public.kretz_request_withdrawal(
  p_user_id uuid, p_amount numeric, p_method text, p_destination text,
  p_reference text, p_transaction_id text, p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_profile public.user_profiles; v_tx public.payment_transactions;
begin
  if p_amount is null or p_amount < 250 or p_amount > 100000000 then
    raise exception 'INVALID_WITHDRAWAL_AMOUNT' using errcode = '22023';
  end if;
  if p_destination is null or length(trim(p_destination)) < 5 then
    raise exception 'INVALID_WITHDRAWAL_DESTINATION' using errcode = '22023';
  end if;
  if p_idempotency_key is not null then
    select * into v_tx from public.payment_transactions
      where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then return to_jsonb(v_tx); end if;
  end if;
  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
  if v_profile.wallet_balance < p_amount then
    raise exception 'INSUFFICIENT_FUNDS' using errcode = '22023';
  end if;
  update public.user_profiles set wallet_balance = wallet_balance - p_amount, updated_at = now()
    where id = p_user_id returning * into v_profile;
  insert into public.payment_transactions
    (id,user_id,type,amount,currency,status,payment_method,reference,notes,idempotency_key)
  values
    (p_transaction_id,p_user_id,'withdrawal',p_amount,'EUR','pending',trim(p_method),p_reference,
     'Funds reserved pending withdrawal review.',p_idempotency_key)
  returning * into v_tx;
  insert into public.withdrawal_requests
    (id,user_id,amount,currency,method,destination,status,reference)
  values (p_transaction_id,p_user_id,p_amount,'EUR',trim(p_method),trim(p_destination),'pending',p_reference);
  insert into public.ledger_entries
    (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
  values
    (p_user_id,p_transaction_id,'withdrawal',-p_amount,'EUR',v_profile.wallet_balance,
     'Funds reserved for withdrawal ' || p_reference,p_idempotency_key);
  return to_jsonb(v_tx);
end;
$$;

-- Admin approvals are atomic, idempotent and leave an immutable ledger trail.
create or replace function public.kretz_review_deposit(
  p_transaction_id text, p_admin_id uuid, p_approve boolean, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_tx public.payment_transactions; v_profile public.user_profiles; v_status text;
begin
  if not public.is_admin(p_admin_id) then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into v_tx from public.payment_transactions
    where id = p_transaction_id and type = 'deposit' for update;
  if not found then raise exception 'DEPOSIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'DEPOSIT_NOT_PENDING' using errcode = '22023'; end if;
  if p_approve then
    update public.user_profiles
      set wallet_balance = wallet_balance + v_tx.amount, updated_at = now()
      where id = v_tx.user_id returning * into v_profile;
    if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
    v_status := 'completed';
    insert into public.ledger_entries
      (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
    values (v_tx.user_id,v_tx.id,'deposit',v_tx.amount,v_tx.currency,v_profile.wallet_balance,
      'Verified deposit ' || v_tx.reference,'deposit:' || v_tx.id);
  else
    v_status := 'rejected';
  end if;
  update public.payment_transactions set status = v_status, processed_at = now(),
    notes = coalesce(p_reason, notes), updated_at = now() where id = v_tx.id returning * into v_tx;
  insert into public.approval_records(entity_type,entity_id,approver_id,approver_role,action,notes)
  values ('deposit',v_tx.id,p_admin_id,'finance_admin',case when p_approve then 'approve' else 'reject' end,p_reason);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  select p_admin_id,email,'finance_admin',case when p_approve then 'DEPOSIT_APPROVED' else 'DEPOSIT_REJECTED' end,
    'deposit',v_tx.id,coalesce(p_reason,'')
    from public.user_profiles where id = p_admin_id;
  return to_jsonb(v_tx);
end;
$$;

create or replace function public.kretz_review_withdrawal(
  p_transaction_id text, p_admin_id uuid, p_approve boolean, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_tx public.payment_transactions; v_profile public.user_profiles; v_status text;
begin
  if not public.is_admin(p_admin_id) then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into v_tx from public.payment_transactions
    where id = p_transaction_id and type = 'withdrawal' for update;
  if not found then raise exception 'WITHDRAWAL_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'WITHDRAWAL_NOT_PENDING' using errcode = '22023'; end if;
  if p_approve then
    v_status := 'completed';
  else
    update public.user_profiles
      set wallet_balance = wallet_balance + v_tx.amount, updated_at = now()
      where id = v_tx.user_id returning * into v_profile;
    if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
    v_status := 'rejected';
    insert into public.ledger_entries
      (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
    values (v_tx.user_id,v_tx.id,'refund',v_tx.amount,v_tx.currency,v_profile.wallet_balance,
      'Withdrawal refund ' || v_tx.reference,'withdrawal-refund:' || v_tx.id);
  end if;
  update public.payment_transactions set status = v_status, processed_at = now(),
    notes = coalesce(p_reason, notes), updated_at = now() where id = v_tx.id returning * into v_tx;
  update public.withdrawal_requests set status = v_status,
    rejection_reason = case when p_approve then null else p_reason end
    where id = v_tx.id;
  insert into public.approval_records(entity_type,entity_id,approver_id,approver_role,action,notes)
  values ('withdrawal',v_tx.id,p_admin_id,'finance_admin',case when p_approve then 'approve' else 'reject' end,p_reason);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  select p_admin_id,email,'finance_admin',case when p_approve then 'WITHDRAWAL_APPROVED' else 'WITHDRAWAL_REJECTED' end,
    'withdrawal',v_tx.id,coalesce(p_reason,'')
    from public.user_profiles where id = p_admin_id;
  return to_jsonb(v_tx);
end;
$$;

-- Atomic purchase: locks both the investor wallet and property inventory in one DB transaction.
create or replace function public.kretz_purchase_tokens(
  p_user_id uuid, p_plan_id text, p_tokens integer, p_payment_method text,
  p_reference text, p_investment_id text, p_transaction_id text,
  p_certificate_id text, p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile public.user_profiles; v_plan public.investment_plans;
  v_tx public.payment_transactions; v_investment public.investments;
  v_principal numeric(14,2); v_fee numeric(14,2); v_total numeric(14,2);
  v_balance numeric(14,2); v_monthly_income numeric(12,2); v_maturity timestamptz;
begin
  if p_tokens is null or p_tokens < 1 then raise exception 'INVALID_TOKEN_COUNT' using errcode = '22023'; end if;
  if p_idempotency_key is not null then
    select * into v_tx from public.payment_transactions
      where user_id = p_user_id and idempotency_key = p_idempotency_key;
    if found then
      select * into v_investment from public.investments where user_id = p_user_id and certificate_id = p_certificate_id;
      return jsonb_build_object('transaction',to_jsonb(v_tx),'investment',case when found then to_jsonb(v_investment) else null end);
    end if;
  end if;
  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
  select * into v_plan from public.investment_plans where id = p_plan_id and status in ('funding','active') for update;
  if not found then raise exception 'PROPERTY_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_tokens > v_plan.available_tokens then raise exception 'INSUFFICIENT_AVAILABLE_TOKENS' using errcode = '22023'; end if;
  v_principal := p_tokens * v_plan.token_price;
  if v_principal < v_plan.minimum_investment then raise exception 'BELOW_MINIMUM_INVESTMENT' using errcode = '22023'; end if;
  v_fee := round(v_principal * 0.0025,2);
  v_total := v_principal + v_fee;
  if v_profile.wallet_balance < v_total then raise exception 'INSUFFICIENT_FUNDS' using errcode = '22023'; end if;
  v_balance := v_profile.wallet_balance - v_total;
  update public.user_profiles set wallet_balance = v_balance, invested_balance = invested_balance + v_principal,
    updated_at = now() where id = p_user_id;
  update public.investment_plans set available_tokens = available_tokens - p_tokens,
    funded_amount = funded_amount + v_principal, updated_at = now() where id = p_plan_id;
  v_maturity := now() + make_interval(months => v_plan.duration_months);
  v_monthly_income := round(v_principal * (v_plan.monthly_target_rate / 100),2);
  insert into public.investments
    (id,user_id,plan_id,tokens_purchased,token_price,total_amount_invested,monthly_target_rate,
     projected_monthly_income,current_valuation,duration_months,status,maturity_date,
     transaction_hash,certificate_id)
  values
    (p_investment_id,p_user_id,p_plan_id,p_tokens,v_plan.token_price,v_principal,
     v_plan.monthly_target_rate,v_monthly_income,v_principal,v_plan.duration_months,'active',
     v_maturity,p_reference,p_certificate_id)
  returning * into v_investment;
  insert into public.payment_transactions
    (id,user_id,type,amount,currency,status,payment_method,reference,notes,idempotency_key,metadata,processed_at)
  values
    (p_transaction_id,p_user_id,'investment',v_total,'EUR','completed',p_payment_method,p_reference,
     'Token purchase settled from investor EUR wallet.',p_idempotency_key,
     jsonb_build_object('plan_id',p_plan_id,'investment_id',p_investment_id,'tokens',p_tokens,
       'principal',v_principal,'fee',v_fee),now())
  returning * into v_tx;
  insert into public.ledger_entries
    (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
  values (p_user_id,p_transaction_id,'investment',-v_total,'EUR',v_balance,
    'Investment purchase ' || p_reference,'investment:' || p_transaction_id);
  return jsonb_build_object('transaction',to_jsonb(v_tx),'investment',to_jsonb(v_investment),
    'remaining_tokens',v_plan.available_tokens - p_tokens,'principal',v_principal,'fee',v_fee,'total',v_total);
end;
$$;

-- Server-only execution; browser clients cannot invoke money-moving functions.
revoke all on function public.kretz_request_deposit(uuid,numeric,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.kretz_request_withdrawal(uuid,numeric,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.kretz_review_deposit(text,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.kretz_review_withdrawal(text,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.kretz_purchase_tokens(uuid,text,integer,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.kretz_request_deposit(uuid,numeric,text,text,text,text,text) to service_role;
grant execute on function public.kretz_request_withdrawal(uuid,numeric,text,text,text,text,text) to service_role;
grant execute on function public.kretz_review_deposit(text,uuid,boolean,text) to service_role;
grant execute on function public.kretz_review_withdrawal(text,uuid,boolean,text) to service_role;
grant execute on function public.kretz_purchase_tokens(uuid,text,integer,text,text,text,text,text,text) to service_role;

commit;
