-- ============================================================================
-- Kretz Real Estate Platform — Supabase Database Schema
-- Migration: 002_supabase_schema.sql
--
-- Replaces Cloudflare Hono + in-memory ledger with Supabase Postgres.
-- All tables include Row Level Security (RLS) policies.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (replaces in-memory users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  full_name text not null,
  role text not null default 'investor' check (role in ('admin', 'investor', 'compliance', 'guest')),
  account_type text not null default 'individual_investor',
  kyc_status text not null default 'unverified' check (kyc_status in ('unverified', 'pending', 'verified', 'rejected')),
  kyc_document_type text,
  kyc_submitted_at timestamptz,
  wallet_balance numeric(14,2) not null default 0 check (wallet_balance >= 0),
  invested_balance numeric(14,2) not null default 0 check (invested_balance >= 0),
  total_earned numeric(14,2) not null default 0 check (total_earned >= 0),
  created_at timestamptz default now() not null,
  phone_number text,
  country text,
  crypto_deposit_address text,
  bank_iban text,
  avatar_url text,
  joint_holder_name text,
  company_name text,
  institution_name text,
  tax_id text,
  registration_number text,
  date_of_birth date,
  address text,
  city text,
  postal_code text,
  two_factor_enabled boolean default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  suspended_reason text,
  updated_at timestamptz default now() not null
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_kyc_status on public.profiles(kyc_status);

-- ----------------------------------------------------------------------------
-- 2. PROPERTIES (replaces in-memory properties)
-- ----------------------------------------------------------------------------
create table if not exists public.properties (
  id text primary key,
  slug text unique not null,
  title text not null,
  location text not null,
  city text not null,
  country text not null,
  type text not null,
  status text not null default 'funding' check (status in ('funding', 'funded', 'completed', 'upcoming', 'hidden', 'pending_approval')),
  images jsonb not null default '[]'::jsonb,
  banner_image text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  funded_amount numeric(14,2) not null default 0 check (funded_amount >= 0),
  token_price numeric(14,2) not null check (token_price > 0),
  total_tokens integer not null check (total_tokens > 0),
  available_tokens integer not null check (available_tokens >= 0),
  estimated_annual_yield numeric(5,2) not null default 0,
  capital_appreciation_yield numeric(5,2) not null default 0,
  total_estimated_return numeric(5,2) not null default 0,
  duration_months integer not null check (duration_months > 0),
  minimum_investment numeric(14,2) not null default 750 check (minimum_investment >= 750),
  distribution_frequency text not null default 'Monthly' check (distribution_frequency in ('Monthly', 'Quarterly')),
  token_ticker text not null,
  blockchain_network text not null default 'Polygon POS',
  token_contract_address text,
  description text,
  investment_structure text,
  highlights jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  exit_strategy text,
  financial_breakdown jsonb,
  fee_structure jsonb,
  payment_schedule jsonb,
  documents jsonb default '[]'::jsonb,
  investor_count integer not null default 0 check (investor_count >= 0),
  created_at timestamptz default now() not null,
  is_sample_record boolean default false,
  surface_area_m2 numeric,
  bedrooms integer,
  bathrooms integer,
  year_build text,
  energy_rating text,
  cadastral_reference text,
  amenities jsonb default '[]'::jsonb,
  timeline jsonb default '[]'::jsonb,
  operator_name text,
  kretz_features jsonb default '[]'::jsonb,
  reental_features jsonb default '[]'::jsonb,
  ref text,
  agent jsonb,
  is_exclusive boolean default false,
  is_off_market boolean default false,
  tour_url text,
  external_tour_url text,
  youtube_id text,
  monthly_target_rate numeric,
  spv_entity_name text,
  solana_mint_address text,
  solana_program_id text,
  is_fully_funded boolean default false,
  approved_for_frontend boolean default false,
  assigned_function text,
  assigned_at timestamptz,
  assigned_by text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  approval_notes text,
  frontend_visibility_status text default 'visible' check (frontend_visibility_status in ('visible', 'hidden', 'pending')),
  sensitivity_analysis jsonb,
  spv_jurisdiction text,
  updated_at timestamptz default now() not null
);

create index if not exists idx_properties_slug on public.properties(slug);
create index if not exists idx_properties_status on public.properties(status);
create index if not exists idx_properties_type on public.properties(type);
create index if not exists idx_properties_city on public.properties(city);
create index if not exists idx_properties_approved_frontend on public.properties(approved_for_frontend);
create index if not exists idx_properties_blockchain_network on public.properties(blockchain_network);

-- ----------------------------------------------------------------------------
-- 3. INVESTMENTS (replaces in-memory investments)
-- ----------------------------------------------------------------------------
create table if not exists public.investments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  property_title text not null,
  property_location text not null,
  property_image text not null,
  tokens_purchased integer not null check (tokens_purchased > 0),
  token_price numeric(14,2) not null check (token_price > 0),
  total_amount_invested numeric(14,2) not null check (total_amount_invested > 0),
  purchased_at timestamptz default now() not null,
  start_date timestamptz default now() not null,
  maturity_date timestamptz not null,
  duration_months integer not null check (duration_months > 0),
  duration_days integer,
  estimated_annual_yield numeric(5,2) not null default 0,
  projected_monthly_income numeric(14,2) not null default 0,
  total_dividends_received numeric(14,2) not null default 0 check (total_dividends_received >= 0),
  current_valuation numeric(14,2),
  unrealized_profit_loss numeric(14,2),
  status text not null default 'active' check (status in ('active', 'matured', 'cancelled', 'pending', 'completed', 'liquidated')),
  transaction_hash text,
  certificate_id text,
  funding_source text check (funding_source in ('wallet', 'reinvestment')),
  reinvested_from_id uuid references public.investments(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_investments_user_id on public.investments(user_id);
create index if not exists idx_investments_property_id on public.investments(property_id);
create index if not exists idx_investments_status on public.investments(status);
create index if not exists idx_investments_created_at on public.investments(created_at);

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS (replaces in-memory transactions)
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'investment', 'distribution', 'fee')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'processing', 'completed', 'rejected')),
  description text not null,
  reference text not null,
  created_at timestamptz default now() not null,
  payment_method text not null,
  tx_hash text,
  balance_after numeric(14,2) not null check (balance_after >= 0),
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_reference on public.transactions(reference);
create index if not exists idx_transactions_created_at on public.transactions(created_at);

-- ----------------------------------------------------------------------------
-- 5. VERIFICATION_DOCUMENTS (replaces in-memory verification docs)
-- ----------------------------------------------------------------------------
create table if not exists public.verification_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('deposit_proof', 'kyc_identity', 'proof_of_address', 'accredited_proof', 'general')),
  title text not null,
  document_type text not null,
  file_url text not null,
  file_name text not null,
  file_size integer not null check (file_size > 0),
  uploaded_at timestamptz default now() not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  transaction_reference text,
  amount numeric(14,2),
  currency text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_verification_docs_user_id on public.verification_documents(user_id);
create index if not exists idx_verification_docs_category on public.verification_documents(category);
create index if not exists idx_verification_docs_status on public.verification_documents(status);
create index if not exists idx_verification_docs_tx_ref on public.verification_documents(transaction_reference);

-- ----------------------------------------------------------------------------
-- 6. AUDIT_LOGS (replaces in-memory audit logs)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id),
  admin_email text not null,
  action text not null,
  details text not null,
  timestamp timestamptz default now() not null,
  ip_address text,
  category text check (category in ('auth', 'user_status', 'financial', 'compliance', 'security', 'system')),
  severity text check (severity in ('info', 'success', 'warning', 'critical')),
  target_user_id uuid references public.profiles(id),
  target_user_email text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_audit_logs_admin_id on public.audit_logs(admin_id);
create index if not exists idx_audit_logs_category on public.audit_logs(category);
create index if not exists idx_audit_logs_severity on public.audit_logs(severity);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp);
create index if not exists idx_audit_logs_target_user_id on public.audit_logs(target_user_id);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS (replaces in-memory notifications)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'financial')),
  read boolean not null default false,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_created_at on public.notifications(created_at);

-- ----------------------------------------------------------------------------
-- 8. PAYMENT_CONFIG (replaces in-memory payment config)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_config (
  id uuid primary key default uuid_generate_v4(),
  beneficiary text not null,
  iban text not null,
  bic text not null,
  bank_name text not null,
  support_email text not null,
  instructions text not null,
  routing_number text,
  address text,
  country text,
  updated_at timestamptz default now() not null
);

-- ----------------------------------------------------------------------------
-- 9. CRYPTO_NETWORKS (replaces in-memory crypto networks)
-- ----------------------------------------------------------------------------
create table if not exists public.crypto_networks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  token text not null,
  network text not null,
  wallet_address text not null,
  contract_end text,
  contract_address text,
  enabled boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_crypto_networks_enabled on public.crypto_networks(enabled);
create index if not exists idx_crypto_networks_token on public.crypto_networks(token);

-- ----------------------------------------------------------------------------
-- 10. MEMBERSHIP_TIERS (Club Privé tiers)
-- ----------------------------------------------------------------------------
create table if not exists public.membership_tiers (
  id text primary key,
  name text not null,
  short_label text not null,
  description text not null,
  badge text not null,
  role text not null default 'investor',
  min_investment text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ----------------------------------------------------------------------------
-- 11. MEMBERSHIPS (user memberships)
-- ----------------------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_id text not null references public.membership_tiers(id),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'pending')),
  billing_cycle text not null default 'annual' check (billing_cycle in ('annual', 'monthly')),
  payment_method text not null,
  preferred_region text,
  invitation_code text,
  special_requests text,
  member_number text,
  started_at timestamptz default now() not null,
  expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_tier_id on public.memberships(tier_id);
create index if not exists idx_memberships_status on public.memberships(status);

-- ----------------------------------------------------------------------------
-- 12. MEMBERSHIP_APPLICATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.membership_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  tier_id text not null references public.membership_tiers(id),
  billing_cycle text not null default 'annual',
  payment_method text not null,
  preferred_region text,
  invitation_code text,
  special_requests text,
  turnstile_token text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_membership_apps_user_id on public.membership_applications(user_id);
create index if not exists idx_membership_apps_status on public.membership_applications(status);

-- ----------------------------------------------------------------------------
-- 13. COMPANY_NEWS
-- ----------------------------------------------------------------------------
create table if not exists public.company_news (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  category text not null,
  source text not null,
  tags jsonb default '[]'::jsonb,
  youtube_id text,
  youtube_url text,
  thumbnail_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_company_news_category on public.company_news(category);
create index if not exists idx_company_news_created_at on public.company_news(created_at);

-- ----------------------------------------------------------------------------
-- 14. FAVORITES (user favorited properties)
-- ----------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique (user_id, property_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_property_id on public.favorites(property_id);

-- ----------------------------------------------------------------------------
-- 15. USER_PREFERENCES
-- ----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id)
);

create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);

-- ----------------------------------------------------------------------------
-- 16. SUB_BALANCES (sub-currency balances per user)
-- ----------------------------------------------------------------------------
create table if not exists public.sub_balances (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, currency)
);

create index if not exists idx_sub_balances_user_id on public.sub_balances(user_id);

-- ----------------------------------------------------------------------------
-- 17. P2P_LISTINGS (P2P token marketplace)
-- ----------------------------------------------------------------------------
create table if not exists public.p2p_listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  seller_name text not null,
  property_id text not null references public.properties(id) on delete cascade,
  property_title text not null,
  property_location text not null,
  property_image text not null,
  token_ticker text not null,
  tokens_available integer not null check (tokens_available > 0),
  asking_price_per_token numeric(14,2) not null check (asking_price_per_token > 0),
  par_value_per_token numeric(14,2) not null check (par_value_per_token > 0),
  estimated_annual_yield numeric(5,2) not null default 0,
  created_at timestamptz default now() not null,
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  updated_at timestamptz default now() not null
);

create index if not exists idx_p2p_listings_seller_id on public.p2p_listings(seller_id);
create index if not exists idx_p2p_listings_property_id on public.p2p_listings(property_id);
create index if not exists idx_p2p_listings_status on public.p2p_listings(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.investments enable row level security;
alter table public.transactions enable row level security;
alter table public.verification_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_config enable row level security;
alter table public.crypto_networks enable row level security;
alter table public.membership_tiers enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_applications enable row level security;
alter table public.company_news enable row level security;
alter table public.favorites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.sub_balances enable row level security;
alter table public.p2p_listings enable row level security;

-- ----------------------------------------------------------------------------
-- Profiles RLS
-- ----------------------------------------------------------------------------
create policy if not exists profiles_public_read
  on public.profiles for select
  using (true);

create policy if not exists profiles_own_write
  on public.profiles for all
  using (auth.uid() = id);

create policy if not exists profiles_admin_all
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Properties RLS
-- ----------------------------------------------------------------------------
create policy if not exists properties_public_read
  on public.properties for select
  using (approved_for_frontend = true or status != 'hidden');

create policy if not exists properties_admin_all
  on public.properties for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists properties_owner_write
  on public.properties for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or p.role = 'compliance')
    )
  );

-- ----------------------------------------------------------------------------
-- Investments RLS
-- ----------------------------------------------------------------------------
create policy if not exists investments_own_read
  on public.investments for select
  using (auth.uid() = user_id);

create policy if not exists investments_admin_read
  on public.investments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists investments_own_insert
  on public.investments for insert
  with check (auth.uid() = user_id);

create policy if not exists investments_admin_all
  on public.investments for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Transactions RLS
-- ----------------------------------------------------------------------------
create policy if not exists transactions_own_read
  on public.transactions for select
  using (auth.uid() = user_id);

create policy if not exists transactions_admin_read
  on public.transactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists transactions_own_insert
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy if not exists transactions_admin_all
  on public.transactions for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Verification Documents RLS
-- ----------------------------------------------------------------------------
create policy if not exists verification_docs_own_read
  on public.verification_documents for select
  using (auth.uid() = user_id);

create policy if not exists verification_docs_admin_all
  on public.verification_documents for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'compliance')
    )
  );

create policy if not exists verification_docs_own_insert
  on public.verification_documents for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Audit Logs RLS
-- ----------------------------------------------------------------------------
create policy if not exists audit_logs_admin_all
  on public.audit_logs for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists audit_logs_own_read
  on public.audit_logs for select
  using (auth.uid() = admin_id or auth.uid() = target_user_id);

-- ----------------------------------------------------------------------------
-- Notifications RLS
-- ----------------------------------------------------------------------------
create policy if not exists notifications_own_all
  on public.notifications for all
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Payment Config RLS
-- ----------------------------------------------------------------------------
create policy if not exists payment_config_public_read
  on public.payment_config for select
  using (true);

create policy if not exists payment_config_admin_all
  on public.payment_config for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Crypto Networks RLS
-- ----------------------------------------------------------------------------
create policy if not exists crypto_networks_public_read
  on public.crypto_networks for select
  using (true);

create policy if not exists crypto_networks_admin_all
  on public.crypto_networks for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Membership Tiers RLS
-- ----------------------------------------------------------------------------
create policy if not exists membership_tiers_public_read
  on public.membership_tiers for select
  using (true);

create policy if not exists membership_tiers_admin_all
  on public.membership_tiers for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Memberships RLS
-- ----------------------------------------------------------------------------
create policy if not exists memberships_own_read
  on public.memberships for select
  using (auth.uid() = user_id);

create policy if not exists memberships_admin_all
  on public.memberships for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists memberships_own_insert
  on public.memberships for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Membership Applications RLS
-- ----------------------------------------------------------------------------
create policy if not exists membership_apps_own_read
  on public.membership_applications for select
  using (auth.uid() = user_id);

create policy if not exists membership_apps_admin_all
  on public.membership_applications for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy if not exists membership_apps_own_insert
  on public.membership_applications for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Company News RLS
-- ----------------------------------------------------------------------------
create policy if not exists company_news_public_read
  on public.company_news for select
  using (true);

create policy if not exists company_news_admin_all
  on public.company_news for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Favorites RLS
-- ----------------------------------------------------------------------------
create policy if not exists favorites_own_all
  on public.favorites for all
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- User Preferences RLS
-- ----------------------------------------------------------------------------
create policy if not exists user_preferences_own_all
  on public.user_preferences for all
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Sub Balances RLS
-- ----------------------------------------------------------------------------
create policy if not exists sub_balances_own_read
  on public.sub_balances for select
  using (auth.uid() = user_id);

create policy if not exists sub_balances_admin_all
  on public.sub_balances for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- P2P Listings RLS
-- ----------------------------------------------------------------------------
create policy if not exists p2p_listings_public_read
  on public.p2p_listings for select
  using (status = 'open');

create policy if not exists p2p_listings_own_all
  on public.p2p_listings for all
  using (auth.uid() = seller_id);

create policy if not exists p2p_listings_admin_all
  on public.p2p_listings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all tables that have updated_at
do $$
declare tbl text;
begin
  for tbl in (
    select tablename from pg_tables where schemaname = 'public'
      and tablename in (
        'profiles', 'properties', 'investments', 'transactions',
        'verification_documents', 'audit_logs', 'notifications',
        'payment_config', 'crypto_networks', 'membership_tiers',
        'memberships', 'membership_applications', 'company_news',
        'favorites', 'user_preferences', 'sub_balances', 'p2p_listings'
      )
  ) loop
    execute format(
      'drop trigger if exists update_%I_updated_at on public.%I;',
      tbl, tbl
    );
    execute format(
      'create trigger update_%I_updated_at before update on public.%I for each row execute function public.update_updated_at_column();',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default payment configuration
insert into public.payment_config (id, beneficiary, iban, bic, bank_name, support_email, instructions, routing_number, address, country)
values (
  uuid_generate_v4(),
  'PREDRAG MIRKOVIC',
  'CY05 9020 0001 0000 0201 0908 5462',
  'CARDCY2LXXX',
  'UNLIMIT',
  'info@kretz.site',
  'Include your unique transfer reference in the wire transfer concept and upload your transfer confirmation receipt for immediate verification.',
  'CY059020',
  'LIMASSOL 125 GEORGIOU GRIVA DIGENI',
  'CYPRUS'
) on conflict do nothing;

-- Default crypto network
insert into public.crypto_networks (id, name, token, network, wallet_address, contract_end, contract_address, enabled)
values (
  uuid_generate_v4(),
  'BNB Smart Chain (BEP20)',
  'USDC',
  'BNB Smart Chain (BEP20)',
  '0x8336A3f49125bAD02101B405699ac87e40D473BB',
  '8ac76a',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  true
) on conflict do nothing;

-- Membership tiers
insert into public.membership_tiers (id, name, short_label, description, badge, role, min_investment)
values
  ('atelier', 'Atelier', 'Atelier', 'Private individual investing in tokenized luxury real estate with monthly rental yields.', 'Retail', 'investor', '€1,000'),
  ('sovereign', 'Sovereign', 'Sovereign', 'Qualified high-net-worth investor with priority access to off-market private allocations.', 'HNWI', 'investor', '€50,000'),
  ('patron', 'Patron', 'Patron', 'Institutional investment funds, asset managers, and corporate treasury allocations.', 'Institutional', 'investor', '€250,000'),
  ('black_circle', 'Black Circle', 'Black Circle', 'Companies, LLCs, SARLs, or holding entities deploying treasury capital into asset-backed tokens.', 'Corporate', 'investor', '€25,000'),
  ('heritage', 'Heritage', 'Heritage', 'Multi-family offices & private wealth managers handling institutional client real estate assets.', 'Family Office', 'investor', '€100,000')
on conflict do nothing;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================