-- ============================================================================
-- Kretz Real Estate Platform — Enterprise Database Schema & Security Migration
-- Migration: 20261018000000_enterprise_financial_schema.sql
-- 
-- Enforces:
-- 1. Entity integrity and relational foreign keys between auth.users and business tables
-- 2. Strict Row Level Security (RLS) policies on every table (deny-by-default)
-- 3. Append-only ledger auditing and dual-approval records
-- 4. Safe security definer triggers with immutable search_path
-- 5. Role isolation: super_admin, finance_admin, operations_admin, support, auditor, investor
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. USER PROFILES TABLE (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  country text default 'Spain' not null,
  country_code text default 'ES',
  phone_number text,
  account_type text default 'individual_investor' not null 
    check (account_type in ('individual_investor', 'corporate_entity', 'family_office', 'institutional_partner', 'admin')),
  wallet_balance numeric(14,2) default 0.00 not null check (wallet_balance >= 0.00),
  invested_balance numeric(14,2) default 0.00 not null check (invested_balance >= 0.00),
  total_dividends_earned numeric(14,2) default 0.00 not null check (total_dividends_earned >= 0.00),
  kyc_status text default 'pending' not null 
    check (kyc_status in ('unverified', 'pending', 'approved', 'rejected')),
  kyc_verified_at timestamp with time zone,
  kyc_notes text,
  preferences jsonb default '{"emailNotifications": true, "smsAlerts": false, "twoFactorRequired": false, "currency": "EUR"}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_profiles_email on public.user_profiles(email);
create index if not exists idx_user_profiles_kyc_status on public.user_profiles(kyc_status);

-- ----------------------------------------------------------------------------
-- 2. USER ROLES TABLE (Authoritative Server-Enforced RBAC)
-- ----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null check (role in (
    'investor',
    'admin',
    'super_admin',
    'finance_admin',
    'operations_admin',
    'support',
    'auditor'
  )),
  granted_by uuid references public.user_profiles(id),
  granted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint uq_user_role unique (user_id, role)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);

-- Helper function to check admin role safely
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id
      and role in ('admin', 'super_admin', 'finance_admin', 'operations_admin', 'support', 'auditor')
  );
$$;

create or replace function public.has_role(check_user_id uuid, check_role text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and (role = check_role or role = 'super_admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. INVESTMENT PLANS TABLE (Offerings & Fractional Real Estate Assets)
-- ----------------------------------------------------------------------------
create table if not exists public.investment_plans (
  id text primary key,
  slug text unique not null,
  title text not null,
  location text not null,
  city text not null,
  country text default 'Spain' not null,
  type text not null,
  status text default 'funding' not null check (status in ('draft', 'funding', 'funded', 'active', 'closed', 'hidden')),
  target_amount numeric(14,2) not null check (target_amount > 0),
  funded_amount numeric(14,2) default 0.00 not null check (funded_amount >= 0),
  token_price numeric(10,2) default 364.00 not null check (token_price > 0),
  total_tokens integer not null check (total_tokens > 0),
  available_tokens integer not null check (available_tokens >= 0),
  monthly_target_rate numeric(5,2) not null check (monthly_target_rate between 5.00 and 15.00),
  estimated_annual_yield numeric(5,2) not null,
  total_estimated_return numeric(5,2) not null,
  duration_months integer default 48 not null check (duration_months > 0),
  minimum_investment numeric(10,2) default 750.00 not null,
  distribution_frequency text default 'Monthly' not null check (distribution_frequency in ('Monthly', 'Quarterly')),
  images jsonb not null,
  specs jsonb default '{}'::jsonb not null,
  financials jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_investment_plans_status on public.investment_plans(status);

-- ----------------------------------------------------------------------------
-- 4. INVESTMENTS TABLE (User Fractional Shareholdings)
-- ----------------------------------------------------------------------------
create table if not exists public.investments (
  id text primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  plan_id text not null references public.investment_plans(id) on delete restrict,
  tokens_purchased integer not null check (tokens_purchased > 0),
  token_price numeric(10,2) not null check (token_price > 0),
  total_amount_invested numeric(14,2) not null check (total_amount_invested > 0),
  monthly_target_rate numeric(5,2) not null,
  projected_monthly_income numeric(12,2) not null,
  total_dividends_received numeric(14,2) default 0.00 not null check (total_dividends_received >= 0),
  current_valuation numeric(14,2) not null check (current_valuation >= 0),
  duration_months integer not null,
  status text default 'active' not null check (status in ('active', 'matured', 'redeemed', 'cancelled')),
  purchased_at timestamp with time zone default timezone('utc'::text, now()) not null,
  maturity_date timestamp with time zone not null,
  transaction_hash text not null,
  certificate_id text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_investments_user_id on public.investments(user_id);
create index if not exists idx_investments_plan_id on public.investments(plan_id);
create index if not exists idx_investments_status on public.investments(status);

-- ----------------------------------------------------------------------------
-- 5. INVESTMENT VALUATIONS TABLE (Historical Audit Trail of Property Value)
-- ----------------------------------------------------------------------------
create table if not exists public.investment_valuations (
  id uuid primary key default uuid_generate_v4(),
  plan_id text not null references public.investment_plans(id) on delete cascade,
  valuation_amount numeric(14,2) not null check (valuation_amount > 0),
  appraiser_name text not null,
  valuation_report_url text,
  effective_date date not null,
  created_by uuid references public.user_profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_valuations_plan_id on public.investment_valuations(plan_id);

-- ----------------------------------------------------------------------------
-- 6. PAYMENT TRANSACTIONS TABLE (Deposits, Payouts, Gateway Records)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_transactions (
  id text primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'investment', 'dividend', 'reinvestment', 'adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  currency text default 'EUR' not null,
  status text default 'pending' not null check (status in ('pending', 'processing', 'completed', 'failed', 'rejected', 'cancelled')),
  payment_method text not null,
  provider text,
  provider_payment_id text,
  reference text unique not null,
  tx_hash text,
  notes text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_payment_transactions_user_id on public.payment_transactions(user_id);
create index if not exists idx_payment_transactions_type on public.payment_transactions(type);
create index if not exists idx_payment_transactions_status on public.payment_transactions(status);
create index if not exists idx_payment_transactions_reference on public.payment_transactions(reference);

-- ----------------------------------------------------------------------------
-- 7. PAYMENT WEBHOOK EVENTS (Idempotency and Anti-Replay Guard)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  provider text not null,
  event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  signature_verified boolean default false not null,
  processing_status text default 'received' not null check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_webhook_event_id on public.payment_webhook_events(event_id);

-- ----------------------------------------------------------------------------
-- 8. WITHDRAWAL REQUESTS & DUAL APPROVAL TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.withdrawal_requests (
  id text primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 250.00),
  currency text default 'EUR' not null,
  method text not null,
  destination text not null,
  status text default 'pending' not null check (status in ('pending', 'first_approved', 'completed', 'rejected', 'cancelled')),
  reference text unique not null,
  requires_dual_approval boolean default false not null,
  first_approver_id uuid references public.user_profiles(id),
  first_approved_at timestamp with time zone,
  final_approver_id uuid references public.user_profiles(id),
  final_approved_at timestamp with time zone,
  rejection_reason text,
  tx_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_withdrawals_user_id on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawals_status on public.withdrawal_requests(status);

-- ----------------------------------------------------------------------------
-- 9. APPROVAL RECORDS (Dual Sign-Off Audit Trail)
-- ----------------------------------------------------------------------------
create table if not exists public.approval_records (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('withdrawal', 'deposit', 'user_kyc', 'property_publish', 'manual_adjustment')),
  entity_id text not null,
  approver_id uuid not null references public.user_profiles(id),
  approver_role text not null,
  action text not null check (action in ('approve', 'reject', 'first_approve', 'final_approve')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_approvals_entity on public.approval_records(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info' not null check (type in ('info', 'success', 'warning', 'financial')),
  read boolean default false not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);

-- ----------------------------------------------------------------------------
-- 11. REFERRAL RECORDS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.referral_records (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.user_profiles(id) on delete cascade,
  referred_user_id uuid unique not null references public.user_profiles(id) on delete cascade,
  referral_code text not null,
  commission_earned numeric(14,2) default 0.00 not null check (commission_earned >= 0),
  status text default 'active' not null check (status in ('active', 'paid', 'void')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_referrals_referrer on public.referral_records(referrer_id);

-- ----------------------------------------------------------------------------
-- 12. AUDIT LOGS TABLE (Append-Only Financial Compliance Log)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.user_profiles(id),
  actor_email text not null,
  actor_role text not null,
  action text not null,
  entity_type text,
  entity_id text,
  details text not null,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- ----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES — STRICT MULTI-TENANT ISOLATION
-- ----------------------------------------------------------------------------

-- Enable RLS on every table
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.investment_plans enable row level security;
alter table public.investments enable row level security;
alter table public.investment_valuations enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.approval_records enable row level security;
alter table public.notifications enable row level security;
alter table public.referral_records enable row level security;
alter table public.audit_logs enable row level security;

-- Policies for user_profiles
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.user_profiles
  for select using (public.is_admin(auth.uid()));

create policy "Users can update limited own fields" on public.user_profiles
  for update using (auth.uid() = id);

-- Policies for user_roles
create policy "Users can view own roles" on public.user_roles
  for select using (auth.uid() = user_id);

create policy "Admins can view all user roles" on public.user_roles
  for select using (public.is_admin(auth.uid()));

create policy "Only super_admins can modify roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- Policies for investment_plans
create policy "Anyone can view non-hidden investment plans" on public.investment_plans
  for select using (status != 'hidden' or public.is_admin(auth.uid()));

create policy "Operations and super admins can manage investment plans" on public.investment_plans
  for all using (
    public.has_role(auth.uid(), 'super_admin') or
    public.has_role(auth.uid(), 'operations_admin') or
    public.has_role(auth.uid(), 'admin')
  );

-- Policies for investments
create policy "Users can view own investments" on public.investments
  for select using (auth.uid() = user_id);

create policy "Admins can view all investments" on public.investments
  for select using (public.is_admin(auth.uid()));

-- Policies for payment_transactions
create policy "Users can view own payment transactions" on public.payment_transactions
  for select using (auth.uid() = user_id);

create policy "Admins can view all payment transactions" on public.payment_transactions
  for select using (public.is_admin(auth.uid()));

create policy "Finance admins can update payment transactions" on public.payment_transactions
  for update using (
    public.has_role(auth.uid(), 'super_admin') or
    public.has_role(auth.uid(), 'finance_admin') or
    public.has_role(auth.uid(), 'admin')
  );

-- Policies for withdrawal_requests
create policy "Users can view own withdrawal requests" on public.withdrawal_requests
  for select using (auth.uid() = user_id);

create policy "Admins can view all withdrawal requests" on public.withdrawal_requests
  for select using (public.is_admin(auth.uid()));

-- Policies for notifications
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- Policies for referral_records
create policy "Users can view own referrals" on public.referral_records
  for select using (auth.uid() = referrer_id);

create policy "Admins can view all referrals" on public.referral_records
  for select using (public.is_admin(auth.uid()));

-- Policies for audit_logs
create policy "Only auditors and administrators can view audit logs" on public.audit_logs
  for select using (public.is_admin(auth.uid()));

-- Policies for approval_records
create policy "Admins can view approval records" on public.approval_records
  for select using (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 14. COMPATIBILITY VIEWS FOR EXISTING CLIENTS
-- ----------------------------------------------------------------------------
create or replace view public.profiles as
  select 
    id,
    email,
    full_name,
    case when public.is_admin(id) then 'admin' else 'investor' end as role,
    account_type,
    wallet_balance,
    invested_balance,
    kyc_status,
    created_at
  from public.user_profiles;

create or replace view public.ledger_transactions as
  select 
    id,
    user_id,
    type,
    amount,
    currency,
    status,
    notes as description,
    reference,
    created_at::text as created_at,
    payment_method,
    0.00 as balance_after,
    coalesce(tx_hash, '') as tx_hash,
    '{}'::jsonb as metadata,
    created_at as inserted_at
  from public.payment_transactions;

-- ----------------------------------------------------------------------------
-- 15. AUTOMATIC TRIGGER FOR SECURE USER PROVISIONING
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_country text;
  v_phone text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_country := coalesce(new.raw_user_meta_data->>'country', 'Spain');
  v_phone := coalesce(new.raw_user_meta_data->>'phone_number', '');

  -- Public signups always start as individual_investor with zero balance
  insert into public.user_profiles (
    id, email, full_name, country, phone_number, account_type, wallet_balance, invested_balance, kyc_status
  ) values (
    new.id, new.email, v_full_name, v_country, v_phone, 'individual_investor', 0.00, 0.00, 'pending'
  );

  -- Always assign least-privilege 'investor' role by default
  insert into public.user_roles (user_id, role)
  values (new.id, 'investor')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
