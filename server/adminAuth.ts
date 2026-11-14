/**
 * Kretz Server-Side Administrator Authentication Service
 *
 * Provides:
 * - Persistent custom administrator credentials (bcrypt cost-12 hash) set via Admin Security Console
 * - Environment-based administrator credential verification (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD)
 * - Cryptographic password verification using bcryptjs with constant-time comparison
 * - Server-side signed session tokens using SESSION_SECRET
 * - Brute-force rate limiting and temporary account lockout
 * - In-memory active session store with token revocation on logout or password rotation
 * - Zero client-side leakage of password hashes or session secrets
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Interface for verified session payload
export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: 'admin';
  fullName: string;
  credUpdatedAt: string | null;
  iat: number;
  exp: number;
  jti: string;
}

export interface CustomAdminCredentials {
  adminEmail: string;
  fullName: string;
  passwordHash: string;
  updatedAt: string;
}

// In-memory tracking for failed attempts & revoked session JTIs
interface FailedAttemptRecord {
  attempts: number;
  lockoutUntil: number;
}

const failedAttempts = new Map<string, FailedAttemptRecord>();
const issuedAdminJtis = new Set<string>();
const revokedAdminJtis = new Set<string>();

function revokeAllIssuedSessions(): void {
  for (const jti of issuedAdminJtis) {
    revokedAdminJtis.add(jti);
  }
  issuedAdminJtis.clear();
}

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let cachedCustomCreds: CustomAdminCredentials | null | undefined = null;

function loadCustomCredentials(): CustomAdminCredentials | null {
  // Production credentials are stored in Supabase by persistentAdminAuth.ts.
  // This legacy in-memory implementation is retained for local development only.
  if (process.env.NODE_ENV === 'production') return null;
  return cachedCustomCreds || null;
}

// Never generate cryptographic randomness during module initialization.
// Cloudflare Workers prohibit randomBytes() in global scope. A configured
// SESSION_SECRET (or legacy JWT_SECRET) is required for signed admin sessions.

/**
 * Resolve Administrator configuration from custom store or server environment variables
 */

export function getAdminConfig() {
  const custom = loadCustomCredentials();
  const rawEnvEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const isPlaceholderEmail =
    !rawEnvEmail ||
    rawEnvEmail === 'admin@example.com' ||
    rawEnvEmail.startsWith('replace_with');
  const envEmail = isPlaceholderEmail
    ? (process.env.NODE_ENV === 'production' ? '' : 'admin@kretz.com')
    : rawEnvEmail;

  const rawHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  const isValidBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(rawHash);
  const envPasswordHash = isValidBcryptHash ? rawHash : null;

  const rawPlain = process.env.ADMIN_PASSWORD?.trim() || '';
  const isPlaceholderPlain =
    !rawPlain ||
    rawPlain.startsWith('replace_with') ||
    rawPlain === 'your_secure_password';
  const envPlaintextPassword = isPlaceholderPlain ? null : rawPlain;

  // Fail closed when no signing secret is configured. Do not create random
  // values during module evaluation: Workers reject crypto randomness in global scope.
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || '';

  if (custom) {
    return {
      adminEmail: custom.adminEmail,
      fullName: custom.fullName,
      passwordHash: custom.passwordHash,
      plaintextPassword: null,
      sessionSecret,
      isCustomConfigured: true,
      updatedAt: custom.updatedAt,
    };
  }

  return {
    adminEmail: envEmail,
    fullName: 'Executive Administrator',
    passwordHash: envPasswordHash,
    plaintextPassword: envPlaintextPassword,
    sessionSecret,
    isCustomConfigured: false,
    updatedAt: null as string | null,
  };
}

/**
 * Validate server configuration mode
 */
export function validateAdminEnvironment(): {
  configured: boolean;
  mode: 'custom_bcrypt' | 'bcrypt_hash' | 'environment_password' | 'development_fallback';
} {
  const config = getAdminConfig();
  if (config.isCustomConfigured) {
    return { configured: true, mode: 'custom_bcrypt' };
  }
  if (config.passwordHash) {
    return { configured: true, mode: 'bcrypt_hash' };
  }
  if (config.plaintextPassword) {
    return { configured: true, mode: 'environment_password' };
  }
  return {
    configured: process.env.NODE_ENV !== 'production' && Boolean(config.adminEmail && config.sessionSecret),
    mode: 'development_fallback'
  };
}

/**
 * Verify administrator credentials securely on the server
 */
export async function verifyAdminCredentials(password: string): Promise<boolean> {
  if (!password) return false;
  const config = getAdminConfig();
  if (!config.adminEmail || !config.sessionSecret) return false;

  // 1. If secure bcrypt password hash is configured (Custom Admin Store or Production Env)
  if (config.passwordHash) {
    try {
      return await bcrypt.compare(password, config.passwordHash);
    } catch (err) {
      console.error('Error verifying admin password hash with bcrypt:', err);
      return false;
    }
  }

  // 2. If plaintext password is provided in env (Deployment Variable)
  if (config.plaintextPassword) {
    const a = Buffer.from(password);
    const b = Buffer.from(config.plaintextPassword);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  // 3. Development / Sandbox fallback only. Production must have an explicit secret.
  if (process.env.NODE_ENV === 'production') return false;
  const devDefault = 'AdminSecure2026!#';
  const a = Buffer.from(password);
  const b = Buffer.from(devDefault);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Persist custom administrator email, display name, and bcrypt-hashed password
 */
export async function updateCustomAdminCredentials(params: {
  email: string;
  fullName?: string;
  passwordToHash: string;
}): Promise<CustomAdminCredentials> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName?.trim() || getAdminConfig().fullName || 'Executive Administrator';
  const passwordHash = await bcrypt.hash(params.passwordToHash, 12);
  const updated: CustomAdminCredentials = {
    adminEmail: cleanEmail,
    fullName: cleanName,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  cachedCustomCreds = updated;

  // Invalidate previously issued admin sessions upon credential rotation
  revokeAllIssuedSessions();
  failedAttempts.clear();

  return updated;
}

/**
 * Reset custom administrator credentials back to environment or default configuration
 */
export function resetCustomAdminCredentials(): void {
  cachedCustomCreds = null;
  revokeAllIssuedSessions();
  failedAttempts.clear();
}

/**
 * Create a cryptographically signed session token
 */
export function createAdminSession(
  email: string,
  fullName?: string
): { token: string; payload: AdminSessionPayload } {
  const config = getAdminConfig();
  if (!config.sessionSecret) {
    throw new Error('Administrator session signing is not configured. Set SESSION_SECRET in the Worker secrets.');
  }
  const now = Date.now();
  const jti = crypto.randomBytes(16).toString('hex');

  const payload: AdminSessionPayload = {
    sub: 'usr-admin-01',
    email: email.trim().toLowerCase(),
    role: 'admin',
    fullName: fullName?.trim() || config.fullName || 'Executive Administrator',
    credUpdatedAt: config.updatedAt || null,
    iat: now,
    exp: now + SESSION_DURATION_MS,
    jti,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadBase64)
    .digest('base64url');

  const token = `kretz_adm_${payloadBase64}.${signature}`;

  issuedAdminJtis.add(jti);

  return { token, payload };
}

/**
 * Verify a signed admin session token
 */
export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  if (!token || !token.startsWith('kretz_adm_')) {
    return null;
  }

  try {
    const raw = token.slice('kretz_adm_'.length);
    const [payloadBase64, signature] = raw.split('.');
    if (!payloadBase64 || !signature) return null;

    const config = getAdminConfig();
    const expectedSignature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadBase64)
      .digest('base64url');

    // Timing-safe signature check
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;

    // Check expiration
    if (Date.now() > payload.exp) {
      revokedAdminJtis.add(payload.jti);
      issuedAdminJtis.delete(payload.jti);
      return null;
    }

    // Check explicit logout / rotation revocation
    if (revokedAdminJtis.has(payload.jti)) {
      return null;
    }

    // Ensure token matches current active administrator email and credential version
    if (
      payload.email !== config.adminEmail ||
      (payload.credUpdatedAt || null) !== (config.updatedAt || null)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Invalidate / revoke an active admin session
 */
export function revokeAdminSession(token: string): boolean {
  if (!token || !token.startsWith('kretz_adm_')) return false;
  try {
    const raw = token.slice('kretz_adm_'.length);
    const [payloadBase64] = raw.split('.');
    if (!payloadBase64) return false;
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as AdminSessionPayload;
    issuedAdminJtis.delete(payload.jti);
    revokedAdminJtis.add(payload.jti);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check rate limit status for an IP / identifier
 */
export function checkAdminRateLimit(identifier: string): { isLocked: boolean; remainingSeconds?: number } {
  const record = failedAttempts.get(identifier);
  if (!record) return { isLocked: false };

  const now = Date.now();
  if (now < record.lockoutUntil) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // Lockout expired
  if (record.lockoutUntil > 0) {
    failedAttempts.delete(identifier);
  }
  return { isLocked: false };
}

/**
 * Record a failed admin login attempt
 */
export function recordAdminFailedAttempt(identifier: string): {
  attempts: number;
  isLocked: boolean;
  remainingSeconds?: number;
} {
  const now = Date.now();
  const record = failedAttempts.get(identifier) || { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(identifier, record);
    return {
      attempts: record.attempts,
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  failedAttempts.set(identifier, record);
  return {
    attempts: record.attempts,
    isLocked: false,
  };
}

/**
 * Reset failed attempts on successful login
 */
export function resetAdminFailedAttempts(identifier: string) {
  failedAttempts.delete(identifier);
}
