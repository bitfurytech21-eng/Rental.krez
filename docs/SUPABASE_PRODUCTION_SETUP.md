# Supabase production setup

This branch adds a Supabase-backed persistence adapter for investor profiles, roles, property offerings, investments, wallet balances, payment transactions, ledger entries, approvals, audit logs, notifications, watchlists and user preferences.

## 1. Apply the database migrations

In the Supabase Dashboard, open **SQL Editor** and apply the migrations in the correct order.

- If the existing enterprise schema has not been installed yet, apply `supabase/migrations/20261018000000_enterprise_financial_schema.sql` first.
- Apply `supabase/migrations/20261113000000_durable_financial_operations.sql` after the enterprise schema.
- The file `supabase/migrations/20261018_admin_security_schema.sql` is a compatibility hardening script. It no longer creates a second `profiles` table or grants administrator access based on email domains. If you previously ran the old version of that script, run the updated version after the enterprise schema to restore the read-only compatibility view safely.

The new financial migration:
- Adds an immutable ledger table and account/profile fields.
- Restricts browser updates to non-financial profile fields.
- Creates atomic database functions for deposits, withdrawals, investment purchases, admin reviews, KYC decisions, account suspension and wallet adjustments.
- Seeds the three existing featured property offerings with `ON CONFLICT DO NOTHING`, so existing operator-managed property records are not overwritten.

Do not manually insert wallet balances or mark deposits as completed to test the workflow. Use the application flow and an authorized finance administrator.

## 2. Configure environment variables

Set these in the API server's secret/environment settings:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NODE_ENV=production
```

Set these for the Vite browser build:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_API_BASE_URL=/api/v1
```

**Never** prefix the service-role key with `VITE_`, add it to frontend code, commit it to GitHub, or share it in chat. The service-role key bypasses Row Level Security and must exist only in the trusted API server environment.

## 3. Provision administrator roles

New Supabase signups are always provisioned as `investor`. Administrator roles are not assigned by email address, email domain, or editable user metadata.

After verifying an administrator's identity through your approved onboarding process, a current super administrator must grant the required role in `public.user_roles`. Use least privilege:
- `finance_admin` for payment queues and wallet adjustments.
- `operations_admin` for property management and KYC/account-status operations.
- `super_admin` for full platform administration.

Do not grant `super_admin` as a convenience or to ordinary investor accounts.

## 4. Deploy and verify

Deploy the `production-hardening` branch to a staging/preview environment first. After the migration and environment variables are installed, verify:

- `/api/health`
- `/api/v1/admin/database/health` using a provisioned admin session
- Investor registration and sign-in
- Property catalogue and property detail pages
- Deposit request -> finance approval -> wallet credit
- Withdrawal request -> wallet reservation -> approval or refund
- Token purchase -> investment record -> ledger entry
- Investor portfolio, transaction history and account statement
- Admin user registry, KYC/status actions, audit history and property editing

The application returns a service-unavailable response for production financial/account routes when persistent database credentials are missing. It must not silently fall back to in-memory demo records.

## 5. Important operational limits

- The application code and migration are prepared, but this repository change does not apply the migration to your Supabase project or configure your hosting secrets.
- Payment approval records a completed/rejected state in the platform ledger; it does not send an actual SEPA payout. Actual payouts require a regulated payment provider integration and reconciliation.
- Multi-currency conversion remains a separate integration task. Do not treat the local FX display rates as a live executable market quote.
- Run the staging verification checklist before merging to `main` or enabling real investor funds.
