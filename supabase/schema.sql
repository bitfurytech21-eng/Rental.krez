/**
 * Kretz Real Estate Platform - Supabase PostgreSQL Database Schema
 * Run this complete script in your Supabase SQL Editor to set up tables, RLS policies, and triggers.
 */

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text default 'investor' check (role in ('investor', 'admin')),
  account_type text default 'individual_investor',
  wallet_balance numeric(12,2) default 0.00 not null,
  invested_balance numeric(12,2) default 0.00 not null,
  kyc_status text default 'pending' check (kyc_status in ('pending', 'verified', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. INVESTMENTS TABLE
create table if not exists public.investments (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id text not null,
  property_title text not null,
  property_location text not null,
  property_image text,
  tokens_purchased integer not null,
  token_price numeric(12,2) not null,
  total_amount_invested numeric(12,2) not null,
  purchased_at text not null,
  estimated_annual_yield numeric(5,2) not null,
  projected_monthly_income numeric(12,2) not null,
  total_dividends_received numeric(12,2) default 0.00 not null,
  status text default 'active' not null,
  transaction_hash text not null,
  certificate_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on investments
alter table public.investments enable row level security;

create policy "Users can view their own investments." on public.investments
  for select using (auth.uid() = user_id);

create policy "Admins can view all investments." on public.investments
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 3. LEDGER TRANSACTIONS TABLE
create table if not exists public.ledger_transactions (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  amount numeric(12,2) not null,
  currency text default 'EUR' not null,
  status text default 'completed' not null,
  description text not null,
  reference text not null,
  created_at text not null,
  payment_method text not null,
  balance_after numeric(12,2) not null,
  tx_hash text not null,
  metadata jsonb,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on ledger_transactions
alter table public.ledger_transactions enable row level security;

create policy "Users can view their own transactions." on public.ledger_transactions
  for select using (auth.uid() = user_id);

create policy "Admins can view all transactions." on public.ledger_transactions
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 4. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, account_type, wallet_balance, invested_balance, kyc_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Valued Investor'),
    coalesce(new.raw_user_meta_data->>'role', 'investor'),
    coalesce(new.raw_user_meta_data->>'account_type', 'individual_investor'),
    0.00,
    0.00,
    'pending'
  );
  return new;
end;
$$;

-- Trigger execution upon insert into auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
