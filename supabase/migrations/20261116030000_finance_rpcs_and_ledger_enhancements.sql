-- ============================================================================
-- Finance Module Schema Enhancements & Security-Definer RPCs
-- Implements:
--   - Payment transaction tracking columns: processed_by, processed_by_email,
--     payout_reference, fee_amount, net_amount, dest_iban,
--     reversed_transaction_id, reversal_reason
--   - settings.limits.withdrawal_fee_eur default
--   - RPCs:
--       finance_summary(p_from, p_to, p_admin_id)
--       admin_credit_deposit(p_user_id, p_amount, p_note, p_admin_id)
--       approve_withdrawal(p_withdrawal_id, p_payout_ref, p_fee, p_admin_id)
--       admin_charge_fee(p_user_id, p_amount, p_reason, p_admin_id)
--       admin_adjust(p_user_id, p_delta, p_reason, p_admin_id)
--       reverse_transaction(p_transaction_id, p_reason, p_admin_id)
--   - Updates approve_deposit / reject_deposit / reject_withdrawal to populate processed_by
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Payment transactions audit/settlement & reversal linkage columns
-- ----------------------------------------------------------------------------
alter table public.payment_transactions
  add column if not exists processed_by uuid references public.user_profiles(id),
  add column if not exists processed_by_email text,
  add column if not exists payout_reference text,
  add column if not exists fee_amount numeric(14,2) not null default 0.00,
  add column if not exists net_amount numeric(14,2),
  add column if not exists dest_iban text,
  add column if not exists reversed_transaction_id text references public.payment_transactions(id),
  add column if not exists reversal_reason text;

create index if not exists idx_payment_transactions_reversed_id
  on public.payment_transactions(reversed_transaction_id)
  where reversed_transaction_id is not null;

-- Add default withdrawal fee to existing settings.limits if missing
update public.settings
set value = jsonb_set(coalesce(value, '{}'::jsonb), '{withdrawal_fee_eur}', coalesce(value->'withdrawal_fee_eur', '0'::jsonb), true),
    updated_at = now()
where key = 'limits';

-- ----------------------------------------------------------------------------
-- 2. finance_summary(p_from, p_to, p_admin_id)
-- Returns wallet_liabilities, pending counts/totals, and kind/status totals
-- ----------------------------------------------------------------------------
create or replace function public.finance_summary(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_wallet_liabilities numeric(14,2) := 0.00;
  v_pending_dep_count bigint := 0;
  v_pending_dep_total numeric(14,2) := 0.00;
  v_pending_wth_count bigint := 0;
  v_pending_wth_total numeric(14,2) := 0.00;
  v_by_kind jsonb := '{}'::jsonb;
  v_by_status jsonb := '{}'::jsonb;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(sum(wallet_balance), 0.00)
  into v_wallet_liabilities
  from public.user_profiles
  where is_admin = false and staff_role is null;

  select count(*), coalesce(sum(amount), 0.00)
  into v_pending_dep_count, v_pending_dep_total
  from public.payment_transactions
  where type = 'deposit' and status = 'pending';

  select count(*), coalesce(sum(amount), 0.00)
  into v_pending_wth_count, v_pending_wth_total
  from public.payment_transactions
  where type = 'withdrawal' and status = 'pending';

  select coalesce(
    jsonb_object_agg(
      kind,
      jsonb_build_object('count', cnt, 'total', total_amt)
    ),
    '{}'::jsonb
  )
  into v_by_kind
  from (
    select
      type as kind,
      count(*) as cnt,
      coalesce(sum(amount), 0.00) as total_amt
    from public.payment_transactions
    where (p_from is null or created_at >= p_from)
      and (p_to is null or created_at <= p_to)
    group by type
  ) k;

  select coalesce(
    jsonb_object_agg(
      st,
      jsonb_build_object('count', cnt, 'total', total_amt)
    ),
    '{}'::jsonb
  )
  into v_by_status
  from (
    select
      status as st,
      count(*) as cnt,
      coalesce(sum(amount), 0.00) as total_amt
    from public.payment_transactions
    where (p_from is null or created_at >= p_from)
      and (p_to is null or created_at <= p_to)
    group by status
  ) s;

  return jsonb_build_object(
    'wallet_liabilities', v_wallet_liabilities,
    'pending_deposits_count', v_pending_dep_count,
    'pending_deposits_total', v_pending_dep_total,
    'pending_withdrawals_count', v_pending_wth_count,
    'pending_withdrawals_total', v_pending_wth_total,
    'totals_by_kind', v_by_kind,
    'totals_by_status', v_by_status,
    'from', p_from,
    'to', p_to
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. admin_credit_deposit(p_user_id, p_amount, p_note, p_admin_id)
-- ----------------------------------------------------------------------------
create or replace function public.admin_credit_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_note text default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_credit numeric(14,2);
  v_profile public.user_profiles;
  v_tx public.payment_transactions;
  v_tx_id text := 'dep-man-' || replace(gen_random_uuid()::text, '-', '');
  v_ref text := 'KZ-MAN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  v_credit := round(coalesce(p_amount, 0), 2);
  if v_credit <= 0 then
    raise exception 'INVALID_DEPOSIT_AMOUNT' using errcode = '22023';
  end if;

  update public.user_profiles
  set wallet_balance = wallet_balance + v_credit, updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.payment_transactions (
    id, user_id, type, amount, net_amount, currency, status, payment_method, reference, notes,
    processed_by, processed_by_email, processed_at, metadata
  ) values (
    v_tx_id, p_user_id, 'deposit', v_credit, v_credit, 'EUR', 'completed', 'Manual Finance Credit',
    v_ref, coalesce(nullif(btrim(p_note), ''), 'Manual deposit credited by finance'),
    v_actor, coalesce(v_admin_email, ''), now(),
    jsonb_build_object('manual_credit', true, 'note', coalesce(p_note, ''))
  ) returning * into v_tx;

  insert into public.ledger_entries
    (user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key)
  values
    (p_user_id, v_tx_id, 'deposit', v_credit, 'EUR', v_profile.wallet_balance,
     coalesce(nullif(btrim(p_note), ''), 'Manual deposit ' || v_ref), 'manual-dep:' || v_tx_id);

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'ADMIN_CREDIT_DEPOSIT', 'deposit', v_tx_id,
          'Manual deposit of €' || v_credit::text || ' for ' || v_profile.email || coalesce(' — ' || nullif(btrim(p_note), ''), ''));

  return jsonb_build_object('transaction', to_jsonb(v_tx), 'balance', v_profile.wallet_balance);
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Update approve_deposit / reject_deposit to save processed_by & email
-- ----------------------------------------------------------------------------
create or replace function public.approve_deposit(
  p_deposit_id text,
  p_received_amount numeric default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_tx public.payment_transactions;
  v_profile public.user_profiles;
  v_credit numeric(14,2);
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select * into v_tx from public.payment_transactions
  where id = p_deposit_id and type = 'deposit' for update;
  if not found then raise exception 'DEPOSIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'DEPOSIT_NOT_PENDING' using errcode = '22023'; end if;

  v_credit := round(coalesce(p_received_amount, v_tx.amount), 2);
  if v_credit <= 0 then raise exception 'INVALID_DEPOSIT_AMOUNT' using errcode = '22023'; end if;

  update public.user_profiles
  set wallet_balance = wallet_balance + v_credit, updated_at = now()
  where id = v_tx.user_id returning * into v_profile;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  update public.payment_transactions
  set amount = v_credit,
      net_amount = v_credit,
      status = 'completed',
      processed_by = v_actor,
      processed_by_email = coalesce(v_admin_email, ''),
      processed_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('original_requested_amount', v_tx.amount, 'received_amount', v_credit),
      notes = 'Deposit approved. Amount credited: ' || v_credit::text || ' EUR',
      updated_at = now()
  where id = v_tx.id returning * into v_tx;

  insert into public.ledger_entries
    (user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key)
  values
    (v_tx.user_id, v_tx.id, 'deposit', v_credit, v_tx.currency, v_profile.wallet_balance,
     'Verified deposit ' || v_tx.reference, 'deposit:' || v_tx.id)
  on conflict do nothing;

  insert into public.approval_records(entity_type, entity_id, approver_id, approver_role, action, notes)
  values ('deposit', v_tx.id, v_actor, v_admin_role, 'approve', 'Credited ' || v_credit::text || ' EUR');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DEPOSIT_APPROVED', 'deposit', v_tx.id,
          'Credited ' || v_credit::text || ' EUR (requested ' || v_tx.amount::text || ' EUR)');

  return to_jsonb(v_tx);
end;
$$;

create or replace function public.reject_deposit(
  p_deposit_id text,
  p_reason text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_tx public.payment_transactions;
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_tx from public.payment_transactions
  where id = p_deposit_id and type = 'deposit' for update;
  if not found then raise exception 'DEPOSIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_tx.status <> 'pending' then raise exception 'DEPOSIT_NOT_PENDING' using errcode = '22023'; end if;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  update public.payment_transactions
  set status = 'failed',
      processed_by = v_actor,
      processed_by_email = coalesce(v_admin_email, ''),
      processed_at = now(),
      notes = btrim(p_reason),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('rejection_reason', btrim(p_reason)),
      updated_at = now()
  where id = v_tx.id returning * into v_tx;

  insert into public.approval_records(entity_type, entity_id, approver_id, approver_role, action, notes)
  values ('deposit', v_tx.id, v_actor, v_admin_role, 'reject', btrim(p_reason));

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DEPOSIT_REJECTED', 'deposit', v_tx.id, btrim(p_reason));

  return to_jsonb(v_tx);
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. approve_withdrawal(tx, payout_ref, fee) & reject_withdrawal
-- ----------------------------------------------------------------------------
drop function if exists public.approve_withdrawal(text, uuid);
create or replace function public.approve_withdrawal(
  p_withdrawal_id text,
  p_payout_ref text default null,
  p_fee numeric default 0,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_tx public.payment_transactions;
  v_fee numeric(14,2);
  v_net numeric(14,2);
  v_admin_email text;
  v_admin_role text;
  v_result jsonb;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_payout_ref is null or length(btrim(p_payout_ref)) < 2 then
    raise exception 'PAYOUT_REFERENCE_REQUIRED' using errcode = '22023';
  end if;

  v_fee := round(greatest(coalesce(p_fee, 0), 0), 2);
  v_result := public.kretz_review_withdrawal(
    p_withdrawal_id,
    v_actor,
    true,
    'Paid ref ' || btrim(p_payout_ref) || ' (fee ' || v_fee::text || ' EUR)'
  );

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  select * into v_tx from public.payment_transactions where id = p_withdrawal_id;
  v_net := greatest(round(v_tx.amount - v_fee, 2), 0.00);

  update public.payment_transactions
  set payout_reference = btrim(p_payout_ref),
      fee_amount = v_fee,
      net_amount = v_net,
      processed_by = v_actor,
      processed_by_email = coalesce(v_admin_email, ''),
      processed_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'payout_reference', btrim(p_payout_ref),
        'fee', v_fee,
        'net_send_amount', v_net
      )
  where id = p_withdrawal_id
  returning * into v_tx;

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'WITHDRAWAL_APPROVED', 'withdrawal', p_withdrawal_id,
          'Payout ref ' || btrim(p_payout_ref) || ' · Gross €' || v_tx.amount::text || ' · Fee €' || v_fee::text || ' · Net sent €' || v_net::text);

  return to_jsonb(v_tx);
end;
$$;

create or replace function public.reject_withdrawal(
  p_withdrawal_id text,
  p_reason text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_tx public.payment_transactions;
  v_admin_email text;
  v_result jsonb;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  v_result := public.kretz_review_withdrawal(
    p_withdrawal_id,
    v_actor,
    false,
    btrim(p_reason)
  );

  select email into v_admin_email from public.user_profiles where id = v_actor;

  update public.payment_transactions
  set processed_by = v_actor,
      processed_by_email = coalesce(v_admin_email, ''),
      processed_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('rejection_reason', btrim(p_reason))
  where id = p_withdrawal_id
  returning * into v_tx;

  return coalesce(to_jsonb(v_tx), v_result);
end;
$$;

-- ----------------------------------------------------------------------------
-- 5b. record_investment & pay_distribution with processed_by & integer-cent math
-- ----------------------------------------------------------------------------
create or replace function public.record_investment(
  p_user_id uuid,
  p_property_id text,
  p_shares integer,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_plan public.investment_plans;
  v_profile public.user_profiles;
  v_inv public.investments;
  v_token_cents bigint;
  v_cost_cents bigint;
  v_cost numeric(14,2);
  v_monthly numeric(12,2);
  v_inv_id text := 'inv-' || replace(gen_random_uuid()::text, '-', '');
  v_tx_id text := 'tx-' || replace(gen_random_uuid()::text, '-', '');
  v_ref text := 'KZ-ADM-INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_cert text := 'CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance', 'property_manager']) then
    raise exception 'INVESTMENT_RECORD_FORBIDDEN' using errcode = '42501';
  end if;
  if p_shares is null or p_shares <= 0 then
    raise exception 'INVALID_SHARE_COUNT' using errcode = '22023';
  end if;

  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_plan from public.investment_plans where id = p_property_id for update;
  if not found then raise exception 'PROPERTY_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_shares > v_plan.available_tokens then raise exception 'INSUFFICIENT_AVAILABLE_SHARES' using errcode = '22023'; end if;

  v_token_cents := round(v_plan.token_price * 100)::bigint;
  v_cost_cents := p_shares::bigint * v_token_cents;
  v_cost := (v_cost_cents::numeric / 100.0)::numeric(14,2);
  v_monthly := round(v_cost * (v_plan.monthly_target_rate / 100.0), 2);

  update public.investment_plans
  set available_tokens = available_tokens - p_shares,
      funded_amount = funded_amount + v_cost,
      updated_at = now()
  where id = v_plan.id;

  update public.user_profiles
  set invested_balance = invested_balance + v_cost,
      updated_at = now()
  where id = v_profile.id;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'admin');

  insert into public.investments (
    id, user_id, plan_id, tokens_purchased, token_price, total_amount_invested,
    monthly_target_rate, projected_monthly_income, current_valuation,
    duration_months, status, maturity_date, transaction_hash, certificate_id
  ) values (
    v_inv_id, p_user_id, v_plan.id, p_shares, v_plan.token_price, v_cost,
    v_plan.monthly_target_rate, v_monthly, v_cost,
    v_plan.duration_months, 'active', now() + make_interval(months => v_plan.duration_months),
    v_ref, v_cert
  ) returning * into v_inv;

  insert into public.payment_transactions (
    id, user_id, type, amount, net_amount, currency, status, payment_method, reference, notes,
    processed_by, processed_by_email, processed_at, metadata
  ) values (
    v_tx_id, p_user_id, 'investment', v_cost, v_cost, 'EUR', 'completed', 'Admin allocation',
    v_ref, 'Admin recorded share allocation for ' || v_plan.title,
    v_actor, coalesce(v_admin_email, ''), now(),
    jsonb_build_object('plan_id', v_plan.id, 'investment_id', v_inv_id, 'shares', p_shares, 'recorded_by', v_actor)
  );

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'INVESTMENT_RECORDED', 'investment', v_inv_id,
          'Allocated ' || p_shares::text || ' shares (€' || v_cost::text || ') in ' || v_plan.title || ' to ' || v_profile.email);

  return to_jsonb(v_inv);
end;
$$;

create or replace function public.pay_distribution(
  p_property_id text,
  p_total_amount numeric,
  p_note text default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_plan public.investment_plans;
  v_total_shares bigint := 0;
  v_total_cents bigint := 0;
  v_holder record;
  v_payout_cents bigint;
  v_share_payout numeric(14,2);
  v_distributed_cents bigint := 0;
  v_recipients integer := 0;
  v_payouts jsonb := '[]'::jsonb;
  v_tx_id text;
  v_ref text;
  v_balance numeric(14,2);
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  v_total_cents := round(coalesce(p_total_amount, 0) * 100)::bigint;
  if v_total_cents <= 0 then
    raise exception 'INVALID_DISTRIBUTION_AMOUNT' using errcode = '22023';
  end if;

  select * into v_plan from public.investment_plans where id = p_property_id;
  if not found then raise exception 'PROPERTY_NOT_FOUND' using errcode = 'P0002'; end if;

  select coalesce(sum(tokens_purchased), 0)::bigint into v_total_shares
  from public.investments
  where plan_id = p_property_id and status = 'active';

  if v_total_shares <= 0 then
    raise exception 'NO_ACTIVE_SHAREHOLDERS' using errcode = '22023';
  end if;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  for v_holder in
    with grouped as (
      select user_id, sum(tokens_purchased)::bigint as shares
      from public.investments
      where plan_id = p_property_id and status = 'active'
      group by user_id
    ),
    floors as (
      select
        user_id,
        shares,
        (v_total_cents * shares) / v_total_shares as base_cents,
        (v_total_cents * shares) % v_total_shares as rem
      from grouped
    ),
    rem_budget as (
      select (v_total_cents - coalesce(sum(base_cents), 0))::bigint as extra_cents
      from floors
    ),
    ranked as (
      select
        f.user_id,
        f.shares,
        f.base_cents,
        row_number() over (order by f.rem desc, f.shares desc, f.user_id asc) as rn,
        rb.extra_cents
      from floors f
      cross join rem_budget rb
    )
    select
      user_id,
      shares,
      (base_cents + case when rn <= extra_cents then 1 else 0 end)::bigint as payout_cents
    from ranked
    order by payout_cents desc, user_id asc
  loop
    v_payout_cents := v_holder.payout_cents;
    if v_payout_cents <= 0 then continue; end if;

    v_share_payout := (v_payout_cents::numeric / 100.0)::numeric(14,2);
    v_tx_id := 'div-' || replace(gen_random_uuid()::text, '-', '');
    v_ref := 'KZ-DIV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    update public.user_profiles
    set wallet_balance = wallet_balance + v_share_payout,
        total_dividends_earned = total_dividends_earned + v_share_payout,
        updated_at = now()
    where id = v_holder.user_id
    returning wallet_balance into v_balance;

    update public.investments
    set total_dividends_received = total_dividends_received + round((v_share_payout * tokens_purchased) / v_holder.shares, 2)
    where plan_id = p_property_id and user_id = v_holder.user_id and status = 'active';

    insert into public.payment_transactions (
      id, user_id, type, amount, net_amount, currency, status, payment_method, reference, notes,
      processed_by, processed_by_email, processed_at, metadata
    ) values (
      v_tx_id, v_holder.user_id, 'dividend', v_share_payout, v_share_payout, 'EUR', 'completed', 'Property yield distribution',
      v_ref, coalesce(nullif(btrim(p_note), ''), 'Distribution for ' || v_plan.title),
      v_actor, coalesce(v_admin_email, ''), now(),
      jsonb_build_object('plan_id', p_property_id, 'shares', v_holder.shares, 'total_shares', v_total_shares, 'payout_cents', v_payout_cents, 'note', coalesce(p_note, ''))
    );

    insert into public.ledger_entries (
      user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key
    ) values (
      v_holder.user_id, v_tx_id, 'dividend', v_share_payout, 'EUR', v_balance,
      'Distribution from ' || v_plan.title, 'dividend:' || v_tx_id
    );

    v_recipients := v_recipients + 1;
    v_distributed_cents := v_distributed_cents + v_payout_cents;
    v_payouts := v_payouts || jsonb_build_object(
      'user_id', v_holder.user_id,
      'shares', v_holder.shares,
      'amount', v_share_payout,
      'amount_cents', v_payout_cents
    );
  end loop;

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DISTRIBUTION_PAID', 'property', p_property_id,
          'Distributed €' || ((v_distributed_cents::numeric / 100.0)::numeric(14,2))::text || ' across ' || v_recipients::text || ' investors for ' || v_plan.title);

  return jsonb_build_object(
    'property_id', p_property_id,
    'recipients_paid', v_recipients,
    'total_amount', (v_distributed_cents::numeric / 100.0)::numeric(14,2),
    'total_amount_cents', v_distributed_cents,
    'payouts', v_payouts
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. admin_charge_fee(p_user_id, p_amount, p_reason, p_admin_id)
-- ----------------------------------------------------------------------------
create or replace function public.admin_charge_fee(
  p_user_id uuid,
  p_amount numeric,
  p_reason text default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_fee numeric(14,2);
  v_profile public.user_profiles;
  v_tx public.payment_transactions;
  v_tx_id text := 'fee-' || replace(gen_random_uuid()::text, '-', '');
  v_ref text := 'KZ-FEE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  v_fee := round(coalesce(p_amount, 0), 2);
  if v_fee <= 0 then
    raise exception 'INVALID_FEE_AMOUNT' using errcode = '22023';
  end if;

  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_profile.wallet_balance < v_fee then
    raise exception 'INSUFFICIENT_WALLET_BALANCE' using errcode = '22023';
  end if;

  update public.user_profiles
  set wallet_balance = wallet_balance - v_fee, updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.payment_transactions (
    id, user_id, type, amount, fee_amount, net_amount, currency, status, payment_method, reference, notes,
    processed_by, processed_by_email, processed_at, metadata
  ) values (
    v_tx_id, p_user_id, 'fee', v_fee, v_fee, 0, 'EUR', 'completed', 'Platform Fee Assessment',
    v_ref, coalesce(nullif(btrim(p_reason), ''), 'Administrative fee charge'),
    v_actor, coalesce(v_admin_email, ''), now(),
    jsonb_build_object('fee_reason', coalesce(p_reason, ''))
  ) returning * into v_tx;

  insert into public.ledger_entries
    (user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key)
  values
    (p_user_id, v_tx_id, 'fee', -v_fee, 'EUR', v_profile.wallet_balance,
     coalesce(nullif(btrim(p_reason), ''), 'Platform fee ' || v_ref), 'fee:' || v_tx_id);

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'ADMIN_CHARGE_FEE', 'user', p_user_id::text,
          'Charged fee €' || v_fee::text || coalesce(' — ' || nullif(btrim(p_reason), ''), ''));

  return jsonb_build_object('transaction', to_jsonb(v_tx), 'balance', v_profile.wallet_balance);
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. admin_adjust(p_user_id, p_delta, p_reason, p_admin_id)
-- ----------------------------------------------------------------------------
create or replace function public.admin_adjust(
  p_user_id uuid,
  p_delta numeric,
  p_reason text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_delta numeric(14,2);
  v_profile public.user_profiles;
  v_tx public.payment_transactions;
  v_tx_id text := 'adj-' || replace(gen_random_uuid()::text, '-', '');
  v_ref text := 'KZ-ADJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  v_delta := round(coalesce(p_delta, 0), 2);
  if v_delta = 0 then
    raise exception 'INVALID_ADJUSTMENT_DELTA' using errcode = '22023';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'ADJUSTMENT_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_profile from public.user_profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_profile.wallet_balance + v_delta < 0 then
    raise exception 'INSUFFICIENT_WALLET_BALANCE' using errcode = '22023';
  end if;

  update public.user_profiles
  set wallet_balance = wallet_balance + v_delta, updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.payment_transactions (
    id, user_id, type, amount, net_amount, currency, status, payment_method, reference, notes,
    processed_by, processed_by_email, processed_at, metadata
  ) values (
    v_tx_id, p_user_id, 'adjustment', abs(v_delta), v_delta, 'EUR', 'completed',
    case when v_delta > 0 then 'Balance Adjustment (Credit)' else 'Balance Adjustment (Debit)' end,
    v_ref, btrim(p_reason),
    v_actor, coalesce(v_admin_email, ''), now(),
    jsonb_build_object('delta', v_delta, 'direction', case when v_delta > 0 then 'credit' else 'debit' end, 'reason', btrim(p_reason))
  ) returning * into v_tx;

  insert into public.ledger_entries
    (user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key)
  values
    (p_user_id, v_tx_id, 'adjustment', v_delta, 'EUR', v_profile.wallet_balance, btrim(p_reason), 'adj:' || v_tx_id);

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'ADMIN_ADJUST_BALANCE', 'user', p_user_id::text,
          'Adjusted wallet by ' || v_delta::text || ' EUR — ' || btrim(p_reason));

  return jsonb_build_object('transaction', to_jsonb(v_tx), 'balance', v_profile.wallet_balance);
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. reverse_transaction(p_transaction_id, p_reason, p_admin_id)
-- ----------------------------------------------------------------------------
create or replace function public.reverse_transaction(
  p_transaction_id text,
  p_reason text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_orig public.payment_transactions;
  v_rev public.payment_transactions;
  v_profile public.user_profiles;
  v_wallet_delta numeric(14,2) := 0.00;
  v_rev_id text := 'rev-' || replace(gen_random_uuid()::text, '-', '');
  v_ref text := 'KZ-REV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_admin_email text;
  v_admin_role text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'REVERSAL_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_orig from public.payment_transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_orig.status <> 'completed' then
    raise exception 'ONLY_COMPLETED_TRANSACTIONS_REVERSIBLE' using errcode = '22023';
  end if;
  if v_orig.type = 'reversal' then
    raise exception 'CANNOT_REVERSE_A_REVERSAL' using errcode = '22023';
  end if;
  if exists (select 1 from public.payment_transactions where reversed_transaction_id = v_orig.id) then
    raise exception 'TRANSACTION_ALREADY_REVERSED' using errcode = '22023';
  end if;

  if v_orig.type in ('deposit', 'dividend', 'distribution', 'payout') then
    v_wallet_delta := -v_orig.amount;
  elsif v_orig.type in ('withdrawal', 'fee', 'investment', 'purchase') then
    v_wallet_delta := v_orig.amount;
  elsif v_orig.type = 'adjustment' then
    v_wallet_delta := -coalesce((v_orig.metadata->>'delta')::numeric, v_orig.amount);
  end if;

  select * into v_profile from public.user_profiles where id = v_orig.user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_profile.wallet_balance + v_wallet_delta < 0 then
    raise exception 'INSUFFICIENT_WALLET_FOR_REVERSAL' using errcode = '22023';
  end if;

  update public.user_profiles
  set wallet_balance = wallet_balance + v_wallet_delta, updated_at = now()
  where id = v_orig.user_id
  returning * into v_profile;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.payment_transactions (
    id, user_id, type, amount, net_amount, currency, status, payment_method, reference, notes,
    reversed_transaction_id, reversal_reason, processed_by, processed_by_email, processed_at, metadata
  ) values (
    v_rev_id, v_orig.user_id, 'reversal', v_orig.amount, v_wallet_delta, coalesce(v_orig.currency, 'EUR'),
    'completed', 'Transaction Reversal', v_ref, btrim(p_reason),
    v_orig.id, btrim(p_reason), v_actor, coalesce(v_admin_email, ''), now(),
    jsonb_build_object('reversal_of_id', v_orig.id, 'reversal_of_reference', v_orig.reference, 'wallet_delta', v_wallet_delta)
  ) returning * into v_rev;

  update public.payment_transactions
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('reversed_by_id', v_rev_id, 'reversed_by_reference', v_ref, 'reversal_reason', btrim(p_reason)),
      updated_at = now()
  where id = v_orig.id;

  insert into public.ledger_entries
    (user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key)
  values
    (v_orig.user_id, v_rev_id, 'reversal', v_wallet_delta, coalesce(v_orig.currency, 'EUR'), v_profile.wallet_balance,
     'Reversal of ' || v_orig.reference || ': ' || btrim(p_reason), 'rev:' || v_orig.id);

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'REVERSE_TRANSACTION', 'transaction', v_orig.id,
          'Reversed ' || v_orig.reference || ' via ' || v_ref || ' — ' || btrim(p_reason));

  return jsonb_build_object('reversal', to_jsonb(v_rev), 'original_id', v_orig.id, 'balance', v_profile.wallet_balance);
end;
$$;

revoke all on function public.finance_summary(timestamptz, timestamptz, uuid) from public, anon;
revoke all on function public.admin_credit_deposit(uuid, numeric, text, uuid) from public, anon;
revoke all on function public.approve_withdrawal(text, text, numeric, uuid) from public, anon;
revoke all on function public.reject_withdrawal(text, text, uuid) from public, anon;
revoke all on function public.record_investment(uuid, text, integer, uuid) from public, anon;
revoke all on function public.pay_distribution(text, numeric, text, uuid) from public, anon;
revoke all on function public.admin_charge_fee(uuid, numeric, text, uuid) from public, anon;
revoke all on function public.admin_adjust(uuid, numeric, text, uuid) from public, anon;
revoke all on function public.reverse_transaction(text, text, uuid) from public, anon;

grant execute on function public.finance_summary(timestamptz, timestamptz, uuid) to authenticated, service_role;
grant execute on function public.admin_credit_deposit(uuid, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.approve_withdrawal(text, text, numeric, uuid) to authenticated, service_role;
grant execute on function public.reject_withdrawal(text, text, uuid) to authenticated, service_role;
grant execute on function public.record_investment(uuid, text, integer, uuid) to authenticated, service_role;
grant execute on function public.pay_distribution(text, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.admin_charge_fee(uuid, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.admin_adjust(uuid, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.reverse_transaction(text, text, uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. Append-only ledger protection (never delete ledger rows)
-- ----------------------------------------------------------------------------
create or replace function public.prevent_ledger_row_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'LEDGER_DELETION_PROHIBITED: Never delete ledger rows. Mistakes must be fixed only with reverse_transaction or admin_adjust.'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_prevent_payment_transactions_delete on public.payment_transactions;
create trigger trg_prevent_payment_transactions_delete
before delete on public.payment_transactions
for each row execute function public.prevent_ledger_row_delete();

do $$
begin
  if to_regclass('public.ledger_entries') is not null then
    execute 'drop trigger if exists trg_prevent_ledger_entries_delete on public.ledger_entries';
    execute 'create trigger trg_prevent_ledger_entries_delete before delete on public.ledger_entries for each row execute function public.prevent_ledger_row_delete()';
  end if;
end $$;

commit;
