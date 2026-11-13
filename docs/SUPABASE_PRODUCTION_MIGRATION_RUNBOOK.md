# Supabase production migration runbook

This runbook is for the Kretz Rental production Supabase project. The migrations in this repository are source-controlled database changes; their presence in GitHub does **not** mean they have been applied to the hosted project.

## Required migration order

Apply every migration in timestamp order. Do not cherry-pick the new auth migrations into a database that is missing the base schema.

1. `20261018000000_enterprise_financial_schema.sql`
2. `20261018000001_real_estate_dossiers_insights.sql`
3. `20261113000000_durable_financial_operations.sql`
4. `20261113000001_persistent_admin_account_controls.sql`
5. `20261113000002_durable_server_sessions.sql`
6. `20261113000003_durable_admin_auth.sql`
7. `20261113000004_customer_auth_profile_metadata.sql`

## Before applying

- Confirm the target Supabase project/ref is the production project, not a preview or staging project.
- Take a database backup / confirm point-in-time recovery is available.
- Confirm the latest production schema has been reconciled with the migrations already applied; do not use `db reset` on production.
- Review the SQL diff in GitHub and ensure the migration history table is consistent.
- Have a tested, authorized administrator account already present in Supabase Auth, `user_profiles`, and `user_roles`. The administrator email must have one of the supported admin roles.
- Set the API Worker encrypted secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, and a valid bcrypt `ADMIN_PASSWORD_HASH`. Do not store secrets in GitHub source or expose the service-role key to Pages.

## Apply with Supabase CLI

Run these commands from a trusted local checkout with the Supabase CLI authenticated. Replace the project ref locally; do not commit it if it is private operational metadata.

```sh
supabase login
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF
supabase migration list
supabase db push --dry-run
```

Review the dry-run output and confirm it includes only the pending migrations listed above. Then, only after backup and review:

```sh
supabase db push
supabase migration list
```

Do not run `supabase db reset` against production.

## Post-migration verification SQL

Run this in the Supabase SQL Editor. It checks that required tables, trigger, RPCs, and row-level security are present. It does not expose credential hashes or session tokens.

```sql
select
  to_regclass('public.user_profiles') is not null as user_profiles_exists,
  to_regclass('public.user_roles') is not null as user_roles_exists,
  to_regclass('public.kretz_server_sessions') is not null as customer_sessions_exists,
  to_regclass('public.kretz_admin_credentials') is not null as admin_credentials_exists,
  to_regclass('public.kretz_admin_sessions') is not null as admin_sessions_exists,
  to_regclass('public.kretz_admin_login_attempts') is not null as admin_lockouts_exists;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'kretz_server_sessions',
    'kretz_admin_credentials',
    'kretz_admin_sessions',
    'kretz_admin_login_attempts'
  )
order by c.relname;

select
  t.tgname,
  (t.tgenabled = 'O') as trigger_enabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'auth'
  and c.relname = 'users'
  and t.tgname = 'on_auth_user_created'
  and not t.tgisinternal;

select
  to_regprocedure('public.kretz_admin_set_user_status(uuid,uuid,text,text)') is not null as admin_status_rpc_exists,
  to_regprocedure('public.kretz_admin_update_kyc(uuid,uuid,text,text)') is not null as admin_kyc_rpc_exists,
  to_regprocedure('public.kretz_admin_credit_user(uuid,uuid,numeric,text,text,text,text)') is not null as admin_credit_rpc_exists,
  to_regprocedure('public.kretz_admin_record_login_failure(text)') is not null as admin_login_lockout_rpc_exists;
```

Expected: all six table checks are true, all four new private auth tables report RLS enabled, the `on_auth_user_created` trigger is present/enabled, and all three admin RPC checks are true.

## Staged application checks

1. Confirm the Supabase Auth sign-up flow creates a row in `auth.users`, a matching `user_profiles` row, and an `investor` role in `user_roles`.
2. Sign in as a test investor and confirm the API resolves the JWT to the same profile and authoritative role.
3. Confirm admin login works only for an email provisioned with an admin role.
4. Rotate the admin password in the security console; verify the old token is rejected and the new token works from a separate Worker request.
5. Log out and verify the admin token is rejected from another Worker request.
6. Verify repeated failed admin logins persist lockout across separate Worker requests/isolates.
7. Verify user registry, profile update, KYC, suspension, wallet credit, deposits, withdrawals, and investment RPCs read/write Supabase records.

Do not enable `AUTH_SESSION_STORE=supabase` unless the legacy `kz_sess_*` customer-cookie path is intentionally used. The configured production browser flow uses Supabase Auth JWTs.

## Rollback

Do not drop auth or financial tables as a first response to a failed deployment. Disable routing to the new Worker / roll back the Worker code, preserve the database for investigation, and use a reviewed forward-fix or a database restore plan. Never delete `auth.users`, `user_profiles`, financial ledger rows, or admin audit records to make a deployment pass.
