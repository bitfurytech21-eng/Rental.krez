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

-- Atomic failure counter prevents concurrent Worker isolates from overwriting lockout increments.
create or replace function public.kretz_admin_record_login_failure(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $
declare v_attempts integer; v_lockout timestamptz;
begin
  if p_identifier is null or length(trim(p_identifier)) = 0 then
    raise exception 'INVALID_LOGIN_IDENTIFIER' using errcode = '22023';
  end if;
  insert into public.kretz_admin_login_attempts(identifier, attempts, lockout_until, updated_at)
  values (p_identifier, 1, null, now())
  on conflict (identifier) do update
    set attempts = case
          when public.kretz_admin_login_attempts.lockout_until is not null
            and public.kretz_admin_login_attempts.lockout_until <= now()
          then 1
          else public.kretz_admin_login_attempts.attempts + 1
        end,
        lockout_until = case
          when (case
            when public.kretz_admin_login_attempts.lockout_until is not null
              and public.kretz_admin_login_attempts.lockout_until <= now()
            then 1
            else public.kretz_admin_login_attempts.attempts + 1
          end) >= 10
          then now() + interval '5 minutes'
          else null
        end,
        updated_at = now()
  returning attempts, lockout_until into v_attempts, v_lockout;
  return jsonb_build_object(
    'attempts', v_attempts,
    'isLocked', v_lockout is not null and v_lockout > now(),
    'remainingSeconds', case when v_lockout is null then null else greatest(0, ceil(extract(epoch from (v_lockout - now())))::integer) end
  );
end;
$;

revoke all on function public.kretz_admin_record_login_failure(text) from public, anon, authenticated;
grant execute on function public.kretz_admin_record_login_failure(text) to service_role;

commit;
