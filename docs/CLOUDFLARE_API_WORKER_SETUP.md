# Cloudflare API Worker

The frontend and API are separate Cloudflare deployments:

- Pages frontend: `wrangler.toml` (root configuration)
- API Worker: `wrangler.api.toml` (this configuration), entry point `worker.ts`

The API Worker uses Cloudflare's supported Node HTTP server bridge for Express and keeps the existing route router and middleware. It does not serve the Vite frontend.

## Required Worker secrets

Configure these as encrypted Worker secrets in the Cloudflare dashboard or with Wrangler. Never put secret values in Git:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `SESSION_SECRET`
- `JWT_SECRET` (only if legacy HS256 verification is still required)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (bcrypt hash; production must not use `ADMIN_PASSWORD` plaintext)
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` (if Turnstile is enabled)

The public non-secret settings and CORS allowlist are in `wrangler.api.toml`. Add any production custom frontend domain to `ALLOWED_ORIGINS` before switching traffic.

## Important production gate

Do not attach the API custom domain or route production traffic to this Worker until the Cloudflare runtime checks pass and the persistent-authentication review is complete. Production administrator credentials, sessions, session revocation, and login lockouts are stored in private Supabase tables by `server/persistentAdminAuth.ts`. The local-development-only admin credential cache is not used in production. Apply the administrator-auth migration and configure all required encrypted Worker secrets before enabling the production Worker.

## Build / deploy commands

From the repository root:

```sh
npx wrangler@4 deploy --dry-run --config wrangler.api.toml
npx wrangler@4 deploy --config wrangler.api.toml
```

Deploy only after setting the required encrypted secrets and completing the production gate above.


## Durable API sessions (optional production switch)

The browser's configured production customer-authentication path uses Supabase Auth access tokens. This optional store applies only to the API's legacy `kz_sess_*` cookie-session path. The production browser flow uses Supabase Auth JWTs, and the old API login/register/password-recovery routes now fail closed in production rather than creating Worker-local mock accounts.

1. Apply `supabase/migrations/20261113000002_durable_server_sessions.sql` to the production Supabase project.
2. Confirm the API Worker has the encrypted `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets configured. Never expose the service-role key as a `VITE_*` variable.
3. Set the Worker variable `AUTH_SESSION_STORE=supabase` and redeploy the API Worker.
4. Test the legacy cookie-session path in an isolated staging environment: session creation, validation, logout, and password-reset revocation across separate Worker requests. Test the primary Supabase Auth frontend flow separately.

Do not set `AUTH_SESSION_STORE=supabase` before the migration is applied and the service-role secret is verified. The default remains the existing in-memory store until the operator explicitly enables the persistent store. This migration does not migrate customer account records; customer accounts are owned by Supabase Auth and `user_profiles` as documented below. Administrator credentials are handled separately by `20261113000003_durable_admin_auth.sql`.


## Supabase Auth registration flow

When the frontend is configured with Supabase Auth, the browser's Supabase sign-up is the account-creation authority. The frontend must not submit the same credentials a second time to the legacy `/auth/register` endpoint. If Supabase requires email confirmation, the UI must remain unauthenticated until a real Supabase session is issued; never substitute a locally fabricated `sess_*` token.


## Durable administrator authentication

Apply `supabase/migrations/20261113000003_durable_admin_auth.sql` before deploying the API Worker changes. The migration creates private tables for the single administrator credential record, signed-session revocation/expiry, and persistent login lockouts. Browser roles cannot read or write these tables; only the Worker service-role client has grants.

Production requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, and a valid bcrypt `ADMIN_PASSWORD_HASH` for the initial administrator credential. The configured administrator email must already map to an authorized row in `user_roles`. After the first successful login, the Admin Security Console can store rotated credentials in Supabase. Logout and credential rotation revoke sessions in the database across Worker isolates. Do not set `ADMIN_PASSWORD` in production.

The migration does not seed an administrator password or grant an administrator role. Provision the administrator identity and role through the existing trusted Supabase Auth/user_roles process before attempting production login. Do not copy a password or service-role key into source control. The former `.admin-credentials.json` file is not automatically imported: it was a local filesystem artifact from the previous server runtime and is not available to the Cloudflare Worker. Before switching production traffic, either securely migrate the existing bcrypt credential record into `kretz_admin_credentials` using an authorized server-side process, or configure a known initial `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` fallback and confirm that email is provisioned with an admin role. Do not deploy until the administrator login has been tested in staging.


## Durable customer accounts

The production customer account authority is Supabase Auth (`auth.users`), with the existing `handle_new_user` database trigger provisioning `public.user_profiles` and the least-privilege `investor` role in `public.user_roles`. The production frontend must have these Cloudflare Pages build variables configured:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the supported publishable-key variable used by the app)

The API Worker separately requires encrypted `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets for server-side identity verification and protected database operations. The service-role key must never be exposed to the browser or prefixed with `VITE_`.

The old API endpoints that authenticated or registered against the Worker-local `mockUsers` collection now fail closed in production with `SUPABASE_AUTH_REQUIRED`. This is intentional: configured production clients use Supabase Auth directly, and the Worker must not create a second, non-durable customer-account system. Development-only mock accounts remain available outside production. Profile, investor registry, KYC, suspension, and financial operations use the existing Supabase-backed tables/RPCs when the database is configured.

Before routing production traffic, verify that the existing enterprise schema migration has been applied and that the `on_auth_user_created` trigger exists and provisions both a profile and the investor role. Confirm the Pages build variables are present; otherwise customer registration/login will not be available and the API will correctly reject the legacy fallback.


## Required Supabase migration order and release verification

Apply these repository migrations to the intended Supabase project in ascending order using the Supabase SQL editor or the project's controlled migration pipeline:

1. `20261018000000_enterprise_financial_schema.sql`
2. `20261018000001_real_estate_dossiers_insights.sql`
3. `20261113000000_durable_financial_operations.sql`
4. `20261113000001_persistent_admin_account_controls.sql`
5. `20261113000002_durable_server_sessions.sql` (only if the optional legacy cookie-session store is enabled)
6. `20261113000003_durable_admin_auth.sql`

Do not mark the database stage complete until the Supabase migration history confirms each required migration is applied and staging checks verify: signup provisions exactly one investor profile and role; login and logout work through Supabase Auth; administrator identity resolves only through `user_roles`; admin credential changes revoke prior Worker sessions; and the existing investor/admin dashboard, KYC, and financial RPC flows still work.

After database verification, run the repository CI checks and `npx wrangler@4 deploy --dry-run --config wrangler.api.toml`. Only then deploy the Worker. A successful dry run validates the bundle, not runtime secrets, database connectivity, custom-domain routing, or email delivery; verify those separately in staging before switching production traffic.
