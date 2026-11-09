# Infra

- `wrangler.toml` — Cloudflare Workers config for the API (Workers adapter placeholder at `apps/api/src/worker.ts`; current API runs as Express via tsx).
- `migrations/` — SQL migrations (moved from `supabase/migrations`).
- `schema.sql` — base schema (moved from `supabase/schema.sql`).
- `supabase-legacy/functions/` — legacy Supabase Edge Functions preserved for reference/migration.
- `github-actions/` — workflow definitions (moved from `.github/workflows`).

Target deployment (from brief): GitHub Actions → Cloudflare Pages (web) + Workers API → Postgres (Neon) → R2. D1/KV/R2 bindings are stubbed in `wrangler.toml`.
