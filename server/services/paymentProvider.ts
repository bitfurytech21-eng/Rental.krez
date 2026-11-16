import crypto from 'crypto';

export interface PaymentProviderStatus {
  provider: 'caixabank_sepa' | 'stripe' | 'sepa_manual_escrow';
  mode: 'live' | 'sandbox';
  stripeConfigured: boolean;
  sepaGatewayConfigured: boolean;
  webhookVerificationConfigured: boolean;
  supportedRails: string[];
}

export interface WebhookSignatureVerificationResult {
  valid: boolean;
  reason?: string;
  scheme?: 'stripe' | 'hmac_sha256' | 'sandbox';
}

export interface PayoutDispatchResult {
  executed: boolean;
  provider: 'caixabank_sepa' | 'manual_sepa_instruction';
  providerTransferId?: string;
  status: 'sent_to_bank' | 'queued_for_settlement' | 'failed';
  error?: string;
}

export function getPaymentProviderStatus(): PaymentProviderStatus {
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const sepaGatewayConfigured = Boolean(
    process.env.CAIXABANK_SEPA_GATEWAY_URL?.trim() && process.env.CAIXABANK_API_KEY?.trim()
  );
  const webhookVerificationConfigured = Boolean(
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
      process.env.PAYMENT_WEBHOOK_SECRET?.trim() ||
      process.env.CAIXABANK_API_KEY?.trim()
  );

  const provider = sepaGatewayConfigured
    ? 'caixabank_sepa'
    : stripeConfigured
    ? 'stripe'
    : 'sepa_manual_escrow';

  return {
    provider,
    mode: sepaGatewayConfigured || stripeConfigured ? 'live' : 'sandbox',
    stripeConfigured,
    sepaGatewayConfigured,
    webhookVerificationConfigured,
    supportedRails: [
      'SEPA Credit Transfer',
      ...(stripeConfigured ? ['Card (Stripe)'] : []),
      ...(sepaGatewayConfigured ? ['CaixaBank SEPA Direct API'] : []),
    ],
  };
}

function timingSafeHexEqual(expectedHex: string, actualHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex.trim().toLowerCase(), 'hex');
    const b = Buffer.from(actualHex.trim().toLowerCase(), 'hex');
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPaymentWebhookSignature(params: {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}): WebhookSignatureVerificationResult {
  const stripeSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const bankSecret = String(
    process.env.PAYMENT_WEBHOOK_SECRET || process.env.CAIXABANK_API_KEY || ''
  ).trim();

  const stripeSigHeader = String(params.headers['stripe-signature'] || '').trim();
  const bankSigHeader = String(
    params.headers['x-bank-signature'] || params.headers['x-signature'] || ''
  ).trim();

  if (stripeSecret && stripeSigHeader) {
    const parts = Object.fromEntries(
      stripeSigHeader.split(',').map((entry) => {
        const idx = entry.indexOf('=');
        return idx > 0 ? [entry.slice(0, idx).trim(), entry.slice(idx + 1).trim()] : [entry, ''];
      })
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) {
      return { valid: false, reason: 'Malformed Stripe-Signature header.' };
    }
    const signedPayload = `${timestamp}.${params.rawBody}`;
    const expected = crypto.createHmac('sha256', stripeSecret).update(signedPayload).digest('hex');
    return timingSafeHexEqual(expected, signature)
      ? { valid: true, scheme: 'stripe' }
      : { valid: false, reason: 'Stripe webhook signature mismatch.' };
  }

  if (bankSecret) {
    if (!bankSigHeader) {
      return { valid: false, reason: 'Missing X-Signature or Stripe-Signature header.' };
    }
    const cleanSig = bankSigHeader.replace(/^sha256=/i, '').trim();
    const expected = crypto.createHmac('sha256', bankSecret).update(params.rawBody).digest('hex');
    return timingSafeHexEqual(expected, cleanSig)
      ? { valid: true, scheme: 'hmac_sha256' }
      : { valid: false, reason: 'Payment webhook HMAC signature mismatch.' };
  }

  if (stripeSecret && !stripeSigHeader) {
    return { valid: false, reason: 'Missing Stripe-Signature header.' };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      valid: false,
      reason: 'Payment webhook secret is not configured in production.',
    };
  }

  return { valid: true, scheme: 'sandbox' };
}

export async function dispatchBankPayoutInstruction(params: {
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  iban: string;
  holderName: string;
}): Promise<PayoutDispatchResult> {
  const gatewayUrl = String(process.env.CAIXABANK_SEPA_GATEWAY_URL || '').trim();
  const apiKey = String(process.env.CAIXABANK_API_KEY || '').trim();

  if (!gatewayUrl || !apiKey) {
    return {
      executed: false,
      provider: 'manual_sepa_instruction',
      status: 'queued_for_settlement',
    };
  }

  try {
    const endpoint = `${gatewayUrl.replace(/\/+$/, '')}/payouts/sepa`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Idempotency-Key': params.reference,
      },
      body: JSON.stringify({
        transactionId: params.transactionId,
        reference: params.reference,
        amount: params.amount,
        currency: params.currency,
        creditorIban: params.iban,
        creditorName: params.holderName,
      }),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        executed: false,
        provider: 'caixabank_sepa',
        status: 'failed',
        error: payload?.error || `SEPA gateway returned HTTP ${response.status}`,
      };
    }
    return {
      executed: true,
      provider: 'caixabank_sepa',
      providerTransferId: String(payload?.transferId || payload?.id || params.reference),
      status: 'sent_to_bank',
    };
  } catch (err: any) {
    return {
      executed: false,
      provider: 'caixabank_sepa',
      status: 'failed',
      error: err?.message || 'SEPA bank gateway request failed',
    };
  }
}
