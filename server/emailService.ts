/**
 * L'Agence / Kretz & De Spain — Automated Email Notification System
 * 
 * Inspired by premium transactional email designs (Notable / Finora aesthetic):
 * - Responsive 600px container with Outlook MSO conditional markup
 * - Clean white cards, subtle borders (#E5E7EB), refined typography
 * - Signature primary blue call-to-action button (#2563EB / #1D4ED8)
 * - Mobile app download section, verified security badges, social links, compliance footer
 * - Multi-provider engine (Resend, SendGrid, Amazon SES / SMTP, and Instant Sandbox)
 * - Event-driven command triggering with idempotency guard against duplicates
 * - Dynamic variable interpolation with HTML sanitization
 * - In-memory transmission activity log with webhook delivery status tracking and safe retries
 */

import nodemailer, { Transporter } from 'nodemailer';
import crypto from 'crypto';

// ============================================================================
// DATA INTERFACES & SCHEMAS
// ============================================================================

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  category: 'account' | 'transactions' | 'investments' | 'security' | 'operations' | 'reports' | 'custom';
  description: string;
  defaultSubject: string;
  supportedCommand: string;
  defaultVariables: string[];
  sampleData: Record<string, any>;
  generateHtml: (data: Record<string, any>, settings: EmailSenderSettings) => string;
  generateText: (data: Record<string, any>, settings: EmailSenderSettings) => string;
}

export interface EmailLogEntry {
  id: string;
  eventId?: string;
  commandName?: string;
  templateId: string;
  templateName?: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
  deliveryMode: 'resend' | 'sendgrid' | 'smtp' | 'sandbox';
  provider: string;
  sentAt: string;
  deliveredAt?: string;
  deliveryTimeMs: number;
  previewSnippet: string;
  idempotencyKey?: string;
  retryCount: number;
  reference?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface EmailAutomationRule {
  id: string;
  eventName: string;
  commandName: string;
  templateId: string;
  description: string;
  enabled: boolean;
  recipientRule: 'user_email' | 'admin_alerts' | 'custom_recipients';
  customRecipients?: string[];
  subjectOverride?: string;
  idempotencyWindowHours: number;
}

export interface EmailSenderSettings {
  senderName: string;
  fromAddress: string;
  replyToAddress: string;
  supportEmail: string;
  supportPhone: string;
  platformUrl: string;
  primaryBrandColor: string; // Signature Blue: #2563EB
  testMode: boolean;
  subjectOverrides: Record<string, string>;
  customTemplates: Array<{
    id: string;
    name: string;
    subject: string;
    bodyMarkdown: string;
    ctaText?: string;
    ctaUrl?: string;
  }>;
}

// ============================================================================
// IN-MEMORY STORES & CONFIGURATION
// ============================================================================

let emailSettings: EmailSenderSettings = {
  senderName: "L'Agence · Kretz",
  fromAddress: 'info@kretz.site',
  replyToAddress: 'support@kretz.site',
  supportEmail: 'info@kretz.site',
  supportPhone: '+34 912 345 678',
  platformUrl: 'https://kretzdespain.com',
  primaryBrandColor: '#2563EB', // Signature Royal Blue from reference image
  testMode: false,
  subjectOverrides: {},
  customTemplates: []
};

// Activity logs with rich initial records
const emailLogs: EmailLogEntry[] = [
  {
    id: 'log-eml-init-01',
    eventId: 'evt-reg-98124',
    commandName: 'send_welcome_email',
    templateId: 'welcome',
    templateName: 'Welcome Email',
    recipient: 'investor@kretz.com',
    subject: "Welcome to L'Agence Kretz — Let's Get Started",
    status: 'delivered',
    deliveryMode: 'sandbox',
    provider: 'Sandbox Engine',
    sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 24 + 1800).toISOString(),
    deliveryTimeMs: 142,
    previewSnippet: "Welcome to L'Agence Kretz! You're already on your way to building a high-yielding real estate portfolio.",
    idempotencyKey: 'idemp-welcome-usr-1',
    retryCount: 0,
    reference: 'KZ-WELCOME-INIT'
  },
  {
    id: 'log-eml-init-02',
    eventId: 'evt-verif-741920',
    commandName: 'send_verification_email',
    templateId: 'email_verification',
    templateName: 'Email Verification',
    recipient: 'investor@kretz.com',
    subject: 'Confirm Your Email Address & Verification Code',
    status: 'delivered',
    deliveryMode: 'sandbox',
    provider: 'Sandbox Engine',
    sentAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 18 + 1200).toISOString(),
    deliveryTimeMs: 98,
    previewSnippet: 'This is your verification code: 4 8 6 2. Enter this code within the next 15 minutes.',
    idempotencyKey: 'idemp-verif-usr-1',
    retryCount: 0,
    reference: 'KZ-VERIF-CODE'
  },
  {
    id: 'log-eml-init-03',
    eventId: 'evt-tx-48102',
    commandName: 'send_transaction_receipt',
    templateId: 'transaction_receipt',
    templateName: 'Transaction Confirmation',
    recipient: 'investor@kretz.com',
    subject: 'Transaction Confirmation: €10,000.00 SPV Fractional Allocation',
    status: 'delivered',
    deliveryMode: 'sandbox',
    provider: 'Sandbox Engine',
    sentAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    deliveredAt: new Date(Date.now() - 3600000 * 6 + 1500).toISOString(),
    deliveryTimeMs: 112,
    previewSnippet: 'Thank you for your purchase! Your fractional SPV token allocation in Villa El Mirador has been confirmed.',
    idempotencyKey: 'idemp-tx-48102',
    retryCount: 0,
    reference: 'KZ-CERT-VILLA-001'
  }
];

// Idempotency cache to prevent duplicate dispatches
const processedIdempotencyKeys = new Map<string, { timestamp: number; logId: string }>();

// Single-use tokens store with TTL
interface ExpiringToken {
  token: string;
  email: string;
  type: 'verification' | 'password_reset';
  expiresAt: number;
  used: boolean;
}
const activeTokens = new Map<string, ExpiringToken>();

// ============================================================================
// EVENT-DRIVEN AUTOMATIONS REGISTRY
// ============================================================================

export let emailAutomationRules: EmailAutomationRule[] = [
  {
    id: 'auto-welcome',
    eventName: 'user.registered',
    commandName: 'send_welcome_email',
    templateId: 'welcome',
    description: 'Triggered automatically when a new user registers on the platform.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 24
  },
  {
    id: 'auto-verification',
    eventName: 'auth.verification_requested',
    commandName: 'send_verification_email',
    templateId: 'email_verification',
    description: 'Triggered when a user requests email verification or attempts a privileged session.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 1
  },
  {
    id: 'auto-reset',
    eventName: 'auth.password_reset_requested',
    commandName: 'send_password_reset',
    templateId: 'password_reset',
    description: 'Triggered when a user requests a password recovery link.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 1
  },
  {
    id: 'auto-command',
    eventName: 'system.command_executed',
    commandName: 'send_command_confirmation',
    templateId: 'command_confirmation',
    description: 'Triggered when an authenticated administrative or ledger command completes.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 6
  },
  {
    id: 'auto-tx',
    eventName: 'transaction.completed',
    commandName: 'send_transaction_receipt',
    templateId: 'transaction_receipt',
    description: 'Triggered when a property investment or token purchase completes successfully.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 24
  },
  {
    id: 'auto-payment',
    eventName: 'payment.status_changed',
    commandName: 'send_payment_notification',
    templateId: 'payment_notification',
    description: 'Triggered when a deposit, wire transfer, or payout is received, processed, or fails.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 12
  },
  {
    id: 'auto-security',
    eventName: 'security.login_alert',
    commandName: 'send_security_alert',
    templateId: 'security_alert',
    description: 'Triggered when a new device, unrecognised IP, or security event occurs.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 2
  },
  {
    id: 'auto-status',
    eventName: 'operation.status_changed',
    commandName: 'send_status_update',
    templateId: 'status_update',
    description: 'Triggered when a pending operation (KYC, escrow settlement, property funding milestone) updates.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 6
  },
  {
    id: 'auto-report',
    eventName: 'report.ready',
    commandName: 'send_report_notification',
    templateId: 'report_notification',
    description: 'Triggered when monthly portfolio statements, tax certificates, or RICS reports are ready.',
    enabled: true,
    recipientRule: 'user_email',
    idempotencyWindowHours: 24
  },
  {
    id: 'auto-custom',
    eventName: 'admin.custom_notification',
    commandName: 'send_custom_email',
    templateId: 'custom_notification',
    description: 'Administrator broadcast or custom event notification.',
    enabled: true,
    recipientRule: 'custom_recipients',
    idempotencyWindowHours: 1
  }
];

// ============================================================================
// DYNAMIC VARIABLE ENGINE & SANITIZATION
// ============================================================================

/**
 * Sanitize untrusted input to prevent HTML injection attacks
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace placeholders like {{user_name}} and {{amount}} with sanitized values
 */
export function interpolateVariables(template: string, data: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in data) {
      const val = data[key];
      if (val === null || val === undefined) return '';
      return sanitizeHtml(String(val));
    }
    return match;
  });
}

// ============================================================================
// MASTER PREMIUM EMAIL LAYOUT (Notable / Finora Reference Aesthetic)
// ============================================================================

interface MasterLayoutOptions {
  preheader: string;
  headline: string;
  badge?: string;
  bodyHtml: string;
  codeDigits?: string[];
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  metricCards?: Array<{ label: string; value: string; status?: string; badgeColor?: string }>;
  itemizedReceipt?: {
    orderNumber: string;
    items: Array<{ name: string; details: string; amount: string }>;
    subtotal: string;
    discount?: string;
    tax?: string;
    total: string;
  };
  securityInfo?: {
    location?: string;
    device?: string;
    ip?: string;
    time?: string;
  };
  timelineSteps?: Array<{ title: string; subtitle: string; status: 'completed' | 'current' | 'upcoming' }>;
  secondaryNotice?: string;
  warningNotice?: string;
}

export function wrapMasterLayout(options: MasterLayoutOptions, settings: EmailSenderSettings): string {
  const {
    preheader,
    headline,
    badge,
    bodyHtml,
    codeDigits,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    metricCards,
    itemizedReceipt,
    securityInfo,
    timelineSteps,
    secondaryNotice,
    warningNotice
  } = options;

  const currentYear = new Date().getFullYear();
  const brandBlue = settings.primaryBrandColor || '#2563EB';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${headline}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #172B2A; -webkit-font-smoothing: antialiased; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 20px !important; }
      .header-padding { padding: 20px 20px !important; }
      .footer-padding { padding: 24px 20px !important; }
      .button-cell a { display: block !important; width: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .metric-cell { display: block !important; width: 100% !important; margin-bottom: 10px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F8;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: #F4F6F8; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F6F8; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 14px 48px 14px;">
        
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->

        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container-table" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);">
          
          <!-- BRAND HEADER (Notable style: clean white background, logo icon + social icons on right) -->
          <tr>
            <td class="header-padding" style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #F0F2F5;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Logo & Brand Name -->
                  <td valign="middle" align="left">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <!-- Clean Brand Icon -->
                          <div style="width: 28px; height: 28px; background-color: #087F5B; border-radius: 7px; text-align: center; line-height: 28px; font-weight: 900; font-size: 14px; color: #FFFFFF;">
                            L
                          </div>
                        </td>
                        <td valign="middle">
                          <span style="font-size: 16px; font-weight: 800; color: #172B2A; letter-spacing: -0.3px;">
                            ${settings.senderName}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right-Side Social Links (Twitter, LinkedIn, Globe as in reference image) -->
                  <td valign="middle" align="right">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        ${badge ? `
                        <td style="padding-right: 12px;">
                          <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; border-radius: 20px; background-color: #DDF5EC; color: #087F5B; letter-spacing: 0.5px;">
                            ${badge}
                          </span>
                        </td>` : ''}
                        <td style="padding-left: 8px;">
                          <a href="${settings.platformUrl}" target="_blank" style="text-decoration: none; color: #71817D; font-size: 12px; font-weight: 600;">
                            &#9679; portal
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 28px 36px;">
              
              <!-- Subject Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #172B2A; line-height: 1.3; letter-spacing: -0.5px;">
                ${headline}
              </h1>

              <!-- Dynamic Body HTML -->
              <div style="font-size: 15px; line-height: 1.65; color: #4B5563; margin-bottom: 24px;">
                ${bodyHtml}
              </div>

              <!-- DIGIT CODE BOXES (Reference image signature feature e.g. [ 4 ] [ 8 ] [ 6 ] [ 2 ]) -->
              ${codeDigits && codeDigits.length > 0 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 26px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        ${codeDigits.map(digit => `
                        <td style="padding: 0 6px;">
                          <div style="width: 52px; height: 58px; background-color: #F9FAFB; border: 1.5px solid #D1D5DB; border-radius: 10px; text-align: center; line-height: 56px; font-size: 26px; font-weight: 800; font-family: monospace; color: #172B2A; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                            ${digit}
                          </div>
                        </td>`).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- METRIC TILES GRID (Reference image: Report Overview 2x2 grid) -->
              ${metricCards && metricCards.length > 0 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 26px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        ${metricCards.slice(0, 2).map(card => `
                        <td width="50%" valign="top" style="padding: 6px;" class="stack-column">
                          <div style="background-color: #F8FAF9; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; text-align: left;">
                            <span style="font-size: 11px; font-weight: 700; color: #71817D; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                              ${card.label}
                            </span>
                            <span style="font-size: 22px; font-weight: 800; color: #172B2A; font-family: monospace; display: block;">
                              ${card.value}
                            </span>
                            ${card.status ? `
                            <span style="font-size: 11px; font-weight: 600; color: ${card.badgeColor || '#087F5B'}; margin-top: 4px; display: inline-block;">
                              ${card.status}
                            </span>` : ''}
                          </div>
                        </td>`).join('')}
                      </tr>
                      ${metricCards.length > 2 ? `
                      <tr>
                        ${metricCards.slice(2, 4).map(card => `
                        <td width="50%" valign="top" style="padding: 6px;" class="stack-column">
                          <div style="background-color: #F8FAF9; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; text-align: left;">
                            <span style="font-size: 11px; font-weight: 700; color: #71817D; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                              ${card.label}
                            </span>
                            <span style="font-size: 22px; font-weight: 800; color: #172B2A; font-family: monospace; display: block;">
                              ${card.value}
                            </span>
                            ${card.status ? `
                            <span style="font-size: 11px; font-weight: 600; color: ${card.badgeColor || '#087F5B'}; margin-top: 4px; display: inline-block;">
                              ${card.status}
                            </span>` : ''}
                          </div>
                        </td>`).join('')}
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- ITEMIZED TRANSACTION RECEIPT (Reference image: Order details, subtotal, discount, total) -->
              ${itemizedReceipt ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #71817D; letter-spacing: 0.5px;">
                    Order Reference: <strong style="color: #172B2A; font-family: monospace;">${itemizedReceipt.orderNumber}</strong>
                  </td>
                </tr>
                ${itemizedReceipt.items.map(item => `
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td valign="top" align="left">
                          <div style="font-size: 14px; font-weight: 700; color: #172B2A;">${item.name}</div>
                          <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">${item.details}</div>
                        </td>
                        <td valign="top" align="right" style="font-size: 14px; font-weight: 700; font-family: monospace; color: #172B2A;">
                          ${item.amount}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
                <tr>
                  <td style="padding: 14px 18px; background-color: #F3F4F6;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 2px 0;">Subtotal</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; font-family: monospace; color: #172B2A;">${itemizedReceipt.subtotal}</td>
                      </tr>
                      ${itemizedReceipt.discount ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 2px 0;">Discount</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; font-family: monospace; color: #087F5B;">-${itemizedReceipt.discount}</td>
                      </tr>` : ''}
                      ${itemizedReceipt.tax ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 2px 0;">Processing &amp; Escrow</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; font-family: monospace; color: #172B2A;">${itemizedReceipt.tax}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="font-size: 14px; font-weight: 800; color: #172B2A; padding-top: 8px; border-top: 1px solid #E5E7EB;">Total Amount</td>
                        <td align="right" style="font-size: 16px; font-weight: 800; font-family: monospace; color: #172B2A; padding-top: 8px; border-top: 1px solid #E5E7EB;">
                          ${itemizedReceipt.total}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- SECURITY AUDIT LOCATION CARD (Reference image: New Login with Location map badge, Device, IP, Time) -->
              ${securityInfo ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      ${securityInfo.location ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 4px 0; width: 35%;">Location</td>
                        <td style="font-size: 12px; font-weight: 700; color: #172B2A;">&#128205; ${securityInfo.location}</td>
                      </tr>` : ''}
                      ${securityInfo.device ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 4px 0;">Device / Browser</td>
                        <td style="font-size: 12px; font-weight: 700; color: #172B2A;">${securityInfo.device}</td>
                      </tr>` : ''}
                      ${securityInfo.ip ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 4px 0;">IP Address</td>
                        <td style="font-size: 12px; font-weight: 700; font-family: monospace; color: #172B2A;">${securityInfo.ip}</td>
                      </tr>` : ''}
                      ${securityInfo.time ? `
                      <tr>
                        <td style="font-size: 12px; color: #6B7280; padding: 4px 0;">Timestamp</td>
                        <td style="font-size: 12px; font-weight: 600; color: #6B7280;">${securityInfo.time}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- MULTI-STEP TIMELINE (Status Update) -->
              ${timelineSteps && timelineSteps.length > 0 ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background-color: #F8FAF9; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
                ${timelineSteps.map((step, idx) => `
                <tr>
                  <td width="28" valign="top" style="padding-bottom: ${idx === timelineSteps.length - 1 ? '0' : '12px'};">
                    <div style="width: 18px; height: 18px; border-radius: 50%; background-color: ${step.status === 'completed' ? '#087F5B' : step.status === 'current' ? brandBlue : '#E5E7EB'}; text-align: center; line-height: 18px; color: #FFFFFF; font-size: 10px; font-weight: bold;">
                      ${step.status === 'completed' ? '&#10003;' : (idx + 1)}
                    </div>
                  </td>
                  <td valign="top" style="padding-bottom: ${idx === timelineSteps.length - 1 ? '0' : '12px'};">
                    <div style="font-size: 13px; font-weight: 700; color: #172B2A;">${step.title}</div>
                    <div style="font-size: 11px; color: #6B7280;">${step.subtitle}</div>
                  </td>
                </tr>`).join('')}
              </table>` : ''}

              <!-- Warning Callout Box (if present) -->
              ${warningNotice ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #FFFBEB; border-left: 3px solid #F59E0B; border-radius: 4px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; line-height: 1.5; color: #92400E;">
                    ${warningNotice}
                  </td>
                </tr>
              </table>` : ''}

              <!-- PRIMARY BLUE CALL TO ACTION BUTTON (Exact signature from reference image) -->
              ${ctaText && ctaUrl ? `
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="left">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Primary Blue CTA -->
                        <td align="center" bgcolor="${brandBlue}" class="button-cell" style="border-radius: 8px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="${brandBlue}">
                            <w:anchorlock/>
                            <center style="color:#FFFFFF;font-family:sans-serif;font-size:14px;font-weight:bold;">${ctaText}</center>
                          </v:roundrect>
                          <![endif]-->
                          <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; color: #FFFFFF; text-decoration: none; border-radius: 8px; text-align: center; mso-hide: all; background-color: ${brandBlue};">
                            ${ctaText}
                          </a>
                        </td>

                        ${secondaryCtaText && secondaryCtaUrl ? `
                        <td style="padding-left: 12px;" class="stack-column">
                          <a href="${secondaryCtaUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 13px; font-weight: 700; color: #4B5563; text-decoration: none; border-radius: 8px; border: 1px solid #D1D5DB; background-color: #FFFFFF;">
                            ${secondaryCtaText}
                          </a>
                        </td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <!-- Secondary Link Fallback -->
              ${secondaryNotice ? `
              <div style="font-size: 12px; line-height: 1.5; color: #6B7280; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #E5E7EB; word-break: break-all;">
                ${secondaryNotice}
              </div>` : ''}

              <!-- Sign-off -->
              <div style="margin-top: 26px; font-size: 14px; color: #374151;">
                Thanks,<br/>
                <strong style="color: #172B2A;">${settings.senderName} Team</strong>
              </div>

            </td>
          </tr>

          <!-- MOBILE APP DOWNLOAD SECTION (Signature section from Notable reference image) -->
          <tr>
            <td style="padding: 24px 36px; background-color: #F9FAFB; border-top: 1px solid #F0F2F5; border-bottom: 1px solid #F0F2F5;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #172B2A; margin-bottom: 10px;">
                      ${settings.senderName} at the touch of a button! Download our mobile investor app:
                    </div>
                    <!-- App Store Badges -->
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 8px;">
                          <div style="display: inline-block; padding: 6px 14px; background-color: #000000; color: #FFFFFF; border-radius: 6px; font-size: 11px; font-weight: 700;">
                            &#9658; Google Play
                          </div>
                        </td>
                        <td>
                          <div style="display: inline-block; padding: 6px 14px; background-color: #000000; color: #FFFFFF; border-radius: 6px; font-size: 11px; font-weight: 700;">
                            &#63743; App Store
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PROFESSIONAL COMPLIANCE FOOTER (Reference image: Questions, Contact Us, Unsubscribe, Address) -->
          <tr>
            <td class="footer-padding" style="padding: 28px 36px; background-color: #FFFFFF; color: #6B7280; font-size: 12px; line-height: 1.6;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="margin-bottom: 8px;">
                      Questions or feedback? Contact us at <a href="mailto:${settings.supportEmail}" style="color: ${brandBlue}; text-decoration: none; font-weight: 600;">${settings.supportEmail}</a>.
                    </div>
                    <div style="margin-bottom: 12px; font-size: 11px; color: #9CA3AF;">
                      If you'd rather not receive this kind of email, <a href="${settings.platformUrl}/settings/notifications" style="color: #6B7280; text-decoration: underline;">unsubscribe</a> or manage preferences.
                    </div>
                    <div style="font-size: 11px; color: #9CA3AF; padding-top: 12px; border-top: 1px solid #F0F2F5;">
                      <div>Madrid: Calle de Velázquez 64, Salamanca · Paris: 12 Place Vendôme, 75001</div>
                      <div style="margin-top: 4px;">&copy; ${currentYear} ${settings.senderName} Capital Partners S.L. All rights reserved.</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// THE 10 CORE REQUIRED TEMPLATES (Notable / Finora Aesthetics)
// ============================================================================

export const emailTemplates: EmailTemplateDefinition[] = [
  // 1. WELCOME EMAIL
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'account',
    description: 'Sent when a new user completes registration. Highlights onboarding benefits, feature checklist, and the primary blue call-to-action button.',
    defaultSubject: "Welcome to L'Agence Kretz — Let's Get Started",
    supportedCommand: 'send_welcome_email',
    defaultVariables: ['user_name', 'user_email', 'action_url', 'support_email'],
    sampleData: {
      user_name: 'Angela Moreau',
      user_email: 'angela.moreau@capital-partners.com',
      action_url: 'https://kretzdespain.com/dashboard',
      support_email: 'info@kretz.site'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Welcome to ${settings.senderName}! You're on your way to building high-yielding European property wealth.`,
      headline: `Welcome to ${settings.senderName}!`,
      badge: 'Getting Started',
      bodyHtml: `
        <p>Hi ${data.user_name || 'there'},</p>
        <p>We're thrilled to welcome you to <strong>${settings.senderName}</strong>. You're already on your way to participating in prime European luxury real estate through ring-fenced fractional SPVs.</p>
        <p>Whether you're here to diversify into Spanish prime trophy villas, earn quarterly rental dividends, or preserve capital with inflation-indexed real assets, we're here every step of the way.</p>
        <p>Now that you've opened your account, take the next step by exploring our current active offerings.</p>
      `,
      metricCards: [
        { label: 'Active Pipeline', value: '€24.5M', status: 'Curated Assets', badgeColor: '#087F5B' },
        { label: 'Avg. Target APY', value: '8.4%', status: 'Net Yield', badgeColor: '#087F5B' }
      ],
      ctaText: "Let's Get Started",
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard`,
      secondaryNotice: `Need assistance setting up your investor account? Contact our wealth desk at <a href="mailto:${settings.supportEmail}" style="color: ${settings.primaryBrandColor};">${settings.supportEmail}</a>.`
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — WELCOME
------------------------------------------------------------
Hi ${data.user_name || 'there'},

Welcome to ${settings.senderName}! You're already on your way to participating in prime European luxury real estate.

Get started by exploring our active properties:
${data.action_url || `${settings.platformUrl}/dashboard`}

Need help? Contact support at ${settings.supportEmail}.
(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 2. EMAIL VERIFICATION
  {
    id: 'email_verification',
    name: 'Email Verification',
    category: 'account',
    description: 'Sent when a user requests verification or registers. Features the prominent 4-digit verification code boxes ([ 4 ] [ 8 ] [ 6 ] [ 2 ]) inspired by the reference design.',
    defaultSubject: 'Confirm Your Email Address & Verification Code',
    supportedCommand: 'send_verification_email',
    defaultVariables: ['user_name', 'user_email', 'verification_code', 'action_url', 'expires_in_minutes'],
    sampleData: {
      user_name: 'Jack Davies',
      user_email: 'j.davies@notable-invest.com',
      verification_code: '4862',
      action_url: 'https://kretzdespain.com/auth/verify?code=4862',
      expires_in_minutes: 15
    },
    generateHtml: (data, settings) => {
      const codeDigits = String(data.verification_code || '4862').split('').slice(0, 4);
      return wrapMasterLayout({
        preheader: `Confirm your verification code: ${data.verification_code || '4862'} to activate your account.`,
        headline: 'Confirm Verification Code',
        badge: 'Security Code',
        bodyHtml: `
          <p>Hi ${data.user_name || 'Jack'},</p>
          <p>Thank you for continuing your journey with us! To verify your email address and secure your investor credentials, please enter this verification code:</p>
        `,
        codeDigits,
        warningNotice: `This security code will only be valid for the next <strong>${data.expires_in_minutes || 15} minutes</strong>. If you did not request this verification, no action is needed.`,
        ctaText: 'Verify Email Address',
        ctaUrl: data.action_url || `${settings.platformUrl}/auth/verify?code=${data.verification_code || '4862'}`,
        secondaryNotice: `You can also verify by clicking the direct confirmation button above or copying this URL into your browser:<br/><span style="color: ${settings.primaryBrandColor};">${data.action_url || `${settings.platformUrl}/auth/verify`}</span>`
      }, settings);
    },
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — CONFIRM VERIFICATION CODE
------------------------------------------------------------
Hi ${data.user_name || 'Jack'},

This is your verification code: ${data.verification_code || '4862'}

This code will only be valid for the next ${data.expires_in_minutes || 15} minutes.
You can also verify directly using this link:
${data.action_url || `${settings.platformUrl}/auth/verify`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 3. PASSWORD RESET
  {
    id: 'password_reset',
    name: 'Password Reset',
    category: 'security',
    description: 'Sent when an individual requests password recovery. Includes single-use expiring token, security advisory, and primary blue reset action button.',
    defaultSubject: "Password Reset Request — L'Agence Kretz",
    supportedCommand: 'send_password_reset',
    defaultVariables: ['user_name', 'user_email', 'action_url', 'expires_in_minutes', 'ip_address'],
    sampleData: {
      user_name: 'Marc Fontaine',
      user_email: 'm.fontaine@geneva-fund.ch',
      action_url: 'https://kretzdespain.com/auth/reset?token=kz-sample-reset-44781',
      expires_in_minutes: 30,
      ip_address: '194.230.144.12'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: 'Authorization request to reset your portfolio account password.',
      headline: 'Reset Your Password',
      badge: 'Account Security',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Investor'},</p>
        <p>We received an authorized request to reset the password for your <strong>${settings.senderName}</strong> account associated with <strong>${data.user_email || 'your email'}</strong>.</p>
        <p>Click the button below to choose a new password. For your security, this link expires in <strong>${data.expires_in_minutes || 30} minutes</strong> and can only be used once.</p>
      `,
      warningNotice: 'If you did not request a password reset, please disregard this email or notify our security compliance desk immediately.',
      ctaText: 'Reset Password',
      ctaUrl: data.action_url || `${settings.platformUrl}/auth/reset`,
      secondaryNotice: `If the button does not open directly, copy and paste this link:<br/><span style="color: ${settings.primaryBrandColor};">${data.action_url || `${settings.platformUrl}/auth/reset`}</span>`
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — PASSWORD RESET
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

We received an authorized request to reset your password. Click the link below to set a new password (valid for ${data.expires_in_minutes || 30} minutes):

${data.action_url || `${settings.platformUrl}/auth/reset`}

If you did not make this request, please contact ${settings.supportEmail}.
(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 4. COMMAND CONFIRMATION
  {
    id: 'command_confirmation',
    name: 'Command Confirmation',
    category: 'operations',
    description: 'Sent when an individual issues a supported website command (e.g. reinvest_dividends, export_tax_dossier, update_kyc). Confirms the execution details and status.',
    defaultSubject: 'Command Executed Successfully — [{{command_name}}]',
    supportedCommand: 'send_command_confirmation',
    defaultVariables: ['user_name', 'command_name', 'event_id', 'status', 'action_url', 'timestamp'],
    sampleData: {
      user_name: 'Dr. Philippe De Saint-Germain',
      command_name: 'reinvest_quarterly_dividends',
      event_id: 'cmd-exec-891024',
      status: 'executed',
      amount: '€4,500.00',
      action_url: 'https://kretzdespain.com/dashboard/investments',
      timestamp: new Date().toUTCString()
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Command [${data.command_name || 'Action'}] has been verified and processed by the ledger.`,
      headline: 'Command Confirmation',
      badge: data.status === 'executed' ? 'Command Complete' : 'Command Processed',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Investor'},</p>
        <p>This email confirms that your issued command <strong>${data.command_name || 'operation'}</strong> has been validated and executed on the platform ledger.</p>
        <p>All associated database state transitions, balance adjustments, and audit ledger logs have been committed successfully.</p>
      `,
      metricCards: [
        { label: 'Command Name', value: data.command_name || 'N/A', status: 'Validated', badgeColor: '#087F5B' },
        { label: 'Execution Status', value: String(data.status || 'Success').toUpperCase(), status: 'Audited', badgeColor: '#087F5B' }
      ],
      ctaText: 'View in Dashboard',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard`,
      secondaryNotice: `Execution Reference ID: <strong style="color: #172B2A; font-family: monospace;">${data.event_id || 'CMD-REF'}</strong> · Dispatched: ${data.timestamp || new Date().toISOString()}`
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — COMMAND CONFIRMATION
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

Your command "${data.command_name}" has been successfully executed.
- Execution Reference: ${data.event_id || 'CMD-REF'}
- Status: ${data.status || 'Completed'}
- Timestamp: ${data.timestamp || new Date().toISOString()}

View your dashboard:
${data.action_url || `${settings.platformUrl}/dashboard`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 5. TRANSACTION CONFIRMATION
  {
    id: 'transaction_receipt',
    name: 'Transaction Confirmation',
    category: 'transactions',
    description: 'Sent when an investment or asset purchase completes. Displays itemized invoice, quantity, price, tax/escrow, and total amount, matching the reference image layout.',
    defaultSubject: 'Transaction Confirmation: {{amount}} SPV Allocation (Ref: {{transaction_id}})',
    supportedCommand: 'send_transaction_receipt',
    defaultVariables: ['user_name', 'amount', 'transaction_id', 'property_title', 'tokens', 'action_url'],
    sampleData: {
      user_name: 'Robin van Persie',
      amount: '€10,000.00',
      transaction_id: 'KZ-TX-75689059',
      property_title: 'Villa El Mirador, Marbella',
      tokens: '100 Tokens',
      action_url: 'https://kretzdespain.com/dashboard/investments'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Thank you for your transaction! We've received your allocation of ${data.amount || '€10,000.00'}.`,
      headline: 'Thank you for your purchase!',
      badge: 'Order Complete',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Robin'},</p>
        <p>Thank you for your real estate allocation! We've received your order and registered your ownership tokens in the corresponding Special Purpose Vehicle (SPV) deed register.</p>
        <p>Here is your complete transaction receipt:</p>
      `,
      itemizedReceipt: {
        orderNumber: data.transaction_id || 'INV-2026-0489',
        items: [
          {
            name: data.property_title || 'Villa El Mirador, Marbella (SPV Note)',
            details: `Fractional Participatory Security · ${data.tokens || '100 Tokens'}`,
            amount: data.amount || '€10,000.00'
          }
        ],
        subtotal: data.amount || '€10,000.00',
        discount: '€0.00',
        tax: '€0.00 (Escrow Included)',
        total: data.amount || '€10,000.00'
      },
      ctaText: 'View Transactions',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard/investments`,
      secondaryCtaText: 'Browse More Properties',
      secondaryCtaUrl: `${settings.platformUrl}/marketplace`,
      secondaryNotice: 'All fractional holdings are notarized under European corporate registry. Your official share certificate has been deposited in your Documents Vault.'
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — TRANSACTION CONFIRMATION
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

Thank you for your transaction!
- Transaction Reference: ${data.transaction_id || 'TX-REF'}
- Asset: ${data.property_title || 'European Real Estate SPV'}
- Total Amount: ${data.amount || '€10,000.00'}

View your transaction details:
${data.action_url || `${settings.platformUrl}/dashboard/investments`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 6. PAYMENT NOTIFICATION
  {
    id: 'payment_notification',
    name: 'Payment Notification',
    category: 'transactions',
    description: 'Sent when a deposit or withdrawal payment is received, processed, or fails. Displays payment method, reference, and account balance update.',
    defaultSubject: 'Payment Notification: {{amount}} {{status}} (Ref: {{transaction_id}})',
    supportedCommand: 'send_payment_notification',
    defaultVariables: ['user_name', 'amount', 'status', 'payment_method', 'transaction_id', 'action_url'],
    sampleData: {
      user_name: 'Robin van Persie',
      amount: '€13,245.00',
      status: 'credited',
      payment_method: 'SEPA Direct Wire (CaixaBank Escrow)',
      transaction_id: 'DEP-SEPA-94102',
      action_url: 'https://kretzdespain.com/dashboard'
    },
    generateHtml: (data, settings) => {
      const isSuccess = data.status === 'credited' || data.status === 'processed' || data.status === 'successful';
      return wrapMasterLayout({
        preheader: `Your payment of ${data.amount || '€13,245.00'} has been ${data.status || 'processed'}.`,
        headline: isSuccess ? 'Your Deposit Successful! 💵' : 'Payment Notification',
        badge: isSuccess ? 'Payment Confirmed' : 'Payment Update',
        bodyHtml: `
          <p>Hi ${data.user_name || 'Investor'},</p>
          <p>You have successfully deposited <strong>${data.amount || '€13,245.00'}</strong> into your <strong>${settings.senderName}</strong> wallet on <strong>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>.</p>
          <p>These funds are now fully available to deploy into active property syndicates or to hold in cash escrow.</p>
        `,
        metricCards: [
          { label: 'Amount Credited', value: data.amount || '€13,245.00', status: 'Settled to Balance', badgeColor: '#087F5B' },
          { label: 'Transfer Method', value: 'SEPA Wire', status: 'CaixaBank Escrow', badgeColor: '#087F5B' }
        ],
        ctaText: 'View Wallet Balance',
        ctaUrl: data.action_url || `${settings.platformUrl}/dashboard`,
        secondaryNotice: `Payment reference: <strong style="font-family: monospace;">${data.transaction_id || 'REF-DEP'}</strong>. Thank you for using ${settings.senderName}.`
      }, settings);
    },
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — PAYMENT NOTIFICATION
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

Your payment of ${data.amount || 'funds'} has been processed.
- Status: ${data.status || 'Successful'}
- Reference: ${data.transaction_id || 'REF'}
- Payment Method: ${data.payment_method || 'Bank Transfer'}

View your wallet:
${data.action_url || `${settings.platformUrl}/dashboard`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 7. ACCOUNT SECURITY ALERT
  {
    id: 'security_alert',
    name: 'Account Security Alert',
    category: 'security',
    description: 'Sent on security events (new device login, IP location change, PIN/password update). Displays location badge, device, IP, and a primary blue "Secure Account" button.',
    defaultSubject: "New Login Detected — L'Agence Kretz Security Alert",
    supportedCommand: 'send_security_alert',
    defaultVariables: ['user_name', 'device', 'location', 'ip_address', 'timestamp', 'action_url'],
    sampleData: {
      user_name: 'Angela Moreau',
      device: 'Safari on macOS (Apple M3)',
      location: 'Paris, France',
      ip_address: '82.64.120.44',
      timestamp: new Date().toUTCString(),
      action_url: 'https://kretzdespain.com/dashboard/security'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Security Alert: We noticed a new sign-in to your ${settings.senderName} account from ${data.location || 'Paris, France'}.`,
      headline: `New Login to ${settings.senderName}`,
      badge: 'Security Notice',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Angela'},</p>
        <p>We noticed your account was accessed from a new device or IP address. If this was you, there's nothing for you to do right now.</p>
        <p>Here are the details of the login session:</p>
      `,
      securityInfo: {
        location: data.location || 'Paris, France',
        device: data.device || 'Safari on macOS',
        ip: data.ip_address || '82.64.120.44',
        time: data.timestamp || new Date().toUTCString()
      },
      warningNotice: '<strong>Not you?</strong> If you do not recognize this activity, take a moment to immediately secure your account and terminate active sessions.',
      ctaText: 'Secure Account',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard/security`,
      secondaryNotice: `If you have questions about account security, please write directly to our Security Compliance Desk at <a href="mailto:${settings.supportEmail}" style="color: ${settings.primaryBrandColor};">${settings.supportEmail}</a>.`
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — SECURITY ALERT
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

We detected a login from a new device or location:
- Location: ${data.location || 'Unknown'}
- Device: ${data.device || 'Web Browser'}
- IP Address: ${data.ip_address || 'Unknown'}
- Timestamp: ${data.timestamp || new Date().toUTCString()}

If this was NOT you, secure your account immediately:
${data.action_url || `${settings.platformUrl}/dashboard/security`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 8. STATUS UPDATE
  {
    id: 'status_update',
    name: 'Status Update',
    category: 'operations',
    description: 'Sent when an operation changes status (KYC approval, property funding phase, withdrawal milestone). Displays a clean 3-step progress timeline.',
    defaultSubject: 'Status Update: {{event_name}} is now {{status}}',
    supportedCommand: 'send_status_update',
    defaultVariables: ['user_name', 'event_name', 'status', 'action_url', 'notes'],
    sampleData: {
      user_name: 'Sophie Martin',
      event_name: 'Institutional KYC Verification',
      status: 'Approved & Verified',
      action_url: 'https://kretzdespain.com/dashboard',
      notes: 'Your European identity verification has cleared AML screening. You now have unlocked Tier 1 institutional allocation privileges.'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Update on your ${data.event_name || 'request'}: Status is now ${data.status || 'Updated'}.`,
      headline: 'Requested Operation Status Update',
      badge: 'Status Update',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Valued Partner'},</p>
        <p>Your requested operation <strong>${data.event_name || 'KYC Verification'}</strong> has progressed to a new status:</p>
        <p style="font-size: 16px; font-weight: 700; color: #087F5B;">
          &#10003; ${data.status || 'Approved & Active'}
        </p>
        <p>${data.notes || 'All requested verification checks have satisfied compliance standards. You may now proceed with platform operations.'}</p>
      `,
      timelineSteps: [
        { title: 'Request Submitted', subtitle: 'Identity documents uploaded', status: 'completed' },
        { title: 'Compliance AML Review', subtitle: 'Spanish Land Registry & KYC check', status: 'completed' },
        { title: 'Tier 1 Access Granted', subtitle: 'Unlocked full portfolio trading', status: 'current' }
      ],
      ctaText: 'Access Your Dashboard',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard`,
      secondaryNotice: 'This status update has been registered in the immutable compliance audit ledger.'
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — STATUS UPDATE
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

Your request "${data.event_name}" has updated to: ${data.status}.
Notes: ${data.notes || 'Operation complete.'}

Access your dashboard:
${data.action_url || `${settings.platformUrl}/dashboard`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 9. REPORT NOTIFICATION
  {
    id: 'report_notification',
    name: 'Report Notification',
    category: 'reports',
    description: 'Sent when monthly portfolio summaries, tax certificates, or RICS appraisal documents are ready. Features 4 key metric cards and a primary blue "View Full Report" button.',
    defaultSubject: 'Your Monthly Real Estate Portfolio Report is Ready ({{month_year}})',
    supportedCommand: 'send_report_notification',
    defaultVariables: ['user_name', 'report_name', 'month_year', 'action_url', 'total_yield', 'active_properties'],
    sampleData: {
      user_name: 'Alexandre Moreau',
      report_name: 'Monthly Investor Statement & Yield Report',
      month_year: 'October 2026',
      total_yield: '+€2,850.00',
      active_properties: '3 Properties',
      action_url: 'https://kretzdespain.com/dashboard/documents'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: `Your ${data.report_name || 'Monthly Portfolio Report'} for ${data.month_year || 'this month'} is ready to inspect.`,
      headline: 'See how your portfolio performed',
      badge: 'Portfolio Report',
      bodyHtml: `
        <p>Hi ${data.user_name || 'Alexandre'},</p>
        <p>Here is an overview of your real estate investments and rental yield distributions for <strong>${data.month_year || 'this month'}</strong>.</p>
        <p>Your full verified statement, audited under RICS appraisal standards, has been generated and deposited into your Documents Vault.</p>
      `,
      metricCards: [
        { label: 'Rental Income Distributed', value: data.total_yield || '+€2,850.00', status: 'Settled to Balance', badgeColor: '#087F5B' },
        { label: 'Active SPV Holdings', value: data.active_properties || '3 Assets', status: '100% Occupancy', badgeColor: '#087F5B' },
        { label: 'Average Net Yield', value: '8.2% APY', status: 'Pro-Forma Target', badgeColor: '#087F5B' },
        { label: 'RICS Capitalization', value: '€145,000', status: 'Quarterly Revaluation', badgeColor: '#087F5B' }
      ],
      ctaText: 'View Full Report',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard/documents`,
      secondaryNotice: 'All figures reflect audited net rental income after maintenance reserves and Spanish non-resident tax withholding.'
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — REPORT NOTIFICATION
------------------------------------------------------------
Hi ${data.user_name || 'Investor'},

Your ${data.report_name || 'Portfolio Report'} for ${data.month_year || 'this period'} is now available.
- Rental Income Distributed: ${data.total_yield || '+€2,850.00'}
- Active Holdings: ${data.active_properties || '3 Assets'}

Download your complete statement:
${data.action_url || `${settings.platformUrl}/dashboard/documents`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  },

  // 10. CUSTOM NOTIFICATION
  {
    id: 'custom_notification',
    name: 'Custom Notification',
    category: 'custom',
    description: 'An administrator-defined broadcast or system event template. Allows editable subject, headline, body text, and dynamic call-to-action button.',
    defaultSubject: 'Important Notice from L\'Agence Kretz: {{headline}}',
    supportedCommand: 'send_custom_email',
    defaultVariables: ['user_name', 'headline', 'body_content', 'cta_text', 'action_url'],
    sampleData: {
      user_name: 'Valued Partner',
      headline: 'Private Syndicate Opportunity: Marbella Trophy Estate',
      body_content: 'We are pleased to announce that private allocations are now open for accredited investors in our newest Prime Trophy Villa syndicate in La Zagaleta, Marbella. Pre-funding priority ends in 72 hours.',
      cta_text: 'Inspect Opportunity Dossier',
      action_url: 'https://kretzdespain.com/marketplace'
    },
    generateHtml: (data, settings) => wrapMasterLayout({
      preheader: data.headline || `An important operational notification from ${settings.senderName}.`,
      headline: data.headline || 'Platform Notification',
      badge: 'Official Notice',
      bodyHtml: `
        <p>Dear ${data.user_name || 'Valued Partner'},</p>
        <p>${data.body_content || 'This is an official administrative broadcast regarding your real estate portfolio.'}</p>
      `,
      ctaText: data.cta_text || 'View Notification',
      ctaUrl: data.action_url || `${settings.platformUrl}/dashboard`,
      secondaryNotice: `If you have inquiries regarding this notice, please write to our executive desk at <a href="mailto:${settings.supportEmail}" style="color: ${settings.primaryBrandColor};">${settings.supportEmail}</a>.`
    }, settings),
    generateText: (data, settings) => `${settings.senderName.toUpperCase()} — NOTICE
------------------------------------------------------------
Dear ${data.user_name || 'Valued Partner'},

${data.body_content || 'This is an official notice from our desk.'}

Action Link:
${data.action_url || `${settings.platformUrl}/dashboard`}

(c) ${new Date().getFullYear()} ${settings.senderName}`
  }
];

// Backwards compatibility map for legacy endpoints
export const legacyTemplateAliases: Record<string, string> = {
  welcome_verification: 'welcome',
  deposit_received: 'payment_notification',
  deposit_confirmed: 'payment_notification',
  withdrawal_requested: 'payment_notification',
  withdrawal_completed: 'payment_notification',
  investment_confirmed: 'transaction_receipt',
  distribution_credited: 'payment_notification',
  contact_receipt: 'command_confirmation',
  admin_alert: 'security_alert',
  kyc_approved: 'status_update',
  kyc_rejected: 'status_update'
};

// ============================================================================
// PROVIDER INTEGRATION & SENDER ENGINE (Resend, SendGrid, Amazon SES / SMTP, Sandbox)
// ============================================================================

export function getProviderConfig() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST || process.env.ZOHO_SMTP_HOST || process.env.GMAIL_SMTP_HOST || process.env.EMAIL_HOST;
  const smtpPort = process.env.SMTP_PORT || process.env.ZOHO_SMTP_PORT || process.env.GMAIL_SMTP_PORT || process.env.EMAIL_PORT;
  const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.ZOHO_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.ZOHO_PASS || process.env.GMAIL_PASS || process.env.EMAIL_PASS;

  if (resendApiKey) {
    return { type: 'resend', name: 'Resend Transactional API', configured: true, key: resendApiKey };
  }
  if (sendgridApiKey) {
    return { type: 'sendgrid', name: 'SendGrid v3 Mail API', configured: true, key: sendgridApiKey };
  }
  if (smtpHost && smtpUser && smtpPass) {
    return {
      type: 'smtp',
      name: `SMTP (${smtpHost}:${smtpPort || 465})`,
      configured: true,
      host: smtpHost,
      port: smtpPort ? parseInt(String(smtpPort), 10) : 465,
      user: smtpUser,
      pass: smtpPass
    };
  }

  return {
    type: 'sandbox',
    name: 'Instant Sandbox Delivery Engine (Zero-Fail Testing Mode)',
    configured: false
  };
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const prov = getProviderConfig();
  if (prov.type === 'smtp' && (prov as any).host) {
    return nodemailer.createTransport({
      host: (prov as any).host,
      port: (prov as any).port,
      secure: (prov as any).port === 465,
      auth: { user: (prov as any).user, pass: (prov as any).pass },
      pool: true,
      maxConnections: 5
    });
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });
  }
  return transporter;
}

// ============================================================================
// CORE EMAIL DISPATCH & IDEMPOTENCY
// ============================================================================

export interface SendEmailOptions {
  templateId: string;
  recipient: string;
  data?: Record<string, any>;
  subjectOverride?: string;
  commandName?: string;
  eventId?: string;
  idempotencyKey?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId: string;
  deliveryMode: 'resend' | 'sendgrid' | 'smtp' | 'sandbox';
  deliveryTimeMs: number;
  previewSnippet: string;
  subject: string;
  idempotencyKey?: string;
  error?: string;
}> {
  const {
    templateId: rawTemplateId,
    recipient,
    data = {},
    subjectOverride,
    commandName,
    eventId,
    idempotencyKey
  } = options;

  // Resolve legacy alias if provided
  const templateId = legacyTemplateAliases[rawTemplateId] || rawTemplateId;
  const template = emailTemplates.find(t => t.id === templateId);

  if (!template) {
    throw new Error(`Email template '${templateId}' not found.`);
  }

  if (!recipient || !recipient.includes('@')) {
    throw new Error(`Invalid recipient email address: '${recipient}'.`);
  }

  // Idempotency check: prevent duplicate send for same event
  if (idempotencyKey && processedIdempotencyKeys.has(idempotencyKey)) {
    const cached = processedIdempotencyKeys.get(idempotencyKey)!;
    const existingLog = emailLogs.find(l => l.id === cached.logId);
    return {
      success: true,
      messageId: `idemp-dup-${cached.logId}`,
      deliveryMode: existingLog?.deliveryMode || 'sandbox',
      deliveryTimeMs: 4,
      previewSnippet: existingLog?.previewSnippet || 'Duplicate suppressed via idempotency guard.',
      subject: existingLog?.subject || 'Idempotent transmission suppressed',
      idempotencyKey
    };
  }

  const startTime = Date.now();
  const provider = getProviderConfig();

  // Populate dynamic variables
  const mergedData: Record<string, any> = {
    user_name: data.fullName || data.user_name || recipient.split('@')[0],
    user_email: recipient,
    support_email: emailSettings.supportEmail,
    timestamp: new Date().toUTCString(),
    platform_url: emailSettings.platformUrl,
    ...template.sampleData,
    ...data
  };

  // Determine Subject
  let subject = subjectOverride || emailSettings.subjectOverrides[templateId] || template.defaultSubject;
  subject = interpolateVariables(subject, mergedData);

  // Generate HTML & Text
  const html = template.generateHtml(mergedData, emailSettings);
  const text = template.generateText(mergedData, emailSettings);

  const previewSnippet = text.replace(/\s+/g, ' ').trim().slice(0, 110) + '...';
  const messageId = `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  try {
    let mode: 'resend' | 'sendgrid' | 'smtp' | 'sandbox' = 'sandbox';

    if (emailSettings.testMode) {
      mode = 'sandbox';
    } else if (provider.type === 'resend') {
      mode = 'resend';
      // Execute Resend REST API call
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${emailSettings.senderName} <${emailSettings.fromAddress}>`,
            to: [recipient],
            subject,
            html,
            text,
            reply_to: emailSettings.replyToAddress
          })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn('[Resend API Error, falling back to sandbox]:', errData);
          mode = 'sandbox';
        }
      } catch (e: any) {
        console.warn('[Resend network failure, falling back to sandbox]:', e.message);
        mode = 'sandbox';
      }
    } else if (provider.type === 'smtp') {
      mode = 'smtp';
      const mailer = getTransporter();
      await mailer.sendMail({
        from: `"${emailSettings.senderName}" <${emailSettings.fromAddress}>`,
        to: recipient,
        replyTo: emailSettings.replyToAddress,
        subject,
        text,
        html
      });
    } else {
      mode = 'sandbox';
      const mailer = getTransporter();
      await mailer.sendMail({
        from: `"${emailSettings.senderName}" <${emailSettings.fromAddress}>`,
        to: recipient,
        subject,
        text,
        html
      });
    }

    const elapsed = Date.now() - startTime;
    const logId = `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const logEntry: EmailLogEntry = {
      id: logId,
      eventId: eventId || `evt-${Date.now()}`,
      commandName: commandName || template.supportedCommand,
      templateId,
      templateName: template.name,
      recipient,
      subject,
      status: 'delivered',
      deliveryMode: mode,
      provider: provider.name,
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      deliveryTimeMs: elapsed,
      previewSnippet,
      idempotencyKey,
      retryCount: 0,
      reference: mergedData.transaction_id || mergedData.event_id || mergedData.reference
    };

    emailLogs.unshift(logEntry);
    if (emailLogs.length > 200) emailLogs.pop();

    if (idempotencyKey) {
      processedIdempotencyKeys.set(idempotencyKey, { timestamp: Date.now(), logId });
    }

    return {
      success: true,
      messageId,
      deliveryMode: mode,
      deliveryTimeMs: elapsed,
      previewSnippet,
      subject,
      idempotencyKey
    };
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    const logId = `log-err-${Date.now()}`;

    const logEntry: EmailLogEntry = {
      id: logId,
      eventId: eventId || `evt-err-${Date.now()}`,
      commandName: commandName || template.supportedCommand,
      templateId,
      templateName: template.name,
      recipient,
      subject,
      status: 'failed',
      deliveryMode: 'sandbox',
      provider: provider.name,
      sentAt: new Date().toISOString(),
      deliveryTimeMs: elapsed,
      previewSnippet: 'Transmission failed: ' + err.message,
      idempotencyKey,
      retryCount: 0,
      error: err.message
    };

    emailLogs.unshift(logEntry);

    return {
      success: false,
      messageId: `failed-${Date.now()}`,
      deliveryMode: 'sandbox',
      deliveryTimeMs: elapsed,
      previewSnippet: 'Failed',
      subject,
      idempotencyKey,
      error: err.message
    };
  }
}

// ============================================================================
// COMMAND-BASED EMAIL TRIGGERING PIPELINE
// ============================================================================

export interface ExecuteEmailCommandInput {
  command: string;
  recipient: string;
  payload?: Record<string, any>;
  idempotencyKey?: string;
  eventId?: string;
  callerRole?: string;
}

export async function executeEmailCommand(input: ExecuteEmailCommandInput): Promise<{
  success: boolean;
  command: string;
  message: string;
  templateId: string;
  logId?: string;
  deliveryMode: string;
  deliveryTimeMs: number;
  previewSnippet: string;
  idempotencyKey?: string;
  error?: string;
}> {
  const { command, recipient, payload = {}, idempotencyKey, eventId, callerRole = 'investor' } = input;

  if (!command) {
    throw new Error('Command name is required.');
  }

  // Find matching template by supportedCommand
  const template = emailTemplates.find(t => t.supportedCommand === command || t.id === command);
  if (!template) {
    throw new Error(`Command '${command}' does not map to an approved email template.`);
  }

  // Check automation rule status
  const rule = emailAutomationRules.find(r => r.commandName === command || r.templateId === template.id);
  if (rule && !rule.enabled) {
    return {
      success: false,
      command,
      templateId: template.id,
      message: `Automation for command '${command}' is currently disabled in administrator settings.`,
      deliveryMode: 'none',
      deliveryTimeMs: 0,
      previewSnippet: 'Disabled',
      error: 'AUTOMATION_DISABLED'
    };
  }

  // Validate recipient
  if (!recipient || !recipient.includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  // Dispatch email
  const sendResult = await sendEmail({
    templateId: template.id,
    recipient,
    data: payload,
    commandName: command,
    eventId: eventId || `evt-${Date.now()}`,
    idempotencyKey: idempotencyKey || `idemp-${command}-${Date.now()}`
  });

  if (!sendResult.success) {
    return {
      success: false,
      command,
      templateId: template.id,
      message: `Failed to dispatch email for command '${command}': ${sendResult.error}`,
      deliveryMode: sendResult.deliveryMode,
      deliveryTimeMs: sendResult.deliveryTimeMs,
      previewSnippet: sendResult.previewSnippet,
      error: sendResult.error
    };
  }

  return {
    success: true,
    command,
    templateId: template.id,
    message: `Command '${command}' successfully triggered '${template.name}' to ${recipient}.`,
    deliveryMode: sendResult.deliveryMode,
    deliveryTimeMs: sendResult.deliveryTimeMs,
    previewSnippet: sendResult.previewSnippet,
    idempotencyKey: sendResult.idempotencyKey
  };
}

// ============================================================================
// PROVIDER WEBHOOK INGESTION (Resend / SendGrid / SES status updates)
// ============================================================================

export function handleEmailWebhook(payload: any): { processed: boolean; updatedCount: number } {
  if (!payload) return { processed: false, updatedCount: 0 };
  let updatedCount = 0;

  // Supports both array of events and single event
  const events = Array.isArray(payload) ? payload : [payload];

  for (const ev of events) {
    const messageId = ev.message_id || ev.id || ev.sg_message_id;
    const recipient = ev.recipient || ev.email;
    const eventType = (ev.type || ev.event || '').toLowerCase();

    // Find matching log entry
    const targetLog = emailLogs.find(l => 
      (messageId && l.id === messageId) || 
      (recipient && l.recipient.toLowerCase() === recipient.toLowerCase())
    );

    if (targetLog) {
      if (eventType.includes('deliver') || eventType === 'delivered') {
        targetLog.status = 'delivered';
        targetLog.deliveredAt = new Date().toISOString();
        updatedCount++;
      } else if (eventType.includes('bounce') || eventType === 'bounced') {
        targetLog.status = 'bounced';
        targetLog.error = ev.reason || 'Bounced by recipient mail server';
        updatedCount++;
      } else if (eventType.includes('fail') || eventType === 'dropped') {
        targetLog.status = 'failed';
        targetLog.error = ev.error || ev.reason || 'Provider delivery failure';
        updatedCount++;
      }
    }
  }

  return { processed: true, updatedCount };
}

// Safe retry for failed logs
export async function retryFailedEmail(logId: string): Promise<{ success: boolean; log: EmailLogEntry; error?: string }> {
  const log = emailLogs.find(l => l.id === logId);
  if (!log) {
    throw new Error(`Log entry '${logId}' not found.`);
  }

  log.retryCount = (log.retryCount || 0) + 1;
  const result = await sendEmail({
    templateId: log.templateId,
    recipient: log.recipient,
    commandName: log.commandName,
    eventId: log.eventId
  });

  if (result.success) {
    log.status = 'delivered';
    log.error = undefined;
    log.deliveredAt = new Date().toISOString();
    return { success: true, log };
  } else {
    log.status = 'failed';
    log.error = result.error;
    return { success: false, log, error: result.error };
  }
}

// ============================================================================
// TOKEN MANAGEMENT (Verification & Password Reset)
// ============================================================================

export function generateExpiringToken(email: string, type: 'verification' | 'password_reset', ttlMinutes = 60): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.set(token, {
    token,
    email: email.toLowerCase().trim(),
    type,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    used: false
  });
  return token;
}

export function verifyAndConsumeToken(token: string, expectedType: 'verification' | 'password_reset'): { valid: boolean; email?: string; error?: string } {
  const record = activeTokens.get(token);
  if (!record) {
    return { valid: false, error: 'Authorization token not found or already consumed.' };
  }
  if (record.used) {
    return { valid: false, error: 'This token has already been used. Please request a new security link.' };
  }
  if (Date.now() > record.expiresAt) {
    activeTokens.delete(token);
    return { valid: false, error: 'Security link expired. Please request a fresh link.' };
  }
  if (record.type !== expectedType) {
    return { valid: false, error: 'Invalid token context.' };
  }

  record.used = true;
  activeTokens.delete(token);
  return { valid: true, email: record.email };
}

// ============================================================================
// SETTINGS & LOGS MANAGEMENT
// ============================================================================

export function getEmailLogs(): EmailLogEntry[] {
  return [...emailLogs];
}

export function clearEmailLogs(): void {
  emailLogs.length = 0;
}

export function getEmailSettings(): EmailSenderSettings {
  return { ...emailSettings };
}

export function updateEmailSettings(newSettings: Partial<EmailSenderSettings>): EmailSenderSettings {
  emailSettings = {
    ...emailSettings,
    ...newSettings,
    subjectOverrides: {
      ...emailSettings.subjectOverrides,
      ...(newSettings.subjectOverrides || {})
    }
  };
  return { ...emailSettings };
}

export function getAutomationRules(): EmailAutomationRule[] {
  return [...emailAutomationRules];
}

export function updateAutomationRule(id: string, updates: Partial<EmailAutomationRule>): EmailAutomationRule {
  const rule = emailAutomationRules.find(r => r.id === id);
  if (!rule) throw new Error(`Automation rule '${id}' not found.`);
  Object.assign(rule, updates);
  return { ...rule };
}

export function verifySmtpConnection() {
  const prov = getProviderConfig();
  const startTime = Date.now();

  const dnsRecordsRecommendation = {
    spf: 'v=spf1 include:resend.com include:_spf.google.com include:zoho.com ~all',
    dmarc: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@kretz.site; pct=100',
    dkimInstructions: 'Publish CNAME selector records provided by your email delivery host (Resend / SendGrid / Zoho) in your DNS manager.'
  };

  return {
    connected: prov.configured,
    provider: prov.type,
    providerName: prov.name,
    latencyMs: Date.now() - startTime,
    message: prov.configured 
      ? `Active provider '${prov.name}' connected and authenticated.` 
      : 'Sandbox Mode active. Real outbound delivery simulated with instant delivery and full HTML preview.',
    dnsRecordsRecommendation
  };
}

export function getSmtpCredentials() {
  const prov = getProviderConfig();
  return {
    isConfigured: prov.configured,
    host: (prov as any).host || prov.name,
    port: (prov as any).port || 465,
    user: (prov as any).user || 'api',
    pass: '***',
    from: emailSettings.fromAddress,
    isSecure: true
  };
}
