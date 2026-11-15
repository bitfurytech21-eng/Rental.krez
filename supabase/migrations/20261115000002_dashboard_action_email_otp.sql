-- Action-scoped email verification grants for sensitive dashboard operations.
begin;

alter table public.kretz_email_otp_challenges
  add column if not exists user_id uuid null,
  add column if not exists action_scope text not null default '';

create table if not exists public.kretz_email_action_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  action_scope text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  consumed_at timestamptz null
);
create index if not exists kretz_email_action_grants_lookup_idx
  on public.kretz_email_action_grants (user_id, action_scope, expires_at)
  where consumed_at is null;

alter table public.kretz_email_action_grants enable row level security;
revoke all on public.kretz_email_action_grants from public, anon, authenticated;
grant select, insert, update, delete on public.kretz_email_action_grants to service_role;

create or replace function public.kretz_issue_dashboard_action_otp(
  p_email text, p_user_id uuid, p_action_scope text, p_code_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_recent integer;
  v_hourly integer;
  v_id uuid;
begin
  if v_email = '' or p_user_id is null or p_action_scope !~ '^[a-z][a-z0-9_.:-]{2,79}$'
     or p_code_hash is null or length(p_code_hash) <> 64 then
    raise exception 'INVALID_ACTION_OTP_REQUEST' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_action_scope));
  select count(*) into v_recent from public.kretz_email_otp_challenges
    where user_id = p_user_id and purpose = 'dashboard_action'
      and action_scope = p_action_scope and created_at > now() - interval '60 seconds';
  if v_recent > 0 then
    return jsonb_build_object('ok', false, 'reason', 'COOLDOWN', 'retry_after', 60);
  end if;
  select count(*) into v_hourly from public.kretz_email_otp_challenges
    where user_id = p_user_id and purpose = 'dashboard_action'
      and action_scope = p_action_scope and created_at > now() - interval '1 hour';
  if v_hourly >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'RATE_LIMITED', 'retry_after', 3600);
  end if;
  update public.kretz_email_otp_challenges set consumed_at = now()
    where user_id = p_user_id and purpose = 'dashboard_action'
      and action_scope = p_action_scope and consumed_at is null;
  insert into public.kretz_email_otp_challenges(email, user_id, purpose, action_scope, code_hash, expires_at)
    values (v_email, p_user_id, 'dashboard_action', p_action_scope, p_code_hash, now() + interval '5 minutes')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'challenge_id', v_id);
end;
$$;

create or replace function public.kretz_verify_dashboard_action_otp(
  p_email text, p_user_id uuid, p_action_scope text, p_code_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.kretz_email_otp_challenges%rowtype;
  v_grant uuid;
begin
  select * into v_row from public.kretz_email_otp_challenges
    where email = lower(trim(p_email)) and user_id = p_user_id
      and purpose = 'dashboard_action' and action_scope = p_action_scope
      and consumed_at is null
    order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('valid', false, 'reason', 'NOT_FOUND'); end if;
  if v_row.expires_at <= now() then
    update public.kretz_email_otp_challenges set consumed_at = now() where id = v_row.id;
    return jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  end if;
  if v_row.attempts >= 5 then
    update public.kretz_email_otp_challenges set consumed_at = now() where id = v_row.id;
    return jsonb_build_object('valid', false, 'reason', 'LOCKED');
  end if;
  if v_row.code_hash <> p_code_hash then
    update public.kretz_email_otp_challenges set attempts = attempts + 1 where id = v_row.id;
    return jsonb_build_object('valid', false, 'reason', 'INVALID');
  end if;
  update public.kretz_email_otp_challenges set consumed_at = now() where id = v_row.id;
  insert into public.kretz_email_action_grants(user_id, email, action_scope, expires_at)
    values (p_user_id, lower(trim(p_email)), p_action_scope, now() + interval '2 minutes')
    returning id into v_grant;
  return jsonb_build_object('valid', true, 'grant_id', v_grant);
end;
$$;

create or replace function public.kretz_consume_dashboard_action_grant(
  p_grant_id uuid, p_user_id uuid, p_action_scope text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  update public.kretz_email_action_grants
    set consumed_at = now()
    where id = p_grant_id and user_id = p_user_id
      and action_scope = p_action_scope and consumed_at is null
      and expires_at > now();
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.kretz_issue_dashboard_action_otp(text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.kretz_verify_dashboard_action_otp(text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.kretz_consume_dashboard_action_grant(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.kretz_issue_dashboard_action_otp(text,uuid,text,text) to service_role;
grant execute on function public.kretz_verify_dashboard_action_otp(text,uuid,text,text) to service_role;
grant execute on function public.kretz_consume_dashboard_action_grant(uuid,uuid,text) to service_role;

commit;
