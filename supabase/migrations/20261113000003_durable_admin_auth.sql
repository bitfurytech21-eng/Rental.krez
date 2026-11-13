-- Durable administrator credentials, sessions and login lockouts for Cloudflare Workers.
begin;

create table if not exists public.kretz_admin_credentials (
  id text primary key check (id = 'primary'),
  admin_email text not null,
  full_name text not null,
  password_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.kretz_admin_sessions (
  jti text primary key,
  admin_email text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists kretz_admin_sessions_expiry_idx
  on public.kretz_admin_sessions (expires_at);
create index if not exists kretz_admin_sessions_email_idx
  on public.kretz_admin_sessions (admin_email);

create table if not exists public.kretz_admin_login_attempts (
  identifier text primary key,
  attempts integer not null default 0 check (attempts >= 0),
  lockout_until timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.kretz_admin_credentials enable row level security;
alter table public.kretz_admin_sessions enable row level security;
alter table public.kretz_admin_login_attempts enable row level security;

revoke all on public.kretz_admin_credentials from public, anon, authenticated;
revoke all on public.kretz_admin_sessions from public, anon, authenticated;
revoke all on public.kretz_admin_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.kretz_admin_credentials to service_role;
grant select, insert, update, delete on public.kretz_admin_sessions to service_role;
grant select, insert, update, delete on public.kretz_admin_login_attempts to service_role;

commit;
