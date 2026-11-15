-- Durable, single-use email OTP challenges for investor and administrator login.
begin;

create table if not exists public.kretz_email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('investor_login', 'admin_login', 'dashboard_action')),
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz null
);
create index if not exists kretz_email_otp_lookup_idx
  on public.kretz_email_otp_challenges (email, purpose, created_at desc);
create index if not exists kretz_email_otp_expiry_idx
  on public.kretz_email_otp_challenges (expires_at);

alter table public.kretz_email_otp_challenges enable row level security;
revoke all on public.kretz_email_otp_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.kretz_email_otp_challenges to service_role;

create or replace function public.kretz_issue_email_otp(
  p_email text, p_purpose text, p_code_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_recent integer;
  v_hourly integer;
  v_id uuid;
begin
  if v_email = '' or p_code_hash is null or length(p_code_hash) <> 64
     or p_purpose not in ('investor_login', 'admin_login', 'dashboard_action') then
    raise exception 'INVALID_OTP_REQUEST' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_email || ':' || p_purpose));
  select count(*) into v_recent from public.kretz_email_otp_challenges
    where email = v_email and purpose = p_purpose and created_at > now() - interval '60 seconds';
  if v_recent > 0 then
    return jsonb_build_object('ok', false, 'reason', 'COOLDOWN', 'retry_after', 60);
  end if;
  select count(*) into v_hourly from public.kretz_email_otp_challenges
    where email = v_email and purpose = p_purpose and created_at > now() - interval '1 hour';
  if v_hourly >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'RATE_LIMITED', 'retry_after', 3600);
  end if;
  update public.kretz_email_otp_challenges
    set consumed_at = now()
    where email = v_email and purpose = p_purpose and consumed_at is null;
  insert into public.kretz_email_otp_challenges(email, purpose, code_hash, expires_at)
    values (v_email, p_purpose, p_code_hash, now() + interval '5 minutes')
    returning id into v_id;
  return jsonb_build_object('ok', true, 'challenge_id', v_id);
end;
$$;

create or replace function public.kretz_verify_email_otp(
  p_email text, p_purpose text, p_code_hash text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.kretz_email_otp_challenges%rowtype;
begin
  select * into v_row from public.kretz_email_otp_challenges
    where email = lower(trim(p_email)) and purpose = p_purpose
      and consumed_at is null
    order by created_at desc limit 1 for update;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'NOT_FOUND');
  end if;
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
  return jsonb_build_object('valid', true);
end;
$$;

create or replace function public.kretz_cancel_email_otp(p_challenge_id uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.kretz_email_otp_challenges set consumed_at = now()
  where id = p_challenge_id and consumed_at is null;
$$;

revoke all on function public.kretz_issue_email_otp(text,text,text) from public, anon, authenticated;
revoke all on function public.kretz_verify_email_otp(text,text,text) from public, anon, authenticated;
revoke all on function public.kretz_cancel_email_otp(uuid) from public, anon, authenticated;
grant execute on function public.kretz_issue_email_otp(text,text,text) to service_role;
grant execute on function public.kretz_verify_email_otp(text,text,text) to service_role;
grant execute on function public.kretz_cancel_email_otp(uuid) to service_role;

commit;
