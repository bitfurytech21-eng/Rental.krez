-- Persistent account controls and audited manual wallet credits.
begin;

alter table public.user_profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','suspended')),
  add column if not exists suspended_reason text;

create or replace function public.kretz_admin_set_user_status(
  p_user_id uuid, p_admin_id uuid, p_status text, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_profile public.user_profiles; v_admin_email text; v_admin_role text;
begin
  if not public.is_admin(p_admin_id) then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_status not in ('active','suspended') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;
  if p_user_id = p_admin_id and p_status = 'suspended' then raise exception 'SELF_SUSPENSION_FORBIDDEN' using errcode = '42501'; end if;
  select email into v_admin_email from public.user_profiles where id = p_admin_id;
  select role into v_admin_role from public.user_roles where user_id = p_admin_id
    order by case role when 'super_admin' then 1 when 'admin' then 2 else 3 end limit 1;
  update public.user_profiles set account_status = p_status,
    suspended_reason = case when p_status = 'suspended' then coalesce(nullif(trim(p_reason),''),'Administrative compliance suspension') else null end,
    updated_at = now()
    where id = p_user_id returning * into v_profile;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  values (p_admin_id,coalesce(v_admin_email,''),coalesce(v_admin_role,'admin'),
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
  if not public.is_admin(p_admin_id) then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_kyc_status not in ('unverified','pending','approved','rejected') then raise exception 'INVALID_KYC_STATUS' using errcode = '22023'; end if;
  select email into v_admin_email from public.user_profiles where id = p_admin_id;
  select role into v_admin_role from public.user_roles where user_id = p_admin_id
    order by case role when 'super_admin' then 1 when 'admin' then 2 else 3 end limit 1;
  update public.user_profiles set kyc_status = p_kyc_status,
    kyc_verified_at = case when p_kyc_status = 'approved' then now() else null end,
    kyc_notes = p_notes, updated_at = now()
    where id = p_user_id returning * into v_profile;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  values (p_admin_id,coalesce(v_admin_email,''),coalesce(v_admin_role,'admin'),
    'KYC_STATUS_UPDATE','user',p_user_id::text,coalesce(p_notes,'') || ' Status: ' || p_kyc_status);
  return jsonb_build_object('id',v_profile.id,'email',v_profile.email,'fullName',v_profile.full_name,
    'kycStatus',v_profile.kyc_status,'kycNotes',v_profile.kyc_notes,'kycVerifiedAt',v_profile.kyc_verified_at);
end;
$$;

create or replace function public.kretz_admin_credit_user(
  p_user_id uuid, p_admin_id uuid, p_amount numeric, p_method text,
  p_reference text, p_notes text default null, p_transaction_id text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_profile public.user_profiles; v_tx public.payment_transactions;
  v_admin_email text; v_admin_role text; v_tx_id text;
begin
  if not public.has_role(p_admin_id,'finance_admin') and not public.has_role(p_admin_id,'admin') then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'INVALID_AMOUNT' using errcode = '22023'; end if;
  if p_reference is null or length(trim(p_reference)) < 4 then raise exception 'INVALID_REFERENCE' using errcode = '22023'; end if;
  select email into v_admin_email from public.user_profiles where id = p_admin_id;
  select role into v_admin_role from public.user_roles where user_id = p_admin_id
    order by case role when 'super_admin' then 1 when 'admin' then 2 else 3 end limit 1;
  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;
  v_tx_id := coalesce(p_transaction_id, p_reference);
  update public.user_profiles set wallet_balance = wallet_balance + p_amount, updated_at = now()
    where id = p_user_id returning * into v_profile;
  insert into public.payment_transactions
    (id,user_id,type,amount,currency,status,payment_method,reference,notes,metadata,processed_at)
  values (v_tx_id,p_user_id,'deposit',p_amount,'EUR','completed',coalesce(nullif(trim(p_method),''),'Direct Wire Received'),
    trim(p_reference),p_notes,jsonb_build_object('admin_manual_credit',true,'admin_id',p_admin_id),now())
  returning * into v_tx;
  insert into public.ledger_entries
    (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
  values (p_user_id,v_tx.id,'adjustment',p_amount,'EUR',v_profile.wallet_balance,
    'Administrator manual wallet credit ' || p_reference,'manual-credit:' || v_tx.id);
  insert into public.approval_records(entity_type,entity_id,approver_id,approver_role,action,notes)
  values ('manual_adjustment',v_tx.id,p_admin_id,coalesce(v_admin_role,'finance_admin'),'approve',p_notes);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  values (p_admin_id,coalesce(v_admin_email,''),coalesce(v_admin_role,'finance_admin'),
    'ADMIN_MANUAL_CREDIT','transaction',v_tx.id,coalesce(p_notes,'') || ' Amount: ' || p_amount::text);
  return jsonb_build_object('transaction',to_jsonb(v_tx),'balance',v_profile.wallet_balance);
end;
$$;

revoke all on function public.kretz_admin_set_user_status(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.kretz_admin_update_kyc(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.kretz_admin_credit_user(uuid,uuid,numeric,text,text,text,text) from public, anon, authenticated;
grant execute on function public.kretz_admin_set_user_status(uuid,uuid,text,text) to service_role;
grant execute on function public.kretz_admin_update_kyc(uuid,uuid,text,text) to service_role;
grant execute on function public.kretz_admin_credit_user(uuid,uuid,numeric,text,text,text,text) to service_role;

commit;
