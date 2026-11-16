-- Granular Staff RBAC on profiles (`is_admin`, `staff_role`) and database-enforced RLS policies.
begin;

-- 1. Add explicit `is_admin` and `staff_role` columns to `public.user_profiles`
alter table public.user_profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists staff_role text;

alter table public.user_profiles
  drop constraint if exists chk_user_profiles_staff_role;

alter table public.user_profiles
  add constraint chk_user_profiles_staff_role
  check (
    staff_role is null
    or staff_role in ('super_admin', 'finance', 'compliance', 'property_manager', 'support')
  );

create index if not exists idx_user_profiles_is_admin on public.user_profiles(is_admin) where is_admin = true;
create index if not exists idx_user_profiles_staff_role on public.user_profiles(staff_role) where staff_role is not null;

-- 2. Extend `public.user_roles` constraint to accept canonical staff roles alongside legacy roles
alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in (
    'investor',
    'admin',
    'super_admin',
    'finance',
    'compliance',
    'property_manager',
    'support',
    'finance_admin',
    'operations_admin',
    'auditor'
  ));

-- 3. Backfill `is_admin` and `staff_role` on existing `user_profiles` rows from `user_roles`
update public.user_profiles up
set
  is_admin = coalesce(up.is_admin, false) or exists (
    select 1 from public.user_roles ur
    where ur.user_id = up.id and ur.role in ('super_admin', 'admin')
  ),
  staff_role = coalesce(
    up.staff_role,
    (
      select case ur.role
        when 'super_admin' then 'super_admin'
        when 'admin' then 'super_admin'
        when 'finance' then 'finance'
        when 'finance_admin' then 'finance'
        when 'compliance' then 'compliance'
        when 'property_manager' then 'property_manager'
        when 'operations_admin' then 'property_manager'
        when 'support' then 'support'
        else null
      end
      from public.user_roles ur
      where ur.user_id = up.id
        and ur.role in ('super_admin', 'admin', 'finance', 'finance_admin', 'compliance', 'property_manager', 'operations_admin', 'support')
      order by case ur.role
        when 'super_admin' then 1
        when 'admin' then 2
        when 'finance' then 3
        when 'finance_admin' then 4
        when 'compliance' then 5
        when 'property_manager' then 6
        when 'operations_admin' then 7
        when 'support' then 8
        else 99
      end
      limit 1
    )
  );

-- 4. Authoritative helper functions reading both `user_profiles` (`is_admin`, `staff_role`) and `user_roles`
create or replace function public.effective_staff_role(check_user_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select case
    when up.is_admin = true or up.staff_role = 'super_admin' then 'super_admin'
    when up.staff_role in ('finance', 'compliance', 'property_manager', 'support') then up.staff_role
    else (
      select case ur.role
        when 'super_admin' then 'super_admin'
        when 'admin' then 'super_admin'
        when 'finance' then 'finance'
        when 'finance_admin' then 'finance'
        when 'compliance' then 'compliance'
        when 'property_manager' then 'property_manager'
        when 'operations_admin' then 'property_manager'
        when 'support' then 'support'
        else null
      end
      from public.user_roles ur
      where ur.user_id = check_user_id
        and ur.role in ('super_admin', 'admin', 'finance', 'finance_admin', 'compliance', 'property_manager', 'operations_admin', 'support')
      order by case ur.role
        when 'super_admin' then 1
        when 'admin' then 2
        when 'finance' then 3
        when 'finance_admin' then 4
        when 'compliance' then 5
        when 'property_manager' then 6
        when 'operations_admin' then 7
        when 'support' then 8
        else 99
      end
      limit 1
    )
  end
  from public.user_profiles up
  where up.id = check_user_id;
$$;

create or replace function public.is_super_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(public.effective_staff_role(check_user_id) = 'super_admin', false);
$$;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.effective_staff_role(check_user_id) is not null;
$$;

create or replace function public.has_staff_role(check_user_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.is_super_admin(check_user_id)
    or coalesce(public.effective_staff_role(check_user_id) = any(allowed_roles), false);
$$;

create or replace function public.has_role(check_user_id uuid, check_role text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select case check_role
    when 'finance_admin' then public.has_staff_role(check_user_id, array['finance'])
    when 'operations_admin' then public.has_staff_role(check_user_id, array['property_manager'])
    when 'admin' then public.is_admin(check_user_id)
    when 'super_admin' then public.is_super_admin(check_user_id)
    else public.has_staff_role(check_user_id, array[check_role])
  end;
$$;

-- Prevent self-escalation of `is_admin` / `staff_role` from authenticated browser clients
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user <> 'service_role' and pg_catalog.current_setting('role', true) <> 'service_role' then
    if (new.is_admin is distinct from old.is_admin or new.staff_role is distinct from old.staff_role)
       and not public.is_super_admin(auth.uid()) then
      raise exception 'PRIVILEGE_ESCALATION_FORBIDDEN' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on public.user_profiles;
create trigger trg_prevent_profile_privilege_escalation
  before update on public.user_profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- 5. Recreate `public.profiles` compatibility view exposing `is_admin` & `staff_role`
create or replace view public.profiles with (security_invoker = true) as
select
  up.id,
  up.email,
  up.full_name,
  case when public.is_admin(up.id) then 'admin' else 'investor' end as role,
  up.is_admin,
  up.staff_role,
  up.account_type,
  up.wallet_balance,
  up.invested_balance,
  up.kyc_status,
  up.created_at
from public.user_profiles up;

-- 6. Database-Enforced Least-Privilege RLS Policies per Staff Role
-- Investors table / user_profiles & wallets: readable by finance, compliance, support, super_admin; mutable ONLY by super_admin or compliance/finance RPCs (support is read-only)
drop policy if exists "Admins can view all profiles" on public.user_profiles;
create policy "Staff can view investor profiles" on public.user_profiles
  for select using (public.has_staff_role(auth.uid(), array['finance', 'compliance', 'support']));

drop policy if exists "Admins view wallets" on public.wallets;
create policy "Finance and compliance view wallets" on public.wallets
  for select using (public.has_staff_role(auth.uid(), array['finance', 'compliance', 'support']));

-- Properties (`investment_plans`): readable/manageable by super_admin and property_manager (finance can read published/funded offerings)
drop policy if exists "Operations and super admins can manage investment plans" on public.investment_plans;
create policy "Property managers and super admins manage investment plans" on public.investment_plans
  for all using (public.has_staff_role(auth.uid(), array['property_manager']));

-- Investments: readable and issuable by super_admin, finance, and property_manager
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Finance and property managers view investments" on public.investments
  for select using (public.has_staff_role(auth.uid(), array['finance', 'property_manager']));

-- Transactions & Withdrawals (`payment_transactions`, `withdrawal_requests`): finance and super_admin ONLY
drop policy if exists "Admins can view all payment transactions" on public.payment_transactions;
create policy "Finance admins view all payment transactions" on public.payment_transactions
  for select using (public.has_staff_role(auth.uid(), array['finance']));

drop policy if exists "Admins can view all withdrawal requests" on public.withdrawal_requests;
create policy "Finance admins view all withdrawal requests" on public.withdrawal_requests
  for select using (public.has_staff_role(auth.uid(), array['finance']));

-- Manual payment gateways & manual deposits: finance and super_admin ONLY
do $$
begin
  if to_regclass('public.manual_payment_methods') is not null then
    drop policy if exists "Admins manage manual payment methods" on public.manual_payment_methods;
    create policy "Finance and super admins manage manual payment methods" on public.manual_payment_methods
      for all using (public.has_staff_role(auth.uid(), array['finance']));
  end if;
  if to_regclass('public.manual_deposit_submissions') is not null then
    drop policy if exists "Admins manage manual deposit submissions" on public.manual_deposit_submissions;
    create policy "Finance and super admins view manual deposit submissions" on public.manual_deposit_submissions
      for all using (public.has_staff_role(auth.uid(), array['finance']));
  end if;
end $$;

-- KYC Compliance steps: super_admin and compliance ONLY
drop policy if exists "Admins manage all compliance_steps" on public.compliance_steps;
create policy "Compliance and super admins manage compliance_steps" on public.compliance_steps
  for all using (public.has_staff_role(auth.uid(), array['compliance']));

-- Documents: super_admin, compliance, property_manager can manage/view; `support` is strictly READ-ONLY (SELECT only)
drop policy if exists "Admins manage all documents" on public.documents;
create policy "Staff with document scope can view all documents" on public.documents
  for select using (public.has_staff_role(auth.uid(), array['compliance', 'property_manager', 'support']));

create policy "Compliance and property managers can modify documents" on public.documents
  for all using (public.has_staff_role(auth.uid(), array['compliance', 'property_manager']))
  with check (public.has_staff_role(auth.uid(), array['compliance', 'property_manager']));

-- Notifications: compliance and support (plus super_admin)
drop policy if exists "Staff can view and create notifications" on public.notifications;
create policy "Compliance and support manage notifications" on public.notifications
  for select using (public.has_staff_role(auth.uid(), array['compliance', 'support']));

create policy "Compliance and support send notifications" on public.notifications
  for insert with check (public.has_staff_role(auth.uid(), array['compliance', 'support']));

-- Audit logs, approval records & roles: strictly super_admin (`is_admin`) ONLY
drop policy if exists "Only auditors and administrators can view audit logs" on public.audit_logs;
create policy "Only super_admins can view audit logs" on public.audit_logs
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "Admins can view approval records" on public.approval_records;
create policy "Finance and super_admins can view approval records" on public.approval_records
  for select using (public.has_staff_role(auth.uid(), array['finance']));

drop policy if exists "Admins can view all user roles" on public.user_roles;
create policy "Only super_admins view all user roles" on public.user_roles
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "Only super_admins can modify roles" on public.user_roles;
create policy "Only super_admins can modify roles" on public.user_roles
  for all using (public.is_super_admin(auth.uid()));

-- 7. Tighten security-definer admin RPCs so database rejects unauthorized staff roles
create or replace function public.kretz_admin_set_user_status(
  p_user_id uuid, p_admin_id uuid, p_status text, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_profile public.user_profiles; v_admin_email text; v_admin_role text;
begin
  if not public.has_staff_role(p_admin_id, array['finance', 'compliance']) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_status not in ('active','suspended') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;
  if p_user_id = p_admin_id and p_status = 'suspended' then raise exception 'SELF_SUSPENSION_FORBIDDEN' using errcode = '42501'; end if;
  select email into v_admin_email from public.user_profiles where id = p_admin_id;
  v_admin_role := coalesce(public.effective_staff_role(p_admin_id), 'super_admin');
  update public.user_profiles set account_status = p_status,
    suspended_reason = case when p_status = 'suspended' then coalesce(nullif(trim(p_reason),''),'Administrative compliance suspension') else null end,
    updated_at = now()
    where id = p_user_id returning * into v_profile;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  values (p_admin_id,coalesce(v_admin_email,''),v_admin_role,
    case when p_status = 'suspended' then 'USER_SUSPENDED' else 'USER_ACTIVATED' end,
    'user',p_user_id::text,coalesce(p_reason,''));
  return jsonb_build_object('id',v_profile.id,'email',v_profile.email,'fullName',v_profile.full_name,
    'status',v_profile.account_status,'suspendedReason',v_profile.suspended_reason);
end;
$$;

create or replace function public.kretz_admin_update_kyc(
  p_user_id uuid, p_admin_id uuid, p_kyc_status text, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_profile public.user_profiles; v_admin_email text; v_admin_role text;
begin
  if not public.has_staff_role(p_admin_id, array['compliance']) then
    raise exception 'COMPLIANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_kyc_status not in ('unverified','pending','approved','rejected') then raise exception 'INVALID_KYC_STATUS' using errcode = '22023'; end if;
  select email into v_admin_email from public.user_profiles where id = p_admin_id;
  v_admin_role := coalesce(public.effective_staff_role(p_admin_id), 'compliance');
  update public.user_profiles set kyc_status = p_kyc_status,
    kyc_verified_at = case when p_kyc_status = 'approved' then now() else null end,
    kyc_notes = p_notes, updated_at = now()
    where id = p_user_id returning * into v_profile;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  values (p_admin_id,coalesce(v_admin_email,''),v_admin_role,
    'KYC_STATUS_UPDATE','user',p_user_id::text,coalesce(p_notes,'') || ' Status: ' || p_kyc_status);
  return jsonb_build_object('id',v_profile.id,'email',v_profile.email,'fullName',v_profile.full_name,
    'kycStatus',v_profile.kyc_status,'kycNotes',v_profile.kyc_notes,'kycVerifiedAt',v_profile.kyc_verified_at);
end;
$$;

commit;
