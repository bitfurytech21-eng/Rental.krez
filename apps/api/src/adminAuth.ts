/**
 * Admin authentication (Node/Workers nodejs_compat compatible).
 * Custom credential file persistence is Node-only; Workers uses env/bindings.
 */
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual, randomBytes, randomUUID } from 'node:crypto';

export interface AdminSessionPayload { sub: string; email: string; role: 'admin'; fullName: string; credUpdatedAt: string | null; iat: number; exp: number; jti: string; }
export interface CustomAdminCredentials { adminEmail: string; fullName: string; passwordHash: string; updatedAt: string; }

const __isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
function __nodeReq(name: string): any { try { return __isNode ? (0, eval)('require')(name) : null; } catch { return null; } }
function __randomHex(n: number): string { try { return randomBytes(n).toString('hex'); } catch { const b = new Uint8Array(n); globalThis.crypto.getRandomValues(b); return [...b].map(x=>x.toString(16).padStart(2,'0')).join(''); } }
function __uuid(): string { try { return randomUUID(); } catch { return (globalThis.crypto as any)?.randomUUID?.() || `adm-${Date.now()}-${Math.random().toString(36).slice(2)}`; } }
function __hmacHex(secret: string, data: string): string { return createHmac('sha256', secret).update(data).digest('hex'); }
function __timingSafe(a: Uint8Array|Buffer, b: Uint8Array|Buffer): boolean { try { return timingSafeEqual(Buffer.from(a) as any, Buffer.from(b) as any); } catch { if (a.length !== b.length) return false; let d=0; for(let i=0;i<a.length;i++) d|=(a[i]^b[i]); return d===0; } }

interface FailedAttemptRecord { attempts: number; lockoutUntil: number; }
const failedAttempts = new Map<string, FailedAttemptRecord>();
const issuedAdminJtis = new Set<string>();
const revokedAdminJtis = new Set<string>();
function revokeAllIssuedSessions(): void { for (const jti of issuedAdminJtis) revokedAdminJtis.add(jti); issuedAdminJtis.clear(); }

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function customCredsFile(): string | null { const path = __nodeReq('node:path'); return path && __isNode ? path.resolve(process.cwd(), 'server', '.admin-credentials.json') : null; }
let cachedCustomCreds: CustomAdminCredentials | null | undefined = undefined;
function loadCustomCredentials(): CustomAdminCredentials | null {
  if (cachedCustomCreds !== undefined) return cachedCustomCreds;
  try {
    const fs = __nodeReq('node:fs'); const f = customCredsFile();
    if (fs && f && fs.existsSync(f)) {
      const parsed = JSON.parse(fs.readFileSync(f, 'utf-8'));
      if (parsed?.adminEmail?.includes('@') && typeof parsed?.passwordHash === 'string' && parsed.passwordHash.length > 20) {
        cachedCustomCreds = { adminEmail: String(parsed.adminEmail).trim().toLowerCase(), fullName: String(parsed.fullName || 'Kretz Executive Admin').trim() || 'Kretz Executive Admin', passwordHash: parsed.passwordHash, updatedAt: parsed.updatedAt || new Date().toISOString() };
        return cachedCustomCreds;
      }
    }
  } catch {}
  cachedCustomCreds = null; return null;
}

function hashPassword(pw: string): string { return bcrypt.hashSync(pw, 12); }
function verifyPassword(pw: string, hash: string): boolean { try { return bcrypt.compareSync(pw, hash); } catch { return false; } }

let ephemeralSessionSecret: string | null = null;
function getAdminConfigInternal(env?: any) {
  const custom = loadCustomCredentials();
  const e = env || (typeof process !== 'undefined' ? (process as any).env : {}) || {};
  const adminEmail = (custom?.adminEmail || e.ADMIN_EMAIL || 'info@kretz.site').trim().toLowerCase();
  const adminPasswordHash = custom?.passwordHash || e.ADMIN_PASSWORD_HASH || '';
  const adminPassword = custom ? '' : (e.ADMIN_PASSWORD || '');
  let sessionSecret = e.SESSION_SECRET || e.JWT_SECRET || '';
  if (!sessionSecret) { if (!ephemeralSessionSecret) ephemeralSessionSecret = __randomHex(32); sessionSecret = ephemeralSessionSecret; }
  return { adminEmail, adminPasswordHash, adminPassword, sessionSecret, credUpdatedAt: custom?.updatedAt || null, fullName: custom?.fullName || 'Kretz Executive Admin', usingCustomCredentials: !!custom };
}

export function getAdminConfig(env?: any) {
  const c = getAdminConfigInternal(env);
  return {
    adminEmail: c.adminEmail,
    hasPasswordHash: !!c.adminPasswordHash,
    hasPlainPasswordFallback: !!c.adminPassword,
    hasSessionSecret: !!c.sessionSecret,
    usingCustomCredentials: c.usingCustomCredentials,
    isCustomConfigured: c.usingCustomCredentials,
    credUpdatedAt: c.credUpdatedAt,
    updatedAt: c.credUpdatedAt,
    fullName: c.fullName
  };
}
export function validateAdminEnvironment(env?: any) {
  const c = getAdminConfigInternal(env);
  return {
    valid: !!c.sessionSecret && (!!c.adminPasswordHash || !!c.adminPassword),
    mode: c.usingCustomCredentials ? 'custom' : (c.adminPasswordHash ? 'environment-hash' : 'plain-fallback'),
    warnings: !c.sessionSecret ? ['SESSION_SECRET missing'] : []
  };
}

function safeCompare(a: string, b: string) { if (!a || !b) return false; try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && __timingSafe(ba, bb); } catch { return a === b; } }

export async function verifyAdminCredentials(password: string, env?: any): Promise<boolean> {
  const c = getAdminConfigInternal(env);
  if (c.adminPasswordHash) return verifyPassword(password, c.adminPasswordHash);
  if (c.adminPassword) return safeCompare(password, c.adminPassword);
  return false;
}
export function saveCustomAdminCredentials(input: { adminEmail?: string; email?: string; fullName?: string; password?: string; passwordToHash?: string }, _env?: any): CustomAdminCredentials {
  const email = (input?.adminEmail || input?.email || '').trim().toLowerCase();
  const password = input?.password || input?.passwordToHash || '';
  if (!email.includes('@')) throw new Error('A valid administrator email is required.');
  if (!password || password.length < 12) throw new Error('Administrator password must be at least 12 characters.');
  const updated: CustomAdminCredentials = { adminEmail: email, fullName: (input.fullName || 'Kretz Executive Admin').trim() || 'Kretz Executive Admin', passwordHash: hashPassword(password), updatedAt: new Date().toISOString() };
  cachedCustomCreds = updated;
  const fs = __nodeReq('node:fs'); const path = __nodeReq('node:path'); const f = customCredsFile();
  if (fs && path && f) { const dir = path.dirname(f); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(updated, null, 2), { encoding: 'utf-8', mode: 0o600 }); }
  revokeAllIssuedSessions(); failedAttempts.clear(); return updated;
}
export const updateCustomAdminCredentials = saveCustomAdminCredentials;
export function resetCustomAdminCredentials(): void {
  cachedCustomCreds = null; const fs = __nodeReq('node:fs'); const f = customCredsFile();
  if (fs && f && fs.existsSync(f)) fs.unlinkSync(f);
  revokeAllIssuedSessions(); failedAttempts.clear();
}

function signToken(payload: AdminSessionPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = Buffer.from(__hmacHex(secret, data), 'hex').toString('base64url');
  return `${data}.${sig}`;
}
export function createAdminSession(email: string, fullName?: string, env?: any): { token: string; expiresAt: number; payload: AdminSessionPayload } {
  const c = getAdminConfigInternal(env); const now = Date.now();
  const payload: AdminSessionPayload = { sub: 'usr-admin-kretz-site', email: c.adminEmail, role: 'admin', fullName: fullName || c.fullName, credUpdatedAt: c.credUpdatedAt, iat: now, exp: now + SESSION_DURATION_MS, jti: __randomHex(16) };
  issuedAdminJtis.add(payload.jti);
  return { token: `kretz_adm_${signToken(payload, c.sessionSecret)}`, expiresAt: payload.exp, payload };
}
export function verifyAdminSessionToken(token: string, env?: any): AdminSessionPayload | null {
  try {
    if (!token?.startsWith('kretz_adm_')) return null;
    const raw = token.slice('kretz_adm_'.length); const [data, sig] = raw.split('.');
    if (!data || !sig) return null;
    const c = getAdminConfigInternal(env);
    const expected = Buffer.from(__hmacHex(c.sessionSecret, data), 'hex');
    const got = Buffer.from(sig, 'base64url');
    if (expected.length !== got.length || !__timingSafe(expected, got)) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (payload.exp < Date.now() || revokedAdminJtis.has(payload.jti) || payload.role !== 'admin' || payload.credUpdatedAt !== c.credUpdatedAt) return null;
    return payload;
  } catch { return null; }
}
export function revokeAdminSession(token: string, env?: any): void { const p = verifyAdminSessionToken(token, env); if (p?.jti) { revokedAdminJtis.add(p.jti); issuedAdminJtis.delete(p.jti); } }

export function checkAdminRateLimit(identifier: string): { isLocked: boolean; remainingSeconds?: number; attempts?: number } {
  const record = failedAttempts.get(identifier); const now = Date.now();
  if (!record) return { isLocked: false, attempts: 0 };
  if (now > record.lockoutUntil && record.lockoutUntil > 0) { failedAttempts.delete(identifier); return { isLocked: false, attempts: 0 }; }
  if (record.lockoutUntil > now) return { isLocked: true, remainingSeconds: Math.ceil((record.lockoutUntil - now) / 1000), attempts: record.attempts };
  return { isLocked: false, attempts: record.attempts };
}
export function recordAdminFailedAttempt(identifier: string) {
  const now = Date.now(); let record = failedAttempts.get(identifier);
  if (!record || (now > record.lockoutUntil && record.lockoutUntil > 0)) record = { attempts: 0, lockoutUntil: 0 };
  record.attempts += 1; if (record.attempts >= MAX_FAILED_ATTEMPTS) record.lockoutUntil = now + LOCKOUT_DURATION_MS;
  failedAttempts.set(identifier, record);
  return { attempts: record.attempts, isLocked: record.lockoutUntil > now };
}
export function resetAdminFailedAttempts(identifier: string) { failedAttempts.delete(identifier); }
