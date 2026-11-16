-- Admin Portal 15-Section Schema Extensions, Private Buckets & Security-Definer RPCs
-- Implements:
--   - Views: wallet_balances, audit_log, updated profiles (with assigned_gate_id & is_admin/staff_role)
--   - Tables/Columns:
--       user_profiles.assigned_gate_id
--       manual_payment_methods: method, detail_rows, active + delete-guard when assigned to investors
--       kyc_submissions + private bucket kyc-documents
--       documents.storage_path + private bucket documents + expanded categories
--       investment_plans: token_price_cents, target_irr, status ('draft','open','closed','funding','funded','active','hidden') + public bucket property-photos
--       notifications: nullable user_id for broadcast notifications
--       settings: 'limits' and 'email_templates' configuration rows (super_admin controlled)
--   - RPCs:
--       admin_stats, assign_gate, set_frozen, review_kyc, approve_deposit, reject_deposit,
--       approve_withdrawal, reject_withdrawal, record_investment, pay_distribution, set_staff_role

begin;

-- ----------------------------------------------------------------------------
-- 1. Payment Gates enhancements on manual_payment_methods + investor gate assignment
-- ----------------------------------------------------------------------------
alter table public.manual_payment_methods
  add column if not exists method text not null default 'sepa',
  add column if not exists detail_rows jsonb not null default '[]'::jsonb,
  add column if not exists active boolean not null default true;

create or replace function public.sync_payment_gate_active_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active is distinct from old.active then
    new.enabled := new.active;
  elsif new.enabled is distinct from old.enabled then
    new.active := new.enabled;
  elsif tg_op = 'INSERT' then
    new.active := coalesce(new.active, new.enabled, true);
    new.enabled := new.active;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_payment_gate_active on public.manual_payment_methods;
create trigger trg_sync_payment_gate_active
  before insert or update on public.manual_payment_methods
  for each row execute function public.sync_payment_gate_active_flag();

alter table public.user_profiles
  add column if not exists assigned_gate_id uuid references public.manual_payment_methods(id) on delete restrict;

create index if not exists idx_user_profiles_assigned_gate_id
  on public.user_profiles(assigned_gate_id)
  where assigned_gate_id is not null;

create or replace function public.prevent_assigned_gate_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.user_profiles where assigned_gate_id = old.id
  ) then
    raise exception 'GATE_IN_USE_DEACTIVATE_ONLY' using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_assigned_gate_delete on public.manual_payment_methods;
create trigger trg_prevent_assigned_gate_delete
  before delete on public.manual_payment_methods
  for each row execute function public.prevent_assigned_gate_delete();

-- ----------------------------------------------------------------------------
-- 2. Compatibility views: wallet_balances, audit_log, profiles
-- ----------------------------------------------------------------------------
create or replace view public.wallet_balances with (security_invoker = true) as
select
  up.id as user_id,
  coalesce(w.currency, 'EUR') as currency,
  coalesce(w.available_balance, up.wallet_balance, 0.00) as available_balance,
  coalesce(w.reserved_balance, 0.00) as reserved_balance,
  coalesce(w.available_balance, up.wallet_balance, 0.00) as balance,
  coalesce(w.updated_at, up.updated_at) as updated_at
from public.user_profiles up
left join public.wallets w on w.user_id = up.id;

grant select on table public.wallet_balances to authenticated;

create or replace view public.audit_log with (security_invoker = true) as
select
  id,
  actor_id,
  actor_email,
  actor_role,
  action,
  entity_type,
  entity_id,
  details,
  ip_address,
  user_agent,
  metadata,
  created_at
from public.audit_logs;

grant select on table public.audit_log to authenticated;

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
  up.account_status,
  up.assigned_gate_id,
  up.created_at
from public.user_profiles up;

grant select on table public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Investment Plans extensions: token_price_cents, target_irr, draft|open|closed
-- ----------------------------------------------------------------------------
alter table public.investment_plans
  add column if not exists token_price_cents bigint,
  add column if not exists target_irr numeric(6,2);

update public.investment_plans
set
  token_price_cents = coalesce(token_price_cents, round(token_price * 100)::bigint),
  target_irr = coalesce(target_irr, nullif((financials->>'totalIrr')::numeric, 0), total_estimated_return);

create or replace function public.sync_investment_plan_price_cents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.token_price_cents is not null and (tg_op = 'INSERT' or new.token_price_cents is distinct from old.token_price_cents) then
    new.token_price := round(new.token_price_cents / 100.0, 2);
  elsif new.token_price is not null then
    new.token_price_cents := round(new.token_price * 100)::bigint;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_investment_plan_price_cents on public.investment_plans;
create trigger trg_sync_investment_plan_price_cents
  before insert or update on public.investment_plans
  for each row execute function public.sync_investment_plan_price_cents();

alter table public.investment_plans
  drop constraint if exists investment_plans_status_check;

alter table public.investment_plans
  add constraint investment_plans_status_check
  check (status in ('draft', 'open', 'closed', 'funding', 'funded', 'active', 'hidden'));

drop policy if exists "Public can view published investment plans" on public.investment_plans;
create policy "Public can view published investment plans" on public.investment_plans
  for select using (status in ('open', 'funding', 'funded', 'active', 'closed') or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Documents storage_path + KYC submissions table + Private & Public Storage Buckets
-- ----------------------------------------------------------------------------
alter table public.documents
  add column if not exists storage_path text;

alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (category in ('kyc_identity', 'proof_of_address', 'accredited_proof', 'statement', 'tax', 'tax_document', 'general'));

create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  category text not null check (category in ('kyc_identity', 'proof_of_address', 'accredited_proof')),
  document_type text not null,
  title text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.user_profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_kyc_submissions_status_user on public.kyc_submissions(status, user_id, created_at desc);

alter table public.kyc_submissions enable row level security;

drop policy if exists "Users view own kyc_submissions" on public.kyc_submissions;
create policy "Users view own kyc_submissions" on public.kyc_submissions
  for select using (auth.uid() = user_id);

drop policy if exists "Users submit own kyc_submissions" on public.kyc_submissions;
create policy "Users submit own kyc_submissions" on public.kyc_submissions
  for insert with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Compliance and super admins manage kyc_submissions" on public.kyc_submissions;
create policy "Compliance and super admins manage kyc_submissions" on public.kyc_submissions
  for all using (public.has_staff_role(auth.uid(), array['compliance']));

grant select, insert on table public.kyc_submissions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 15728640, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('kyc-documents', 'kyc-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('property-photos', 'property-photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 5. Notifications nullable user_id for platform-wide broadcasts
-- ----------------------------------------------------------------------------
alter table public.notifications
  alter column user_id drop not null;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id or user_id is null);

-- ----------------------------------------------------------------------------
-- 6. Settings table (`limits` & `email_templates`, strictly super_admin managed)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Only super_admins can read settings" on public.settings;
create policy "Only super_admins can read settings" on public.settings
  for select using (public.is_super_admin(auth.uid()));

drop policy if exists "Only super_admins can modify settings" on public.settings;
create policy "Only super_admins can modify settings" on public.settings
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

revoke all on table public.settings from anon, authenticated;
grant select, insert, update on table public.settings to authenticated;
grant all on table public.settings to service_role;

insert into public.settings (key, value, description)
values
  (
    'limits',
    jsonb_build_object(
      'minimumDepositEur', 100,
      'minimumWithdrawalEur', 250,
      'minimumInvestmentEur', 1000,
      'dualApprovalThresholdEur', 50000,
      'kycAutoApproveLimitEur', 10000,
      'platformFeePercent', 0.25,
      'maintenanceMode', false
    ),
    'Platform transaction limits, approval thresholds, and maintenance flags'
  ),
  (
    'email_templates',
    jsonb_build_object(
      'deposit_received', jsonb_build_object('subject', 'Deposit Request Received — {{reference}}', 'body', 'Hello {{fullName}}, your deposit request for €{{amount}} ({{reference}}) via {{method}} has been logged and is pending review.'),
      'deposit_confirmed', jsonb_build_object('subject', 'Deposit Credited — €{{amount}}', 'body', 'Hello {{fullName}}, your deposit of €{{amount}} ({{reference}}) has been settled and credited to your Kretz wallet.'),
      'withdrawal_processed', jsonb_build_object('subject', 'Withdrawal Paid — €{{amount}}', 'body', 'Hello {{fullName}}, your withdrawal of €{{amount}} ({{reference}}) has been paid to your verified destination IBAN.'),
      'kyc_approved', jsonb_build_object('subject', 'Identity Verification Approved', 'body', 'Hello {{fullName}}, your KYC dossier has been approved. You now have full access to primary investments and withdrawals.'),
      'kyc_rejected', jsonb_build_object('subject', 'Identity Verification Update Required', 'body', 'Hello {{fullName}}, your KYC submission requires attention: {{reason}}.')
    ),
    'Editable transactional email subjects and bodies'
  )
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 7. Security-Definer Admin RPCs (11 requested operations)
-- ----------------------------------------------------------------------------

-- 7.1 admin_stats()
create or replace function public.admin_stats(p_admin_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_pending_deposits_count bigint := 0;
  v_pending_deposits_total numeric(14,2) := 0.00;
  v_pending_withdrawals_count bigint := 0;
  v_pending_withdrawals_total numeric(14,2) := 0.00;
  v_kyc_queue_count bigint := 0;
  v_investors_count bigint := 0;
  v_total_aum_at_cost numeric(14,2) := 0.00;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance', 'compliance']) then
    raise exception 'ADMIN_STATS_FORBIDDEN' using errcode = '42501';
  end if;

  select count(*), coalesce(sum(amount), 0)
  into v_pending_deposits_count, v_pending_deposits_total
  from public.payment_transactions
  where type = 'deposit' and status = 'pending';

  select count(*), coalesce(sum(amount), 0)
  into v_pending_withdrawals_count, v_pending_withdrawals_total
  from public.payment_transactions
  where type = 'withdrawal' and status = 'pending';

  select count(distinct user_id)
  into v_kyc_queue_count
  from public.kyc_submissions
  where status = 'pending';

  if v_kyc_queue_count = 0 then
    select count(*)
    into v_kyc_queue_count
    from public.user_profiles
    where kyc_status in ('pending', 'unverified')
      and is_admin = false
      and staff_role is null;
  end if;

  select count(*)
  into v_investors_count
  from public.user_profiles
  where is_admin = false and staff_role is null;

  select coalesce(sum(total_amount_invested), 0)
  into v_total_aum_at_cost
  from public.investments
  where status in ('active', 'matured');

  return jsonb_build_object(
    'pending_deposits_count', v_pending_deposits_count,
    'pending_deposits_total', v_pending_deposits_total,
    'pending_withdrawals_count', v_pending_withdrawals_count,
    'pending_withdrawals_total', v_pending_withdrawals_total,
    'kyc_queue_count', v_kyc_queue_count,
    'investors_count', v_investors_count,
    'total_aum_at_cost', v_total_aum_at_cost
  );
end;
$$;

-- 7.2 assign_gate()
create or replace function public.assign_gate(
  p_user_id uuid,
  p_gate_id uuid,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_admin_email text;
  v_admin_role text;
  v_gate_name text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_gate_id is not null then
    select name into v_gate_name from public.manual_payment_methods where id = p_gate_id;
    if not found then raise exception 'GATE_NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  update public.user_profiles
  set assigned_gate_id = p_gate_id, updated_at = now()
  where id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (
    v_actor,
    coalesce(v_admin_email, ''),
    v_admin_role,
    'ASSIGN_PAYMENT_GATE',
    'user',
    p_user_id::text,
    case when p_gate_id is null then 'Cleared assigned payment gate' else 'Assigned payment gate ' || coalesce(v_gate_name, p_gate_id::text) end
  );

  return jsonb_build_object('user_id', p_user_id, 'assigned_gate_id', p_gate_id, 'gate_name', v_gate_name);
end;
$$;

-- 7.3 set_frozen()
create or replace function public.set_frozen(
  p_user_id uuid,
  p_frozen boolean,
  p_reason text default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_status text := case when p_frozen then 'suspended' else 'active' end;
begin
  if v_actor is null then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  return public.kretz_admin_set_user_status(p_user_id, v_actor, v_status, p_reason);
end;
$$;

-- 7.4 review_kyc()
create or replace function public.review_kyc(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_sub public.kyc_submissions;
  v_admin_email text;
  v_admin_role text;
  v_remaining_pending bigint;
  v_any_approved boolean;
  v_next_kyc_status text;
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['compliance']) then
    raise exception 'COMPLIANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_KYC_DECISION' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and (p_reason is null or length(btrim(p_reason)) < 3) then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  update public.kyc_submissions
  set status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
      reviewed_by = v_actor,
      reviewed_at = now()
  where id = p_submission_id and status = 'pending'
  returning * into v_sub;

  if not found then raise exception 'KYC_SUBMISSION_NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.compliance_steps (user_id, step_key, title, status, notes, reviewed_at, updated_at)
  values (
    v_sub.user_id,
    v_sub.category,
    v_sub.title,
    case when p_decision = 'approved' then 'verified' else 'rejected' end,
    case when p_decision = 'rejected' then btrim(p_reason) else 'Verified by compliance' end,
    now(),
    now()
  )
  on conflict (user_id, step_key) do update
    set status = excluded.status,
        notes = excluded.notes,
        reviewed_at = now(),
        updated_at = now();

  select count(*) into v_remaining_pending
  from public.kyc_submissions where user_id = v_sub.user_id and status = 'pending';

  select exists(select 1 from public.kyc_submissions where user_id = v_sub.user_id and status = 'approved')
  into v_any_approved;

  if p_decision = 'rejected' then
    v_next_kyc_status := 'rejected';
  elsif v_remaining_pending = 0 and v_any_approved then
    v_next_kyc_status := 'approved';
  else
    v_next_kyc_status := 'pending';
  end if;

  update public.user_profiles
  set kyc_status = v_next_kyc_status,
      kyc_verified_at = case when v_next_kyc_status = 'approved' then now() else kyc_verified_at end,
      kyc_notes = coalesce(p_reason, kyc_notes),
      updated_at = now()
  where id = v_sub.user_id;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'compliance');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (
    v_actor,
    coalesce(v_admin_email, ''),
    v_admin_role,
    case when p_decision = 'approved' then 'KYC_SUBMISSION_APPROVED' else 'KYC_SUBMISSION_REJECTED' end,
    'kyc_submission',
    p_submission_id::text,
    coalesce(p_reason, 'Approved ' || v_sub.title)
  );

  return to_jsonb(v_sub);
end;
$$;

-- 7.5 approve_deposit() (supports editable received amount)
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

  update public.payment_transactions
  set amount = v_credit,
      status = 'completed',
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

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.approval_records(entity_type, entity_id, approver_id, approver_role, action, notes)
  values ('deposit', v_tx.id, v_actor, v_admin_role, 'approve', 'Credited ' || v_credit::text || ' EUR');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DEPOSIT_APPROVED', 'deposit', v_tx.id,
          'Credited ' || v_credit::text || ' EUR (requested ' || v_tx.amount::text || ' EUR)');

  return to_jsonb(v_tx);
end;
$$;

-- 7.6 reject_deposit() (requires reason)
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

  update public.payment_transactions
  set status = 'failed',
      processed_at = now(),
      notes = btrim(p_reason),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('rejection_reason', btrim(p_reason)),
      updated_at = now()
  where id = v_tx.id returning * into v_tx;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.approval_records(entity_type, entity_id, approver_id, approver_role, action, notes)
  values ('deposit', v_tx.id, v_actor, v_admin_role, 'reject', btrim(p_reason));

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DEPOSIT_REJECTED', 'deposit', v_tx.id, btrim(p_reason));

  return to_jsonb(v_tx);
end;
$$;

-- 7.7 approve_withdrawal()
create or replace function public.approve_withdrawal(
  p_withdrawal_id text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  return public.kretz_review_withdrawal(p_withdrawal_id, v_actor, true, 'Approved and marked as paid');
end;
$$;

-- 7.8 reject_withdrawal()
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
begin
  if v_actor is null or not public.has_staff_role(v_actor, array['finance']) then
    raise exception 'FINANCE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;
  return public.kretz_review_withdrawal(p_withdrawal_id, v_actor, false, btrim(p_reason));
end;
$$;

-- 7.9 record_investment()
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

  v_cost := round(p_shares * v_plan.token_price, 2);
  v_monthly := round(v_cost * (v_plan.monthly_target_rate / 100), 2);

  update public.investment_plans
  set available_tokens = available_tokens - p_shares,
      funded_amount = funded_amount + v_cost,
      updated_at = now()
  where id = v_plan.id;

  update public.user_profiles
  set invested_balance = invested_balance + v_cost,
      updated_at = now()
  where id = v_profile.id;

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
    id, user_id, type, amount, currency, status, payment_method, reference, notes, processed_at, metadata
  ) values (
    v_tx_id, p_user_id, 'investment', v_cost, 'EUR', 'completed', 'Admin allocation',
    v_ref, 'Admin recorded share allocation for ' || v_plan.title, now(),
    jsonb_build_object('plan_id', v_plan.id, 'investment_id', v_inv_id, 'shares', p_shares, 'recorded_by', v_actor)
  );

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'admin');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'INVESTMENT_RECORDED', 'investment', v_inv_id,
          'Allocated ' || p_shares::text || ' shares (€' || v_cost::text || ') in ' || v_plan.title || ' to ' || v_profile.email);

  return to_jsonb(v_inv);
end;
$$;

-- 7.10 pay_distribution()
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
  v_total_shares numeric := 0;
  v_holder record;
  v_share_payout numeric(14,2);
  v_distributed_sum numeric(14,2) := 0;
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
  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'INVALID_DISTRIBUTION_AMOUNT' using errcode = '22023';
  end if;

  select * into v_plan from public.investment_plans where id = p_property_id;
  if not found then raise exception 'PROPERTY_NOT_FOUND' using errcode = 'P0002'; end if;

  select coalesce(sum(tokens_purchased), 0) into v_total_shares
  from public.investments
  where plan_id = p_property_id and status = 'active';

  if v_total_shares <= 0 then
    raise exception 'NO_ACTIVE_SHAREHOLDERS' using errcode = '22023';
  end if;

  for v_holder in
    select user_id, sum(tokens_purchased) as shares
    from public.investments
    where plan_id = p_property_id and status = 'active'
    group by user_id
  loop
    v_share_payout := round((p_total_amount * v_holder.shares) / v_total_shares, 2);
    if v_share_payout <= 0 then continue; end if;

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
      id, user_id, type, amount, currency, status, payment_method, reference, notes, processed_at, metadata
    ) values (
      v_tx_id, v_holder.user_id, 'dividend', v_share_payout, 'EUR', 'completed', 'Property yield distribution',
      v_ref, coalesce(nullif(btrim(p_note), ''), 'Distribution for ' || v_plan.title), now(),
      jsonb_build_object('plan_id', p_property_id, 'shares', v_holder.shares, 'total_shares', v_total_shares, 'note', coalesce(p_note, ''))
    );

    insert into public.ledger_entries (
      user_id, transaction_id, entry_type, amount, currency, balance_after, description, idempotency_key
    ) values (
      v_holder.user_id, v_tx_id, 'dividend', v_share_payout, 'EUR', v_balance,
      'Distribution from ' || v_plan.title, 'dividend:' || v_tx_id
    );

    v_recipients := v_recipients + 1;
    v_distributed_sum := v_distributed_sum + v_share_payout;
    v_payouts := v_payouts || jsonb_build_object('user_id', v_holder.user_id, 'shares', v_holder.shares, 'amount', v_share_payout);
  end loop;

  select email into v_admin_email from public.user_profiles where id = v_actor;
  v_admin_role := coalesce(public.effective_staff_role(v_actor), 'finance');

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), v_admin_role, 'DISTRIBUTION_PAID', 'property', p_property_id,
          'Distributed €' || v_distributed_sum::text || ' across ' || v_recipients::text || ' investors for ' || v_plan.title);

  return jsonb_build_object(
    'property_id', p_property_id,
    'recipients_paid', v_recipients,
    'total_amount', v_distributed_sum,
    'payouts', v_payouts
  );
end;
$$;

-- 7.11 set_staff_role() (super_admin only)
create or replace function public.set_staff_role(
  p_user_id uuid,
  p_staff_role text,
  p_admin_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := coalesce(p_admin_id, auth.uid());
  v_profile public.user_profiles;
  v_admin_email text;
  v_next_role text;
begin
  if v_actor is null or not public.is_super_admin(v_actor) then
    raise exception 'SUPER_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_staff_role is not null and length(btrim(p_staff_role)) > 0 then
    v_next_role := lower(btrim(p_staff_role));
    if v_next_role not in ('super_admin', 'finance', 'compliance', 'property_manager', 'support') then
      raise exception 'INVALID_STAFF_ROLE' using errcode = '22023';
    end if;
  else
    v_next_role := null;
  end if;

  update public.user_profiles
  set staff_role = v_next_role,
      is_admin = (v_next_role = 'super_admin'),
      updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  if not found then raise exception 'USER_NOT_FOUND' using errcode = 'P0002'; end if;

  delete from public.user_roles
  where user_id = p_user_id
    and role in ('admin', 'super_admin', 'finance', 'finance_admin', 'compliance', 'property_manager', 'operations_admin', 'support', 'auditor');

  if v_next_role is not null then
    insert into public.user_roles (user_id, role, granted_by)
    values (p_user_id, v_next_role, v_actor)
    on conflict (user_id, role) do nothing;
  end if;

  select email into v_admin_email from public.user_profiles where id = v_actor;

  insert into public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
  values (v_actor, coalesce(v_admin_email, ''), 'super_admin', 'STAFF_ROLE_UPDATED', 'user', p_user_id::text,
          'Set staff_role to ' || coalesce(v_next_role, 'none'));

  return jsonb_build_object(
    'user_id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'is_admin', v_profile.is_admin,
    'staff_role', v_profile.staff_role
  );
end;
$$;

-- Restrict RPC execution strictly to authenticated/service_role (internal role checks enforce access)
revoke all on function public.admin_stats(uuid) from public, anon;
revoke all on function public.assign_gate(uuid, uuid, uuid) from public, anon;
revoke all on function public.set_frozen(uuid, boolean, text, uuid) from public, anon;
revoke all on function public.review_kyc(uuid, text, text, uuid) from public, anon;
revoke all on function public.approve_deposit(text, numeric, uuid) from public, anon;
revoke all on function public.reject_deposit(text, text, uuid) from public, anon;
revoke all on function public.approve_withdrawal(text, uuid) from public, anon;
revoke all on function public.reject_withdrawal(text, text, uuid) from public, anon;
revoke all on function public.record_investment(uuid, text, integer, uuid) from public, anon;
revoke all on function public.pay_distribution(text, numeric, text, uuid) from public, anon;
revoke all on function public.set_staff_role(uuid, text, uuid) from public, anon;

grant execute on function public.admin_stats(uuid) to authenticated, service_role;
grant execute on function public.assign_gate(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.set_frozen(uuid, boolean, text, uuid) to authenticated, service_role;
grant execute on function public.review_kyc(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.approve_deposit(text, numeric, uuid) to authenticated, service_role;
grant execute on function public.reject_deposit(text, text, uuid) to authenticated, service_role;
grant execute on function public.approve_withdrawal(text, uuid) to authenticated, service_role;
grant execute on function public.reject_withdrawal(text, text, uuid) to authenticated, service_role;
grant execute on function public.record_investment(uuid, text, integer, uuid) to authenticated, service_role;
grant execute on function public.pay_distribution(text, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.set_staff_role(uuid, text, uuid) to authenticated, service_role;

commit;
