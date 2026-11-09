# @rental-log/admin

Standalone admin Vite app (Cloudflare Pages-capable). It currently reuses admin/auth/providers/components from `apps/web/src` via `@web/*` aliases to preserve behavior while extraction is incremental.

- Dev: `npm run dev -w @rental-log/admin` (port 3001, reads root `.env`)
- Build: `npm run build -w @rental-log/admin`
- Admin UI source remains primarily in `apps/web/src/components/admin`; move components into `apps/admin/src` or `packages/ui`/`packages/auth` as coupling is reduced.

`apps/web` still serves `/admin` routes for backward compatibility.
