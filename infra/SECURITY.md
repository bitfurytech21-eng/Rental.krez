# Security & production notes
- **Workers Turnstile:** enforced by `verifyTurnstile` when `TURNSTILE_SECRET_KEY` is set (migrated auth/financial/public entry points). If unset, requests are allowed as a dev fallback—set the secret in production.
- **CSRF:** migrated auth issues `X-CSRF-Token`; cookie-auth mutations are checked by `requireCsrfForCookieAuth` in migrated Hono flows. Full parity requires migrating all legacy cookie-mutating Express routes.
- **CORS:** set `ALLOWED_ORIGINS` (comma-separated) in production. Empty origins are permissive for local/dev parity.
- **Secrets/state:** do not commit `.env`. Use `wrangler secret put`/dashboard. `DEMO_SEED=false` disables demo users for production bindings; replace in-memory stores with D1/KV/R2-backed services before relying on Workers for financial state.
- **Admin creds:** Node fs-based custom admin creds are not Workers-safe; migrate to D1/KV.
- **CI:** lint (`tsc` + ESLint gate), `npm audit --omit=dev || true` (non-blocking), contract tests, builds. Add secret scanning and strict ESLint/TS policy as toolchain permits.
