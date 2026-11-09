# Rental-log (Monorepo)

Restructured layout:

```text
apps/
 ├─ web    (React/Vite)           # UI, routes, admin UI
 ├─ api    (Express + TS; Workers target via infra/wrangler.toml)
 └─ admin  (placeholder; admin lives in apps/web for now)

packages/
 ├─ ui           (shared UI placeholder)
 ├─ database     (shared data/content exports)
 ├─ auth         (placeholder)
 └─ validation   (financial/distribution logic & types)

infra/
 ├─ wrangler.toml
 ├─ migrations/
 ├─ schema.sql
 ├─ github-actions/
 └─ supabase-legacy/
```

## Dev

- `npm install` (workspaces)
- `npm run dev` — Vite web (`apps/web`)
- `npm run dev:api` — API (`apps/api`)
- `npm run build` — builds web
- `npm start` — starts API (serves `apps/web/dist` if present; set `SERVE_WEB=true` for Vite middleware in dev)

## Target stack (brief)

React/Vite/TS/TanStack Query/Zustand (web), Cloudflare Workers/Hono (API target), Postgres Neon/Supabase or D1, Drizzle, Better Auth/Clerk, R2, KV, Sentry. GitHub Actions → Cloudflare Pages + Workers → Postgres → R2.
