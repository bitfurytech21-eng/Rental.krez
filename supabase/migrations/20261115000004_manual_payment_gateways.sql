-- Manual payment gateway configuration and deposit evidence for Rental.krez.
-- All writes and reads are performed by the authenticated API using the service-role client.
alter table public.payment_transactions
  add column if not exists manual_transaction_id text,
  add column if not exists sender_name text,
  add column if not exists fee_amount numeric(14,2) not null default 0 check (fee_amount >= 0),
  add column if not exists gross_amount numeric(14,2) check (gross_amount is null or gross_amount > 0),
  add column if not exists payment_date date,
  add column if not exists proof_storage_path text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references public.user_profiles(id),
  add column if not exists reviewed_at timestamptz;

create unique index if not exists idx_payment_transactions_manual_tx_id
  on public.payment_transactions (lower(manual_transaction_id))
  where manual_transaction_id is not null and btrim(manual_transaction_id) <> '';

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
  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (maximum_amount is null or maximum_amount >= minimum_amount)
);

create index if not exists idx_manual_payment_methods_enabled
  on public.manual_payment_methods (enabled, sort_order);

alter table public.manual_payment_methods enable row level security;
revoke all on public.manual_payment_methods from anon, authenticated;
grant all on public.manual_payment_methods to service_role;

-- Evidence is private. The API stores random object names and serves evidence only
-- after an authenticated admin authorization check.
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

drop policy if exists "No direct access to manual payment evidence" on storage.objects;
create policy "No direct access to manual payment evidence"
  on storage.objects for all to authenticated
  using (bucket_id <> 'manual-payment-proofs')
  with check (bucket_id <> 'manual-payment-proofs');

comment on column public.payment_transactions.manual_transaction_id is
  'Sender-provided bank or payment transaction identifier; unique across manual deposit submissions.';
comment on column public.payment_transactions.proof_storage_path is
  'Private Supabase Storage object path for manual deposit evidence.';
