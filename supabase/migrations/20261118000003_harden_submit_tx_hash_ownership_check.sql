-- Harden transaction-hash submission: verify the caller owns a pending USDT request
-- before checking whether the supplied hash has already been used.
create or replace function public.submit_tx_hash(
  p_tx uuid,
  p_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_hash text := btrim(coalesce(p_hash, ''));
  v_submission public.manual_deposit_submissions%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;
  if p_tx is null then
    raise exception 'INVALID_DEPOSIT_REFERENCE' using errcode = '22023';
  end if;
  if v_hash !~* '^(0x)?[0-9a-f]{64}$' then
    raise exception 'INVALID_TRANSACTION_HASH' using errcode = '22023';
  end if;

  select * into v_submission
  from public.manual_deposit_submissions d
  where d.id = p_tx
    and d.user_id = v_user_id
    and d.status = 'pending'
    and pg_catalog.lower(d.payment_method) like '%usdt%'
  for update;

  if not found then
    raise exception 'DEPOSIT_NOT_PENDING_OR_NOT_OWNED' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.lower(v_hash), 0)
  );

  if exists (
    select 1 from public.manual_deposit_submissions d
    where d.manual_transaction_id is not null
      and pg_catalog.lower(d.manual_transaction_id) = pg_catalog.lower(v_hash)
  ) then
    raise exception 'TRANSACTION_HASH_ALREADY_USED' using errcode = '23505';
  end if;

  update public.manual_deposit_submissions
  set manual_transaction_id = v_hash,
      updated_at = pg_catalog.now()
  where id = p_tx and user_id = v_user_id and status = 'pending';

  return pg_catalog.jsonb_build_object(
    'id', p_tx,
    'reference', v_submission.reference,
    'status', v_submission.status,
    'transaction_id_submitted', true
  );
end;
$function$;

revoke all on function public.submit_tx_hash(uuid, text) from public, anon;
grant execute on function public.submit_tx_hash(uuid, text) to authenticated;
