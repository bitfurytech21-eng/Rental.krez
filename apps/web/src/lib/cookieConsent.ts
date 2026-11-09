import { CookieCategory, CookieConsentState } from '../types/cookies';

const CONSENT_STORAGE_KEY = 'kretz_cookie_consent_v1';
const COOKIE_NAME = 'kretz_cookie_consent';
const CURRENT_VERSION = '1.0.0';

type ConsentListener = (state: CookieConsentState) => void;
const listeners = new Set<ConsentListener>();

// Helper to write first-party cookie
function setFirstPartyCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

// Helper to read first-party cookie
function getFirstPartyCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function getCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check localStorage first
    const rawLocal = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed.hasChosen === 'boolean') {
        return parsed as CookieConsentState;
      }
    }

    // Check first-party cookie fallback
    const rawCookie = getFirstPartyCookie(COOKIE_NAME);
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      if (parsed && typeof parsed.hasChosen === 'boolean') {
        return parsed as CookieConsentState;
      }
    }
  } catch (err) {
    console.error('Failed reading cookie consent state:', err);
  }
  return null;
}

export function saveCookieConsent(
  categories: Partial<CookieConsentState['categories']>
): CookieConsentState {
  const state: CookieConsentState = {
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    hasChosen: true,
    categories: {
      strictlyNecessary: true, // Always true and locked
      analytics: Boolean(categories.analytics),
      marketing: Boolean(categories.marketing),
      preferences: Boolean(categories.preferences),
    },
  };

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
      setFirstPartyCookie(COOKIE_NAME, serialized, 365);
    } catch (e) {
      console.error('Failed persisting cookie consent:', e);
    }
  }

  // Notify active listeners
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.error('Error in cookie consent listener:', e);
    }
  });

  return state;
}

export function acceptAllCookies(): CookieConsentState {
  return saveCookieConsent({
    strictlyNecessary: true,
    analytics: true,
    marketing: true,
    preferences: true,
  });
}

export function rejectOptionalCookies(): CookieConsentState {
  return saveCookieConsent({
    strictlyNecessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });
}

export function resetCookieConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  setFirstPartyCookie(COOKIE_NAME, '', -1);
  const resetState: CookieConsentState = {
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    hasChosen: false,
    categories: {
      strictlyNecessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    },
  };
  listeners.forEach((cb) => cb(resetState));
}

export function hasConsentFor(category: CookieCategory): boolean {
  if (category === 'strictlyNecessary') return true;
  const current = getCookieConsent();
  if (!current || !current.hasChosen) return false;
  return Boolean(current.categories[category]);
}

export function subscribeToCookieConsent(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
