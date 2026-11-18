const ACTION_VERIFICATION_TTL_MS = 10 * 60 * 1000;
const SESSION_STORAGE_KEY = 'lagence_action_verification_session';

export type SensitiveActionScope =
  | 'investor.withdrawal.create'
  | 'investor.profile.bank.update'
  | 'investor.password.change';

interface VerificationSessionState {
  verifiedUntil: number;
  grants: Record<string, { grantId: string; expiresAt: number }>;
}

let memoryState: VerificationSessionState = {
  verifiedUntil: 0,
  grants: {},
};

function readState(): VerificationSessionState {
  if (typeof window === 'undefined') return memoryState;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VerificationSessionState;
      if (parsed && typeof parsed.verifiedUntil === 'number') {
        memoryState = {
          verifiedUntil: parsed.verifiedUntil,
          grants: parsed.grants && typeof parsed.grants === 'object' ? parsed.grants : {},
        };
      }
    }
  } catch {
    // Ignore restricted sessionStorage contexts
  }
  return memoryState;
}

function writeState(next: VerificationSessionState): void {
  memoryState = next;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore restricted sessionStorage contexts
  }
}

export function markActionVerified(scope?: string, grantId?: string, ttlMs: number = ACTION_VERIFICATION_TTL_MS): void {
  const now = Date.now();
  const current = readState();
  const expiresAt = now + ttlMs;
  const nextGrants = { ...current.grants };
  if (scope && grantId) {
    nextGrants[scope] = { grantId, expiresAt };
  }
  writeState({
    verifiedUntil: Math.max(current.verifiedUntil, expiresAt),
    grants: nextGrants,
  });
}

export function isActionVerifiedInSession(): boolean {
  const now = Date.now();
  const state = readState();
  if (state.verifiedUntil > now) {
    return true;
  }
  return Object.values(state.grants).some((g) => g.expiresAt > now);
}

export function getValidActionGrant(scope: string): string | null {
  const now = Date.now();
  const state = readState();
  const entry = state.grants[scope];
  if (entry && entry.expiresAt > now && entry.grantId) {
    return entry.grantId;
  }
  return null;
}

export function clearActionVerification(): void {
  memoryState = { verifiedUntil: 0, grants: {} };
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function formatEmailCodeSendError(err: any): string {
  const status = Number(err?.status || 0);
  const code = String(err?.code || '').toUpperCase();
  const raw = String(err?.message || '').toLowerCase();
  if (
    status === 429 ||
    code.includes('RATE_LIMIT') ||
    raw.includes('rate limit') ||
    raw.includes('too many') ||
    raw.includes('429')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return 'We couldn’t send your code. Please try again, or contact support.';
}

export function sanitizeErrorForMonitoring(err: any): {
  message: string;
  errorCode: string;
} {
  const rawMessage = String(err?.message || err?.name || 'Security code delivery failure');
  const redacted = rawMessage
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{6}\b/g, '[redacted-code]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [redacted-token]')
    .slice(0, 280);
  const errorCode = String(err?.code || (err?.status ? `HTTP_${err.status}` : 'EMAIL_CODE_FAILURE')).slice(0, 64);
  return {
    message: redacted || 'Security code delivery failure',
    errorCode,
  };
}
