import crypto from 'crypto';

export interface KycProviderStatus {
  provider: 'sumsub' | 'internal_aml_vault';
  mode: 'live' | 'internal';
  sumsubConfigured: boolean;
  webhookVerificationConfigured: boolean;
}

export interface KycSessionResult {
  provider: 'sumsub' | 'internal_aml_vault';
  mode: 'live' | 'internal';
  externalUserId: string;
  sdkAccessToken?: string;
  requiredSteps: Array<'kyc_identity' | 'proof_of_address' | 'accredited_proof'>;
}

export function getKycProviderStatus(): KycProviderStatus {
  const sumsubConfigured = Boolean(
    process.env.SUMSUB_APP_TOKEN?.trim() && process.env.SUMSUB_SECRET_KEY?.trim()
  );
  const webhookVerificationConfigured = Boolean(
    process.env.SUMSUB_WEBHOOK_SECRET?.trim() || process.env.SUMSUB_SECRET_KEY?.trim()
  );
  return {
    provider: sumsubConfigured ? 'sumsub' : 'internal_aml_vault',
    mode: sumsubConfigured ? 'live' : 'internal',
    sumsubConfigured,
    webhookVerificationConfigured,
  };
}

export async function createKycVerificationSession(params: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<KycSessionResult> {
  const appToken = String(process.env.SUMSUB_APP_TOKEN || '').trim();
  const secretKey = String(process.env.SUMSUB_SECRET_KEY || '').trim();
  const requiredSteps: Array<'kyc_identity' | 'proof_of_address' | 'accredited_proof'> = [
    'kyc_identity',
    'proof_of_address',
    'accredited_proof',
  ];

  if (!appToken || !secretKey) {
    return {
      provider: 'internal_aml_vault',
      mode: 'internal',
      externalUserId: params.userId,
      requiredSteps,
    };
  }

  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const levelName = encodeURIComponent(process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level');
    const externalUserId = encodeURIComponent(params.userId);
    const path = `/resources/accessTokens?userId=${externalUserId}&levelName=${levelName}&ttlInSecs=600`;
    const signature = crypto.createHmac('sha256', secretKey).update(`${ts}POST${path}`).digest('hex');

    const response = await fetch(`https://api.sumsub.com${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature,
      },
    });
    const payload: any = await response.json().catch(() => ({}));
    if (response.ok && payload?.token) {
      return {
        provider: 'sumsub',
        mode: 'live',
        externalUserId: params.userId,
        sdkAccessToken: String(payload.token),
        requiredSteps,
      };
    }
  } catch {
    // Fall back cleanly to internal AML vault workflow if external SDK token generation fails
  }

  return {
    provider: 'internal_aml_vault',
    mode: 'internal',
    externalUserId: params.userId,
    requiredSteps,
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

export function verifyKycWebhookSignature(params: {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}): { valid: boolean; reason?: string } {
  const secret = String(
    process.env.SUMSUB_WEBHOOK_SECRET || process.env.SUMSUB_SECRET_KEY || ''
  ).trim();
  const signature = String(
    params.headers['x-payload-digest'] ||
      params.headers['x-kyc-signature'] ||
      params.headers['x-signature'] ||
      ''
  ).trim();

  if (secret) {
    if (!signature) {
      return { valid: false, reason: 'Missing X-Payload-Digest or X-KYC-Signature header.' };
    }
    const cleanSig = signature.replace(/^sha256=/i, '').trim();
    const expected = crypto.createHmac('sha256', secret).update(params.rawBody).digest('hex');
    return timingSafeHexEqual(expected, cleanSig)
      ? { valid: true }
      : { valid: false, reason: 'KYC webhook HMAC signature mismatch.' };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      valid: false,
      reason: 'KYC webhook secret is not configured in production.',
    };
  }

  return { valid: true };
}
