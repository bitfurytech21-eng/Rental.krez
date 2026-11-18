-- Investor deposit requests use the assigned, active payment gate and the existing manual-deposit approval workflow.
-- Requests are pending only; wallet credit remains exclusively in kretz_review_manual_deposit.
begin;

-- The simplified investor flow does not request sender details or proof at request time.
-- Existing submissions retain their values; these columns are nullable for new requests.
alter table public.manual_deposit_submissions
  alter column manual_transaction_id drop not null,
  alter column sender_name drop not null,
  alter column payment_date drop not null,
  alter column proof_storage_path drop not null;

create or replace function public.request_deposit(
  p_amount numeric,
  p_method text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_bank_gate_id uuid;
  v_usdt_gate_id uuid;
  v_terms_version text;
  v_privacy_version text;
  v_risk_version text;
  v_legal jsonb;
  v_method_id uuid;
  v_method public.manual_payment_methods%rowtype;
  v_method_key text;
  v_reference text;
  v_submission public.manual_deposit_submissions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'INVALID_DEPOSIT_AMOUNT' using errcode = '22023';
  end if;

  v_method_key := lower(btrim(coalesce(p_method, '')));
  if v_method_key not in ('bank', 'usdt') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;

  select payment_gate_id, usdt_payment_gate_id, terms_version, privacy_version, risk_version
    into v_bank_gate_id, v_usdt_gate_id, v_terms_version, v_privacy_version, v_risk_version
  from public.profiles where id = v_user_id;
  if not found then raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002'; end if;

  select value into v_legal from public.settings where key = 'legal';
  if v_legal is null
     or v_terms_version is distinct from v_legal ->> 'terms_version'
     or v_privacy_version is distinct from v_legal ->> 'privacy_version'
     or v_risk_version is distinct from v_legal ->> 'risk_version' then
    raise exception 'LEGAL_CONSENT_REQUIRED' using errcode = '42501';
  end if;

  v_method_id := case when v_method_key = 'bank' then v_bank_gate_id else v_usdt_gate_id end;
  if v_method_id is null then raise exception 'PAYMENT_METHOD_NOT_ASSIGNED' using errcode = '22023'; end if;

  select * into v_method
  from public.manual_payment_methods m
  where m.id = v_method_id
    and m.enabled = true
    and case
      when v_method_key = 'usdt' then lower(coalesce(m.account_details ->> '__gate_method', '')) = 'usdt'
      else lower(coalesce(m.account_details ->> '__gate_method', 'bank')) in ('bank','sepa','wire','bank_wire')
    end
  for share;
  if not found then raise exception 'PAYMENT_METHOD_UNAVAILABLE' using errcode = '22023'; end if;

  if p_amount < v_method.minimum_amount
     or (v_method.maximum_amount is not null and p_amount > v_method.maximum_amount) then
    raise exception 'AMOUNT_OUT_OF_RANGE' using errcode = '22023';
  end if;

  v_reference := 'KZ-DEP-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.manual_deposit_submissions (
    user_id, method_id, amount, currency, status, payment_method, reference,
    manual_transaction_id, sender_name, payment_date, fee_amount, gross_amount,
    extra_values, proof_storage_path
  ) values (
    v_user_id, v_method.id, p_amount, 'EUR', 'pending',
    case when v_method_key = 'bank' then 'Bank transfer (SEPA)' else 'USDT (crypto)' end,
    v_reference, null, null, null, 0, p_amount, '{}'::jsonb, null
  ) returning * into v_submission;

  return jsonb_build_object(
    'id', v_submission.id,
    'reference', v_submission.reference,
    'amount', v_submission.amount,
    'currency', v_submission.currency,
    'payment_method', v_submission.payment_method,
    'status', v_submission.status,
    'created_at', v_submission.created_at
  );
end;
$function$;

revoke all on function public.request_deposit(numeric, text) from public, anon;
grant execute on function public.request_deposit(numeric, text) to authenticated, service_role;

commit;
