/**
 * Frontend Error Logger & LocalStorage Buffer
 * 
 * Captures React component tree crashes and uncaught frontend errors into
 * a persistent local ring buffer for inspection by users and administrators.
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
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'kretz_frontend_error_buffer_v1';
const MAX_STORED_ERRORS = 50;

/**
 * Retrieve all logged frontend errors from localStorage
 */
export function getFrontendErrors(): FrontendErrorEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse frontend error buffer:', err);
    return [];
  }
}

/**
 * Log a caught React error or runtime error into the buffer
 */
export function logFrontendError(
  error: Error,
  errorInfo?: { componentStack?: string | null },
  metadata?: Record<string, any>
): FrontendErrorEntry {
  const entry: FrontendErrorEntry = {
    id: `fe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    name: error?.name || 'Error',
    message: error?.message || String(error) || 'Unknown error occurred',
    stack: error?.stack || undefined,
    componentStack: errorInfo?.componentStack || undefined,
    url: typeof window !== 'undefined' ? window.location.href : '',
    pathname: typeof window !== 'undefined' ? (window.location.hash || window.location.pathname) : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
    metadata,
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = getFrontendErrors();
      const updated = [entry, ...existing].slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Dispatch CustomEvent for live UI updates in admin panel
      window.dispatchEvent(new CustomEvent('kretz:frontend-error-logged', { detail: entry }));
    } catch (err) {
      console.warn('Failed to store frontend error in localStorage buffer:', err);
    }
  }

  return entry;
}

/**
 * Clear the stored frontend errors buffer
 */
export function clearFrontendErrors(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('kretz:frontend-error-cleared'));
  } catch (err) {
    console.warn('Failed to clear error buffer:', err);
  }
}

/**
 * Export all logged frontend errors as a formatted JSON string
 */
export function exportFrontendErrorsJson(): string {
  const errors = getFrontendErrors();
  return JSON.stringify(
    {
      exportTime: new Date().toISOString(),
      platform: "L'Agence Institutional Real Estate Platform",
      errorCount: errors.length,
      errors,
    },
    null,
    2
  );
}

/**
 * Triggers a browser file download of the error log
 */
export function downloadFrontendErrorsFile(): void {
  if (typeof window === 'undefined') return;
  const json = exportFrontendErrorsJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lagence-frontend-diagnostic-log-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
