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
- `ADMIN_PASSWORD_HASH`
- `TURNSTILE_SECRET_KEY` (if Turnstile is enabled)

The public non-secret settings and CORS allowlist are in `wrangler.api.toml`. Add any production custom frontend domain to `ALLOWED_ORIGINS` before switching traffic.

## Important production gate

Do not attach the API custom domain or route production traffic to this Worker until the Cloudflare runtime checks pass and the persistent-authentication review is complete. The current application still contains process-local session, brute-force and rate-limit stores, plus a filesystem-backed custom-admin credential fallback. Those stores are not durable across Worker isolates/restarts. Supabase-backed authentication and persisted admin credentials must be the production source of truth before relying on those flows at scale.

## Build / deploy commands

From the repository root:

```sh
npx wrangler@4 deploy --dry-run --config wrangler.api.toml
npx wrangler@4 deploy --config wrangler.api.toml
```

Deploy only after setting the required encrypted secrets and completing the production gate above.
