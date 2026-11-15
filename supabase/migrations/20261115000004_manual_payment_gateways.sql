-- Manual payment gateway adapted to the active Login / Rental.krez schema.
-- Pending evidence is stored separately from the immutable completed wallet ledger.
create table if not exists public.manual_payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 100),
  logo_url text,
  instructions text not null default '',
  account_details jsonb not null default '{}'::jsonb,
  minimum_amount numeric(14,2) not null default 100 check (minimum_amount > 0),
  maximum_amount numeric(14,2),
  fee_type text not null default 'none' check (fee_type in ('none','fixed','percent')),
  fee_value numeric(14,2) not null default 0 check (fee_value >= 0),
  extra_fields jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (maximum_amount is null or maximum_amount >= minimum_amount)
);

create index if not exists idx_manual_payment_methods_enabled
  on public.manual_payment_methods (enabled, sort_order);

create table if not exists public.manual_deposit_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  method_id uuid references public.manual_payment_methods(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  payment_method text not null,
  reference text not null unique,
  manual_transaction_id text not null,
  sender_name text not null,
  payment_date date not null,
  fee_amount numeric(14,2) not null default 0 check (fee_amount >= 0),
  gross_amount numeric(14,2) not null check (gross_amount > 0),
  extra_values jsonb not null default '{}'::jsonb,
  proof_storage_path text not null,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_manual_deposit_transaction_id
  on public.manual_deposit_submissions (lower(manual_transaction_id))
  where btrim(manual_transaction_id) <> '';

create index if not exists idx_manual_deposit_user_created
  on public.manual_deposit_submissions (user_id, created_at desc);

create index if not exists idx_manual_deposit_status_created
  on public.manual_deposit_submissions (status, created_at desc);

alter table public.manual_payment_methods enable row level security;
alter table public.manual_deposit_submissions enable row level security;
revoke all on public.manual_payment_methods from anon, authenticated;
revoke all on public.manual_deposit_submissions from anon, authenticated;
grant all on public.manual_payment_methods to service_role;
grant all on public.manual_deposit_submissions to service_role;

-- Evidence remains private. The API uses the service-role client and creates
-- short-lived signed URLs only after checking the caller's admin role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manual-payment-proofs',
  'manual-payment-proofs',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

create or replace function public.kretz_review_manual_deposit(
  p_submission_id uuid,
  p_admin_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_submission public.manual_deposit_submissions%rowtype;
  v_balance numeric(14,2);
  v_ledger_id text;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = p_admin_id and role = 'admin'
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_submission
  from public.manual_deposit_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'DEPOSIT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_submission.status <> 'pending' then
    raise exception 'DEPOSIT_NOT_PENDING' using errcode = 'P0001';
  end if;

  if p_approve then
    update public.profiles
    set wallet_balance = wallet_balance + v_submission.amount
    where id = v_submission.user_id
    returning wallet_balance into v_balance;

    if not found then
      raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
    end if;

    v_ledger_id := 'KZ-MAN-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.ledger_transactions (
      id, user_id, type, amount, currency, status, description, reference,
      created_at, payment_method, balance_after, tx_hash, metadata
    ) values (
      v_ledger_id,
      v_submission.user_id,
      'deposit',
      v_submission.amount,
      v_submission.currency,
      'completed',
      'Manual deposit approved by finance',
      v_submission.reference,
      pg_catalog.now()::text,
      v_submission.payment_method,
      v_balance,
      v_submission.reference,
      pg_catalog.jsonb_build_object(
        'manual_deposit_submission_id', v_submission.id,
        'manual_transaction_id', v_submission.manual_transaction_id,
        'sender_name', v_submission.sender_name,
        'payment_date', v_submission.payment_date,
        'fee_amount', v_submission.fee_amount,
        'gross_amount', v_submission.gross_amount,
        'proof_storage_path', v_submission.proof_storage_path
      )
    );

    update public.manual_deposit_submissions
    set status = 'completed',
        reviewed_by = p_admin_id,
        reviewed_at = pg_catalog.now(),
        updated_at = pg_catalog.now(),
        rejection_reason = null
    where id = p_submission_id
    returning * into v_submission;
  else
    if p_reason is null or pg_catalog.length(pg_catalog.btrim(p_reason)) < 3 then
      raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
    end if;

    update public.manual_deposit_submissions
    set status = 'rejected',
        rejection_reason = pg_catalog.left(pg_catalog.btrim(p_reason), 1000),
        reviewed_by = p_admin_id,
        reviewed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = p_submission_id
    returning * into v_submission;

    select wallet_balance into v_balance
    from public.profiles where id = v_submission.user_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'submission', pg_catalog.to_jsonb(v_submission),
    'balance_after', v_balance,
    'ledger_transaction_id', v_ledger_id
  );
end;
$function$;

revoke all on function public.kretz_review_manual_deposit(uuid,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.kretz_review_manual_deposit(uuid,uuid,boolean,text) to service_role;
