# Supabase persistence setup

This branch adds a server-side Supabase persistence adapter. Existing investor and administrator screens remain in place; when the server credentials are configured, the API reads and writes the durable records instead of the in-memory development fixtures.

## 1. Configure secrets

Set these in the deployment platform's **server environment** (not in source control):

- `SUPABASE_URL`: the project URL from Supabase Project Settings → API.
- `SUPABASE_ANON_KEY`: the project's anon/publishable key. The API uses it only to verify user access tokens against Supabase Auth.
- `SUPABASE_SERVICE_ROLE_KEY`: the service-role key. This is server-only and must never use a `VITE_` prefix.
- `VITE_SUPABASE_URL`: same project URL, for the browser client.
- `VITE_SUPABASE_ANON_KEY`: anon/publishable key, safe for the browser.

Never commit real keys to GitHub or expose the service-role key in browser code.

## 2. Apply database migrations

From a trusted local development environment with the Supabase CLI installed and authenticated:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Review the SQL migrations in `supabase/migrations/` before applying them to a live project. The new persistence migrations add an append-only ledger, atomic deposit/withdrawal/investment RPCs, account suspension/KYC controls, audited manual wallet credits, and a safe first-time seed for the three existing featured offerings. Existing property rows are not overwritten.

## 3. Verify

After deploying the server with the variables above:

- Sign in using a real Supabase Auth account with a corresponding `user_profiles` row.
- Ensure its authoritative role exists in `user_roles`.
- Open the admin database health endpoint while signed in as an administrator.
- Confirm property listings, profile, portfolio and transaction history load.
- Test a small deposit request (it must remain pending until finance review).
- Test a withdrawal request (funds are reserved immediately; rejection refunds them).
- Test a wallet-funded investment (wallet and property token inventory are updated atomically).
- Confirm admin KYC, suspension and manual credit actions appear in audit logs.

## Important operational notes

- The app intentionally returns a service-unavailable response for production financial writes when the persistent database is not configured; it does not silently fall back to volatile mock balances.
- A deposit is not proof of settlement. Finance must verify cleared funds independently before approval.
- A withdrawal approval marks the request completed in the platform ledger; it does not itself send money through a bank or crypto payout provider.
- This change does not deploy the application or apply database migrations to your Supabase project. Those steps require your project credentials and deployment access.
