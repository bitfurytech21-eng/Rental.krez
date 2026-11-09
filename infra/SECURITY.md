# Security & migration notes (step 2/5)
- Workers Turnstile: enforced when `TURNSTILE_SECRET_KEY` binding/secret is set (migrated auth/financial entry points). Demo fallback only when unset.
- CSRF: `X-CSRF-Token` issued by migrated auth/session flows; cookie-auth mutations should be validated (`requireCsrfForCookieAuth`). Full parity across all legacy cookie endpoints requires complete Hono migration.
- Secrets: do not commit `.env`; set secrets via `wrangler secret put`/Cloudflare dashboard. Demo seed users in `shared-store.ts` are non-production fixtures.
- Admin creds: Node fs store not Workers-safe; migrate to D1/KV bound config.
- CI: dependency audit runs (`npm audit --omit=dev`, non-blocking until policy set). Add secret scanning (gitleaks/trufflehog) and stricter ESLint/TS policy as toolchain allows.
