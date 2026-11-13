import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin, isSupabaseServerConfigured } from './supabaseDatabase';

export interface PersistentAdminPayload {
  sub: string;
  email: string;
  role: 'admin';
  fullName: string;
  credUpdatedAt: string;
  iat: number;
  exp: number;
  jti: string;
}

const SESSION_MS = 24 * 60 * 60 * 1000;
const secret = () => process.env.SESSION_SECRET || process.env.JWT_SECRET || '';

function requireStore() {
  if (!isSupabaseServerConfigured()) throw new Error('ADMIN_STORE_NOT_CONFIGURED');
  if (!secret()) throw new Error('ADMIN_SESSION_SECRET_NOT_CONFIGURED');
  return getSupabaseAdmin();
}

export async function getPersistentAdminConfig() {
  const db = requireStore();
  const { data, error } = await db.from('kretz_admin_credentials')
    .select('admin_email,full_name,password_hash,updated_at').eq('id', 'primary').maybeSingle();
  if (error) throw error;
  if (data) return {
    adminEmail: data.admin_email,
    fullName: data.full_name,
    passwordHash: data.password_hash,
    updatedAt: data.updated_at,
    isCustomConfigured: true,
    mode: 'custom_bcrypt' as const
  };
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const hash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (!email || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash)) {
    throw new Error('ADMIN_ENV_CREDENTIALS_NOT_CONFIGURED');
  }
  return {
    adminEmail: email,
    fullName: 'Executive Administrator',
    passwordHash: hash,
    updatedAt: 'environment:' + crypto.createHash('sha256').update(hash).digest('hex'),
    isCustomConfigured: false,
    mode: 'bcrypt_hash' as const
  };
}

export async function verifyPersistentAdminCredentials(email: string, password: string) {
  const config = await getPersistentAdminConfig();
  if (email.trim().toLowerCase() !== config.adminEmail) return false;
  return bcrypt.compare(password, config.passwordHash);
}

export async function updatePersistentAdminCredentials(input: {
  email: string; fullName: string; password: string; updatedBy: string;
}) {
  const db = requireStore();
  const updatedAt = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const { error } = await db.from('kretz_admin_credentials').upsert({
    id: 'primary',
    admin_email: input.email.trim().toLowerCase(),
    full_name: input.fullName.trim() || 'Executive Administrator',
    password_hash: passwordHash,
    updated_at: updatedAt,
    updated_by: input.updatedBy
  }, { onConflict: 'id' });
  if (error) throw error;
  const { error: revokeError } = await db.from('kretz_admin_sessions')
    .update({ revoked_at: updatedAt }).is('revoked_at', null);
  if (revokeError) throw revokeError;
  return { adminEmail: input.email.trim().toLowerCase(), fullName: input.fullName.trim() || 'Executive Administrator', updatedAt };
}

export async function resetPersistentAdminCredentials() {
  const db = requireStore();
  const now = new Date().toISOString();
  const { error } = await db.from('kretz_admin_credentials').delete().eq('id', 'primary');
  if (error) throw error;
  const { error: revokeError } = await db.from('kretz_admin_sessions')
    .update({ revoked_at: now }).is('revoked_at', null);
  if (revokeError) throw revokeError;
}

export async function createPersistentAdminSession(email: string, fullName: string) {
  const db = requireStore();
  const config = await getPersistentAdminConfig();
  const now = Date.now();
  const payload: PersistentAdminPayload = {
    sub: 'usr-admin-01', email: email.trim().toLowerCase(), role: 'admin',
    fullName: fullName.trim() || config.fullName, credUpdatedAt: config.updatedAt,
    iat: now, exp: now + SESSION_MS, jti: crypto.randomBytes(24).toString('hex')
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  const token = `kretz_adm_${encoded}.${signature}`;
  const { error } = await db.from('kretz_admin_sessions').insert({
    jti: payload.jti, admin_email: payload.email,
    expires_at: new Date(payload.exp).toISOString()
  });
  if (error) throw error;
  return { token, payload };
}

export async function verifyPersistentAdminSession(token: string): Promise<PersistentAdminPayload | null> {
  if (!token?.startsWith('kretz_adm_') || !isSupabaseServerConfigured() || !secret()) return null;
  try {
    const [encoded, signature] = token.slice('kretz_adm_'.length).split('.');
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PersistentAdminPayload;
    if (!payload.jti || !payload.email || !payload.exp || Date.now() >= payload.exp) return null;
    const db = requireStore();
    const [{ data: session, error: sessionError }, config] = await Promise.all([
      db.from('kretz_admin_sessions').select('jti,revoked_at,expires_at,admin_email')
        .eq('jti', payload.jti).maybeSingle(),
      getPersistentAdminConfig()
    ]);
    if (sessionError || !session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null;
    if (session.admin_email !== payload.email || payload.email !== config.adminEmail ||
        payload.credUpdatedAt !== config.updatedAt) return null;
    return payload;
  } catch { return null; }
}

export async function revokePersistentAdminSession(token: string) {
  if (!token?.startsWith('kretz_adm_') || !isSupabaseServerConfigured()) return false;
  try {
    const [encoded] = token.slice('kretz_adm_'.length).split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as PersistentAdminPayload;
    const { data, error } = await requireStore().from('kretz_admin_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('jti', payload.jti).is('revoked_at', null)
      .select('jti').maybeSingle();
    return !error && Boolean(data);
  } catch { return false; }
}

export async function checkPersistentAdminRateLimit(identifier: string) {
  const { data, error } = await requireStore().from('kretz_admin_login_attempts')
    .select('attempts,lockout_until').eq('identifier', identifier).maybeSingle();
  if (error) throw error;
  if (data?.lockout_until && Date.parse(data.lockout_until) > Date.now()) {
    return { isLocked: true, remainingSeconds: Math.ceil((Date.parse(data.lockout_until) - Date.now()) / 1000) };
  }
  return { isLocked: false };
}

export async function recordPersistentAdminFailure(identifier: string) {
  const db = requireStore();
  const { data, error } = await db.from('kretz_admin_login_attempts')
    .select('attempts').eq('identifier', identifier).maybeSingle();
  if (error) throw error;
  const attempts = Number(data?.attempts || 0) + 1;
  const lockoutUntil = attempts >= 10 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;
  const { error: saveError } = await db.from('kretz_admin_login_attempts').upsert({
    identifier, attempts, lockout_until: lockoutUntil, updated_at: new Date().toISOString()
  }, { onConflict: 'identifier' });
  if (saveError) throw saveError;
  return { attempts, isLocked: Boolean(lockoutUntil), remainingSeconds: lockoutUntil ? 300 : undefined };
}

export async function resetPersistentAdminFailures(identifier: string) {
  const { error } = await requireStore().from('kretz_admin_login_attempts').delete().eq('identifier', identifier);
  if (error) throw error;
}
