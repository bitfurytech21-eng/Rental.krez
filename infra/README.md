# Infra

- `wrangler.toml` / `apps/api/wrangler.toml` — Cloudflare Workers Hono fetch API (`apps/api/src/worker.ts`, `hono-routes-core.ts`).
- `apps/api/server.ts` — Express/Node full legacy surface fallback.
- `migrations/`, `schema.sql`, `supabase-legacy/` — database assets.
- `github-actions/ci.yml` — lint, tests (web/api/worker), web+admin builds.
- `github-actions/deploy.yml` — Cloudflare Pages (web/admin) + Workers (api) when `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets and project vars are set.

## Hono migration status (incremental)
Migrated: health, config, blog/team, marketplace listings/detail, auth register/login/logout/session/me, admin login/logout/session, user profile, portfolio summary, distributions subset. Unmigrated legacy routes return `501` JSON from Workers; use Express deployment for parity until migrated.

## Bindings/secrets needed for full production
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, Pages project names (`CF_PAGES_WEB_PROJECT`, `CF_PAGES_ADMIN_PROJECT`), D1/KV/R2 bindings, Turnstile/email/auth secrets, DB URL/provider config.
