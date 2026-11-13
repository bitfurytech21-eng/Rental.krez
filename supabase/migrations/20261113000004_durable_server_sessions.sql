-- Durable server-side sessions for legacy/API session flows.
-- Apply after 20261113000003_durable_admin_auth.sql.

begin;

create table if not exists public.kretz_server_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in (
    'investor', 'admin', 'super_admin', 'finance_admin',
    'operations_admin', 'support', 'auditor'
  )),
  full_name text not null,
  csrf_token text not null,
  created_at_ms bigint not null,
  last_activity_at_ms bigint not null,
  expires_at_ms bigint not null,
  idle_timeout_ms bigint not null,
  ip text,
  user_agent text not null default 'unknown',
  constraint kretz_server_sessions_valid_expiry
    check (expires_at_ms > created_at_ms and idle_timeout_ms > 0)
);

create index if not exists kretz_server_sessions_user_idx
  on public.kretz_server_sessions(user_id);
create index if not exists kretz_server_sessions_expiry_idx
  on public.kretz_server_sessions(expires_at_ms);

alter table public.kretz_server_sessions enable row level security;
revoke all on public.kretz_server_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.kretz_server_sessions to service_role;

comment on table public.kretz_server_sessions is
  'Server-only session store. Never expose session IDs or CSRF tokens through client-side queries.';

commit;
