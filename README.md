# Rental-log (Monorepo)

```text
apps/
 ├─ web    (React/Vite)            # main app; still serves /admin for compatibility
 ├─ api    (Cloudflare Hono worker + Express/Node fallback)
 └─ admin  (standalone Vite admin; currently reuses web admin modules)

packages/ ui, database, auth, validation
infra/    wrangler.toml, migrations/, schema.sql, github-actions/, supabase-legacy/
```

## Key commands
- `npm install`
- `npm run dev` / `npm run dev:web` — web
- `npm run dev -w @rental-log/admin` — admin
- `npm run dev -w @rental-log/api` — Workers (wrangler); `npm run dev:api:node` — Express fallback
- `npm run lint` — web + api type checks
- `npm test -w @rental-log/web`; `npx tsx apps/api/src/worker.test.ts`; `npx tsx apps/api/src/routes.test.ts`
- `npm run build` (web), `npm run build -w @rental-log/admin`, `npm run build:api` / `npm run deploy:api`

## Status
Workers/Hono has core routes migrated (health/config/blog/team/listings/auth/profile/portfolio/distributions subset) with 501 fallback for unmigrated legacy endpoints; Express `apps/api/src/routes.ts` remains the full legacy surface. Admin is a standalone build but still reuses web admin components/providers for behavior parity.
