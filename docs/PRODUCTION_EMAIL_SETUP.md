# Production email delivery setup

The application already contains event-driven email templates and calls for registration verification, password recovery, contact-form receipts, KYC decisions, deposit and withdrawal events, investment confirmations, and admin alerts.

**Important:** email delivery is not live until a production provider is configured. Without credentials, development can use the sandbox transport; production intentionally fails instead of reporting a simulated send as successful.

## 1. Sandbox / preview mode (current configuration)

The portal is configured to run without a transactional email API key. Set `EMAIL_PROVIDER=sandbox` to force preview-only mode. In this mode, live provider calls are disabled and the system must not report an email as delivered.

- `EMAIL_PROVIDER`: `sandbox` (current no-provider mode); `resend` or `sendgrid` only when deliberately enabled later.
- `EMAIL_FROM`: `info@kretzdespain.com` (display/configuration only in sandbox mode).
- `EMAIL_SENDER_NAME`: `Kretz Real Estate`.
- `EMAIL_REPLY_TO`: `info@kretzdespain.com`.
- `EMAIL_SUPPORT`: `info@kretzdespain.com`.
- `PUBLIC_APP_URL`: canonical deployed website origin, with no trailing slash.
- `EMAIL_TEST_MODE`: `true` to force sandbox mode as well.

Sandbox/preview mode does not send real email. Live delivery can be enabled later by explicitly selecting a provider and securely configuring its server-side credentials.

Never put provider secrets in `VITE_*` variables, frontend source, GitHub commits, or chat.

## 2. Verify the sending domain

Verify `kretzdespain.com` in the selected provider and add the exact SPF/DKIM (and recommended DMARC) DNS records the provider supplies. Do not switch `EMAIL_FROM` to live mode until the provider shows the domain and sender as verified.

In the provider dashboard, add the sending domain and publish the exact DNS records it supplies (typically SPF and DKIM; add DMARC for domain policy/reporting). Do not copy generic SPF/DKIM values from an example: use the provider-specific records and ensure there is only one valid SPF record for the domain. Wait for provider verification before testing delivery.

## 3. Optional: Configure the Resend delivery webhook (only if Resend is later enabled)

After creating a webhook in Resend, subscribe to the delivery events you need and use this endpoint:

`https://api.kretzdespain.com/api/v1/webhooks/email`

Copy the webhook signing secret shown by Resend (the `whsec_...` value) into the API Worker's protected secret named `RESEND_WEBHOOK_SECRET`. This is separate from `RESEND_API_KEY`. Never put either secret in frontend variables, source control, or chat. The endpoint rejects unsigned, invalid, and timestamp-expired requests; configure the secret before enabling the Resend webhook.

## 4. Configure the app

Set `PUBLIC_APP_URL` to the exact production origin. Register the corresponding auth redirect URLs in Supabase if Supabase Auth is used for password recovery. Ensure the platform's production environment contains the provider secrets and `NODE_ENV=production`.

## 5. Event triggers already present

| User/system event | Existing email behaviour |
| --- | --- |
| New account registration | Verification email with expiring link |
| Password recovery | Password reset email |
| Contact form submission | Receipt / acknowledgement |
| KYC decision | Approved or rejected notification |
| Deposit request / status | Deposit receipt or status notification |
| Withdrawal request / completion | Request or completion notification |
| Investment confirmation | Investment confirmation |
| High-value deposit | Admin alert |

The automation rules registry also defines welcome, verification, password reset, command confirmation, transaction receipt, payment, security, status, report and custom notification rules. A rule being enabled does not prove that a corresponding business event is wired to it; verify each path with the test checklist below.

## 6. Production test checklist

Current sandbox mode does not send live email. If a provider is enabled later, configure its protected runtime secret and sender authentication before live testing. The repository default sender is `info@kretzdespain.com`; this setting does not itself verify the mailbox or authenticate delivery. Do not commit credentials or paste them into chat.

1. Confirm the admin email-provider status reports Sandbox / Preview Mode.
2. Preview a test message; no inbox delivery is expected in sandbox mode.
3. Inspect preview rendering, sender, reply-to, links and mobile layout.
4. Register a controlled test account and confirm the UI clearly indicates email delivery is inactive in sandbox mode.
5. Exercise password recovery, contact receipt, KYC status, deposit, withdrawal and investment notifications using test accounts and non-production financial data.
6. Confirm provider delivery webhooks update message status and that failed messages are visible to admins.
7. Confirm duplicate event retries do not send duplicate transactional emails.
8. Confirm no real customer email is sent during tests without consent.

## 7. Security and operational notes

- Do not use a real customer's address for test messages.
- Do not send sensitive KYC documents, passwords, full payment credentials, or secret tokens in email.
- Use provider delivery events to distinguish accepted/sent from delivered, bounced or complained.
- Ensure event dispatch is tied to a committed business-state change. Financial notifications must never be sent before the underlying operation succeeds.
- Email automation configuration and delivery logs are currently held in the server process memory in the existing implementation; they reset on restart and are not a durable audit trail. Production persistence and retry queues should be added before relying on them for compliance-critical notifications.
