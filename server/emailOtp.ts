import crypto from 'crypto';
import { getSupabaseAdmin } from './supabaseDatabase';

export type EmailOtpPurpose = 'investor_login' | 'admin_login' | 'dashboard_action';

function codeDigest(email: string, purpose: EmailOtpPurpose, code: string): string {
  const secret = String(process.env.SESSION_SECRET || '');
  if (secret.length < 32) throw new Error('EMAIL_OTP_SIGNING_SECRET_NOT_CONFIGURED');
  return crypto.createHmac('sha256', secret)
    .update(`${email.toLowerCase().trim()}:${purpose}:${code}`)
    .digest('hex');
}

export async function issueEmailOtp(email: string, purpose: EmailOtpPurpose) {
  const normalizedEmail = email.toLowerCase().trim();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const digest = codeDigest(normalizedEmail, purpose, code);
  const { data, error } = await getSupabaseAdmin().rpc('kretz_issue_email_otp', {
    p_email: normalizedEmail, p_purpose: purpose, p_code_hash: digest
  });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
  if (!data?.ok) return { ok: false as const, reason: String(data?.reason || 'RATE_LIMITED'), retryAfter: Number(data?.retry_after || 60) };
  return { ok: true as const, challengeId: String(data.challenge_id), code };
}

export async function verifyEmailOtp(email: string, purpose: EmailOtpPurpose, code: string) {
  if (!/^\d{6}$/.test(code)) return { valid: false as const, reason: 'INVALID' };
  const digest = codeDigest(email.toLowerCase().trim(), purpose, code);
  const { data, error } = await getSupabaseAdmin().rpc('kretz_verify_email_otp', {
    p_email: email.toLowerCase().trim(), p_purpose: purpose, p_code_hash: digest
  });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
  return { valid: data?.valid === true, reason: String(data?.reason || '') };
}

export async function cancelEmailOtp(challengeId: string) {
  const { error } = await getSupabaseAdmin().rpc('kretz_cancel_email_otp', { p_challenge_id: challengeId });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
}

export async function issueDashboardActionOtp(email: string, userId: string, actionScope: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const digest = codeDigest(normalizedEmail, 'dashboard_action', code);
  const { data, error } = await getSupabaseAdmin().rpc('kretz_issue_dashboard_action_otp', {
    p_email: normalizedEmail, p_user_id: userId, p_action_scope: actionScope, p_code_hash: digest
  });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
  if (!data?.ok) return { ok: false as const, reason: String(data?.reason || 'RATE_LIMITED'), retryAfter: Number(data?.retry_after || 60) };
  return { ok: true as const, challengeId: String(data.challenge_id), code };
}

export async function verifyDashboardActionOtp(email: string, userId: string, actionScope: string, code: string) {
  if (!/^\\d{6}$/.test(code)) return { valid: false as const, reason: 'INVALID' };
  const normalizedEmail = email.toLowerCase().trim();
  const digest = codeDigest(normalizedEmail, 'dashboard_action', code);
  const { data, error } = await getSupabaseAdmin().rpc('kretz_verify_dashboard_action_otp', {
    p_email: normalizedEmail, p_user_id: userId, p_action_scope: actionScope, p_code_hash: digest
  });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
  return { valid: data?.valid === true, reason: String(data?.reason || ''), grantId: data?.grant_id ? String(data.grant_id) : undefined };
}

export async function consumeDashboardActionGrant(grantId: string, userId: string, actionScope: string) {
  const { data, error } = await getSupabaseAdmin().rpc('kretz_consume_dashboard_action_grant', {
    p_grant_id: grantId, p_user_id: userId, p_action_scope: actionScope
  });
  if (error) throw new Error('EMAIL_OTP_STORAGE_UNAVAILABLE');
  return data === true;
}
