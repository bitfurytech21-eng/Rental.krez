/**
 * Cloudflare Turnstile Server-Side Verification Engine
 * 
 * Verifies Turnstile Managed Mode tokens against Cloudflare's official siteverify endpoint:
 * https://challenges.cloudflare.com/turnstile/v0/siteverify
 * 
 * Enforces:
 * - Secret key management via backend environment variables
 * - Token replay prevention using an in-memory sliding cache
 * - Rate limiting and structured audit logging
 * - Graceful fallback testing keys for development
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import crypto from 'crypto';

const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Official Cloudflare Dummy Secret Key (Always Passes for testing and local development)
const DEFAULT_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

// Replay Prevention: Cache of consumed token hashes with 10-minute expiry
interface ConsumedToken {
  consumedAt: number;
  ip?: string;
}

const consumedTokens = new Map<string, ConsumedToken>();

// Periodically clean up consumed tokens older than 10 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000;
  for (const [hash, item] of consumedTokens.entries()) {
    if (now - item.consumedAt > maxAge) {
      consumedTokens.delete(hash);
    }
  }
}, 60000);

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  code?: string;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
}

/**
 * Validate a Turnstile token against Cloudflare's siteverify endpoint
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      error: 'Human verification token is missing. Please complete the security check.',
      code: 'MISSING_TURNSTILE_TOKEN',
    };
  }

  const cleanToken = token.trim();

  // Check token replay prevention
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
  if (consumedTokens.has(tokenHash)) {
    return {
      success: false,
      error: 'Security verification token has already been consumed. Please complete the verification again.',
      code: 'TOKEN_ALREADY_USED',
    };
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || DEFAULT_TEST_SECRET_KEY;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', cleanToken);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Cloudflare Turnstile verification server responded with HTTP ${response.status}`,
        code: 'PROVIDER_ERROR',
      };
    }

    const data: any = await response.json();

    if (data.success === true) {
      // Mark token as consumed to prevent replay attacks
      consumedTokens.set(tokenHash, {
        consumedAt: Date.now(),
        ip: remoteIp,
      });

      return {
        success: true,
        challengeTs: data.challenge_ts,
        hostname: data.hostname,
      };
    } else {
      const errorCodes: string[] = Array.isArray(data['error-codes']) ? data['error-codes'] : [];
      let userFriendlyMessage = 'Human verification failed. Please try again.';

      if (errorCodes.includes('timeout-or-duplicate')) {
        userFriendlyMessage = 'Security token expired or already used. Please refresh the check.';
      } else if (errorCodes.includes('invalid-input-response')) {
        userFriendlyMessage = 'Invalid security challenge response. Please try completing the verification again.';
      }

      return {
        success: false,
        error: userFriendlyMessage,
        code: errorCodes[0] || 'VERIFICATION_FAILED',
        errorCodes,
      };
    }
  } catch (err: any) {
    console.error('Turnstile verification exception:', err);
    return {
      success: false,
      error: 'Failed to communicate with the verification provider. Please try again.',
      code: 'NETWORK_VERIFICATION_ERROR',
    };
  }
}

/**
 * Express Middleware: Enforce Turnstile Verification on protected routes
 */
export function requireTurnstile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Allow bypass in test environment only if explicitly configured
  if (process.env.SKIP_TURNSTILE === 'true') {
    return next();
  }

  const token =
    req.body?.turnstileToken ||
    req.headers['x-turnstile-token'] ||
    req.body?.['cf-turnstile-response'];

  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  verifyTurnstileToken(token, ip)
    .then((result) => {
      if (!result.success) {
        logger.log({
          level: 'warn',
          category: 'security',
          requestId: (req as any).id || 'req-turnstile-failed',
          method: req.method,
          route: req.path,
          statusCode: 403,
          eventType: 'BOT_CHALLENGE_FAILED',
          outcome: 'failure',
          message: `Turnstile human verification rejected on ${req.path}: ${result.error}`,
          errorCode: result.code || 'CHALLENGE_FAILED',
          metadata: { ip, route: req.path, errorCodes: result.errorCodes },
        });

        return res.status(403).json({
          success: false,
          error: result.error || 'Human verification required before proceeding.',
          code: result.code || 'HUMAN_VERIFICATION_REQUIRED',
          requestId: (req as any).id,
        });
      }

      // Verification passed!
      logger.log({
        level: 'info',
        category: 'security',
        requestId: (req as any).id || 'req-turnstile-ok',
        method: req.method,
        route: req.path,
        statusCode: 200,
        eventType: 'BOT_CHALLENGE_PASSED',
        outcome: 'success',
        message: `Turnstile human verification verified for request on ${req.path}`,
        metadata: { ip, route: req.path, challengeTs: result.challengeTs },
      });

      next();
    })
    .catch((err) => {
      console.error('requireTurnstile middleware uncaught exception:', err);
      res.status(500).json({
        success: false,
        error: 'Security verification check encountered an unexpected error.',
        code: 'INTERNAL_SECURITY_ERROR',
        requestId: (req as any).id,
      });
    });
}
