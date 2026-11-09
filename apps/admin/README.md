# @rental-log/admin

Standalone admin Vite app for Cloudflare Pages. It currently reuses admin/auth/providers/components from `apps/web/src` via aliases to preserve behavior while extraction is incremental (`apps/web` still serves `/admin`).

- `npm run dev -w @rental-log/admin`
- `npm run build -w @rental-log/admin`
- `npm run lint -w @rental-log/admin`

Next extraction step: move `apps/web/src/components/admin/*` and shared auth/UI dependencies into `apps/admin/src` / `packages/ui` / `packages/auth`, then switch `apps/web` `/admin` to redirect.
