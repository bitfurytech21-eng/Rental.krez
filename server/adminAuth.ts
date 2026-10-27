/**
 * Kretz Server-Side Administrator Authentication Service
 * 
 * Provides:
 * - Environment-based administrator credential verification (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD)
 * - Cryptographic password verification using bcryptjs with constant-time comparison
 * - Server-side signed session tokens using SESSION_SECRET
 * - Brute-force rate limiting and temporary account lockout
 * - In-memory active session store with token revocation on logout
 * - Zero client-side leakage of password hashes or session secrets
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { logger } from './logger';

// Interface for verified session payload
export interface AdminSessionPayload {
  sub: string;
  email: string;
  role: 'admin';
  fullName: string;
  iat: number;
  exp: number;
  jti: string;
}

// In-memory tracking for failed attempts & active sessions
interface FailedAttemptRecord {
  attempts: number;
  lockoutUntil: number;
}

const failedAttempts = new Map<string, FailedAttemptRecord>();
const activeAdminSessions = new Map<string, AdminSessionPayload>();

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Resolve Administrator configuration from server environment variables
 */
export function getAdminConfig() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kretz.com').trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  const plaintextPassword = process.env.ADMIN_PASSWORD?.trim() || null;
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'kretz_prime_session_secret_2026_default_key';

  return {
    adminEmail,
    passwordHash,
    plaintextPassword,
    sessionSecret
  };
}

/**
 * Validate server configuration during startup
 */
export function validateAdminEnvironment(): { configured: boolean; mode: string } {
  const config = getAdminConfig();
  if (config.passwordHash) {
    return { configured: true, mode: 'bcrypt_hash' };
  }
  if (config.plaintextPassword) {
    return { configured: true, mode: 'environment_password' };
  }
  return { configured: true, mode: 'development_fallback' };
}

/**
 * Verify administrator credentials securely on the server
 */
export async function verifyAdminCredentials(password: string): Promise<boolean> {
  const config = getAdminConfig();

  // 1. If secure bcrypt password hash is provided in env (Production Standard)
  if (config.passwordHash) {
    try {
      return await bcrypt.compare(password, config.passwordHash);
    } catch (err) {
      console.error('Error verifying ADMIN_PASSWORD_HASH with bcrypt:', err);
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

  // 3. Development / Sandbox fallback if unconfigured
  // Secure default: 'AdminSecure2026!#'
  const devDefault = 'AdminSecure2026!#';
  const a = Buffer.from(password);
  const b = Buffer.from(devDefault);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Create a cryptographically signed session token
 */
export function createAdminSession(email: string): { token: string; payload: AdminSessionPayload } {
  const config = getAdminConfig();
  const now = Date.now();
  const jti = crypto.randomBytes(16).toString('hex');

  const payload: AdminSessionPayload = {
    sub: 'usr-admin-01',
    email,
    role: 'admin',
    fullName: 'Executive Administrator',
    iat: now,
    exp: now + SESSION_DURATION_MS,
    jti
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadBase64)
    .digest('base64url');

  const token = `kretz_adm_${payloadBase64}.${signature}`;

  // Store in active sessions
  activeAdminSessions.set(jti, payload);

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
      activeAdminSessions.delete(payload.jti);
      return null;
    }

    // Check active session revocation
    if (!activeAdminSessions.has(payload.jti)) {
      return null;
    }

    return payload;
  } catch (err) {
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
    return activeAdminSessions.delete(payload.jti);
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
export function recordAdminFailedAttempt(identifier: string): { attempts: number; isLocked: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = failedAttempts.get(identifier) || { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(identifier, record);
    return {
      attempts: record.attempts,
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000)
    };
  }

  failedAttempts.set(identifier, record);
  return {
    attempts: record.attempts,
    isLocked: false
  };
}

/**
 * Reset failed attempts on successful login
 */
export function resetAdminFailedAttempts(identifier: string) {
  failedAttempts.delete(identifier);
}
