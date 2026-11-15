/**
 * Cloudflare Turnstile Server-Side Verification (hardened, no dummy keys)
 *
 * Verifies tokens against https://challenges.cloudflare.com/turnstile/v0/siteverify
 *
 * Design rules:
 *  - FAIL CLOSED always. A real secret is required in every environment.
 *  - No test tokens, no dummy secrets, no auto-pass paths, no fail-open on errors.
 *  - The only relaxation is the explicit preview bypass: TURNSTILE_PREVIEW_BYPASS=true,
 *    set only on the preview environment, and refused on production hostnames.
 *  - Replay cache marks a token "pending" BEFORE the network call (no race).
 *  - Hostname and action are always validated.
 *  - Client IP comes from CF-Connecting-IP (not spoofable via XFF on Cloudflare).
 *  - Fetch has a timeout.
 *
 * Env vars:
 *  CLOUDFLARE_TURNSTILE_SECRET_KEY | TURNSTILE_SECRET_KEY   real secret (required)
 *  TURNSTILE_ALLOWED_HOSTNAMES                              comma list
 *  TURNSTILE_PREVIEW_BYPASS=true                            preview-only bypass
 *  TURNSTILE_PRODUCTION_HOSTNAMES                           hosts where bypass is never allowed
 */

import { Request, Response, NextFunction } from 'express';
import { isIP } from 'net';
import crypto from 'crypto';
import { logger } from './logger';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const FETCH_TIMEOUT_MS = 5000;
const MAX_TOKEN_LENGTH = 2048; // Cloudflare's documented maximum
const DEFAULT_ALLOWED_HOSTNAMES = 'kretzdespain.com,www.kretzdespain.com,rental-krez.pages.dev';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getSecret(): string {
  return (
    String(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim() ||
    String(process.env.TURNSTILE_SECRET_KEY || '').trim()
  );
}

function productionHostnames(): string[] {
  return (process.env.TURNSTILE_PRODUCTION_HOSTNAMES || 'kretzdespain.com,www.kretzdespain.com')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Preview bypass: only when explicitly enabled on the preview environment
 * (TURNSTILE_PREVIEW_BYPASS=true). It is refused whenever the request's host is
 * a production hostname or cannot be determined, so a mistakenly copied flag
 * cannot open up the live site.
 */
function isBypassEnabled(req: Request): boolean {
  if (process.env.TURNSTILE_PREVIEW_BYPASS !== 'true') return false;
  const host = String(req.headers.host || '').split(':')[0].trim().toLowerCase();
  if (!host) return false;
  return !productionHostnames().includes(host);
}

function allowedHostnames(): string[] {
  return (process.env.TURNSTILE_ALLOWED_HOSTNAMES || DEFAULT_ALLOWED_HOSTNAMES)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Replay cache (pending -> consumed). Per-isolate best effort only;
// Cloudflare's own `timeout-or-duplicate` is the authoritative replay defence.
// ---------------------------------------------------------------------------

type TokenState = { state: 'pending' | 'consumed'; at: number };

const REPLAY_TTL_MS = 10 * 60 * 1000;
const REPLAY_MAX_ENTRIES = 10_000;
const tokenCache = new Map<string, TokenState>();

function pruneTokenCache(now = Date.now()) {
  // Lazy cleanup: no background timers (Workers-safe).
  if (tokenCache.size >= 250) {
    for (const [hash, item] of tokenCache) {
      if (now - item.at > REPLAY_TTL_MS) tokenCache.delete(hash);
    }
  }
  // Hard cap: evict oldest entries (Map preserves insertion order).
  while (tokenCache.size >= REPLAY_MAX_ENTRIES) {
    const oldest = tokenCache.keys().next().value;
    if (oldest === undefined) break;
    tokenCache.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  code?: string;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
}

interface SiteverifyResponse {
  success?: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

function fail(error: string, code: string, errorCodes?: string[]): TurnstileVerificationResult {
  return { success: false, error, code, ...(errorCodes ? { errorCodes } : {}) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeIp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const candidate = raw.split(',')[0].trim();
  return isIP(candidate) ? candidate : undefined;
}

function getClientIp(req: Request): string | undefined {
  // On Cloudflare, CF-Connecting-IP is set by the edge and cannot be spoofed by the client.
  const cf = req.headers['cf-connecting-ip'];
  const cfIp = sanitizeIp(Array.isArray(cf) ? cf[0] : cf);
  if (cfIp) return cfIp;
  // Fall back to the socket address only. X-Forwarded-For is client-controlled
  // unless a trusted proxy overwrites it; configure `app.set('trust proxy', ...)`
  // and use req.ip if you need it.
  return sanitizeIp(req.socket?.remoteAddress);
}

function extractToken(req: Request): string | undefined {
  const header = req.headers['x-turnstile-token'];
  const candidates: unknown[] = [
    req.body?.turnstileToken,
    req.body?.['cf-turnstile-response'],
    Array.isArray(header) ? header[0] : header,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Core verification
// ---------------------------------------------------------------------------

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string,
  expectedActions: string[] = []
): Promise<TurnstileVerificationResult> {
  const secret = getSecret();

  // Fail closed: a real secret is required everywhere.
  if (!secret) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: 'turnstile-config',
      eventType: 'BOT_CHALLENGE_MISCONFIGURED',
      outcome: 'failure',
      message:
        'Turnstile secret is unavailable. Set CLOUDFLARE_TURNSTILE_SECRET_KEY (or TURNSTILE_SECRET_KEY) on the active environment; rejecting request.',
      metadata: { environment: process.env.NODE_ENV || 'unset' },
    });
    return fail(
      'Human verification is temporarily unavailable. Please try again later.',
      'TURNSTILE_NOT_CONFIGURED'
    );
  }

  const cleanToken = typeof token === 'string' ? token.trim() : '';
  if (!cleanToken) {
    return fail(
      'Human verification token is missing. Please complete the security check.',
      'MISSING_TURNSTILE_TOKEN'
    );
  }
  if (cleanToken.length > MAX_TOKEN_LENGTH) {
    return fail('Invalid security challenge response.', 'INVALID_TURNSTILE_TOKEN');
  }

  const safeIp = sanitizeIp(remoteIp);

  // Replay protection.
  pruneTokenCache();
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  const existing = tokenCache.get(tokenHash);
  if (existing) {
    return fail(
      existing.state === 'pending'
        ? 'This verification is already being processed.'
        : 'Security verification token has already been used. Please complete the verification again.',
      existing.state === 'pending' ? 'TOKEN_IN_PROGRESS' : 'TOKEN_ALREADY_USED'
    );
  }
  // Mark pending BEFORE the await so concurrent requests cannot both pass.
  tokenCache.set(tokenHash, { state: 'pending', at: Date.now() });

  try {
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', cleanToken);
    if (safeIp) body.append('remoteip', safeIp);

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      tokenCache.delete(tokenHash);
      return fail(
        'Human verification service is temporarily unavailable. Please try again.',
        'PROVIDER_ERROR'
      );
    }

    const data = (await response.json()) as SiteverifyResponse;

    if (data.success !== true) {
      tokenCache.delete(tokenHash);
      const errorCodes = Array.isArray(data['error-codes']) ? data['error-codes'] : [];

      let message = 'Human verification failed. Please try again.';
      if (errorCodes.includes('timeout-or-duplicate')) {
        message = 'Security token expired or already used. Please refresh the check.';
      } else if (errorCodes.includes('invalid-input-response')) {
        message = 'Invalid security challenge response. Please try completing the verification again.';
      }
      return fail(message, errorCodes[0] || 'VERIFICATION_FAILED', errorCodes);
    }

    // Hostname and action are always enforced.
    const verifiedHostname = String(data.hostname || '').toLowerCase();
    if (!verifiedHostname || !allowedHostnames().includes(verifiedHostname)) {
      tokenCache.delete(tokenHash);
      return fail(
        'Security verification came from an unapproved website. Please reload and try again.',
        'TURNSTILE_HOSTNAME_MISMATCH'
      );
    }
    if (expectedActions.length > 0 && !expectedActions.includes(String(data.action || ''))) {
      tokenCache.delete(tokenHash);
      return fail(
        'Security verification action did not match this request. Please complete the check again.',
        'TURNSTILE_ACTION_MISMATCH'
      );
    }

    tokenCache.set(tokenHash, { state: 'consumed', at: Date.now() });
    return { success: true, challengeTs: data.challenge_ts, hostname: data.hostname };
  } catch (err) {
    tokenCache.delete(tokenHash);
    logger.log({
      level: 'error',
      category: 'security',
      requestId: 'turnstile-network',
      eventType: 'BOT_CHALLENGE_NETWORK_ERROR',
      outcome: 'failure',
      message: `Turnstile verification request failed: ${(err as Error)?.name || 'Error'}`,
      metadata: { timeout: (err as Error)?.name === 'TimeoutError' },
    });
    // Never fail open.
    return fail(
      'Failed to communicate with the verification provider. Please try again.',
      'NETWORK_VERIFICATION_ERROR'
    );
  }
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

// Route -> required Turnstile action(s). Unmapped routes fail closed when using
// the default `requireTurnstile`; use `turnstileFor([...])` to protect other routes.
const ROUTE_ACTIONS: Array<[RegExp, string[]]> = [
  [/\/auth\/register\/?$/, ['register']],
  [/\/auth\/admin-login\/?$/, ['admin_login']],
  [/\/auth\/login\/?$/, ['login', 'investor_login']],
];

function createMiddleware(resolveActions: (req: Request) => string[] | null) {
  return async function turnstileMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = String((req as any).id || crypto.randomUUID());
    const fullPath = `${req.baseUrl || ''}${req.path || ''}`;

    try {
      // Explicit preview bypass (never on production hostnames).
      if (isBypassEnabled(req)) {
        logger.log({
          level: 'warn',
          category: 'security',
          requestId,
          method: req.method,
          route: fullPath,
          eventType: 'BOT_CHALLENGE_BYPASSED',
          outcome: 'success',
          message: `Turnstile bypassed on ${fullPath} (TURNSTILE_PREVIEW_BYPASS, non-production host).`,
        });
        return next();
      }

      const expectedActions = resolveActions(req);
      if (expectedActions === null || expectedActions.length === 0) {
        logger.log({
          level: 'error',
          category: 'security',
          requestId,
          method: req.method,
          route: fullPath,
          statusCode: 500,
          eventType: 'BOT_CHALLENGE_ACTION_UNMAPPED',
          outcome: 'failure',
          message: `No Turnstile action configured for ${fullPath}; rejecting (fail closed).`,
        });
        return res.status(500).json({
          success: false,
          error: 'Security verification is not configured for this route.',
          code: 'TURNSTILE_ACTION_UNMAPPED',
          requestId,
        });
      }

      const ip = getClientIp(req);
      const result = await verifyTurnstileToken(extractToken(req), ip, expectedActions);

      if (!result.success) {
        logger.log({
          level: 'warn',
          category: 'security',
          requestId,
          method: req.method,
          route: fullPath,
          statusCode: 403,
          eventType: 'BOT_CHALLENGE_FAILED',
          outcome: 'failure',
          message: `Turnstile verification rejected on ${fullPath}: ${result.error}`,
          errorCode: result.code || 'CHALLENGE_FAILED',
          metadata: { ip, route: fullPath, errorCodes: result.errorCodes },
        });
        return res.status(403).json({
          success: false,
          error: result.error || 'Human verification required before proceeding.',
          code: result.code || 'HUMAN_VERIFICATION_REQUIRED',
          requestId,
        });
      }

      logger.log({
        level: 'debug',
        category: 'security',
        requestId,
        method: req.method,
        route: fullPath,
        statusCode: 200,
        eventType: 'BOT_CHALLENGE_PASSED',
        outcome: 'success',
        message: `Turnstile verified for ${fullPath}`,
        metadata: { ip, route: fullPath, challengeTs: result.challengeTs },
      });

      return next();
    } catch (err) {
      logger.log({
        level: 'error',
        category: 'security',
        requestId,
        method: req.method,
        route: fullPath,
        statusCode: 500,
        eventType: 'BOT_CHALLENGE_INTERNAL_ERROR',
        outcome: 'failure',
        message: `requireTurnstile uncaught exception: ${(err as Error)?.message || 'unknown'}`,
      });
      return res.status(500).json({
        success: false,
        error: 'Security verification check encountered an unexpected error.',
        code: 'INTERNAL_SECURITY_ERROR',
        requestId,
      });
    }
  };
}

/** Default middleware: action is derived from the route table above. */
export const requireTurnstile = createMiddleware((req) => {
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`;
  for (const [pattern, actions] of ROUTE_ACTIONS) {
    if (pattern.test(fullPath)) return actions;
  }
  return null;
});

/** Explicit per-route middleware, e.g. router.post('/contact', turnstileFor(['contact']), handler) */
export function turnstileFor(actions: string[]) {
  return createMiddleware(() => actions);
}
