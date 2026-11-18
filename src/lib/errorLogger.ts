/**
 * Privacy-safe frontend diagnostic buffer.
 * Never persist exception messages, stacks, URLs, form values, or app state:
 * those fields can contain passwords, one-time codes, or access tokens.
 */
export interface FrontendErrorEntry {
  id: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  pathname: string;
  userAgent: string;
  viewport: string;
  metadata?: Record<string, never>;
}

const STORAGE_KEY = 'kretz_frontend_error_buffer_v2';
const LEGACY_STORAGE_KEY = 'kretz_frontend_error_buffer_v1';
const MAX_STORED_ERRORS = 50;

function clearLegacyBuffer(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch {}
}

export function getFrontendErrors(): FrontendErrorEntry[] {
  if (typeof window === 'undefined') return [];
  clearLegacyBuffer();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Reconstruct records from an explicit allowlist. Never expose legacy/free-form fields.
    return parsed.filter((item) => item && typeof item === 'object').map((item) => ({
      id: typeof item.id === 'string' ? item.id : 'frontend-error',
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : '',
      name: 'FrontendError',
      message: 'A frontend error occurred.',
      url: '',
      pathname: '',
      userAgent: '',
      viewport: typeof item.viewport === 'string' ? item.viewport : 'unknown',
    })).slice(0, MAX_STORED_ERRORS);
  } catch {
    return [];
  }
}

export function logFrontendError(
  _error: Error,
  _errorInfo?: { componentStack?: string | null },
  _metadata?: Record<string, unknown>
): FrontendErrorEntry {
  const entry: FrontendErrorEntry = {
    id: `fe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    name: 'FrontendError',
    message: 'A frontend error occurred.',
    url: '',
    pathname: '',
    userAgent: '',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
  };

  if (typeof window !== 'undefined') {
    clearLegacyBuffer();
    try {
      const updated = [entry, ...getFrontendErrors()].slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('kretz:frontend-error-logged', { detail: entry }));
    } catch {
      // Diagnostic logging must never affect the application.
    }
  }
  return entry;
}

export function clearFrontendErrors(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    clearLegacyBuffer();
    window.dispatchEvent(new CustomEvent('kretz:frontend-error-cleared'));
  } catch {}
}

export function exportFrontendErrorsJson(): string {
  const errors = getFrontendErrors();
  return JSON.stringify({
    exportTime: new Date().toISOString(),
    platform: "L'Agence Institutional Real Estate Platform",
    errorCount: errors.length,
    errors,
  }, null, 2);
}

export function downloadFrontendErrorsFile(): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([exportFrontendErrorsJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lagence-frontend-diagnostic-log-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
