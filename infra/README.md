# Infra

- `wrangler.toml` / `apps/api/wrangler.toml` — Cloudflare Workers config for the Hono fetch API (`apps/api/src/worker.ts` + `apps/api/src/hono-app.ts`).
- `apps/api/server.ts` + `apps/api/src/index.ts` — Express/Node entries preserved for the full legacy route surface and local Node hosting.
- `migrations/`, `schema.sql`, `supabase-legacy/` — database assets.
- `github-actions/` — workflows.

Workers migration status (step 1): health, blog, team, distributions export/list subset, and a 501 JSON fallback for unmigrated legacy routes are implemented in Hono. The full 5k+ Express route surface in `apps/api/src/routes.ts` remains available via Node/Express and should be migrated incrementally to fetch/Hono handlers.
