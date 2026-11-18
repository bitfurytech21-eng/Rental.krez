-- Separate bank and USDT payment-gate assignments without changing existing bank assignments.
alter table public.profiles
  add column if not exists usdt_payment_gate_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_usdt_payment_gate_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_usdt_payment_gate_id_fkey
      foreign key (usdt_payment_gate_id)
      references public.manual_payment_methods(id)
      on update cascade on delete restrict;
  end if;
end
$$;

create index if not exists profiles_usdt_payment_gate_id_idx
  on public.profiles (usdt_payment_gate_id);


create or replace function public.assign_gate(p_users uuid[], p_gate uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_method text;
  v_expected integer;
  v_found integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not public.is_staff(null)
     and not exists (
       select 1 from public.user_roles
       where user_id = (select auth.uid())
         and role = any(array['super_admin','finance_admin','operations_admin','finance','compliance','property_manager','support','auditor']::text[])
     ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_users is null or cardinality(p_users) = 0
     or array_position(p_users, null) is not null or p_gate is null then
    raise exception 'INVALID_GATE_ASSIGNMENT' using errcode = '22023';
  end if;
  select case
    when lower(coalesce(m.account_details ->> '__gate_method', 'bank')) in ('sepa','wire','bank_wire') then 'bank'
    else lower(coalesce(m.account_details ->> '__gate_method', 'bank'))
  end into v_method
  from public.manual_payment_methods m
  where m.id = p_gate and m.enabled = true;
  if v_method is null then raise exception 'ACTIVE_GATE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_method not in ('bank','usdt') then raise exception 'INVALID_GATE_METHOD' using errcode = '22023'; end if;
  select count(distinct user_id)::integer into v_expected from unnest(p_users) as input(user_id);
  select count(*)::integer into v_found from public.profiles p
   where p.id = any(p_users) and p.role = 'investor' and p.staff_role is null;
  if v_found <> v_expected then raise exception 'INVESTOR_NOT_FOUND_OR_NOT_ASSIGNABLE' using errcode = 'P0002'; end if;
  if v_method = 'bank' then
    update public.profiles set payment_gate_id = p_gate
     where id = any(p_users) and role = 'investor' and staff_role is null;
  else
    update public.profiles set usdt_payment_gate_id = p_gate
     where id = any(p_users) and role = 'investor' and staff_role is null;
  end if;
  return jsonb_build_object('success',true,'method',v_method,'gate_id',p_gate,'assigned_count',v_expected);
end;
$function$;

create or replace function public.clear_gate(p_users uuid[], p_method text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_expected integer;
  v_found integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not public.is_staff(null)
     and not exists (
       select 1 from public.user_roles
       where user_id = (select auth.uid())
         and role = any(array['super_admin','finance_admin','operations_admin','finance','compliance','property_manager','support','auditor']::text[])
     ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_users is null or cardinality(p_users) = 0
     or array_position(p_users, null) is not null
     or lower(coalesce(p_method,'')) not in ('bank','usdt') then
    raise exception 'INVALID_GATE_CLEAR' using errcode = '22023';
  end if;
  select count(distinct user_id)::integer into v_expected from unnest(p_users) as input(user_id);
  select count(*)::integer into v_found from public.profiles p
   where p.id = any(p_users) and p.role = 'investor' and p.staff_role is null;
  if v_found <> v_expected then raise exception 'INVESTOR_NOT_FOUND_OR_NOT_ASSIGNABLE' using errcode = 'P0002'; end if;
  if lower(p_method) = 'bank' then
    update public.profiles set payment_gate_id = null
     where id = any(p_users) and role = 'investor' and staff_role is null;
  else
    update public.profiles set usdt_payment_gate_id = null
     where id = any(p_users) and role = 'investor' and staff_role is null;
  end if;
  return jsonb_build_object('success',true,'method',lower(p_method),'cleared_count',v_expected);
end;
$function$;

revoke all on function public.assign_gate(uuid[], uuid) from public, anon;
revoke all on function public.clear_gate(uuid[], text) from public, anon;
grant execute on function public.assign_gate(uuid[], uuid) to authenticated, service_role;
grant execute on function public.clear_gate(uuid[], text) to authenticated, service_role;

