-- Durable server-authoritative sessions for the Cloudflare Worker API.
-- Enable with AUTH_SESSION_STORE=supabase only after applying this migration.
begin;

create table if not exists public.kretz_server_sessions (
  id text primary key,
  user_id text not null,
  email text not null,
  role text not null check (role in ('investor','admin','super_admin','finance_admin','operations_admin','support','auditor')),
  full_name text not null,
  csrf_token text not null,
  created_at_ms bigint not null,
  last_activity_at_ms bigint not null,
  expires_at_ms bigint not null,
  idle_timeout_ms bigint not null,
  ip text not null default '',
  user_agent text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists kretz_server_sessions_user_id_idx
  on public.kretz_server_sessions (user_id);
create index if not exists kretz_server_sessions_expiry_idx
  on public.kretz_server_sessions (expires_at_ms);

alter table public.kretz_server_sessions enable row level security;
revoke all on table public.kretz_server_sessions from anon, authenticated;
grant select, insert, update, delete on table public.kretz_server_sessions to service_role;

commit;
