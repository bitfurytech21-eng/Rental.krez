# Environment Groups Reference

All platform environment variables are organized into **6 Environment Groups** matching `render.yaml` and `.env.example`.

> **Important Build Rule:** Any variable starting with `VITE_` is compiled into the frontend bundle during `npm run build`. Whenever you add or edit a `VITE_*` variable in your hosting dashboard, trigger **Clear Build Cache & Deploy** so the browser receives the updated value.

---

## Group 1 — `kretz-core-runtime`
Core Node/Express runtime and frontend-to-backend API routing.

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | Server | Enables production static serving (`dist/`) and secure `httpOnly` cookies. |
| `PORT` | `3000` | Server | Unified Express + SPA listening port. |
| `VITE_API_BASE_URL` | `/api/v1` | Build/Client | Keep as `/api/v1` when frontend and backend run on the same service. |

---

## Group 2 — `kretz-admin-security`
Administrator Gateway (`/admin/login`), session signing, and protected system log access.

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `ADMIN_EMAIL` | `admin@kretz.com` | Server | Initial admin email (overridden once you save a Custom Login at `/admin/login`). |
| `ADMIN_PASSWORD` | *(leave blank or set yours)* | Server | Optional plaintext override. Defaults to `AdminSecure2026!#` when blank. |
| `ADMIN_PASSWORD_HASH` | *(leave blank or 60-char bcrypt)* | Server | Only set if using a real `$2b$12$...` bcrypt hash. Never paste placeholder text. |
| `SESSION_SECRET` | *(auto-generated 64-char secret)* | Server | Cryptographically signs `kretz_adm_` administrator tokens. |
| `JWT_SECRET` | *(auto-generated secret)* | Server | Fallback signing secret for token verification. |
| `ADMIN_LOG_API_KEY` | *(auto-generated secret)* | Server | Protects external monitoring access to `/api/v1/admin/logs`. |
| `ADMIN_LOG_API_SECRET` | *(auto-generated secret)* | Server | Secondary fallback secret for `/api/v1/admin/logs/export`. |

---

## Group 3 — `kretz-supabase-client`
Investor accounts, profiles, and persistent database connectivity.

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Build/Client | Supabase Project URL (**Project Settings -> API**). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Build/Client | Supabase publishable client key. |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` *(optional)* | Build/Client | Legacy `anon` public key (only needed if not using `VITE_SUPABASE_PUBLISHABLE_KEY`). |

---

## Group 4 — `kretz-cloudflare-turnstile`
Human verification challenge on customer & administrator authentication forms.

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` | *(Cloudflare Site Key)* | Build/Client | Public widget key scoped to `kretzdespain.com`. Leave blank to use test fallback. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | *(Cloudflare Secret Key)* | Server | Server secret key paired with the Site Key above. |
| `SKIP_TURNSTILE` | `false` | Server | Set to `true` only if temporarily bypassing Turnstile verification. |

---

## Group 5 — `kretz-transactional-email`
Automated receipts, KYC updates, and security alerts. **Configure only ONE provider** (priority order: Resend -> SendGrid -> SMTP -> Sandbox fallback).

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | `re_...` | Server | **Option A (Priority 1):** Resend API key. Leave blank if unused. |
| `SENDGRID_API_KEY` | `SG....` | Server | **Option B (Priority 2):** SendGrid Mail API v3 key. Leave blank if unused. |
| `SMTP_HOST` | `smtppro.zoho.com` | Server | **Option C (Priority 3):** SMTP relay host (Zoho, Gmail, SES). |
| `SMTP_PORT` | `465` | Server | `465` (SSL) or `587` (STARTTLS). |
| `SMTP_USER` | `info@kretzdespain.com` | Server | SMTP account username/email. |
| `SMTP_PASS` | *(SMTP app password)* | Server | SMTP password or app-specific password. |

---

## Group 6 — `kretz-optional-integrations`
Public customer live-chat widget and multi-language translation providers.

| Key | Recommended Value | Scope | Notes |
| :--- | :--- | :--- | :--- |
| `VITE_SMARTSUPP_KEY` | *(Smartsupp key)* | Build/Client | Customer live chat on public/investor pages (automatically hidden on `/admin`). |
| `DEEPL_API_KEY` | *(optional)* | Server | Primary neural translation provider when set. |
| `LIBRETRANSLATE_URL` | `https://translate.argosopentech.com/translate` | Server | Secondary translation endpoint. |
| `LIBRETRANSLATE_API_KEY` | *(optional)* | Server | API key if using a hosted LibreTranslate instance. |
| `MYMEMORY_EMAIL` | *(optional email)* | Server | Increases daily free translation quota on fallback engine. |
