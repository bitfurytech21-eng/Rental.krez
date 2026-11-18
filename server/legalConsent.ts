import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './middleware';
import { getSupabaseAdmin, isSupabaseServerConfigured } from './supabaseDatabase';

const CONSENT_REQUIRED_MESSAGE =
  'Please accept the latest terms, privacy policy and risk warning first';

/**
 * Server-side enforcement for investor money operations.
 * Uses the verified request identity and the live legal settings/profile versions.
 */
export async function requireLatestLegalConsent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.id?.startsWith('usr-dev-')) {
    next();
    return;
  }

  if (!isSupabaseServerConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }
    res.status(503).json({
      success: false,
      error: 'Legal acceptance could not be verified because the database is unavailable.',
      code: 'LEGAL_CONSENT_CHECK_FAILED',
      requestId: req.id,
    });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: 'Sign in required',
      code: 'AUTH_REQUIRED',
      requestId: req.id,
    });
    return;
  }

  try {
    const db = getSupabaseAdmin();
    const [profileResult, settingsResult] = await Promise.all([
      db.from('profiles')
        .select('terms_version,risk_version')
        .eq('id', req.user.id)
        .maybeSingle(),
      db.from('settings')
        .select('value')
        .eq('key', 'legal')
        .maybeSingle(),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (!profileResult.data) {
      res.status(403).json({
        success: false,
        error: 'Profile not found',
        code: 'LEGAL_PROFILE_NOT_FOUND',
        requestId: req.id,
      });
      return;
    }

    const legal = settingsResult.data?.value as
      | { terms_version?: string; risk_version?: string }
      | null
      | undefined;
    if (!legal?.terms_version || !legal?.risk_version) {
      res.status(503).json({
        success: false,
        error: 'Legal versions are not configured',
        code: 'LEGAL_CONSENT_CHECK_FAILED',
        requestId: req.id,
      });
      return;
    }

    if (
      profileResult.data.terms_version !== legal.terms_version ||
      profileResult.data.risk_version !== legal.risk_version
    ) {
      res.status(403).json({
        success: false,
        error: CONSENT_REQUIRED_MESSAGE,
        code: 'LEGAL_REACCEPTANCE_REQUIRED',
        requestId: req.id,
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: error?.message || 'Unable to verify current legal acceptance.',
      code: 'LEGAL_CONSENT_CHECK_FAILED',
      requestId: req.id,
    });
  }
}
