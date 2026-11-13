-- Compatibility hardening for the Kretz enterprise schema.
-- The authoritative profile table is public.user_profiles and authoritative
-- permissions live in public.user_roles. Do not create a second profiles table,
-- and never grant administrator access based on an email address or domain.

begin;

alter table public.user_profiles
  add column if not exists mfa_enabled boolean not null default false;

-- Keep the legacy read-only profiles view aligned with the canonical profile and
-- role tables. This preserves the existing frontend view contract.
create or replace view public.profiles as
select
  up.id,
  up.email,
  up.full_name,
  case when public.is_admin(up.id) then 'admin' else 'investor' end as role,
  up.account_type,
  up.wallet_balance,
  up.invested_balance,
  up.kyc_status,
  up.created_at
from public.user_profiles up;

-- Auth user provisioning is handled by the enterprise migration's
-- public.handle_new_user() trigger, which always creates the least-privilege
-- investor role. Administrative roles must be granted manually by an
-- already-authorized super administrator through public.user_roles.
-- This migration intentionally does not replace that trigger.

commit;
