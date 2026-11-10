-- ============================================================================
-- Kretz Real Estate Platform — Tokenization Schema Migration
-- Migration: 001_tokenization.sql
--
-- Adds tables for SPV token issuance, token holder management, and
-- on-chain/off-chain token transaction tracking.
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TOKEN ISSUANCES (SPV token offerings)
-- ----------------------------------------------------------------------------
create table if not exists public.token_issuances (
  id uuid primary key default uuid_generate_v4(),
  property_id text not null,
  slug text unique not null,
  name text not null,
  ticker text not null,
  blockchain_network text not null default 'Polygon POS',
  token_contract_address text,
  total_supply numeric(18,0) not null check (total_supply > 0),
  price_per_token numeric(14,2) not null check (price_per_token > 0),
  total_target_amount numeric(14,2) not null check (total_target_amount > 0),
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'active', 'sold_out', 'paused', 'closed')),
  estimated_annual_yield numeric(5,2) not null default 0,
  capital_appreciation_yield numeric(5,2) not null default 0,
  duration_months integer not null default 36,
  minimum_investment numeric(14,2) not null default 1000,
  distribution_frequency text not null default 'Monthly',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id) not null
);

-- Index for property lookups
create index if not exists idx_token_issuances_property_id on public.token_issuances(property_id);
create index if not exists idx_token_issuances_slug on public.token_issuances(slug);
create index if not exists idx_token_issuances_status on public.token_issuances(status);

-- ----------------------------------------------------------------------------
-- 2. TOKEN HOLDERS (investor token balances)
-- ----------------------------------------------------------------------------
create table if not exists public.token_holders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuance_id uuid not null references public.token_issuances(id) on delete cascade,
  token_balance numeric(18,0) not null default 0 check (token_balance >= 0),
  invested_amount numeric(14,2) not null default 0 check (invested_amount >= 0),
  first_invested_at timestamptz,
  last_invested_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, issuance_id)
);

-- Index for investor lookups
create index if not exists idx_token_holders_user_id on public.token_holders(user_id);
create index if not exists idx_token_holders_issuance_id on public.token_holders(issuance_id);

-- ----------------------------------------------------------------------------
-- 3. TOKEN TRANSACTIONS (buy/sell/transfer records)
-- ----------------------------------------------------------------------------
create table if not exists public.token_transactions (
  id uuid primary key default uuid_generate_v4(),
  issuance_id uuid not null references public.token_issuances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('purchase', 'sale', 'transfer_in', 'transfer_out', 'distribution')),
  token_amount numeric(18,0) not null check (token_amount > 0),
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'refunded')),
  blockchain_tx_hash text,
  wallet_address text,
  created_at timestamptz default now() not null,
  processed_at timestamptz
);

-- Index for transaction lookups
create index if not exists idx_token_transactions_issuance_id on public.token_transactions(issuance_id);
create index if not exists idx_token_transactions_user_id on public.token_transactions(user_id);
create index if not exists idx_token_transactions_status on public.token_transactions(status);
create index if not exists idx_token_transactions_created_at on public.token_transactions(created_at);

-- ----------------------------------------------------------------------------
-- 4. TOKEN DISTRIBUTIONS (rental yield payouts)
-- ----------------------------------------------------------------------------
create table if not exists public.token_distributions (
  id uuid primary key default uuid_generate_v4(),
  issuance_id uuid not null references public.token_issuances(id) on delete cascade,
  distribution_date date not null,
  amount_per_token numeric(14,6) not null check (amount_per_token >= 0),
  total_distributed numeric(14,2) not null default 0 check (total_distributed >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  created_by uuid references auth.users(id)
);

-- Index for distribution lookups
create index if not exists idx_token_distributions_issuance_id on public.token_distributions(issuance_id);
create index if not exists idx_token_distributions_date on public.token_distributions(distribution_date);
create index if not exists idx_token_distributions_status on public.token_distributions(status);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.token_issuances enable row level security;
alter table public.token_holders enable row level security;
alter table public.token_transactions enable row level security;
alter table public.token_distributions enable row level security;

-- Token issuances: public read, admin write
create policy if not exists token_issuances_public_read
  on public.token_issuances for select
  using (true);

create policy if not exists token_issuances_admin_write
  on public.token_issuances for all
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Token holders: investors can read their own holdings, admins can read all
create policy if not exists token_holders_own_read
  on public.token_holders for select
  using (auth.uid() = user_id);

create policy if not exists token_holders_admin_read
  on public.token_holders for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

create policy if not exists token_holders_admin_write
  on public.token_holders for all
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Token transactions: investors can read their own, admins can read/write all
create policy if not exists token_transactions_own_read
  on public.token_transactions for select
  using (auth.uid() = user_id);

create policy if not exists token_transactions_admin_read
  on public.token_transactions for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

create policy if not exists token_transactions_admin_write
  on public.token_transactions for all
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Token distributions: public read, admin write
create policy if not exists token_distributions_public_read
  on public.token_distributions for select
  using (true);

create policy if not exists token_distributions_admin_write
  on public.token_distributions for all
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
        and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 6. COMMENTS
-- ----------------------------------------------------------------------------
comment on table public.token_issuances is 'SPV token issuance offerings for real estate properties';
comment on table public.token_holders is 'Investor token balances per issuance';
comment on table public.token_transactions is 'Token purchase, sale, and transfer records';
comment on table public.token_distributions is 'Rental yield distribution records per issuance';