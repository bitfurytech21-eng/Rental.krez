# @rental-log/admin

Standalone admin Vite app (Cloudflare Pages). Step 2 extraction: admin components copied to `apps/admin/src/components/admin` and the shell imports local login/panel; shared providers/auth/utils still resolve via `@web/*` for behavior parity while package extraction continues.

- `npm run dev -w @rental-log/admin`
- `npm run build -w @rental-log/admin`
- `npm run lint -w @rental-log/admin`

Next: move shared auth/providers/UI used by admin into `packages/auth`/`packages/ui`, then dedupe web/admin copies and switch `apps/web /admin` to redirect.
