# Production email delivery setup

The application already contains event-driven email templates and calls for registration verification, password recovery, contact-form receipts, KYC decisions, deposit and withdrawal events, investment confirmations, and admin alerts.

**Important:** email delivery is not live until a production provider is configured. Without credentials, development can use the sandbox transport; production intentionally fails instead of reporting a simulated send as successful.

## 1. Choose and configure one provider

Recommended for this project now: SendGrid. Explicitly select it with `EMAIL_PROVIDER=sendgrid`.

Set these server-side environment variables in the actual hosting platform (not in the browser):

- `EMAIL_PROVIDER`: `sendgrid` to force SendGrid; `resend` to force Resend; `auto` for legacy priority detection.
- `SENDGRID_API_KEY`: API key created in SendGrid (server-side secret).
- `EMAIL_FROM`: `info@kretzdespain.com` (must be verified as a sender by the selected provider).
- `EMAIL_SENDER_NAME`: `Kretz Real Estate`.
- `EMAIL_REPLY_TO`: `info@kretzdespain.com` (ensure this mailbox is monitored).
- `EMAIL_SUPPORT`: `info@kretzdespain.com`.
- `PUBLIC_APP_URL`: canonical deployed website origin, with no trailing slash.
- `EMAIL_TEST_MODE`: `false` for live delivery.

Resend is disabled for this configuration when `EMAIL_PROVIDER=sendgrid`, even if a Resend key remains set.

**Cloudflare Worker limitation:** SMTP socket transport is not supported by this Worker implementation. Use Resend or SendGrid over HTTPS. The existing email service explicitly rejects SMTP mode in Workers; SMTP credentials in the environment will not make email delivery work.

Never put provider secrets in `VITE_*` variables, frontend source, GitHub commits, or chat messages. Add them as protected server runtime secrets and redeploy/restart the server.

## 2. Verify the sending domain

Verify `kretzdespain.com` in the selected provider and add the exact SPF/DKIM (and recommended DMARC) DNS records the provider supplies. Do not switch `EMAIL_FROM` to live mode until the provider shows the domain and sender as verified.

In the provider dashboard, add the sending domain and publish the exact DNS records it supplies (typically SPF and DKIM; add DMARC for domain policy/reporting). Do not copy generic SPF/DKIM values from an example: use the provider-specific records and ensure there is only one valid SPF record for the domain. Wait for provider verification before testing delivery.

## 3. Configure the Resend delivery webhook

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

Before enabling live delivery, add `SENDGRID_API_KEY` as a protected Cloudflare Worker secret and set `EMAIL_PROVIDER=sendgrid`. The repository default sender is `info@kretzdespain.com`; this setting does not itself verify the mailbox or authenticate delivery. Do not commit credentials or paste them into chat.

1. Confirm the admin email-provider status reports SendGrid, not sandbox.
2. Send a test message to a mailbox controlled by the project owner.
3. Verify receipt in the inbox and inspect spam placement, sender, reply-to, links and mobile rendering.
4. Register a controlled test account and confirm the verification email arrives and its link resolves on the production domain.
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
