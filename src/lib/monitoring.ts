type MonitoringSource = 'react-boundary' | 'window-error' | 'unhandled-rejection';

interface SentryConfig {
  dsn: string;
  envelopeUrl: string;
  environment: 'production' | 'development';
}

let config: SentryConfig | null | undefined;
let sentInWindow = 0;
let windowStartedAt = Date.now();

function getConfig(): SentryConfig | null {
  if (config !== undefined) return config;
  const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
  if (!dsn) {
    config = null;
    return config;
  }

  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.split('/').filter(Boolean).pop();
    if (parsed.protocol !== 'https:' || !parsed.username || !projectId || parsed.password) {
      config = null;
      return config;
    }
    parsed.search = '';
    parsed.hash = '';
    config = {
      dsn: parsed.toString().replace(/\/$/, ''),
      envelopeUrl: `https://${parsed.host}/api/${encodeURIComponent(projectId)}/envelope/`,
      environment: import.meta.env.PROD ? 'production' : 'development',
    };
    return config;
  } catch {
    config = null;
    return config;
  }
}

/**
 * Sends deliberately minimal error events to Sentry's envelope endpoint.
 * Never attach messages, stacks, URLs, user identity, request data, breadcrumbs,
 * form values, or application state. Only a generic exception and fixed source
 * label leave the browser.
 */
export function captureFrontendError(source: MonitoringSource): void {
  const sentry = getConfig();
  if (!sentry || typeof fetch !== 'function') return;

  const now = Date.now();
  if (now - windowStartedAt >= 60_000) {
    windowStartedAt = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= 20) return;
  sentInWindow += 1;

  const eventId = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const envelope = [
    JSON.stringify({
      event_id: eventId,
      sent_at: new Date(now).toISOString(),
      dsn: sentry.dsn,
    }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify({
      event_id: eventId,
      timestamp: new Date(now).toISOString(),
      platform: 'javascript',
      level: 'error',
      environment: sentry.environment,
      exception: {
        values: [{
          type: 'Error',
          value: 'Frontend exception',
          mechanism: { type: 'generic', handled: source === 'react-boundary' },
        }],
      },
      tags: { source },
    }),
    '',
  ].join('\n');

  void fetch(sentry.envelopeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
    mode: 'cors',
    credentials: 'omit',
    keepalive: true,
    referrerPolicy: 'no-referrer',
  }).catch(() => {
    // Monitoring failures must never affect the application.
  });
}

/** Install global handlers once, without collecting event payloads or breadcrumbs. */
export function installFrontendErrorMonitoring(): void {
  if (typeof window === 'undefined') return;
  const target = window as Window & { __kretzSentryHandlersInstalled?: boolean };
  if (target.__kretzSentryHandlersInstalled) return;
  target.__kretzSentryHandlersInstalled = true;

  window.addEventListener('error', () => captureFrontendError('window-error'));
  window.addEventListener('unhandledrejection', () =>
    captureFrontendError('unhandled-rejection')
  );
}
