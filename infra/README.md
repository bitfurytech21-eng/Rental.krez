# Infra

## Runtime paths (step 1)
- **Cloudflare Workers (incremental):** `apps/api/src/worker.ts` → Hono `hono-routes-core.ts`. Migrated: health, config, blog/team, listings, auth (register/login/logout/session/me), admin login/logout/session, profile, portfolio, wallet balance, transactions/notifications/favorites/preferences compat, treasury read, payments config read, contact/membership/newsletter/turnstile demo handlers. Financial mutations and unmigrated legacy routes return **501** with `NOT_MIGRATED`/guidance.
- **Node/Express fallback (full legacy surface):** `apps/api/server.ts` + `src/routes.ts` + `src/index.ts`. Use for durable ledger/email flows until migrated.

## Bindings/secrets (step 2)
Configured as placeholders in `apps/api/wrangler.toml` + `infra/wrangler.toml`. Set in Cloudflare dashboard/`wrangler secret put`: `DATABASE_URL` (Neon/Postgres) or D1 binding, `CACHE`/`SESSIONS` KV, `ASSETS` R2, `SESSION_SECRET`, `JWT_SECRET`, admin creds, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, email provider secrets, `SENTRY_DSN`. CI/CD uses `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_WEB_PROJECT`, `CF_PAGES_ADMIN_PROJECT`, optional `VITE_API_BASE_URL`/`VITE_WEB_URL`.

## Deploy
- `infra/github-actions/ci.yml`: lint + tests + builds.
- `infra/github-actions/deploy.yml`: Pages deploy `apps/web/dist` and `apps/admin/dist`; Workers deploy `apps/api` (Hono). Requires Cloudflare secrets/vars.
