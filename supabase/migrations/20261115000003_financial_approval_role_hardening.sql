-- Restrict money-moving approvals to finance administrators and super administrators.
-- Existing RPCs remain atomic (row locks + ledger writes) and service-role only.

begin;

create or replace function public.kretz_review_deposit(
  p_transaction_id text, p_admin_id uuid, p_approve boolean, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.payment_transactions;
  v_profile public.user_profiles;
  v_status text;
  v_approver_role text;
begin
  if not public.has_role(p_admin_id,'finance_admin') then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select role into v_approver_role from public.user_roles
    where user_id = p_admin_id and role in ('finance_admin','super_admin')
    order by case role when 'super_admin' then 1 else 2 end limit 1;
  select * into v_tx from public.payment_transactions
    where id = p_transaction_id and type = 'deposit' for update;
  if not found then raise exception 'DEPOSIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'DEPOSIT_NOT_PENDING' using errcode = '22023'; end if;

  if p_approve then
    update public.user_profiles
      set wallet_balance = wallet_balance + v_tx.amount, updated_at = now()
      where id = v_tx.user_id returning * into v_profile;
    if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
    v_status := 'completed';
    insert into public.ledger_entries
      (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
    values (v_tx.user_id,v_tx.id,'deposit',v_tx.amount,v_tx.currency,v_profile.wallet_balance,
      'Verified deposit ' || v_tx.reference,'deposit:' || v_tx.id);
  else
    v_status := 'rejected';
  end if;

  update public.payment_transactions set status = v_status, processed_at = now(),
    notes = coalesce(p_reason, notes), updated_at = now() where id = v_tx.id returning * into v_tx;
  insert into public.approval_records(entity_type,entity_id,approver_id,approver_role,action,notes)
  values ('deposit',v_tx.id,p_admin_id,v_approver_role,case when p_approve then 'approve' else 'reject' end,p_reason);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  select p_admin_id,email,v_approver_role,case when p_approve then 'DEPOSIT_APPROVED' else 'DEPOSIT_REJECTED' end,
    'deposit',v_tx.id,coalesce(p_reason,'')
    from public.user_profiles where id = p_admin_id;
  return to_jsonb(v_tx);
end;
$$;

create or replace function public.kretz_review_withdrawal(
  p_transaction_id text, p_admin_id uuid, p_approve boolean, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_tx public.payment_transactions;
  v_profile public.user_profiles;
  v_status text;
  v_approver_role text;
begin
  if not public.has_role(p_admin_id,'finance_admin') then
    raise exception 'FINANCE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select role into v_approver_role from public.user_roles
    where user_id = p_admin_id and role in ('finance_admin','super_admin')
    order by case role when 'super_admin' then 1 else 2 end limit 1;
  select * into v_tx from public.payment_transactions
    where id = p_transaction_id and type = 'withdrawal' for update;
  if not found then raise exception 'WITHDRAWAL_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'WITHDRAWAL_NOT_PENDING' using errcode = '22023'; end if;

  if p_approve then
    v_status := 'completed';
  else
    update public.user_profiles
      set wallet_balance = wallet_balance + v_tx.amount, updated_at = now()
      where id = v_tx.user_id returning * into v_profile;
    if not found then raise exception 'ACCOUNT_LEDGER_UNAVAILABLE' using errcode = 'P0002'; end if;
    v_status := 'rejected';
    insert into public.ledger_entries
      (user_id,transaction_id,entry_type,amount,currency,balance_after,description,idempotency_key)
    values (v_tx.user_id,v_tx.id,'refund',v_tx.amount,v_tx.currency,v_profile.wallet_balance,
      'Withdrawal refund ' || v_tx.reference,'withdrawal-refund:' || v_tx.id);
  end if;

  update public.payment_transactions set status = v_status, processed_at = now(),
    notes = coalesce(p_reason, notes), updated_at = now() where id = v_tx.id returning * into v_tx;
  update public.withdrawal_requests set status = v_status,
    rejection_reason = case when p_approve then null else p_reason end
    where id = v_tx.id;
  insert into public.approval_records(entity_type,entity_id,approver_id,approver_role,action,notes)
  values ('withdrawal',v_tx.id,p_admin_id,v_approver_role,case when p_approve then 'approve' else 'reject' end,p_reason);
  insert into public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,details)
  select p_admin_id,email,v_approver_role,case when p_approve then 'WITHDRAWAL_APPROVED' else 'WITHDRAWAL_REJECTED' end,
    'withdrawal',v_tx.id,coalesce(p_reason,'')
    from public.user_profiles where id = p_admin_id;
  return to_jsonb(v_tx);
end;
$$;

revoke all on function public.kretz_review_deposit(text,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.kretz_review_withdrawal(text,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.kretz_review_deposit(text,uuid,boolean,text) to service_role;
grant execute on function public.kretz_review_withdrawal(text,uuid,boolean,text) to service_role;

commit;
