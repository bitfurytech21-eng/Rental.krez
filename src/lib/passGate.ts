/**
 * Kretz & De Spain / L'Agence Platform
 * Administrative Pass Gate Access Controller
 * Secures https://kretzdespain.com/admin with hardware/session-level pass gate authentication.
 */

const PASSGATE_SESSION_KEY = 'kretz_admin_passgate_session_unlocked';
const PASSGATE_CUSTOM_CODE_KEY = 'kretz_admin_passgate_custom_secret';
const PASSGATE_ATTEMPTS_KEY = 'kretz_admin_passgate_attempts';
const PASSGATE_LOCKOUT_KEY = 'kretz_admin_passgate_lockout_until';

// Default authorized master passcodes recognized by the executive pass gate
export const DEFAULT_MASTER_PASSCODES = [
  'kretz2026',
  'Kretz2026!',
  'admin2026',
  '774921',
  'kretz-admin',
  'admin123',
];

export const PRIMARY_DEFAULT_PASSCODE = 'kretz2026';

import { ledger } from './ledger';

type PassGateListener = (unlocked: boolean) => void;
const listeners: PassGateListener[] = [];

export function subscribePassGate(listener: PassGateListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyPassGateChange(unlocked: boolean) {
  listeners.forEach((fn) => {
    try {
      fn(unlocked);
    } catch (e) {
      // Ignore listener error
    }
  });
}

/**
 * Checks if the current browser session has cleared the pass gate
 */
export function isPassGateUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionVal = window.sessionStorage.getItem(PASSGATE_SESSION_KEY);
    if (sessionVal === 'true') return true;

    // Optional short-term memory token check
    const localVal = window.localStorage.getItem(PASSGATE_SESSION_KEY);
    if (localVal) {
      const data = JSON.parse(localVal);
      if (data?.expiresAt && Date.now() < data.expiresAt) {
        return true;
      }
    }
  } catch (e) {
    // Session read error
  }
  return false;
}

/**
 * Check if the user is currently rate-limited due to too many failed attempts
 */
export function getRateLimitStatus(): { isLocked: boolean; remainingSeconds: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingSeconds: 0 };
  try {
    const lockoutUntilStr = window.localStorage.getItem(PASSGATE_LOCKOUT_KEY);
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      const diffMs = lockoutUntil - Date.now();
      if (diffMs > 0) {
        return { isLocked: true, remainingSeconds: Math.ceil(diffMs / 1000) };
      } else {
        window.localStorage.removeItem(PASSGATE_LOCKOUT_KEY);
        window.localStorage.removeItem(PASSGATE_ATTEMPTS_KEY);
      }
    }
  } catch (e) {
    // Ignore error
  }
  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Get current failed attempt count
 */
export function getFailedAttemptsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = window.localStorage.getItem(PASSGATE_ATTEMPTS_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Unlocks the pass gate with the provided passcode
 */
export function verifyAndUnlockPassGate(enteredCode: string): {
  success: boolean;
  message?: string;
  remainingSeconds?: number;
} {
  const rateLimit = getRateLimitStatus();
  if (rateLimit.isLocked) {
    return {
      success: false,
      message: `Pass Gate locked due to multiple security violations. Retry in ${rateLimit.remainingSeconds}s.`,
      remainingSeconds: rateLimit.remainingSeconds,
    };
  }

  const trimmed = (enteredCode || '').trim();
  if (!trimmed) {
    return { success: false, message: 'Please enter the administrative security passcode.' };
  }

  // Retrieve any custom user-configured passcode
  let customCode: string | null = null;
  try {
    customCode = window.localStorage.getItem(PASSGATE_CUSTOM_CODE_KEY);
  } catch (e) {
    // Ignore error
  }

  const isValid =
    (customCode && trimmed === customCode.trim()) ||
    DEFAULT_MASTER_PASSCODES.some((p) => p.toLowerCase() === trimmed.toLowerCase()) ||
    trimmed === PRIMARY_DEFAULT_PASSCODE;

  if (isValid) {
    // Clear attempt counters
    try {
      window.localStorage.removeItem(PASSGATE_ATTEMPTS_KEY);
      window.localStorage.removeItem(PASSGATE_LOCKOUT_KEY);
      window.sessionStorage.setItem(PASSGATE_SESSION_KEY, 'true');
      // Store 8-hour persistent token for executive convenience
      window.localStorage.setItem(
        PASSGATE_SESSION_KEY,
        JSON.stringify({
          unlocked: true,
          unlockedAt: Date.now(),
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        })
      );
    } catch (e) {
      // Storage error
    }

    notifyPassGateChange(true);
    try {
      ledger.recordAuditLog(
        'usr-admin-1',
        'admin@lagence.com',
        'PASSGATE_UNLOCKED',
        'Executive Pass Gate authorized and unlocked successfully.',
        'security',
        'success'
      );
    } catch (e) {
      // Ignore
    }
    return { success: true };
  } else {
    // Increment failed attempts
    let newAttempts = 1;
    try {
      const prev = parseInt(window.localStorage.getItem(PASSGATE_ATTEMPTS_KEY) || '0', 10);
      newAttempts = prev + 1;
      window.localStorage.setItem(PASSGATE_ATTEMPTS_KEY, newAttempts.toString());

      if (newAttempts >= 5) {
        const lockoutPeriodMs = 30 * 1000; // 30 seconds lockout
        window.localStorage.setItem(
          PASSGATE_LOCKOUT_KEY,
          (Date.now() + lockoutPeriodMs).toString()
        );

        try {
          ledger.recordAuditLog(
            'guest',
            'unauthorized',
            'PASSGATE_LOCKOUT_TRIGGERED',
            'Multiple invalid pass gate passcode attempts. Pass Gate locked out for 30s.',
            'security',
            'critical'
          );
        } catch (e) {}

        return {
          success: false,
          message: 'Security threshold exceeded. Pass Gate locked out for 30 seconds.',
          remainingSeconds: 30,
        };
      }
    } catch (e) {
      // Storage error
    }

    const attemptsLeft = Math.max(0, 5 - newAttempts);
    try {
      ledger.recordAuditLog(
        'guest',
        'unauthorized',
        'PASSGATE_FAILED_ATTEMPT',
        `Failed pass gate attempt at /admin. Attempts remaining: ${attemptsLeft}.`,
        'security',
        'critical'
      );
    } catch (e) {}

    return {
      success: false,
      message: `Invalid access passcode. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before security lockout.`,
    };
  }
}

/**
 * Locks the Pass Gate immediately, clearing session and requiring re-authentication
 */
export function lockPassGate(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PASSGATE_SESSION_KEY);
    window.localStorage.removeItem(PASSGATE_SESSION_KEY);
  } catch (e) {
    // Storage error
  }
  try {
    ledger.recordAuditLog(
      'usr-admin-1',
      'admin@lagence.com',
      'PASSGATE_LOCKED',
      'Executive Pass Gate locked and re-armed by administrator.',
      'security',
      'warning'
    );
  } catch (e) {}
  notifyPassGateChange(false);
}

/**
 * Get active custom code or default
 */
export function getActivePassGateCode(): string {
  if (typeof window === 'undefined') return PRIMARY_DEFAULT_PASSCODE;
  try {
    const custom = window.localStorage.getItem(PASSGATE_CUSTOM_CODE_KEY);
    if (custom) return custom;
  } catch (e) {
    // Ignore error
  }
  return PRIMARY_DEFAULT_PASSCODE;
}

/**
 * Set a new custom master passcode
 */
export function updatePassGateMasterCode(newPasscode: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const trimmed = (newPasscode || '').trim();
    if (trimmed.length < 4) return false;
    window.localStorage.setItem(PASSGATE_CUSTOM_CODE_KEY, trimmed);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reset passcode to factory default
 */
export function resetPassGateToDefault(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PASSGATE_CUSTOM_CODE_KEY);
  } catch (e) {
    // Ignore error
  }
}
