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
- `TURNSTILE_SECRET_KEY` (if Turnstile is enabled)

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

The browser's configured production customer-authentication path uses Supabase Auth access tokens. This optional store applies only to the API's legacy `kz_sess_*` cookie-session path (used when the frontend is not configured for Supabase Auth); it does not replace Supabase Auth or migrate legacy `mockUsers` customer records. It stores those legacy sessions in Supabase instead of Worker memory.

1. Apply `supabase/migrations/20261113000002_durable_server_sessions.sql` to the production Supabase project.
2. Confirm the API Worker has the encrypted `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets configured. Never expose the service-role key as a `VITE_*` variable.
3. Set the Worker variable `AUTH_SESSION_STORE=supabase` and redeploy the API Worker.
4. Test the legacy cookie-session path in an isolated staging environment: session creation, validation, logout, and password-reset revocation across separate Worker requests. Test the primary Supabase Auth frontend flow separately.

Do not set `AUTH_SESSION_STORE=supabase` before the migration is applied and the service-role secret is verified. The default remains the existing in-memory store until the operator explicitly enables the persistent store. This migration does not migrate customer account records or the administrator credential file; those are separate remaining authentication tasks.


## Supabase Auth registration flow

When the frontend is configured with Supabase Auth, the browser's Supabase sign-up is the account-creation authority. The frontend must not submit the same credentials a second time to the legacy `/auth/register` endpoint. If Supabase requires email confirmation, the UI must remain unauthenticated until a real Supabase session is issued; never substitute a locally fabricated `sess_*` token.


## Durable administrator authentication

Apply `supabase/migrations/20261113000003_durable_admin_auth.sql` before deploying the API Worker changes. The migration creates private tables for the single administrator credential record, signed-session revocation/expiry, and persistent login lockouts. Browser roles cannot read or write these tables; only the Worker service-role client has grants.

Production requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, and a valid bcrypt `ADMIN_PASSWORD_HASH` for the initial administrator credential. The configured administrator email must already map to an authorized row in `user_roles`. After the first successful login, the Admin Security Console can store rotated credentials in Supabase. Logout and credential rotation revoke sessions in the database across Worker isolates. Do not set `ADMIN_PASSWORD` in production.

The migration does not seed an administrator password or grant an administrator role. Provision the administrator identity and role through the existing trusted Supabase Auth/user_roles process before attempting production login. Do not copy a password or service-role key into source control.
