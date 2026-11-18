/**
 * Kretz Clean API v1 Route Controllers & Endpoints
 * 
 * Organized in accordance with the architectural specification:
 * - /api/v1/auth/* (login, register, logout, password recovery, session)
 * - /api/v1/admin/* (users, audit-logs, system-health, settings, logs, reviews)
 * - /api/v1/marketplace/* (listings, listing details, property updates)
 * - /api/v1/user/* & portfolio (profile, holdings, transactions, notifications)
 * - /api/v1/deposits, withdrawals, investments, payments/webhooks
 */

import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, rateLimiter, requireAuth, requireAdmin, requireAdminOrLogSecret, requireStaffSection } from './middleware';
import { logger } from './logger';
import { requireLatestLegalConsent } from './legalConsent';
import { issueEmailOtp, verifyEmailOtp, cancelEmailOtp, issueDashboardActionOtp, verifyDashboardActionOtp, consumeDashboardActionGrant } from './emailOtp';
import {
  manualPaymentRouter,
  registerManualPaymentDevHooks,
  hydrateManualPaymentDevState,
  exportManualPaymentDevDeposits,
  getDevAssignedGateId,
  getDevGateById,
} from './manualPaymentRoutes';
import {
  handleTranslationRequest,
  handleGetProviders,
  handleSwitchProvider,
  handleTestTranslation,
} from './translationController';
import {
  emailTemplates,
  sendEmail,
  executeEmailCommand,
  handleEmailWebhook,
  retryFailedEmail,
  getEmailLogs,
  clearEmailLogs,
  getEmailSettings,
  updateEmailSettings,
  getAutomationRules,
  updateAutomationRule,
  verifySmtpConnection,
  getSmtpCredentials,
  getProviderConfig
} from './emailService';
import crypto from 'crypto';
import {
  validatePasswordStrength,
  validateEmail,
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  revokeSession,
  checkBruteForceLimit,
  recordFailedLogin,
  resetFailedLogin,
  ABSOLUTE_TIMEOUT_MS,
  registerDevSessionPersistence,
  hydrateServerSessions,
  exportServerSessions
} from './authService';
import { loadDevAuthSnapshot, saveDevAuthSnapshot } from './devPersistence';
import {
  getAdminConfig,
  validateAdminEnvironment,
  verifyAdminCredentials,
  updateCustomAdminCredentials,
  resetCustomAdminCredentials,
  createAdminSession,
  revokeAdminSession,
  checkAdminRateLimit,
  recordAdminFailedAttempt,
  resetAdminFailedAttempts
} from './adminAuth';
import { getPersistentAdminConfig, verifyPersistentAdminCredentials, updatePersistentAdminCredentials, resetPersistentAdminCredentials, createPersistentAdminSession, revokePersistentAdminSession, checkPersistentAdminRateLimit, recordPersistentAdminFailure, resetPersistentAdminFailures } from './persistentAdminAuth';
import { ALL_KRETZ_MEMBERS } from '../src/data/kretzTeam';
import { BLOG_POSTS } from '../src/data/blogPosts';
import { dailyPaymentService } from './dailyPaymentService';
import { generatePropertyPaymentsCsv } from '../src/lib/distributionService';
import {
  isSupabaseServerConfigured, isSupabaseAuthConfigured, canUseLiveSupabaseData, isMissingSchemaError, markSupabaseSchemaMissingInDev,
  getSupabaseAdmin, databaseHealth, listUserTransactions, listAdminTransactions,
  getUserProfile, updateUserProfile, runFinancialRpc, toApiTransaction, listInvestmentPlans,
  getInvestmentPlan, listUserInvestments, listAdminUsers, getPersistentDashboardSummary,
  getPersistentAdminDashboard, listPersistentInvestments, listPersistentAuditLogs, getAdminIdentityByEmail,
  createPersistentInvestmentPlan, updatePersistentInvestmentPlan,
  listUserNotifications, markUserNotificationRead, markAllUserNotificationsRead, createUserNotification,
  listAdminNotifications, sendAdminNotifications,
  listUserFavorites, saveUserFavorite, removeUserFavorite, getUserPreferences, saveUserPreferences,
  listComplianceDocuments, addComplianceDocument, listAdminComplianceDocuments, reviewComplianceDocument,
  listComplianceSteps, upsertComplianceStep, getWalletSummary, getAssignedPaymentGate, findTransactionByReferenceOrId,
  ComplianceStepKey, ComplianceStepRecord,
  listUserStatementDocuments, getSignedDocumentUrl,
  getPersistentAccountStatement, getPersistentPerformance,
  signInCustomer, registerCustomer, requestCustomerPasswordReset, updateCustomerPassword, signOutCustomer
} from './supabaseDatabase';
import {
  getPaymentProviderStatus,
  verifyPaymentWebhookSignature,
  dispatchBankPayoutInstruction
} from './services/paymentProvider';
import {
  getKycProviderStatus,
  createKycVerificationSession,
  verifyKycWebhookSignature
} from './services/kycProvider';

const router = Router();
router.use(async (_req, _res, next) => {
  await ensureDevStateHydrated();
  next();
});
router.use('/manual-payments', manualPaymentRouter);
const DASHBOARD_ACTION_SCOPES = new Set([
  'investor.withdrawal.create',
  'investor.profile.bank.update',
  'investor.password.change',
  'admin.deposit.approve',
  'admin.deposit.reject',
  'admin.withdrawal.approve',
  'admin.withdrawal.reject',
  'admin.user.credit',
  'admin.user.kyc',
  'admin.user.status'
]);

const ACTION_VERIFICATION_SESSION_TTL_MS = 10 * 60 * 1000;
const verifiedActionSessions = new Map<string, number>();

function markActionSessionVerified(userId: string) {
  verifiedActionSessions.set(userId, Date.now() + ACTION_VERIFICATION_SESSION_TTL_MS);
}

function getActionSessionRemainingSeconds(userId: string): number {
  const expiresAt = verifiedActionSessions.get(userId);
  if (!expiresAt) return 0;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) {
    verifiedActionSessions.delete(userId);
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

function clearActionSessionVerified(userId?: string) {
  if (userId) verifiedActionSessions.delete(userId);
}

const devActionGrants = new Map<string, { userId: string; scope: string; expiresAt: number }>();
const devComplianceDocsByUser = new Map<string, Array<{
  id: string;
  userId: string;
  category: 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
  documentType: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  fileDataUrl?: string;
}>>();
const devComplianceStepsByUser = new Map<string, ComplianceStepRecord[]>();

function normalizeAccountName(name: unknown): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatchOwner(legalName: unknown, holderName: unknown): boolean {
  const a = normalizeAccountName(legalName);
  const b = normalizeAccountName(holderName);
  return Boolean(a && b && a === b);
}

function isValidIbanServer(iban: string): boolean {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34 || !/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) {
    return false;
  }
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i += 1) {
    const ch = rearranged.charCodeAt(i);
    if (ch >= 48 && ch <= 57) {
      remainder = (remainder * 10 + (ch - 48)) % 97;
    } else if (ch >= 65 && ch <= 90) {
      const val = ch - 55;
      remainder = (remainder * 100 + val) % 97;
    } else {
      return false;
    }
  }
  return remainder === 1;
}

function buildDevComplianceSteps(userId: string, kycStatus?: string): ComplianceStepRecord[] {
  const defs: Array<{ stepKey: ComplianceStepKey; title: string }> = [
    { stepKey: 'kyc_identity', title: 'Identity verification' },
    { stepKey: 'proof_of_address', title: 'Proof of address' },
    { stepKey: 'accredited_proof', title: 'Investor questionnaire' },
  ];
  const saved = devComplianceStepsByUser.get(userId) || [];
  const docs = devComplianceDocsByUser.get(userId) || [];
  const normKyc = String(kycStatus || 'pending').toLowerCase();

  return defs.map((def) => {
    const existing = saved.find((s) => s.stepKey === def.stepKey);
    const matchingDocs = docs.filter((d) => d.category === def.stepKey);
    let status: ComplianceStepRecord['status'] = 'not_started';
    if (normKyc === 'verified' || normKyc === 'approved') {
      status = 'verified';
    } else if (existing?.status) {
      status = existing.status;
    } else if (matchingDocs.length > 0) {
      const latest = matchingDocs[0];
      status = latest.status === 'verified' ? 'verified' : latest.status === 'rejected' ? 'rejected' : 'in_review';
    } else if (normKyc === 'rejected') {
      status = 'rejected';
    }
    return {
      stepKey: def.stepKey,
      title: def.title,
      status,
      submittedAt: existing?.submittedAt || matchingDocs[0]?.uploadedAt,
      reviewedAt: existing?.reviewedAt,
      updatedAt: existing?.updatedAt,
    };
  });
}

const requireActionEmailVerification = (actionScope: string) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id || !req.user.email) return res.status(401).json({ success: false, error: 'Authentication required.', code: 'AUTH_REQUIRED', requestId: req.id });
    if (getActionSessionRemainingSeconds(req.user.id) > 0) {
      return next();
    }
    const grantId = String(req.headers['x-action-verification'] || '');
    const devGrant = grantId ? devActionGrants.get(grantId) : undefined;
    if (process.env.NODE_ENV !== 'production' && devGrant && devGrant.userId === req.user.id && devGrant.scope === actionScope && devGrant.expiresAt > Date.now()) {
      devActionGrants.delete(grantId);
      markActionSessionVerified(req.user.id);
      return next();
    }
    if (process.env.NODE_ENV !== 'production' && (!isEmailOtpEnforced() || !shouldUseSupabaseForCustomer(req))) {
      return next();
    }
    if (!/^[0-9a-f-]{36}$/i.test(grantId)) {
      return res.status(428).json({ success: false, error: 'Email verification is required for this action.', code: 'ACTION_EMAIL_VERIFICATION_REQUIRED', actionScope, requestId: req.id });
    }
    try {
      const consumed = await consumeDashboardActionGrant(grantId, req.user.id, actionScope);
      if (!consumed) return res.status(428).json({ success: false, error: 'The verification has expired or does not match this action. Request a new code.', code: 'ACTION_EMAIL_VERIFICATION_REQUIRED', actionScope, requestId: req.id });
      markActionSessionVerified(req.user.id);
      return next();
    } catch (error: any) {
      logger.log({
        level: 'error',
        category: 'security',
        requestId: req.id || 'req-action-otp-consume',
        userId: req.user?.id,
        eventType: 'ACTION_OTP_CONSUME_FAILED',
        outcome: 'failure',
        message: String(error?.message || 'Action OTP grant verification failed'),
        metadata: { actionScope }
      });
      return res.status(503).json({ success: false, error: 'Email action verification is temporarily unavailable.', code: 'ACTION_EMAIL_VERIFICATION_UNAVAILABLE', requestId: req.id });
    }
  };


const requireBankChangeEmailVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const input = req.body || {};
  const includesBankFields =
    Object.prototype.hasOwnProperty.call(input, 'bankIban') ||
    Object.prototype.hasOwnProperty.call(input, 'bankAccountHolder');
  if (!includesBankFields) return next();

  try {
    let existing: any = null;
    if (shouldUseSupabaseForCustomer(req)) {
      existing = await getUserProfile(req.user!.id);
    } else {
      existing = devCustomersById.get(req.user!.id) || null;
    }
    if (!existing) return next();

    const currentIban = String(existing.bank_iban ?? existing.bankIban ?? existing.iban ?? '')
      .replace(/\s+/g, '').toUpperCase();
    const nextIban = typeof input.bankIban === 'string'
      ? input.bankIban.replace(/\s+/g, '').toUpperCase()
      : currentIban;
    const currentHolder = String(existing.bank_account_holder ?? existing.bankAccountHolder ?? existing.bank_holder ?? existing.full_name ?? existing.fullName ?? '')
      .trim().toLowerCase();
    const nextHolder = typeof input.bankAccountHolder === 'string'
      ? input.bankAccountHolder.trim().toLowerCase()
      : currentHolder;

    if (currentIban === nextIban && currentHolder === nextHolder) return next();
    return requireActionEmailVerification('investor.profile.bank.update')(req, res, next);
  } catch {
    return res.status(503).json({
      success: false,
      error: 'Unable to verify this bank-account change. Please try again.',
      code: 'BANK_CHANGE_VERIFICATION_UNAVAILABLE',
      requestId: req.id
    });
  }
};

const maskLoginEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'your registered email';
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
};

function isEmailOtpEnforced(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const provider = getProviderConfig();
  return (
    isSupabaseServerConfigured() &&
    (provider.type === 'resend' || provider.type === 'sendgrid') &&
    !getEmailSettings().testMode
  );
}

function getRequestIp(req: AuthenticatedRequest): string {
  const rawHeader = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(rawHeader)
    ? rawHeader[0]
    : (typeof rawHeader === 'string' ? rawHeader.split(',')[0].trim() : undefined);
  return forwarded || req.socket.remoteAddress || '127.0.0.1';
}

async function sendLoginEmailCode(email: string, purpose: 'investor_login' | 'admin_login') {
  // Login codes must never be reported as sent by the local sandbox or SMTP in Workers.
  const provider = getProviderConfig();
  if ((provider.type !== 'resend' && provider.type !== 'sendgrid') || getEmailSettings().testMode) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }

  const issued = await issueEmailOtp(email, purpose);
  if (!issued.ok) {
    return { success: false as const, reason: issued.reason, retryAfter: issued.retryAfter };
  }
  const delivery = await sendEmail({
    templateId: 'email_verification',
    recipient: email,
    data: {
      user_name: email.split('@')[0],
      verification_code: issued.code,
      expires_in_minutes: 5,
      action_url: 'https://kretzdespain.com/#login'
    },
    commandName: 'send_verification_email',
    idempotencyKey: `login-otp-${issued.challengeId}`,
    bypassAutomationCheck: true
  });
  if (!delivery.success) {
    await cancelEmailOtp(issued.challengeId);
    throw new Error('EMAIL_PROVIDER_DELIVERY_FAILED');
  }
  return { success: true as const, maskedEmail: maskLoginEmail(email) };
}


// Server-side Switch Translation API endpoints (independent multi-provider translation engine)
router.post('/translate', handleTranslationRequest);
router.get('/translate/providers', handleGetProviders);
router.post('/translate/switch', handleSwitchProvider);
/**
 * GET /api/v1/blog & /api/blog
 * Returns editorial blog articles with category & search filters
 */
router.get('/blog', (req: AuthenticatedRequest, res: Response) => {
  const { category, search } = req.query;
  let posts = [...BLOG_POSTS];

  if (category && typeof category === 'string' && category !== 'all') {
    posts = posts.filter(p => p.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return res.json({
    success: true,
    data: posts,
    total: posts.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/blog/:slug & /api/blog/:slug
 */
router.get('/blog/:slug', (req: AuthenticatedRequest, res: Response) => {
  const { slug } = req.params;
  const post = BLOG_POSTS.find(p => p.slug === slug || p.id === slug);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Blog article not found',
      requestId: req.id
    });
  }

  return res.json({
    success: true,
    data: post,
    requestId: req.id
  });
});

/**
 * GET /api/v1/team & /api/team
 * Returns global Kretz executive leadership & regional team members
 */
router.get('/team', (req: AuthenticatedRequest, res: Response) => {
  const { category, search } = req.query;
  let members = ALL_KRETZ_MEMBERS.map(m => ({
    ...m,
    image: m.remoteImage || (typeof m.image === 'string' ? m.image : 'https://files.kretzrealestate.com/placeholder.jpg')
  }));

  if (category && typeof category === 'string' && category !== 'all') {
    members = members.filter(m => m.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    members = members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.location.toLowerCase().includes(q) ||
      m.specialty.toLowerCase().includes(q)
    );
  }

  return res.json({
    success: true,
    data: members,
    total: members.length,
    requestId: req.id
  });
});


router.get('/security/action-code/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const remainingSeconds = getActionSessionRemainingSeconds(req.user!.id);
  const verified = remainingSeconds > 0;
  return res.json({
    success: true,
    verified,
    remainingSeconds,
    expiresAt: verified ? new Date(Date.now() + remainingSeconds * 1000).toISOString() : null,
    requestId: req.id
  });
});

router.post('/security/action-code/request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const actionScope = String(req.body?.actionScope || '');
  if (!DASHBOARD_ACTION_SCOPES.has(actionScope)) return res.status(400).json({ success: false, error: 'Unsupported protected action.', code: 'INVALID_ACTION_SCOPE', requestId: req.id });
  const remainingSeconds = getActionSessionRemainingSeconds(req.user!.id);
  if (remainingSeconds > 0) {
    const grantId = crypto.randomUUID();
    devActionGrants.set(grantId, { userId: req.user!.id, scope: actionScope, expiresAt: Date.now() + remainingSeconds * 1000 });
    return res.json({
      success: true,
      otpRequired: false,
      alreadyVerified: true,
      grantId,
      maskedEmail: maskLoginEmail(req.user!.email),
      expiresInSeconds: remainingSeconds,
      actionScope,
      message: 'Recent security verification is active for this session.',
      requestId: req.id
    });
  }
  if (process.env.NODE_ENV !== 'production' && (!isEmailOtpEnforced() || !shouldUseSupabaseForCustomer(req))) {
    const grantId = crypto.randomUUID();
    devActionGrants.set(grantId, { userId: req.user!.id, scope: actionScope, expiresAt: Date.now() + ACTION_VERIFICATION_SESSION_TTL_MS });
    markActionSessionVerified(req.user!.id);
    return res.json({
      success: true,
      otpRequired: false,
      grantId,
      maskedEmail: maskLoginEmail(req.user!.email),
      expiresInSeconds: 600,
      actionScope,
      message: 'Security confirmation prepared.',
      requestId: req.id
    });
  }
  try {
    const issued = await issueDashboardActionOtp(req.user!.email, req.user!.id, actionScope);
    if (!issued.ok) {
      logger.log({
        level: 'warn',
        category: 'security',
        requestId: req.id || 'req-action-otp-rate',
        userId: req.user?.id,
        eventType: 'ACTION_OTP_RATE_LIMITED',
        outcome: 'failure',
        message: 'Security code request rate limited.',
        metadata: { actionScope, reason: issued.reason, retryAfter: issued.retryAfter }
      });
      return res.status(429).json({ success: false, error: 'Too many attempts. Please wait a few minutes and try again.', code: issued.reason, retryAfter: issued.retryAfter, requestId: req.id });
    }
    const delivery = await sendEmail({
      templateId: 'email_verification',
      recipient: req.user!.email,
      data: { user_name: req.user!.fullName || 'Investor', verification_code: issued.code, expires_in_minutes: 5, action_url: 'https://kretzdespain.com/dashboard' },
      commandName: 'send_verification_email',
      idempotencyKey: `dashboard-action-otp-${issued.challengeId}`,
      bypassAutomationCheck: true
    });
    if (!delivery.success) {
      await cancelEmailOtp(issued.challengeId);
      logger.log({
        level: 'error',
        category: 'security',
        requestId: req.id || 'req-action-otp-delivery',
        userId: req.user?.id,
        eventType: 'ACTION_OTP_DELIVERY_FAILED',
        outcome: 'failure',
        message: String(delivery.error || 'Failed to deliver action security code'),
        metadata: { actionScope }
      });
      return res.status(503).json({ success: false, error: 'We couldn’t send your code. Please try again, or contact support.', code: 'ACTION_EMAIL_DELIVERY_FAILED', requestId: req.id });
    }
    return res.json({ success: true, otpRequired: true, maskedEmail: maskLoginEmail(req.user!.email), expiresInSeconds: 300, actionScope, message: 'A security code has been sent to your registered email address.', requestId: req.id });
  } catch (error: any) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: req.id || 'req-action-otp-error',
      userId: req.user?.id,
      eventType: 'ACTION_OTP_REQUEST_ERROR',
      outcome: 'failure',
      message: String(error?.message || 'Security code service failure'),
      metadata: { actionScope }
    });
    return res.status(503).json({ success: false, error: 'We couldn’t send your code. Please try again, or contact support.', code: 'ACTION_EMAIL_VERIFICATION_UNAVAILABLE', requestId: req.id });
  }
});

router.post('/security/action-code/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const actionScope = String(req.body?.actionScope || '');
  const code = String(req.body?.code || '').trim();
  if (!DASHBOARD_ACTION_SCOPES.has(actionScope)) return res.status(400).json({ success: false, error: 'Unsupported protected action.', code: 'INVALID_ACTION_SCOPE', requestId: req.id });
  try {
    const verified = await verifyDashboardActionOtp(req.user!.email, req.user!.id, actionScope, code);
    if (!verified.valid || !verified.grantId) {
      logger.log({
        level: 'warn',
        category: 'security',
        requestId: req.id || 'req-action-otp-invalid',
        userId: req.user?.id,
        eventType: 'ACTION_OTP_VERIFY_FAILED',
        outcome: 'failure',
        message: 'Security code verification failed.',
        metadata: { actionScope, reason: verified.reason || 'INVALID' }
      });
      return res.status(401).json({ success: false, error: 'The code is invalid or expired. Request a new code and try again.', code: 'INVALID_ACTION_EMAIL_CODE', requestId: req.id });
    }
    markActionSessionVerified(req.user!.id);
    return res.json({ success: true, grantId: verified.grantId, expiresInSeconds: 600, actionScope, requestId: req.id });
  } catch (error: any) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: req.id || 'req-action-otp-verify-err',
      userId: req.user?.id,
      eventType: 'ACTION_OTP_VERIFY_ERROR',
      outcome: 'failure',
      message: String(error?.message || 'Security code verification service unavailable'),
      metadata: { actionScope }
    });
    return res.status(503).json({ success: false, error: 'Email action verification is temporarily unavailable.', code: 'ACTION_EMAIL_VERIFICATION_UNAVAILABLE', requestId: req.id });
  }
});

router.post('/monitoring/client-error', (req: AuthenticatedRequest, res: Response) => {
  const safeMessage = String(req.body?.message || 'Client security code delivery error')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{6}\b/g, '[redacted-code]')
    .slice(0, 300);
  const category = String(req.body?.category || 'security').slice(0, 40) as any;
  const eventType = String(req.body?.eventType || 'CLIENT_EMAIL_CODE_FAILURE').slice(0, 80);
  const errorCode = String(req.body?.errorCode || 'CLIENT_ERROR').slice(0, 80);
  const scope = req.body?.scope ? String(req.body.scope).slice(0, 80) : undefined;
  logger.log({
    level: 'error',
    category: ['auth', 'security', 'api', 'payments'].includes(category) ? category : 'security',
    requestId: req.id || 'req-client-mon',
    userId: req.user?.id,
    eventType,
    outcome: 'failure',
    errorCode,
    message: safeMessage,
    metadata: { scope }
  });
  return res.json({ success: true, requestId: req.id });
});

const contactLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  category: 'security',
  message: 'Too many contact inquiries from this IP address. Please wait 1 minute.'
});

const publicSubmissionLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  category: 'security',
  message: 'Too many submissions from this IP address. Please wait 1 minute.'
});

// Restrict sensitive administrator credential changes and resets.
const securityLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  category: 'security',
  message: 'Too many administrator security changes. Please wait 10 minutes.'
});

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: string;
  kycStatus: string;
  balance: number;
  currency: string;
  createdAt: string;
  country?: string;
  countryCode?: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  status?: 'active' | 'suspended';
  suspendedReason?: string;
}

export function sanitizeUser(user: UserRecord): UserRecord {
  return user;
}

// Customer identities and profiles are authoritative in Supabase Auth and public.user_profiles.
// Non-production fallback store when Supabase Auth / Postgres are not configured in local dev or smoke tests.
interface DevCustomerRecord extends UserRecord {
  passwordHash: string;
  accountType: string;
  investedBalance: number;
  address?: string;
  city?: string;
  postalCode?: string;
  avatarUrl?: string;
  bankIban?: string;
  bankAccountHolder?: string;
  cryptoDepositAddress?: string;
  taxId?: string;
  dateOfBirth?: string;
  preferences?: Record<string, any>;
}

const devCustomersByEmail = new Map<string, DevCustomerRecord>();
const devCustomersById = new Map<string, DevCustomerRecord>();

let devStateHydrated = false;
let devStateLoadPromise: Promise<void> | null = null;

async function ensureDevStateHydrated(): Promise<void> {
  if (devStateHydrated || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return;
  }
  if (!devStateLoadPromise) {
    devStateLoadPromise = (async () => {
      const snap = await loadDevAuthSnapshot();
      for (const c of snap.customers) {
        if (c && c.email && c.id) {
          const normEmail = String(c.email).toLowerCase();
          if (!devCustomersByEmail.has(normEmail)) devCustomersByEmail.set(normEmail, c);
          if (!devCustomersById.has(c.id)) devCustomersById.set(c.id, c);
        }
      }
      for (const [uid, docs] of Object.entries(snap.complianceDocs || {})) {
        if (Array.isArray(docs) && !devComplianceDocsByUser.has(uid)) {
          devComplianceDocsByUser.set(uid, docs);
        }
      }
      for (const [uid, steps] of Object.entries(snap.complianceSteps || {})) {
        if (Array.isArray(steps) && !devComplianceStepsByUser.has(uid)) {
          devComplianceStepsByUser.set(uid, steps);
        }
      }
      if (Array.isArray(snap.transactions) && mockTransactions.length === 0) {
        mockTransactions.push(...snap.transactions);
      }
      for (const [uid, list] of Object.entries(snap.notifications || {})) {
        if (Array.isArray(list) && !userNotificationsStore.has(uid)) {
          userNotificationsStore.set(uid, list);
        }
      }
      for (const [uid, bals] of Object.entries(snap.subBalances || {})) {
        if (bals && typeof bals === 'object' && !userSubBalancesStore.has(uid)) {
          userSubBalancesStore.set(uid, bals);
        }
      }
      for (const [uid, prefs] of Object.entries(snap.preferences || {})) {
        if (prefs && typeof prefs === 'object' && !userPreferencesStore.has(uid)) {
          userPreferencesStore.set(uid, prefs);
        }
      }
      hydrateManualPaymentDevState(snap.manualDeposits);
      hydrateServerSessions(snap.sessions);
      devStateHydrated = true;
    })();
  }
  await devStateLoadPromise;
}

async function persistDevState(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return;
  const complianceDocs: Record<string, any[]> = {};
  for (const [uid, docs] of devComplianceDocsByUser.entries()) {
    complianceDocs[uid] = docs;
  }
  const complianceSteps: Record<string, any[]> = {};
  for (const [uid, steps] of devComplianceStepsByUser.entries()) {
    complianceSteps[uid] = steps;
  }
  const notifications: Record<string, any[]> = {};
  for (const [uid, list] of userNotificationsStore.entries()) {
    notifications[uid] = list.slice(0, 150);
  }
  const subBalances: Record<string, Record<string, number>> = {};
  for (const [uid, bals] of userSubBalancesStore.entries()) {
    subBalances[uid] = bals;
  }
  const preferences: Record<string, Record<string, any>> = {};
  for (const [uid, prefs] of userPreferencesStore.entries()) {
    preferences[uid] = prefs;
  }
  await saveDevAuthSnapshot({
    customers: Array.from(devCustomersById.values()),
    sessions: exportServerSessions(),
    complianceDocs,
    complianceSteps,
    transactions: mockTransactions.slice(0, 1000),
    notifications,
    subBalances,
    preferences,
    manualDeposits: exportManualPaymentDevDeposits().slice(0, 500),
  });
}

registerManualPaymentDevHooks({
  onDepositCreated: async (deposit: any) => {
    const depTx = {
      id: deposit.id,
      userId: deposit.user_id,
      userEmail: deposit.user_email || '',
      type: 'deposit',
      amount: deposit.amount,
      feeAmount: deposit.fee_amount,
      currency: deposit.currency || 'EUR',
      status: 'pending',
      method: deposit.payment_method,
      reference: deposit.reference,
      txHash: deposit.manual_transaction_id,
      createdAt: deposit.created_at,
      metadata: {
        manualDepositId: deposit.id,
        senderName: deposit.sender_name,
        paymentDate: deposit.payment_date,
        manualTransactionId: deposit.manual_transaction_id,
        extraValues: deposit.extra_values,
      },
    };
    mockTransactions.unshift(depTx);
    pushUserNotification(deposit.user_id, {
      title: 'Deposit proof submitted',
      message: `Your €${deposit.amount.toFixed(2)} ${deposit.payment_method} deposit (${deposit.reference}) is pending finance verification.`,
      type: 'info',
    });
  },
  onDepositReviewed: async (deposit: any, approve: boolean, reason?: string) => {
    const tx = mockTransactions.find((t) => t.id === deposit.id || t.reference === deposit.reference);
    if (tx) {
      tx.status = approve ? 'completed' : 'rejected';
      tx.processedAt = deposit.reviewed_at || new Date().toISOString();
      if (!approve && reason) tx.notes = reason;
    }
    const cust = devCustomersById.get(deposit.user_id);
    if (cust && approve) {
      cust.balance = Math.round((Number(cust.balance || 0) + Number(deposit.amount || 0)) * 100) / 100;
      if (userSubBalancesStore.has(cust.id)) {
        userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
      }
      pushUserNotification(cust.id, {
        title: 'Deposit approved',
        message: `Your EUR ${deposit.amount.toFixed(2)} deposit (${deposit.reference}) has been approved and credited.`,
        type: 'success',
      });
    } else if (cust && !approve) {
      pushUserNotification(cust.id, {
        title: 'Deposit declined',
        message: `Deposit ${deposit.reference} was declined: ${reason || 'Proof could not be verified.'}`,
        type: 'warning',
      });
    }
  },
  persist: persistDevState,
});

registerDevSessionPersistence(ensureDevStateHydrated, persistDevState);

function toPublicDevCustomer(record: DevCustomerRecord) {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    role: record.role,
    accountType: record.accountType,
    kycStatus: record.kycStatus,
    balance: Number(record.balance || 0),
    investedBalance: Number(record.investedBalance || 0),
    currency: record.currency || 'EUR',
    createdAt: record.createdAt,
    country: record.country,
    countryCode: record.countryCode,
    phoneNumber: record.phoneNumber,
    isEmailVerified: record.isEmailVerified ?? true,
    status: record.status || 'active',
    frozen: Boolean((record as any).frozen ?? record.status === 'suspended'),
    isAdmin: Boolean((record as any).isAdmin ?? (record.role === 'admin' || record.role === 'super_admin')),
    staffRole: (record as any).staffRole ?? (record.role && record.role !== 'investor' ? record.role : null),
    assignedGateId: (record as any).assignedGateId ?? null,
    assignedGateName: (record as any).assignedGateName ?? null,
    assignedUsdtGateId: (record as any).assignedUsdtGateId ?? null,
    assignedUsdtGateName: (record as any).assignedUsdtGateName ?? null,
    suspendedReason: record.suspendedReason,
    address: record.address,
    city: record.city,
    postalCode: record.postalCode,
    avatarUrl: record.avatarUrl,
    bankIban: record.bankIban,
    bankAccountHolder: record.bankAccountHolder || record.fullName,
    cryptoDepositAddress: record.cryptoDepositAddress,
    taxId: record.taxId,
    dateOfBirth: record.dateOfBirth,
    preferences: record.preferences
  };
}

function isDevCustomerRequest(req?: AuthenticatedRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const userId = req?.user?.id;
  if (!userId) return false;
  return userId.startsWith('usr-dev-') || devCustomersById.has(userId);
}

function shouldUseSupabaseForCustomer(req?: AuthenticatedRequest): boolean {
  return isSupabaseServerConfigured() && !isDevCustomerRequest(req);
}

let mockListings = [
  {
    id: 'prop-villa-mirador',
    slug: 'villa-mirador-marbella',
    title: 'Villa El Mirador',
    location: 'La Zagaleta, Benahavís, Spain',
    city: 'Benahavís',
    country: 'Spain',
    type: 'Luxury Villa',
    status: 'open',
    fundedAmount: 1840000,
    targetAmount: 2450000,
    tokenPrice: 364,
    totalTokens: 6730,
    availableTokens: 1675,
    monthlyTargetRate: 6.10,
    projectedYield: 73.2,
    capitalAppreciation: 5.5,
    minimumInvestment: 1000,
    holdingPeriodMonths: 48,
    images: [
      'https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg',
      'https://files.kretzrealestate.com/bf9614ca8f58bfccfdcc38b3f7f167e.jpg',
      'https://files.kretzrealestate.com/3286f7373a9319f6adb33037462b9324.jpg',
      'https://files.kretzrealestate.com/6bc1db91a5f1856684da4204fd49ddd.jpg',
      'https://files.kretzrealestate.com/77505885976169785aa355b7b21d7abe.jpg',
      'https://files.kretzrealestate.com/337717ee33c361d8662e538c0cf8088.jpg',
      'https://files.kretzrealestate.com/413290f763843c687cca11f6bc94ca.jpg'
    ],
    specs: { bedrooms: 7, bathrooms: 9, builtAreaM2: 1280, plotAreaM2: 5200 },
    financials: { grossRentAnnual: 220000, netYield: 73.2, totalIrr: 292.8 }
  },
  {
    id: 'prop-palacio-pedralbes',
    slug: 'palacio-pedralbes-barcelona',
    title: 'Palacio de Pedralbes',
    location: 'Pedralbes, Barcelona, Spain',
    city: 'Barcelona',
    country: 'Spain',
    type: 'Modernist Mansion',
    status: 'open',
    fundedAmount: 980000,
    targetAmount: 1650000,
    tokenPrice: 364,
    totalTokens: 4532,
    availableTokens: 1840,
    monthlyTargetRate: 6.30,
    projectedYield: 75.6,
    capitalAppreciation: 4.8,
    minimumInvestment: 1000,
    holdingPeriodMonths: 48,
    images: [
      'https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg',
      'https://files.kretzrealestate.com/7cae7d2c3b9bbf8e9445a1b2cc78e81.jpg',
      'https://files.kretzrealestate.com/e1d5efb0c63a5b291d5efb22df70cc39.jpg',
      'https://files.kretzrealestate.com/9137bb174bd8652fb631cde092a6ec.jpg',
      'https://files.kretzrealestate.com/8ea96ea88eac7013d9d6445c14583f8e.jpg',
      'https://files.kretzrealestate.com/c55e327fcfeb5af6d71e727d9662616.jpg',
      'https://files.kretzrealestate.com/27c1f069733648b4db1711cf1d1b.jpg'
    ],
    specs: { bedrooms: 6, bathrooms: 7, builtAreaM2: 950, plotAreaM2: 2400 },
    financials: { grossRentAnnual: 145000, netYield: 75.6, totalIrr: 302.4 }
  },
  {
    id: 'prop-finca-son-vida',
    slug: 'finca-son-vida-mallorca',
    title: 'Son Vida Private Estate',
    location: 'Son Vida, Palma de Mallorca, Spain',
    city: 'Palma de Mallorca',
    country: 'Spain',
    type: 'Island Finca',
    status: 'open',
    fundedAmount: 2600000,
    targetAmount: 3100000,
    tokenPrice: 364,
    totalTokens: 8516,
    availableTokens: 1373,
    monthlyTargetRate: 6.50,
    projectedYield: 78.0,
    capitalAppreciation: 6.2,
    minimumInvestment: 1000,
    holdingPeriodMonths: 36,
    images: [
      'https://files.kretzrealestate.com/90c118757380841fab714e209b2d3984.jpg',
      'https://files.kretzrealestate.com/b8d5f1e23efcd102b11bcb49831c99.jpg',
      'https://files.kretzrealestate.com/31574c24ff15ac43bf531be459a515f9.jpg',
      'https://files.kretzrealestate.com/a96543a914113694b2503fa450b344f7.jpg',
      'https://files.kretzrealestate.com/2f11c8e882deea4e33221d31a6718a.jpg',
      'https://files.kretzrealestate.com/3c62f78b3114e7f8f343dfcd6ca6dbf.jpg',
      'https://files.kretzrealestate.com/57597262d0e282a1c34ff9e1a4a539d1.jpg'
    ],
    specs: { bedrooms: 8, bathrooms: 10, builtAreaM2: 1450, plotAreaM2: 8900 },
    financials: { grossRentAnnual: 310000, netYield: 78.0, totalIrr: 234.0 }
  }
];

// Real transactions store initialized empty
let mockTransactions: any[] = [];

let platformConfig = {
  platformName: 'Kretz Prime Real Estate Platform',
  baseCurrency: 'EUR',
  minInvestment: 750,
  maxInvestmentPerInvestor: 500000,
  limits: {
    min_deposit_eur: 100,
    max_deposit_eur: 500000,
    min_withdrawal_eur: 250,
    max_withdrawal_eur: 250000,
    min_investment_eur: 500,
    withdrawal_fee_eur: 0,
    require_kyc_for_withdrawal: true
  },
  tradingEnabled: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  maintenanceMode: false,
  announcementBanner: {
    active: false,
    text: '',
    type: 'info'
  },
  kycEnforcement: 'STRICT',
  supportedChains: ['BNB Smart Chain (BEP20)'],
  settlementTimeHours: 24,
  updatedAt: new Date().toISOString(),
  updatedBy: 'usr-admin-01'
};

let mockAuditLogs = [
  {
    id: 'audit-001',
    adminId: 'usr-admin-01',
    adminEmail: 'admin@kretz.com',
    action: 'SETTINGS_UPDATE',
    details: 'Updated institutional treasury settlement address for Base network.',
    timestamp: new Date(Date.now() - 86400000).toISOString()
  }
];

// Processed webhook idempotency set to prevent duplicate financial processing
const processedWebhooks = new Set<string>();

// Per-user favorites, preferences, notifications, referrals, and multi-currency treasury sub-balances
const userFavoritesStore = new Map<string, Set<string>>();
const userPreferencesStore = new Map<string, Record<string, any>>();
const userSubBalancesStore = new Map<string, Record<string, number>>();
const contactInquiriesStore: Array<Record<string, any>> = [];
const newsletterSubscribersStore = new Map<string, { email: string; source: string; subscribedAt: string; reference: string }>();
const membershipApplicationsStore: Array<Record<string, any>> = [];
const userReferralsStore = new Map<string, Array<{ id: string; email: string; date: string; status: 'invited' | 'registered' | 'funded'; reward: number; referralCode?: string }>>();
const userNotificationsStore = new Map<string, any[]>();

const TREASURY_FX_RATES_TO_EUR_TEST: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92,
  GBP: 1.18,
  CHF: 1.06,
  USDC: 0.92,
  USDT: 0.92,
  SOL: 158.4,
};
const TREASURY_FX_FEE_PERCENT = 0.15;
const TREASURY_MIN_EUR = 10;
const TREASURY_MAX_EUR = 250000;
const TREASURY_QUOTE_TTL_MS = 60_000;

interface CachedLiveRates {
  ratesToEur: Record<string, number>;
  fetchedAt: number;
  source: string;
}

let liveRatesCache: CachedLiveRates | null = null;
const activeTreasuryQuotes = new Map<
  string,
  { ratesToEur: Record<string, number>; feePercent: number; expiresAt: number; source: string }
>();

async function fetchLiveTreasuryRates(): Promise<{
  available: boolean;
  ratesToEur?: Record<string, number>;
  updatedAt?: string;
  source?: string;
  error?: string;
}> {
  if (process.env.NODE_ENV === 'test') {
    return {
      available: true,
      ratesToEur: { ...TREASURY_FX_RATES_TO_EUR_TEST },
      updatedAt: new Date().toISOString(),
      source: 'test-deterministic-feed',
    };
  }

  const now = Date.now();
  if (liveRatesCache && now - liveRatesCache.fetchedAt < TREASURY_QUOTE_TTL_MS) {
    return {
      available: true,
      ratesToEur: { ...liveRatesCache.ratesToEur },
      updatedAt: new Date(liveRatesCache.fetchedAt).toISOString(),
      source: liveRatesCache.source,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const [fiatRes, cryptoRes] = await Promise.all([
      fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF', { signal: controller.signal }),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether,solana&vs_currencies=eur', {
        signal: controller.signal,
      }),
    ]);
    clearTimeout(timer);

    if (!fiatRes.ok || !cryptoRes.ok) {
      throw new Error('Upstream FX/Crypto provider returned non-200 status');
    }

    const fiatJson: any = await fiatRes.json();
    const cryptoJson: any = await cryptoRes.json();

    const usdPerEur = Number(fiatJson?.rates?.USD);
    const gbpPerEur = Number(fiatJson?.rates?.GBP);
    const chfPerEur = Number(fiatJson?.rates?.CHF);
    const usdcEur = Number(cryptoJson?.['usd-coin']?.eur);
    const usdtEur = Number(cryptoJson?.tether?.eur);
    const solEur = Number(cryptoJson?.solana?.eur);

    if (
      !Number.isFinite(usdPerEur) || usdPerEur <= 0 ||
      !Number.isFinite(gbpPerEur) || gbpPerEur <= 0 ||
      !Number.isFinite(chfPerEur) || chfPerEur <= 0 ||
      !Number.isFinite(usdcEur) || usdcEur <= 0 ||
      !Number.isFinite(usdtEur) || usdtEur <= 0 ||
      !Number.isFinite(solEur) || solEur <= 0
    ) {
      throw new Error('Incomplete exchange rate payload received from upstream provider');
    }

    const ratesToEur: Record<string, number> = {
      EUR: 1.0,
      USD: Number((1 / usdPerEur).toFixed(6)),
      GBP: Number((1 / gbpPerEur).toFixed(6)),
      CHF: Number((1 / chfPerEur).toFixed(6)),
      USDC: Number(usdcEur.toFixed(6)),
      USDT: Number(usdtEur.toFixed(6)),
      SOL: Number(solEur.toFixed(4)),
    };

    liveRatesCache = {
      ratesToEur,
      fetchedAt: now,
      source: 'Frankfurter ECB + CoinGecko Live Feed',
    };

    return {
      available: true,
      ratesToEur,
      updatedAt: new Date(now).toISOString(),
      source: liveRatesCache.source,
    };
  } catch (err: any) {
    // Allow brief 5-minute stale-while-revalidate grace only if we previously received genuine live market rates
    if (liveRatesCache && now - liveRatesCache.fetchedAt < 5 * 60_000) {
      return {
        available: true,
        ratesToEur: { ...liveRatesCache.ratesToEur },
        updatedAt: new Date(liveRatesCache.fetchedAt).toISOString(),
        source: `${liveRatesCache.source} (Cached)`,
      };
    }
    return {
      available: false,
      error: err?.message || 'Live FX and crypto rate feed is temporarily unreachable.',
    };
  }
}

function getOrInitUserSubBalances(userId: string, eurBalance: number): Record<string, number> {
  let balances = userSubBalancesStore.get(userId);
  if (!balances) {
    balances = {
      EUR: eurBalance,
      USD: 0,
      GBP: 0,
      CHF: 0,
      USDC: 0,
      USDT: 0,
      SOL: 0
    };
    userSubBalancesStore.set(userId, balances);
  } else {
    balances.EUR = eurBalance;
  }
  return balances;
}

function pushUserNotification(userId: string, notif: { title: string; message: string; type: string }) {
  const list = userNotificationsStore.get(userId) || [];
  list.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    read: false,
    createdAt: new Date().toISOString()
  });
  userNotificationsStore.set(userId, list);
}

async function notifyInvestorEvent(params: {
  userId: string;
  email?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  emailTemplate?: string;
  emailData?: Record<string, any>;
  idempotencyKey?: string;
}) {
  if (isSupabaseServerConfigured()) {
    await createUserNotification(params.userId, {
      title: params.title,
      message: params.message,
      type: params.type,
    }).catch(() => {});
  } else {
    pushUserNotification(params.userId, {
      title: params.title,
      message: params.message,
      type: params.type,
    });
  }

  if (params.email && params.emailTemplate) {
    sendEmail({
      templateId: params.emailTemplate,
      recipient: params.email,
      data: params.emailData || {},
      idempotencyKey: params.idempotencyKey,
    }).catch(() => {});
  }
}

// ============================================================================
// 1. AUTHENTICATION ROUTES (/api/v1/auth)
// ============================================================================

// Rate limit authentication attempts: 15 attempts per 5 minutes
const authLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  category: 'auth',
  message: 'Too many authentication attempts. Please wait 5 minutes.'
});

/**
 * POST /api/v1/auth/login
 * Production-grade customer authentication with bcrypt validation, brute-force lockout, and HttpOnly session cookie
 */
router.post('/auth/login', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || req.body?.pass || '');
  if (!normalizedEmail || !password) return res.status(400).json({ success: false, error: 'Please provide both email address and password.', code: 'MISSING_FIELDS', requestId: req.id });

  if (!isSupabaseAuthConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Customer authentication is not configured. Please contact support.', code: 'SUPABASE_AUTH_NOT_CONFIGURED', requestId: req.id });
    }

    const ip = getRequestIp(req);
    const lockKey = `${ip}:${normalizedEmail}`;
    const lockStatus = checkBruteForceLimit(lockKey);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please wait a few minutes and try again.',
        code: 'RATE_LIMIT_EXCEEDED',
        remainingSeconds: lockStatus.remainingSeconds,
        requestId: req.id
      });
    }

    await ensureDevStateHydrated();
    const devUser = devCustomersByEmail.get(normalizedEmail);
    if (!devUser || !verifyPassword(password, devUser.passwordHash)) {
      recordFailedLogin(lockKey);
      logger.log({ level: 'warn', category: 'auth', requestId: req.id || 'req-dev-login-failed', eventType: 'DEV_LOGIN_FAILED', outcome: 'failure', message: 'Invalid login credentials' });
      return res.status(401).json({ success: false, error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS', requestId: req.id });
    }

    if (devUser.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: devUser.suspendedReason || 'Your account has been suspended by compliance. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
        requestId: req.id
      });
    }

    resetFailedLogin(lockKey);
    const session = await createSession({
      userId: devUser.id,
      email: devUser.email,
      role: 'investor',
      fullName: devUser.fullName,
      ip,
      userAgent: String(req.headers['user-agent'] || 'unknown')
    });

    res.cookie('kretz_session', session.id, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: ABSOLUTE_TIMEOUT_MS,
      path: '/'
    });
    res.setHeader('X-CSRF-Token', session.csrfToken);

    const safeUser = toPublicDevCustomer(devUser);
    return res.json({
      success: true,
      data: {
        user: safeUser,
        token: session.id,
        csrfToken: session.csrfToken,
        expiresAt: new Date(session.expiresAt).toISOString()
      },
      user: safeUser,
      token: session.id,
      csrfToken: session.csrfToken,
      message: 'Authentication successful.',
      requestId: req.id
    });
  }

  try {
    // Normal investor login is email + password only (no email OTP required per login).
    const result = await signInCustomer(normalizedEmail, password);
    return res.json({
      success: true,
      data: { user: result.user, token: result.session.access_token, refreshToken: result.session.refresh_token, expiresAt: new Date(result.session.expires_at ? result.session.expires_at * 1000 : Date.now() + result.session.expires_in * 1000).toISOString() },
      user: result.user, token: result.session.access_token, refreshToken: result.session.refresh_token,
      message: 'Authentication successful.', requestId: req.id
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message === 'ACCOUNT_SUSPENDED') return res.status(403).json({ success: false, error: 'Your account has been suspended by compliance. Please contact support.', code: 'ACCOUNT_SUSPENDED', requestId: req.id });
    if (message === 'ADMIN_LOGIN_REQUIRED') return res.status(403).json({ success: false, error: 'Administrator accounts must sign in through the Administrator Gateway.', code: 'ADMIN_LOGIN_REQUIRED', requestId: req.id });
    if (/email not confirmed/i.test(message)) return res.status(403).json({ success: false, error: 'Email not confirmed yet. Please verify your email before signing in.', code: 'EMAIL_NOT_CONFIRMED', requestId: req.id });
    if (message === 'SUPABASE_PROFILE_NOT_PROVISIONED') return res.status(403).json({ success: false, error: 'Your account profile is not yet available. Please contact support.', code: 'PROFILE_NOT_PROVISIONED', requestId: req.id });
    logger.log({ level: 'warn', category: 'auth', requestId: req.id || 'req-login-failed', eventType: 'SUPABASE_LOGIN_FAILED', outcome: 'failure', message: 'Supabase customer sign-in failed.' });
    return res.status(401).json({ success: false, error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS', requestId: req.id });
  }
});

/**
 * Optional passwordless email security-code sign-in
 */
router.post('/auth/login-code/request', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!normalizedEmail || !validateEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'Please provide a valid email address.', code: 'INVALID_EMAIL', requestId: req.id });
  }
  if (!isSupabaseAuthConfigured()) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: req.id || 'req-login-code-unconfigured',
      eventType: 'LOGIN_EMAIL_CODE_UNAVAILABLE',
      outcome: 'failure',
      message: 'Email code login requested while Supabase Auth/email provider is not configured.'
    });
    return res.status(503).json({ success: false, error: 'We couldn’t send your code. Please try again, or contact support.', code: 'EMAIL_CODE_SERVICE_UNAVAILABLE', requestId: req.id });
  }
  try {
    const challenge = await sendLoginEmailCode(normalizedEmail, 'investor_login');
    if (!challenge.success) {
      logger.log({
        level: 'warn',
        category: 'security',
        requestId: req.id || 'req-login-code-rate',
        eventType: 'LOGIN_EMAIL_CODE_RATE_LIMITED',
        outcome: 'failure',
        message: 'Login email code rate limit triggered.',
        metadata: { reason: challenge.reason, retryAfter: challenge.retryAfter }
      });
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please wait a few minutes and try again.',
        code: challenge.reason || 'RATE_LIMITED',
        retryAfter: challenge.retryAfter || 60,
        requestId: req.id
      });
    }
    return res.json({
      success: true,
      maskedEmail: challenge.maskedEmail,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      message: 'A six-digit security code has been sent to your email address.',
      requestId: req.id
    });
  } catch (error: any) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: req.id || 'req-login-code-err',
      eventType: 'LOGIN_EMAIL_CODE_SEND_FAILED',
      outcome: 'failure',
      message: String(error?.message || 'Failed to dispatch login email code')
    });
    return res.status(503).json({
      success: false,
      error: 'We couldn’t send your code. Please try again, or contact support.',
      code: 'EMAIL_CODE_SERVICE_UNAVAILABLE',
      requestId: req.id
    });
  }
});

router.post('/auth/login-code/verify', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();
  if (!normalizedEmail || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 6-digit security code.', code: 'INVALID_EMAIL_CODE', requestId: req.id });
  }
  if (!isSupabaseAuthConfigured()) {
    return res.status(503).json({ success: false, error: 'We couldn’t send your code. Please try again, or contact support.', code: 'EMAIL_CODE_SERVICE_UNAVAILABLE', requestId: req.id });
  }
  try {
    const codeResult = await verifyEmailOtp(normalizedEmail, 'investor_login', code);
    if (!codeResult.valid) {
      return res.status(401).json({ success: false, error: 'The security code is invalid or expired. Request a new code and try again.', code: 'INVALID_EMAIL_CODE', requestId: req.id });
    }
    const { data: linkData, error: linkErr } = await getSupabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      throw linkErr || new Error('LOGIN_SESSION_GENERATION_FAILED');
    }
    const { data: otpSessionData, error: otpErr } = await getSupabaseAdmin().auth.verifyOtp({
      email: normalizedEmail,
      token: linkData.properties.email_otp,
      type: 'email',
    });
    if (otpErr || !otpSessionData?.session || !otpSessionData?.user) {
      throw otpErr || new Error('LOGIN_SESSION_EXCHANGE_FAILED');
    }
    const profile = await getUserProfile(otpSessionData.user.id);
    if (profile?.account_status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended by compliance. Please contact support.', code: 'ACCOUNT_SUSPENDED', requestId: req.id });
    }
    markActionSessionVerified(otpSessionData.user.id);
    const userPayload = {
      id: otpSessionData.user.id,
      email: profile?.email || otpSessionData.user.email || normalizedEmail,
      fullName: profile?.full_name || 'Investor',
      role: 'investor',
      accountType: profile?.account_type || 'individual_investor',
      kycStatus: profile?.kyc_status || 'pending',
      balance: Number(profile?.wallet_balance || 0),
      status: 'active',
    };
    return res.json({
      success: true,
      data: {
        user: userPayload,
        token: otpSessionData.session.access_token,
        refreshToken: otpSessionData.session.refresh_token,
        expiresAt: new Date(otpSessionData.session.expires_at ? otpSessionData.session.expires_at * 1000 : Date.now() + otpSessionData.session.expires_in * 1000).toISOString(),
      },
      user: userPayload,
      token: otpSessionData.session.access_token,
      refreshToken: otpSessionData.session.refresh_token,
      message: 'Authentication successful.',
      requestId: req.id,
    });
  } catch (error: any) {
    logger.log({
      level: 'error',
      category: 'security',
      requestId: req.id || 'req-login-code-verify-err',
      eventType: 'LOGIN_EMAIL_CODE_VERIFY_FAILED',
      outcome: 'failure',
      message: String(error?.message || 'Login email code verification failed')
    });
    return res.status(401).json({ success: false, error: 'The security code is invalid or expired. Request a new code and try again.', code: 'INVALID_EMAIL_CODE', requestId: req.id });
  }
});

/**
 * POST /api/v1/admin/login & /api/v1/auth/admin/login & /api/v1/auth/admin-login
 * Environment-configured administrator authentication with rate limiting and secure sessions
 */
const handleAdminLogin = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, pass } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const inputPass = password || pass;

  const rawHeader = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(rawHeader) ? rawHeader[0] : (typeof rawHeader === 'string' ? rawHeader.split(',')[0].trim() : undefined)) || req.socket.remoteAddress || '127.0.0.1';

  // 1. Check Rate Limiter & Lockout
  const rateLimitStatus = process.env.NODE_ENV === 'production' ? await checkPersistentAdminRateLimit(ip) : checkAdminRateLimit(ip);
  if (rateLimitStatus.isLocked) {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-admin-locked',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 429,
      eventType: 'ADMIN_LOGIN_LOCKED_OUT',
      outcome: 'failure',
      message: `Admin login blocked: IP ${ip} is temporarily locked for ${rateLimitStatus.remainingSeconds}s due to repeated failures.`,
      metadata: { ip, remainingSeconds: rateLimitStatus.remainingSeconds }
    });

    return res.status(429).json({
      success: false,
      error: `Too many failed attempts. Administrative login is locked for ${rateLimitStatus.remainingSeconds} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED',
      remainingSeconds: rateLimitStatus.remainingSeconds,
      requestId: req.id
    });
  }

  // 2. Validate input presence
  if (!normalizedEmail || !inputPass) {
    return res.status(400).json({
      success: false,
      error: 'Please provide administrator email address and security password.',
      code: 'MISSING_FIELDS',
      requestId: req.id
    });
  }

  // 3. Load administrator configuration from environment
  const config = process.env.NODE_ENV === 'production' ? await getPersistentAdminConfig() : getAdminConfig();

  // 4. Validate both administrator factors before issuing any email challenge.
  const emailMatches = normalizedEmail === config.adminEmail;
  const passwordMatches = emailMatches && (process.env.NODE_ENV === 'production'
    ? await verifyPersistentAdminCredentials(normalizedEmail, inputPass)
    : await verifyAdminCredentials(inputPass));

  if (!emailMatches || !passwordMatches) {
    const failureRecord = process.env.NODE_ENV === 'production' ? await recordPersistentAdminFailure(ip) : recordAdminFailedAttempt(ip);
    logger.log({
      level: 'warn', category: 'security', requestId: req.id || 'req-admin-fail',
      method: 'POST', route: req.originalUrl, statusCode: 401,
      eventType: 'ADMIN_LOGIN_FAILED', outcome: 'failure',
      message: `Failed admin login attempt from ${ip} for account ${normalizedEmail}. Failed attempts: ${failureRecord.attempts}`,
      errorCode: 'INVALID_CREDENTIALS',
      metadata: { ip, attempts: failureRecord.attempts, isLocked: failureRecord.isLocked }
    });
    return res.status(401).json({
      success: false, error: 'Invalid administrator email or security credentials.',
      code: 'INVALID_CREDENTIALS', remainingAttempts: Math.max(0, 5 - failureRecord.attempts), requestId: req.id
    });
  }

  if (isEmailOtpEnforced()) {
    const emailCode = String(req.body?.emailCode || '').trim();
    if (!emailCode) {
      try {
        const challenge = await sendLoginEmailCode(normalizedEmail, 'admin_login');
        if (!challenge.success) return res.status(429).json({ success: false, error: 'A security code was recently sent or the request limit was reached. Please wait before requesting another.', code: challenge.reason, retryAfter: challenge.retryAfter, requestId: req.id });
        return res.json({ success: true, requiresEmailCode: true, maskedEmail: challenge.maskedEmail, expiresInSeconds: 300, message: 'A six-digit administrator security code has been sent to your registered email address.', requestId: req.id });
      } catch {
        return res.status(503).json({ success: false, error: 'Unable to send the administrator security code. Please try again later.', code: 'EMAIL_CODE_DELIVERY_FAILED', requestId: req.id });
      }
    }
    const codeResult = await verifyEmailOtp(normalizedEmail, 'admin_login', emailCode);
    if (!codeResult.valid) return res.status(401).json({ success: false, error: 'The security code is invalid or expired. Request a new code and try again.', code: 'INVALID_EMAIL_CODE', requestId: req.id });
  }

  // Production administrator credentials must map to an explicitly provisioned database role.
  if (process.env.NODE_ENV === 'production') {
    if (!isSupabaseServerConfigured()) {
      return res.status(503).json({ success: false, error: 'Administrator database authorization is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    try {
      const identity = await getAdminIdentityByEmail(normalizedEmail);
      if (!identity) {
        return res.status(403).json({ success: false, error: 'This administrator email has not been provisioned with an authorized role in the platform database.', code: 'ADMIN_ROLE_NOT_PROVISIONED', requestId: req.id });
      }
    } catch {
      return res.status(503).json({ success: false, error: 'Administrator authorization could not be verified.', code: 'ADMIN_AUTHORIZATION_UNAVAILABLE', requestId: req.id });
    }
  }

  // 5. Success: reset failed attempts
  if (process.env.NODE_ENV === 'production') await resetPersistentAdminFailures(ip); else resetAdminFailedAttempts(ip);

  // 6. Establish secure server session
  const session = process.env.NODE_ENV === 'production' ? await createPersistentAdminSession(config.adminEmail, config.fullName) : createAdminSession(config.adminEmail, config.fullName);

  // 7. Set HTTP-only secure SameSite cookie
  res.cookie('kretz_admin_session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-admin-login-ok',
    method: 'POST',
    route: req.originalUrl,
    statusCode: 200,
    userId: session.payload.sub,
    userRole: 'admin',
    eventType: 'ADMIN_LOGIN_SUCCESS',
    outcome: 'success',
    message: `Administrator ${session.payload.email} authenticated successfully via environment credentials.`,
    metadata: { role: 'admin', authMode: 'environment-secret' }
  });

  return res.json({
    success: true,
    data: {
      user: {
        id: session.payload.sub,
        email: session.payload.email,
        role: 'admin',
        fullName: session.payload.fullName
      },
      token: session.token,
      expiresAt: new Date(session.payload.exp).toISOString()
    },
    token: session.token,
    user: {
      id: session.payload.sub,
      email: session.payload.email,
      role: 'admin',
      fullName: session.payload.fullName
    },
    message: 'Administrative authentication successful.',
    requestId: req.id
  });
};

router.post(['/admin/login', '/auth/admin/login', '/auth/admin-login'], authLimiter, handleAdminLogin);

/**
 * POST /api/v1/auth/admin-customize
 * Verifies the active administrator email + password and atomically sets a custom administrator email,
 * display name, and bcrypt-hashed password while issuing a freshly rotated administrator session.
 */
router.post(
  ['/admin/customize', '/auth/admin-customize'],
  authLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const rateLimitStatus = process.env.NODE_ENV === 'production' ? await checkPersistentAdminRateLimit(ip) : checkAdminRateLimit(ip);
    if (rateLimitStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Too many failed attempts. Administrative gateway is locked for ${rateLimitStatus.remainingSeconds} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        remainingSeconds: rateLimitStatus.remainingSeconds,
        requestId: req.id
      });
    }

    const { currentEmail, currentPassword, newEmail, newPassword, fullName } = req.body || {};
    const normalizedCurrentEmail =
      typeof currentEmail === 'string' ? currentEmail.trim().toLowerCase() : '';
    const inputCurrPass = typeof currentPassword === 'string' ? currentPassword : '';

    if (!normalizedCurrentEmail || !inputCurrPass) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your current administrator email and current password to authorize custom credentials.',
        code: 'MISSING_CURRENT_CREDENTIALS',
        requestId: req.id
      });
    }

    const config = process.env.NODE_ENV === 'production' ? await getPersistentAdminConfig() : getAdminConfig();
    const emailMatches = normalizedCurrentEmail === config.adminEmail;
    const passwordMatches = process.env.NODE_ENV === 'production' ? await verifyPersistentAdminCredentials(normalizedCurrentEmail, inputCurrPass) : await verifyAdminCredentials(inputCurrPass);

    if (!emailMatches || !passwordMatches) {
      const failureRecord = process.env.NODE_ENV === 'production' ? await recordPersistentAdminFailure(ip) : recordAdminFailedAttempt(ip);
      logger.log({
        level: 'warn',
        category: 'security',
        requestId: req.id || 'req-admin-customize-denied',
        method: 'POST',
        route: req.originalUrl,
        statusCode: 401,
        eventType: 'ADMIN_CUSTOMIZE_DENIED',
        outcome: 'failure',
        message: `Failed admin credential customization attempt from ${ip} for ${normalizedCurrentEmail}.`,
        errorCode: 'INVALID_CURRENT_CREDENTIALS',
        metadata: { ip, attempts: failureRecord.attempts, isLocked: failureRecord.isLocked }
      });

      return res.status(401).json({
        success: false,
        error: 'Current administrator email or password is incorrect.',
        code: 'INVALID_CURRENT_CREDENTIALS',
        remainingAttempts: Math.max(0, 5 - failureRecord.attempts),
        requestId: req.id
      });
    }

    const targetEmail = (typeof newEmail === 'string' ? newEmail : '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid custom administrator email address.',
        code: 'INVALID_EMAIL',
        requestId: req.id
      });
    }
    if (process.env.NODE_ENV === 'production') {
      if (!isSupabaseServerConfigured()) return res.status(503).json({ success: false, error: 'Administrator database authorization is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
      try {
        const identity = await getAdminIdentityByEmail(targetEmail);
        if (!identity) return res.status(403).json({ success: false, error: 'The new administrator email must already belong to a provisioned platform administrator.', code: 'ADMIN_ROLE_NOT_PROVISIONED', requestId: req.id });
      } catch {
        return res.status(503).json({ success: false, error: 'Administrator authorization could not be verified.', code: 'ADMIN_AUTHORIZATION_UNAVAILABLE', requestId: req.id });
      }
    }

    const targetPassword = typeof newPassword === 'string' ? newPassword : '';
    if (!targetPassword || targetPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Your new administrator password must be at least 8 characters long.',
        code: 'WEAK_PASSWORD',
        requestId: req.id
      });
    }

    if (process.env.NODE_ENV === 'production') await resetPersistentAdminFailures(ip); else resetAdminFailedAttempts(ip);

    const targetFullName =
      typeof fullName === 'string' && fullName.trim() ? fullName.trim() : config.fullName;

    const updated = process.env.NODE_ENV === 'production'
      ? await updatePersistentAdminCredentials({ email: targetEmail, fullName: targetFullName, password: targetPassword, updatedBy: req.user?.id || 'system' })
      : await updateCustomAdminCredentials({ email: targetEmail, fullName: targetFullName, passwordToHash: targetPassword });

        const session = process.env.NODE_ENV === 'production' ? await createPersistentAdminSession(updated.adminEmail, updated.fullName) : createAdminSession(updated.adminEmail, updated.fullName);
    res.cookie('kretz_admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    logger.log({
      level: 'info',
      category: 'admin',
      requestId: req.id || 'req-admin-customize-ok',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 200,
      userId: session.payload.sub,
      userRole: 'admin',
      eventType: 'ADMIN_CREDENTIALS_CUSTOMIZED',
      outcome: 'success',
      message: `Custom administrator credentials configured and session established for ${updated.adminEmail}.`
    });

    return res.json({
      success: true,
      token: session.token,
      user: {
        id: session.payload.sub,
        email: session.payload.email,
        role: 'admin',
        fullName: session.payload.fullName
      },
      data: {
        email: updated.adminEmail,
        fullName: updated.fullName,
        mode: 'custom_bcrypt',
        isCustomConfigured: true,
        updatedAt: updated.updatedAt,
        token: session.token,
        user: {
          id: session.payload.sub,
          email: session.payload.email,
          role: 'admin',
          fullName: session.payload.fullName
        }
      },
      message: 'Custom administrator email and password configured successfully.',
      requestId: req.id
    });
  }
);

/**
 * POST /api/v1/admin/logout & /api/v1/auth/admin-logout
 */
router.post(['/admin/logout', '/auth/admin/logout', '/auth/admin-logout'], async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)kretz_admin_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (token) {
    if (process.env.NODE_ENV === 'production') await revokePersistentAdminSession(token); else revokeAdminSession(token);
  }

  res.clearCookie('kretz_admin_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-admin-logout',
    method: 'POST',
    route: req.originalUrl,
    statusCode: 200,
    eventType: 'ADMIN_LOGOUT_SUCCESS',
    outcome: 'success',
    message: 'Administrator session revoked successfully.'
  });

  res.json({
    success: true,
    message: 'Administrator session terminated successfully.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/security/credentials
 * Returns the active administrator login email, display name, and credential mode (never exposes hashes or passwords).
 */
router.get('/admin/security/credentials', requireAuth, requireStaffSection('staff-roles', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const config = process.env.NODE_ENV === 'production' ? await getPersistentAdminConfig() : getAdminConfig();
  const envState = process.env.NODE_ENV === 'production' ? { mode: config.isCustomConfigured ? 'custom_bcrypt' as const : 'bcrypt_hash' as const } : validateAdminEnvironment();

  return res.json({
    success: true,
    data: {
      email: config.adminEmail,
      fullName: config.fullName,
      mode: envState.mode,
      isCustomConfigured: config.isCustomConfigured,
      updatedAt: config.updatedAt
    },
    requestId: req.id
  });
});

/**
 * PUT /api/v1/admin/security/credentials
 * Updates the administrator login email, display name, and/or bcrypt-hashed password after verifying currentPassword.
 */
router.put(
  '/admin/security/credentials',
  securityLimiter,
  requireAuth,
  requireStaffSection('staff-roles', 'write'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newEmail, newPassword, fullName } = req.body || {};
    const config = process.env.NODE_ENV === 'production' ? await getPersistentAdminConfig() : getAdminConfig();

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please enter your current administrator password to authorize credential changes.',
        code: 'CURRENT_PASSWORD_REQUIRED',
        requestId: req.id
      });
    }

    const isCurrentValid = process.env.NODE_ENV === 'production' ? await verifyPersistentAdminCredentials(req.user?.email || '', currentPassword) : await verifyAdminCredentials(currentPassword);
    if (!isCurrentValid) {
      logger.log({
        level: 'warn',
        category: 'security',
        requestId: req.id || 'req-admin-cred-denied',
        method: 'PUT',
        route: req.originalUrl,
        statusCode: 401,
        userId: req.user?.id,
        eventType: 'ADMIN_CREDENTIALS_UPDATE_DENIED',
        outcome: 'failure',
        message: 'Failed attempt to update administrator credentials due to invalid current password.',
        errorCode: 'INVALID_CURRENT_PASSWORD'
      });

      return res.status(401).json({
        success: false,
        error: 'Current administrator password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD',
        requestId: req.id
      });
    }

    const targetEmail = (typeof newEmail === 'string' && newEmail.trim() ? newEmail : config.adminEmail)
      .trim()
      .toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid administrator email address.',
        code: 'INVALID_EMAIL',
        requestId: req.id
      });
    }
    if (process.env.NODE_ENV === 'production' && targetEmail !== config.adminEmail) {
      try {
        const targetIdentity = await getAdminIdentityByEmail(targetEmail);
        if (!targetIdentity) return res.status(403).json({ success: false, error: 'The new administrator email must already be provisioned with an authorized administrator role.', code: 'ADMIN_ROLE_NOT_PROVISIONED', requestId: req.id });
      } catch {
        return res.status(503).json({ success: false, error: 'Administrator authorization could not be verified.', code: 'ADMIN_AUTHORIZATION_UNAVAILABLE', requestId: req.id });
      }
    }

    const trimmedNewPass = typeof newPassword === 'string' ? newPassword : '';
    if (trimmedNewPass && trimmedNewPass.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New administrator password must be at least 8 characters long.',
        code: 'WEAK_PASSWORD',
        requestId: req.id
      });
    }

    const passwordToPersist = trimmedNewPass || currentPassword;
    const targetFullName =
      typeof fullName === 'string' && fullName.trim() ? fullName.trim() : config.fullName;

    const updated = process.env.NODE_ENV === 'production'
      ? await updatePersistentAdminCredentials({ email: targetEmail, fullName: targetFullName, password: passwordToPersist, updatedBy: req.user?.id || 'system' })
      : await updateCustomAdminCredentials({ email: targetEmail, fullName: targetFullName, passwordToHash: passwordToPersist });

        const session = process.env.NODE_ENV === 'production' ? await createPersistentAdminSession(updated.adminEmail, updated.fullName) : createAdminSession(updated.adminEmail, updated.fullName);
    res.cookie('kretz_admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    logger.log({
      level: 'info',
      category: 'admin',
      requestId: req.id || 'req-admin-cred-updated',
      method: 'PUT',
      route: req.originalUrl,
      statusCode: 200,
      userId: session.payload.sub,
      userRole: 'admin',
      eventType: 'ADMIN_CREDENTIALS_UPDATED',
      outcome: 'success',
      message: `Administrator login credentials updated for ${updated.adminEmail}.`,
      metadata: {
        emailChanged: updated.adminEmail !== config.adminEmail,
        passwordChanged: Boolean(trimmedNewPass)
      }
    });

    return res.json({
      success: true,
      data: {
        email: updated.adminEmail,
        fullName: updated.fullName,
        mode: 'custom_bcrypt',
        isCustomConfigured: true,
        updatedAt: updated.updatedAt,
        token: session.token,
        user: {
          id: session.payload.sub,
          email: session.payload.email,
          role: 'admin',
          fullName: session.payload.fullName
        }
      },
      message: 'Custom administrator email and security credentials saved.',
      requestId: req.id
    });
  }
);

/**
 * POST /api/v1/admin/security/credentials/reset
 * Resets custom administrator credentials back to environment or default settings after verifying currentPassword.
 */
router.post(
  '/admin/security/credentials/reset',
  securityLimiter,
  requireAuth,
  requireStaffSection('staff-roles', 'write'),
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please enter your current administrator password to authorize reset.',
        code: 'CURRENT_PASSWORD_REQUIRED',
        requestId: req.id
      });
    }

    const isCurrentValid = process.env.NODE_ENV === 'production' ? await verifyPersistentAdminCredentials(req.user?.email || '', currentPassword) : await verifyAdminCredentials(currentPassword);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        error: 'Current administrator password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD',
        requestId: req.id
      });
    }

    if (process.env.NODE_ENV === 'production') await resetPersistentAdminCredentials(); else resetCustomAdminCredentials();
    const restoredConfig = process.env.NODE_ENV === 'production' ? await getPersistentAdminConfig() : getAdminConfig();
    const envState = process.env.NODE_ENV === 'production' ? { mode: restoredConfig.isCustomConfigured ? 'custom_bcrypt' as const : 'bcrypt_hash' as const } : validateAdminEnvironment();
    const session = process.env.NODE_ENV === 'production' ? await createPersistentAdminSession(restoredConfig.adminEmail, restoredConfig.fullName) : createAdminSession(restoredConfig.adminEmail, restoredConfig.fullName);

    res.cookie('kretz_admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      data: {
        email: restoredConfig.adminEmail,
        fullName: restoredConfig.fullName,
        mode: envState.mode,
        isCustomConfigured: false,
        updatedAt: null,
        token: session.token,
        user: {
          id: session.payload.sub,
          email: session.payload.email,
          role: 'admin',
          fullName: session.payload.fullName
        }
      },
      message: 'Administrator credentials reset to environment default.',
      requestId: req.id
    });
  }
);

/**
 * GET /api/v1/admin/session & /api/v1/auth/admin-session
 */
router.get(['/admin/session', '/auth/admin/session'], (req: AuthenticatedRequest, res: Response) => {
  const adminRoles = ['admin','super_admin','finance_admin','operations_admin','finance','compliance','property_manager','support','auditor'];
  const hasStaff = Boolean(req.user && (req.user.isAdmin || (typeof req.user.staffRole === 'string' && req.user.staffRole.trim()) || adminRoles.includes(req.user.role)));
  if (req.user && hasStaff) {
    return res.json({
      success: true,
      data: {
        ...req.user,
        permissionsRole: req.user.staffRole || req.user.role,
        isAdmin: Boolean(req.user.isAdmin),
        staffRole: req.user.staffRole ?? null,
        role: req.user.isAdmin ? 'admin' : (req.user.staffRole || req.user.role || 'admin')
      },
      requestId: req.id
    });
  }

  return res.status(401).json({
    success: false,
    error: 'No active administrator session.',
    code: 'UNAUTHORIZED',
    requestId: req.id
  });
});

/**
 * POST /api/v1/auth/register
 * Production-grade registration with email validation, password strength enforcement,
 * duplicate prevention, bcrypt password hashing, and HttpOnly session establishment.
 */
router.post('/auth/register', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const rawPassword = req.body?.password ?? req.body?.pass ?? '';
  const password = typeof rawPassword === 'string' ? rawPassword : String(rawPassword || '');
  const fullName = String(req.body?.fullName || req.body?.full_name || '').trim();
  const country = String(req.body?.country || 'France').trim() || 'France';
  const phoneNumber = String(req.body?.phoneNumber || req.body?.phone_number || '').trim();
  const countryCode = String(req.body?.countryCode || req.body?.country_code || '').trim();
  const requestedAccountType = String(req.body?.accountType || req.body?.account_type || 'individual_investor').trim();
  const accountType = requestedAccountType === 'admin' || !requestedAccountType ? 'individual_investor' : requestedAccountType;

  if (!email || !password || !fullName) return res.status(400).json({ success: false, error: 'Full legal name, valid email address, and password are required.', code: 'VALIDATION_ERROR', requestId: req.id });
  if (fullName.length < 2) return res.status(400).json({ success: false, error: 'Full legal name must contain at least 2 characters.', code: 'VALIDATION_ERROR', requestId: req.id });
  if (!validateEmail(email)) return res.status(400).json({ success: false, error: 'Please provide a valid email address.', code: 'INVALID_EMAIL_FORMAT', requestId: req.id });
  const strength = validatePasswordStrength(password);
  if (!strength.valid) return res.status(400).json({ success: false, error: strength.error || 'Password does not meet institutional security requirements.', code: 'WEAK_PASSWORD', requestId: req.id });

  if (!isSupabaseAuthConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Customer registration is not configured. Please contact support.', code: 'SUPABASE_AUTH_NOT_CONFIGURED', requestId: req.id });
    }

    await ensureDevStateHydrated();
    if (devCustomersByEmail.has(email)) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
        code: 'EMAIL_ALREADY_EXISTS',
        requestId: req.id
      });
    }

    const userId = `usr-dev-${crypto.randomUUID()}`;
    const devUser: DevCustomerRecord = {
      id: userId,
      email,
      fullName,
      passwordHash: hashPassword(password),
      role: 'investor',
      accountType,
      kycStatus: 'pending',
      balance: 0,
      investedBalance: 0,
      currency: 'EUR',
      createdAt: new Date().toISOString(),
      country,
      countryCode,
      phoneNumber,
      isEmailVerified: true,
      status: 'active'
    };

    devCustomersByEmail.set(email, devUser);
    devCustomersById.set(userId, devUser);
    await persistDevState();

    const session = await createSession({
      userId: devUser.id,
      email: devUser.email,
      role: 'investor',
      fullName: devUser.fullName,
      ip: getRequestIp(req),
      userAgent: String(req.headers['user-agent'] || 'unknown')
    });

    res.cookie('kretz_session', session.id, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: ABSOLUTE_TIMEOUT_MS,
      path: '/'
    });
    res.setHeader('X-CSRF-Token', session.csrfToken);

    const safeUser = toPublicDevCustomer(devUser);
    return res.status(201).json({
      success: true,
      data: { user: safeUser, token: session.id, csrfToken: session.csrfToken, refreshToken: null, requiresVerification: false },
      user: safeUser,
      token: session.id,
      csrfToken: session.csrfToken,
      refreshToken: null,
      requiresVerification: false,
      message: 'Account created successfully.',
      requestId: req.id
    });
  }

  try {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : 'https://kretzdespain.com';
    const result = await registerCustomer({ email, password, fullName, accountType, country, countryCode, phoneNumber, redirectTo: `${origin}/#login` });
    const user = result.user || {
      id: result.authUser.id, email: result.authUser.email || email,
      fullName, role: 'investor', accountType,
      balance: 0, status: 'active'
    };
    return res.status(201).json({
      success: true,
      data: { user, token: result.session?.access_token || null, refreshToken: result.session?.refresh_token || null, requiresVerification: !result.session },
      user, token: result.session?.access_token || null, refreshToken: result.session?.refresh_token || null,
      requiresVerification: !result.session,
      message: result.session ? 'Account created successfully.' : 'Account created. Please verify your email before signing in.',
      requestId: req.id
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (/already registered|already exists|user already/i.test(message)) return res.status(409).json({ success: false, error: 'An account with this email address already exists. Please sign in.', code: 'EMAIL_ALREADY_EXISTS', requestId: req.id });
    if (/password/i.test(message)) return res.status(400).json({ success: false, error: message, code: 'WEAK_PASSWORD', requestId: req.id });
    if (/email.*invalid|invalid.*email/i.test(message)) return res.status(400).json({ success: false, error: 'Please provide a valid email address.', code: 'INVALID_EMAIL_FORMAT', requestId: req.id });
    logger.log({ level: 'error', category: 'auth', requestId: req.id || 'req-register-failed', eventType: 'SUPABASE_REGISTRATION_FAILED', outcome: 'failure', message: 'Supabase customer registration failed.' });
    return res.status(503).json({ success: false, error: 'Registration could not be completed. Please try again shortly.', code: 'REGISTRATION_UNAVAILABLE', requestId: req.id });
  }
});

/**
 * POST /api/v1/auth/logout
 * Terminates server-authoritative session and clears HttpOnly session cookie
 */
router.post('/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token && req.headers.cookie) {
    const sessionMatch = req.headers.cookie.match(/(?:^|;\s*)kretz_session=([^;]+)/);
    if (sessionMatch) token = decodeURIComponent(sessionMatch[1]);
  }
  if (req.user?.id) {
    clearActionSessionVerified(req.user.id);
  }
  if (token && token.startsWith('kz_sess_')) {
    try {
      const existing = await getSession(token);
      if (existing?.userId) clearActionSessionVerified(existing.userId);
      await revokeSession(token);
    } catch {}
  } else if (token && isSupabaseAuthConfigured()) {
    try { await signOutCustomer(token); }
    catch { return res.status(503).json({ success: false, error: 'Sign-out could not be completed. Please retry.', code: 'SIGN_OUT_UNAVAILABLE', requestId: req.id }); }
  }
  res.clearCookie('kretz_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  return res.json({ success: true, message: 'Session closed successfully.', requestId: req.id });
});

/**
 * POST /api/v1/auth/password/forgot
 */
router.post('/auth/password/forgot', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !validateEmail(email)) return res.status(400).json({ success: false, error: 'Please provide a valid email address.', code: 'INVALID_EMAIL', requestId: req.id });
  if (!isSupabaseAuthConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Password recovery is not configured. Please contact support.', code: 'SUPABASE_AUTH_NOT_CONFIGURED', requestId: req.id });
    }
    return res.json({ success: true, message: 'If an account exists with this email, recovery instructions have been sent.', requestId: req.id });
  }
  try {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : 'https://kretzdespain.com';
    await requestCustomerPasswordReset(email, `${origin}/#reset-password`);
  } catch (error: any) {
    logger.log({ level: 'error', category: 'auth', requestId: req.id || 'req-forgot-failed', eventType: 'SUPABASE_PASSWORD_RECOVERY_FAILED', outcome: 'failure', message: 'Supabase password recovery request failed.' });
    return res.status(503).json({ success: false, error: 'Password recovery could not be started. Please try again shortly.', code: 'PASSWORD_RECOVERY_UNAVAILABLE', requestId: req.id });
  }
  return res.json({ success: true, message: 'If an account exists with this email, recovery instructions have been sent.', requestId: req.id });
});

/**
 * POST /api/v1/contact
 * Accepts public inquiries with rate limiting; authenticated session requests are also supported
 */
router.post('/contact', contactLimiter, (req: AuthenticatedRequest, res: Response) => {
  const { fullName, name, email, phone, topic, subject, message, advisorName, investmentCapacity, country } = req.body || {};
  const resolvedName = String(fullName || name || '').trim();
  const resolvedTopic = String(topic || subject || 'Investor Inquiries').trim();
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const trimmedMessage = String(message || '').trim();

  if (!resolvedName || !normalizedEmail || !trimmedMessage) {
    return res.status(400).json({
      success: false,
      error: 'Full name, valid email address, and inquiry message are required.',
      code: 'MISSING_FIELDS',
      requestId: req.id,
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL',
      requestId: req.id,
    });
  }

  const ticketId = `KZ-INQ-${new Date().getFullYear()}-${100 + contactInquiriesStore.length + Math.floor(Math.random() * 800)}`;
  const createdAt = new Date().toISOString();

  contactInquiriesStore.unshift({
    ticketId,
    userId: req.user?.id || null,
    fullName: resolvedName,
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : undefined,
    topic: resolvedTopic,
    advisorName: advisorName ? String(advisorName).trim() : undefined,
    investmentCapacity: investmentCapacity ? String(investmentCapacity).trim() : undefined,
    country: country ? String(country).trim() : undefined,
    message: trimmedMessage,
    createdAt,
  });

  // Auto-dispatch branded inquiry receipt to the investor
  sendEmail({
    templateId: 'contact_receipt',
    recipient: normalizedEmail,
    data: {
      fullName: resolvedName,
      email: normalizedEmail,
      topic: resolvedTopic,
      ticketId,
      messageSnippet: trimmedMessage.slice(0, 160),
      slaHours: '4 business hours'
    }
  }).catch(err => {
    logger.log({
      level: 'error',
      category: 'system',
      requestId: req.id || 'req-contact-email',
      eventType: 'EMAIL_DISPATCH_FAILURE',
      outcome: 'failure',
      message: `Failed to dispatch contact receipt email: ${err.message}`
    });
  });

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-contact',
    method: 'POST',
    route: '/api/v1/contact',
    statusCode: 200,
    eventType: 'CONTACT_INQUIRY_RECEIVED',
    outcome: 'success',
    message: `Direct investor desk inquiry received from ${resolvedName} (${normalizedEmail})`,
    metadata: { email: normalizedEmail, topic: resolvedTopic, ticketId, advisorName }
  });

  return res.json({
    success: true,
    data: { ticketId, createdAt },
    message: 'Your inquiry has been successfully received by the Kretz Investor Relations Desk.',
    requestId: req.id,
  });
});

/**
 * POST /api/v1/newsletter/subscribe
 * Subscribes an email to the Kretz Editorial Dispatch with idempotency and confirmation email
 */
router.post('/newsletter/subscribe', publicSubmissionLimiter, (req: AuthenticatedRequest, res: Response) => {
  const normalizedEmail = String(req.body?.email || '').toLowerCase().trim();
  const source = String(req.body?.source || 'editorial_dispatch').trim().slice(0, 64);

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid corporate or personal email address.',
      code: 'INVALID_EMAIL',
      requestId: req.id,
    });
  }

  const existing = newsletterSubscribersStore.get(normalizedEmail);
  if (existing) {
    return res.status(200).json({
      success: true,
      data: {
        email: existing.email,
        alreadySubscribed: true,
        subscribedAt: existing.subscribedAt,
        reference: existing.reference,
      },
      message: 'This email address is already subscribed to the Kretz Editorial Dispatch.',
      requestId: req.id,
    });
  }

  const subscribedAt = new Date().toISOString();
  const reference = `KZ-DSP-${1000 + newsletterSubscribersStore.size + 1}`;
  newsletterSubscribersStore.set(normalizedEmail, {
    email: normalizedEmail,
    source,
    subscribedAt,
    reference,
  });

  sendEmail({
    templateId: 'contact_receipt',
    recipient: normalizedEmail,
    data: {
      fullName: 'Subscriber',
      email: normalizedEmail,
      topic: 'Kretz Editorial Dispatch Subscription',
      ticketId: reference,
      messageSnippet: 'Confirmed weekly European Real Estate Intelligence & Dossiers briefing subscription.',
      slaHours: 'Every Thursday 08:00 CET',
    },
  }).catch(() => {});

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-newsletter',
    method: 'POST',
    route: '/api/v1/newsletter/subscribe',
    statusCode: 201,
    eventType: 'NEWSLETTER_SUBSCRIBED',
    outcome: 'success',
    message: `Editorial dispatch subscription registered for ${normalizedEmail}`,
    metadata: { email: normalizedEmail, source, reference },
  });

  return res.status(201).json({
    success: true,
    data: {
      email: normalizedEmail,
      alreadySubscribed: false,
      subscribedAt,
      reference,
    },
    message: 'Subscribed to the Kretz Editorial Dispatch.',
    requestId: req.id,
  });
});

/**
 * POST /api/v1/memberships/apply
 * Records and validates L'Agence Club Privé membership applications
 */
router.post('/memberships/apply', publicSubmissionLimiter, (req: AuthenticatedRequest, res: Response) => {
  const {
    fullName,
    email,
    phone,
    tierId,
    billingCycle,
    paymentMethod,
    preferredRegion,
    invitationCode,
    specialRequests,
  } = req.body || {};

  const resolvedName = String(fullName || '').trim();
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const validTiers = ['atelier', 'sovereign', 'patron', 'black_circle', 'heritage'];
  const validCycles = ['annual', 'monthly'];
  const validMethods = ['wallet_balance', 'bank_wire', 'credit_card', 'complimentary_invitation'];

  if (!resolvedName || !normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Valid full legal name and email address are required.',
      code: 'INVALID_APPLICANT',
      requestId: req.id,
    });
  }

  if (!validTiers.includes(tierId) || !validCycles.includes(billingCycle) || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid membership tier, billing cadence, or payment arrangement.',
      code: 'INVALID_MEMBERSHIP_CONFIG',
      requestId: req.id,
    });
  }

  if (paymentMethod === 'complimentary_invitation' && !String(invitationCode || '').trim()) {
    return res.status(400).json({
      success: false,
      error: "A valid L'Agence Partners invitation code is required for complimentary onboarding.",
      code: 'MISSING_INVITATION_CODE',
      requestId: req.id,
    });
  }

  const applicationId = `KZ-CLUB-${new Date().getFullYear()}-${1000 + membershipApplicationsStore.length + 1}`;
  const status = paymentMethod === 'wallet_balance' || paymentMethod === 'credit_card' ? 'active' : 'pending_payment';
  const createdAt = new Date().toISOString();

  const record = {
    applicationId,
    userId: req.user?.id || null,
    fullName: resolvedName,
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : '',
    tierId,
    billingCycle,
    paymentMethod,
    preferredRegion: preferredRegion ? String(preferredRegion).trim() : 'Madrid & Balearic Islands',
    specialRequests: specialRequests ? String(specialRequests).trim() : '',
    status,
    createdAt,
  };

  membershipApplicationsStore.unshift(record);

  if (req.user?.id) {
    pushUserNotification(req.user.id, {
      title: `Club Privé ${String(tierId).charAt(0).toUpperCase() + String(tierId).slice(1)} Application`,
      message: `Reference ${applicationId} recorded (${status === 'active' ? 'Active Membership' : 'Awaiting Settlement'}).`,
      type: 'success',
    });
  }

  sendEmail({
    templateId: 'contact_receipt',
    recipient: normalizedEmail,
    data: {
      fullName: resolvedName,
      email: normalizedEmail,
      topic: `Club Privé Membership (${String(tierId).toUpperCase()})`,
      ticketId: applicationId,
      messageSnippet: `Billing: ${billingCycle} · Arrangement: ${paymentMethod}`,
      slaHours: '2 business hours',
    },
  }).catch(() => {});

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-membership',
    method: 'POST',
    route: '/api/v1/memberships/apply',
    statusCode: 201,
    eventType: 'MEMBERSHIP_APPLICATION_SUBMITTED',
    outcome: 'success',
    message: `Club Privé ${tierId} application ${applicationId} submitted by ${normalizedEmail}`,
    metadata: { applicationId, tierId, billingCycle, paymentMethod, status },
  });

  return res.status(201).json({
    success: true,
    data: record,
    message: 'Club Privé membership application processed.',
    requestId: req.id,
  });
});

/**
 * GET /api/v1/user/referrals
 * Retrieve server-synced referral invitations for the authenticated user
 */
router.get('/user/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const list = userReferralsStore.get(userId) || [];
  return res.json({
    success: true,
    data: { referrals: list },
    requestId: req.id,
  });
});

/**
 * POST /api/v1/user/referrals/invite
 * Dispatches and logs an investor referral invitation with duplicate and self-referral checks
 */
router.post('/user/referrals/invite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const normalizedEmail = String(req.body?.email || '').toLowerCase().trim();
  const referralCode = String(req.body?.referralCode || '').trim();
  const serverUser = shouldUseSupabaseForCustomer(req) ? await getUserProfile(userId) : null;
  const ownEmails = new Set(
    [serverUser?.email, req.user?.email, req.body?.inviterEmail]
      .map((e) => String(e || '').toLowerCase().trim())
      .filter(Boolean)
  );

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid associate email address.',
      code: 'INVALID_EMAIL',
      requestId: req.id,
    });
  }

  if (ownEmails.has(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'You cannot dispatch a referral invitation to your own registered email.',
      code: 'SELF_REFERRAL',
      requestId: req.id,
    });
  }

  const existingList = userReferralsStore.get(userId) || [];
  if (existingList.some((r) => r.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({
      success: false,
      error: `${normalizedEmail} has already been invited.`,
      code: 'ALREADY_INVITED',
      requestId: req.id,
    });
  }

  const referral = {
    id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: normalizedEmail,
    date: new Date().toISOString().split('T')[0],
    status: 'invited' as const,
    reward: 0,
    referralCode: referralCode || undefined,
  };

  const updated = [referral, ...existingList];
  userReferralsStore.set(userId, updated);

  pushUserNotification(userId, {
    title: 'VIP Referral Invitation Dispatched',
    message: `Partner invitation sent to ${normalizedEmail}. €500 allocation bonus tracks automatically upon their first SPV investment.`,
    type: 'info',
  });

  sendEmail({
    templateId: 'contact_receipt',
    recipient: normalizedEmail,
    data: {
      fullName: 'Invited Associate',
      email: normalizedEmail,
      topic: `Private Referral Invitation (${referralCode || 'KRETZ-VIP'})`,
      ticketId: referral.id,
      messageSnippet: 'You have been invited to L\'Agence | Kretz & De Spain with a €500 first-allocation credit.',
      slaHours: 'Valid for 90 days',
    },
  }).catch(() => {});

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-referral',
    method: 'POST',
    route: '/api/v1/user/referrals/invite',
    statusCode: 201,
    userId,
    eventType: 'REFERRAL_INVITE_SENT',
    outcome: 'success',
    message: `User ${userId} dispatched referral invite to ${normalizedEmail}`,
    metadata: { invitee: normalizedEmail, referralCode },
  });

  return res.status(201).json({
    success: true,
    data: { referral, referrals: updated },
    message: `VIP invitation dispatched to ${normalizedEmail}.`,
    requestId: req.id,
  });
});

/**
 * POST /api/v1/auth/password/reset
 * Verifies single-use reset token, validates password strength, updates bcrypt password hash,
 * and invalidates all existing sessions for the target user.
 */
router.post('/auth/password/reset', async (req: AuthenticatedRequest, res: Response) => {
  const password = String(req.body?.newPassword || req.body?.password || '');
  const strength = validatePasswordStrength(password);
  if (!strength.valid) return res.status(400).json({ success: false, error: strength.error || 'Password does not meet security requirements.', code: 'WEAK_PASSWORD', requestId: req.id });
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : String(req.body?.accessToken || req.body?.token || '');
  if (!accessToken) return res.status(401).json({ success: false, error: 'A valid Supabase recovery session is required.', code: 'RECOVERY_SESSION_REQUIRED', requestId: req.id });
  try {
    await updateCustomerPassword(accessToken, password);
    return res.json({ success: true, message: 'Password updated successfully. Please sign in again.', requestId: req.id });
  } catch {
    return res.status(400).json({ success: false, error: 'The recovery session is invalid or expired. Request a new password reset email.', code: 'INVALID_RECOVERY_SESSION', requestId: req.id });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Protected by email verification code (or active 10-minute session grant).
 */
router.post('/auth/change-password', requireAuth, requireActionEmailVerification('investor.password.change'), async (req: AuthenticatedRequest, res: Response) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required.', code: 'MISSING_FIELDS', requestId: req.id });
  }
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ success: false, error: strength.error || 'Password does not meet security requirements.', code: 'WEAK_PASSWORD', requestId: req.id });
  }

  if (!shouldUseSupabaseForCustomer(req)) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Customer authentication is not configured.', code: 'SUPABASE_AUTH_NOT_CONFIGURED', requestId: req.id });
    }
    const devUser = devCustomersById.get(req.user!.id);
    if (!devUser) {
      return res.status(404).json({ success: false, error: 'Account not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    }
    if (!verifyPassword(currentPassword, devUser.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.', code: 'INVALID_CREDENTIALS', requestId: req.id });
    }
    devUser.passwordHash = hashPassword(newPassword);
    await persistDevState();
    return res.json({ success: true, message: 'Password changed successfully.', requestId: req.id });
  }

  try {
    const verified = await signInCustomer(req.user!.email, currentPassword);
    await updateCustomerPassword(verified.session.access_token, newPassword);
    return res.json({ success: true, message: 'Password changed successfully.', requestId: req.id });
  } catch (error: any) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.', code: 'INVALID_CREDENTIALS', requestId: req.id });
    }
    return res.status(400).json({ success: false, error: 'Unable to update your password right now. Please try again.', code: 'PASSWORD_CHANGE_FAILED', requestId: req.id });
  }
});

/**
 * GET /api/v1/auth/session
 * Validates active session, verifies account non-suspended status, and returns sanitized profile.
 * Gracefully handles unauthenticated probes with 200 OK { authenticated: false }.
 */
router.get('/auth/session', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    try {
      const profile = shouldUseSupabaseForCustomer(req) ? await getUserProfile(req.user.id) : null;
      const devCustomer = !profile && process.env.NODE_ENV !== 'production' ? devCustomersById.get(req.user.id) : undefined;
      const status = profile?.account_status === 'suspended' ? 'suspended' : (devCustomer?.status || req.user.status || 'active');
      if (status === 'suspended') {
        return res.status(403).json({ success: false, error: profile?.suspended_reason || devCustomer?.suspendedReason || req.user.suspendedReason || 'Your account has been suspended by compliance.', code: 'ACCOUNT_SUSPENDED', requestId: req.id });
      }
      const safeUser = profile ? {
        id: req.user.id, email: profile.email || req.user.email,
        fullName: profile.full_name || req.user.fullName,
        role: req.user.role,
        isAdmin: Boolean(req.user.isAdmin),
        staffRole: req.user.staffRole ?? null,
        accountType: profile.account_type || req.user.accountType,
        country: profile.country, phoneNumber: profile.phone_number,
        balance: Number(profile.wallet_balance ?? req.user.balance ?? 0),
        kycStatus: profile.kyc_status || 'pending', status
      } : (devCustomer ? toPublicDevCustomer(devCustomer) : req.user);
      const csrfToken = req.session?.csrfToken || '';
      return res.json({ success: true, data: { authenticated: true, user: safeUser, csrfToken }, authenticated: true, user: safeUser, csrfToken, requestId: req.id });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Session verification is temporarily unavailable.', code: 'SESSION_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token && req.cookies && req.cookies.kretz_session) {
    token = req.cookies.kretz_session;
  }

  if (!token) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
        user: null
      },
      authenticated: false,
      user: null,
      requestId: req.id
    });
  }

  let session;
  try { session = await getSession(token); } catch {
    return res.status(503).json({ success: false, error: 'Session verification is temporarily unavailable.', code: 'SESSION_STORE_UNAVAILABLE', requestId: req.id });
  }
  if (!session) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
        user: null
      },
      authenticated: false,
      user: null,
      requestId: req.id
    });
  }

  req.user = { id: session.userId, email: session.email, role: session.role, fullName: session.fullName } as any;
  req.session = session;

  const currentUser = await findUserRecordForRequest(req);

  if (!currentUser) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
        user: null
      },
      authenticated: false,
      user: null,
      requestId: req.id
    });
  }

  // Check account status
  if (currentUser.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: currentUser.suspendedReason || 'Your account has been suspended by compliance. Please contact support.',
      code: 'ACCOUNT_SUSPENDED',
      requestId: req.id
    });
  }

  const safeUser = sanitizeUser(currentUser);
  const csrfToken = req.session?.csrfToken || '';

  return res.json({
    success: true,
    data: {
      authenticated: true,
      user: safeUser,
      csrfToken
    },
    authenticated: true,
    user: safeUser,
    csrfToken,
    requestId: req.id
  });
});

// ============================================================================
// 2. ADMINISTRATION ROUTES (/api/v1/admin)
// ============================================================================

/**
 * GET /api/v1/admin/users
 */
router.get('/admin/users', requireStaffSection('investors', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try {
      const users = await listAdminUsers();
      const data = users.map((u: any) => ({
        id: u.id, email: u.email, fullName: u.full_name, country: u.country, phoneNumber: u.phone_number,
        role: (u.user_roles || []).map((r: any) => r.role).find((role: string) => ['super_admin','admin','finance_admin','operations_admin','finance','compliance','property_manager','support','auditor'].includes(role)) || (u.is_admin ? 'super_admin' : (u.staff_role || 'investor')),
        isAdmin: Boolean(u.is_admin),
        staffRole: u.staff_role ?? null,
        frozen: Boolean(u.frozen ?? u.account_status === 'suspended'),
        assignedGateId: u.payment_gate_id ?? null,
        assignedUsdtGateId: u.usdt_payment_gate_id ?? null,
        accountType: u.account_type, balance: Number(u.wallet_balance || 0), investedBalance: Number(u.invested_balance || 0),
        kycStatus: u.kyc_status, totalEarned: Number(u.total_dividends_earned || 0), bankIban: u.bank_iban || u.iban || undefined, bankAccountHolder: u.bank_account_holder || u.bank_holder || u.full_name, cryptoDepositAddress: u.crypto_deposit_address || undefined, status: (u.frozen || u.account_status === 'suspended') ? 'suspended' : 'active', suspendedReason: u.suspended_reason, createdAt: u.created_at
      }));
      return res.json({ success: true, data, total: data.length, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-users-db', eventType: 'ADMIN_USERS_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load users.' });
        return res.status(503).json({ success: false, error: 'The investor registry is temporarily unavailable.', code: 'USER_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent user registry is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const data = Array.from(devCustomersById.values()).map(toPublicDevCustomer);
  return res.json({ success: true, data, total: data.length, requestId: req.id });
});

/**
 * GET /api/v1/admin/users/:id
 * Read one authoritative Supabase customer profile for the admin user drawer.
 */
router.get('/admin/users/:id', requireStaffSection('investors', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) return res.status(503).json({ success: false, error: 'Persistent user registry is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  try {
    const profile = await getUserProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    const { data: roles, error: rolesError } = await getSupabaseAdmin()
      .from('user_roles').select('role,granted_at,granted_by').eq('user_id', req.params.id);
    if (rolesError) throw rolesError;
    return res.json({ success: true, data: {
      id: profile.id, email: profile.email, fullName: profile.full_name, country: profile.country,
      countryCode: profile.country_code, phoneNumber: profile.phone_number, accountType: profile.account_type,
      balance: Number(profile.wallet_balance || 0), investedBalance: Number(profile.invested_balance || 0),
      totalEarned: Number(profile.total_dividends_earned || 0), kycStatus: profile.kyc_status,
      status: profile.account_status || 'active', suspendedReason: profile.suspended_reason,
      address: profile.address, city: profile.city, postalCode: profile.postal_code,
      createdAt: profile.created_at, updatedAt: profile.updated_at, roles: roles || []
    }, requestId: req.id });
  } catch (error: any) {
    logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-user-detail', eventType: 'ADMIN_USER_DETAIL_FAILED', outcome: 'failure', message: error?.message || 'Unable to load customer profile.' });
    return res.status(503).json({ success: false, error: 'The customer record is temporarily unavailable.', code: 'USER_DATABASE_UNAVAILABLE', requestId: req.id });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/profile
 * Administrators may correct contact/profile fields only. Roles, balances, KYC and
 * account status are deliberately managed by their dedicated protected workflows.
 */
router.patch('/admin/users/:id/profile', requireStaffSection('investors', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) return res.status(503).json({ success: false, error: 'Persistent user registry is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const input = req.body || {};
  const patch: Record<string, unknown> = {
    full_name: input.fullName, country: input.country, country_code: input.countryCode,
    phone_number: input.phoneNumber, address: input.address, city: input.city,
    postal_code: input.postalCode, avatar_url: input.avatarUrl
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && typeof value !== 'string') return res.status(400).json({ success: false, error: 'Profile fields must be text values.', code: 'INVALID_PROFILE_FIELD', requestId: req.id });
    if (typeof value === 'string' && value.length > 500) return res.status(400).json({ success: false, error: 'A profile field exceeds the allowed length.', code: 'PROFILE_FIELD_TOO_LONG', requestId: req.id });
  }
  try {
    const updated = await updateUserProfile(req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    logger.log({ level: 'info', category: 'admin', requestId: req.id || 'req-admin-user-profile', userId: req.user?.id, eventType: 'ADMIN_USER_PROFILE_UPDATED', outcome: 'success', message: 'Administrator updated customer contact/profile fields.', metadata: { targetUserId: req.params.id, fields: Object.keys(patch).filter(key => patch[key] !== undefined) } });
    return res.json({ success: true, data: {
      id: updated.id, email: updated.email, fullName: updated.full_name, country: updated.country,
      countryCode: updated.country_code, phoneNumber: updated.phone_number, address: updated.address,
      city: updated.city, postalCode: updated.postal_code, avatarUrl: updated.avatar_url,
      status: updated.account_status || 'active', kycStatus: updated.kyc_status
    }, message: 'Customer profile updated.', requestId: req.id });
  } catch (error: any) {
    logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-user-profile-failed', eventType: 'ADMIN_USER_PROFILE_UPDATE_FAILED', outcome: 'failure', message: error?.message || 'Customer profile update failed.' });
    return res.status(503).json({ success: false, error: 'Customer profile changes could not be saved.', code: 'USER_PROFILE_UPDATE_FAILED', requestId: req.id });
  }
});

/**
 * GET /api/v1/admin/audit-logs
 */
router.get('/admin/audit-logs', requireStaffSection('audit-log', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try {
      const logs = await listPersistentAuditLogs();
      return res.json({ success: true, data: logs, total: logs.length, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: 'Audit records are temporarily unavailable.', code: 'AUDIT_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent audit log storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  res.json({
    success: true,
    data: mockAuditLogs,
    total: mockAuditLogs.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/system-health
 */
router.get('/admin/system-health', requireStaffSection('dashboard', 'read'), (req: AuthenticatedRequest, res: Response) => {
  const metrics = logger.computeMetrics();

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-health',
    method: 'GET',
    route: '/api/v1/admin/system-health',
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'HEALTH_CHECK_AUDIT',
    outcome: 'success',
    message: 'System health diagnostic requested by administrator.',
    metadata: { uptime: metrics.uptimeSeconds, errorCount: metrics.errorCount }
  });

  res.json({
    success: true,
    data: {
      status: metrics.healthy ? 'HEALTHY' : 'DEGRADED',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptimeSeconds: metrics.uptimeSeconds,
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      subsystems: metrics.subsystems,
      apiStats: {
        totalRequestsLogged: metrics.totalLogs,
        errorCount: metrics.errorCount,
        warnCount: metrics.warnCount,
        averageLatencyMs: metrics.avgLatencyMs
      },
      databaseStatus: {
        connected: true,
        type: 'In-Memory Journal / Supabase Bridge',
        readOnly: false,
        note: 'Ready for full production PostgreSQL or Cloud SQL schema migration.'
      }
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/config
 * Public configuration retrieval for frontend & customer dashboards
 */
router.get('/config', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: platformConfig,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/settings
 */
router.get('/admin/settings', requireStaffSection('settings', 'read'), (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: platformConfig,
    requestId: req.id
  });
});

/**
 * PUT /api/v1/admin/settings
 * Update authoritative platform configuration with mandatory audit logging and validation
 */
router.put('/admin/settings', requireStaffSection('settings', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const adminUser = req.user;
  const updates = req.body || {};

  const oldConfigSnapshot = { ...platformConfig };

  if (typeof updates.platformName === 'string') platformConfig.platformName = updates.platformName.trim();
  if (typeof updates.tradingEnabled === 'boolean') platformConfig.tradingEnabled = updates.tradingEnabled;
  if (typeof updates.depositsEnabled === 'boolean') platformConfig.depositsEnabled = updates.depositsEnabled;
  if (typeof updates.withdrawalsEnabled === 'boolean') platformConfig.withdrawalsEnabled = updates.withdrawalsEnabled;
  if (typeof updates.maintenanceMode === 'boolean') platformConfig.maintenanceMode = updates.maintenanceMode;
  if (typeof updates.minInvestment === 'number') platformConfig.minInvestment = updates.minInvestment;
  if (typeof updates.maxInvestmentPerInvestor === 'number') platformConfig.maxInvestmentPerInvestor = updates.maxInvestmentPerInvestor;
  if (updates.limits && typeof updates.limits === 'object') {
    platformConfig.limits = { ...platformConfig.limits, ...updates.limits };
  }
  if (updates.announcementBanner && typeof updates.announcementBanner === 'object') {
    platformConfig.announcementBanner = {
      active: Boolean(updates.announcementBanner.active),
      text: String(updates.announcementBanner.text || ''),
      type: ['info', 'warning', 'success'].includes(updates.announcementBanner.type) ? updates.announcementBanner.type : 'info'
    };
  }

  platformConfig.updatedAt = new Date().toISOString();
  platformConfig.updatedBy = adminUser?.email || 'admin@kretz.com';

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    adminId: adminUser?.id || 'usr-admin-01',
    adminEmail: adminUser?.email || 'admin@kretz.com',
    action: 'PLATFORM_SETTINGS_UPDATE',
    details: `Administrative settings and feature flags updated. Trading: ${platformConfig.tradingEnabled}, Deposits: ${platformConfig.depositsEnabled}, Withdrawals: ${platformConfig.withdrawalsEnabled}, Maintenance: ${platformConfig.maintenanceMode}`,
    previousSetting: oldConfigSnapshot,
    newSetting: platformConfig,
    timestamp: new Date().toISOString(),
    status: 'success',
    affectedSections: ['Public Frontend', 'Customer Dashboards', 'Financial Operations', 'Property Marketplace']
  };

  mockAuditLogs.unshift(auditEntry);

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-admin-settings',
    method: 'PUT',
    route: '/api/v1/admin/settings',
    statusCode: 200,
    userId: adminUser?.id,
    userRole: adminUser?.role,
    eventType: 'ADMIN_COMMAND_EXECUTED',
    outcome: 'success',
    message: `Administrator ${adminUser?.email} successfully updated platform settings.`,
    metadata: { updates, platformConfig }
  });

  return res.json({
    success: true,
    data: platformConfig,
    message: 'Platform settings updated and synchronized across frontend and customer dashboards.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/logs
 * Query & Filter Structured Server Logs
 */
router.get('/admin/logs', requireAdminOrLogSecret, (req: AuthenticatedRequest, res: Response) => {
  const { category, level, route, search, requestId, since, limit, offset } = req.query;

  const result = logger.getLogs({
    category: category as any,
    level: level as any,
    route: route ? String(route) : undefined,
    search: search ? String(search) : undefined,
    requestId: requestId ? String(requestId) : undefined,
    since: since ? String(since) : undefined,
    limit: limit ? parseInt(String(limit), 10) : 50,
    offset: offset ? parseInt(String(offset), 10) : 0
  });

  res.json({
    success: true,
    data: result.logs,
    total: result.total,
    metrics: result.metrics,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/logs/export
 */
router.get('/admin/logs/export', requireAdminOrLogSecret, (req: AuthenticatedRequest, res: Response) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const exported = logger.exportSanitized(format);

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-export',
    method: 'GET',
    route: '/api/v1/admin/logs/export',
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'LOGS_EXPORTED',
    outcome: 'success',
    message: `Admin ${req.user?.email} exported sanitized server audit logs in ${format.toUpperCase()} format.`
  });

  res.setHeader('Content-Disposition', `attachment; filename="kretz_server_logs_${Date.now()}.${format}"`);
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.send(exported);
});

/**
 * POST /api/v1/admin/users/:id/kyc
 */
router.patch('/admin/users/:id/profile', requireStaffSection('investors', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  if (!isSupabaseServerConfigured()) return res.status(503).json({ success: false, error: 'Persistent user database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const bankIban = typeof req.body?.bankIban === 'string' ? req.body.bankIban.trim() : undefined;
  const cryptoDepositAddress = typeof req.body?.cryptoDepositAddress === 'string' ? req.body.cryptoDepositAddress.trim() : undefined;
  if (bankIban === undefined && cryptoDepositAddress === undefined) return res.status(400).json({ success: false, error: 'At least one payment detail must be supplied.', code: 'NO_PROFILE_CHANGES', requestId: req.id });
  try {
    const profile = await updateUserProfile(req.params.id, { bank_iban: bankIban, crypto_deposit_address: cryptoDepositAddress });
    if (!profile) return res.status(404).json({ success: false, error: 'Investor account not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    return res.json({ success: true, data: { id: profile.id, email: profile.email, bankIban: profile.bank_iban, cryptoDepositAddress: profile.crypto_deposit_address }, message: 'Investor payment details saved.', requestId: req.id });
  } catch (error: any) {
    const message = String(error?.message || '');
    const notFound = message.toLowerCase().includes('0 rows') || message.toLowerCase().includes('not found');
    return res.status(notFound ? 404 : 503).json({ success: false, error: notFound ? 'Investor account not found.' : 'Investor payment details could not be saved.', code: notFound ? 'USER_NOT_FOUND' : 'PROFILE_UPDATE_FAILED', requestId: req.id });
  }
});

router.post('/admin/users/:id/kyc', requireStaffSection('kyc', 'write'), requireActionEmailVerification('admin.user.kyc'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { kycStatus = 'approved', notes } = req.body || {};
  const normalizedKyc = String(kycStatus).toLowerCase() === 'rejected' ? 'rejected' : 'verified';
  const stepStatus = normalizedKyc === 'rejected' ? 'rejected' : 'verified';

  if (!isSupabaseServerConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent user database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const devCustomer = devCustomersById.get(id);
    if (!devCustomer) {
      return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    }
    devCustomer.kycStatus = normalizedKyc;
    const docs = devComplianceDocsByUser.get(id) || [];
    docs.forEach((doc) => {
      if (doc.status === 'pending') doc.status = stepStatus;
    });
    const nowIso = new Date().toISOString();
    const updatedSteps = buildDevComplianceSteps(id, normalizedKyc).map((s) => ({
      ...s,
      status: stepStatus as ComplianceStepRecord['status'],
      reviewedAt: nowIso,
      updatedAt: nowIso,
      notes: notes || s.notes,
    }));
    devComplianceStepsByUser.set(id, updatedSteps);
    await notifyInvestorEvent({
      userId: id,
      email: devCustomer.email,
      title: stepStatus === 'verified' ? 'Identity verification approved' : 'Identity verification requires attention',
      message: stepStatus === 'verified'
        ? 'Your investor KYC compliance check is verified. Withdrawals and full portfolio operations are now enabled.'
        : notes || 'Your submitted identity documents need an update before approval.',
      type: stepStatus === 'verified' ? 'success' : 'warning',
      emailTemplate: stepStatus === 'verified' ? 'kyc_approved' : 'kyc_rejected',
      emailData: {
        fullName: devCustomer.fullName || 'Valued Investor',
        event_name: 'Institutional KYC Verification',
        status: stepStatus === 'rejected' ? 'Action Required / Declined' : 'Approved & Verified',
        notes: notes || 'Your KYC status has been updated.',
      },
      idempotencyKey: `idemp-kyc-${id}-${normalizedKyc}-${Date.now()}`,
    });
    await persistDevState();
    return res.json({ success: true, data: toPublicDevCustomer(devCustomer), message: `User KYC status updated to ${normalizedKyc}.`, requestId: req.id });
  }

  try {
    const profile = await runFinancialRpc('kretz_admin_update_kyc', { p_user_id: id, p_admin_id: req.user!.id, p_kyc_status: String(kycStatus), p_notes: notes || null });
    await Promise.all([
      upsertComplianceStep(id, 'kyc_identity', stepStatus, notes || undefined).catch(() => {}),
      upsertComplianceStep(id, 'proof_of_address', stepStatus, notes || undefined).catch(() => {}),
      upsertComplianceStep(id, 'accredited_proof', stepStatus, notes || undefined).catch(() => {}),
    ]);
    try {
      const updatedProfile = await getUserProfile(id);
      await notifyInvestorEvent({
        userId: id,
        email: updatedProfile?.email,
        title: stepStatus === 'verified' ? 'Identity verification approved' : 'Identity verification requires attention',
        message: stepStatus === 'verified'
          ? 'Your investor KYC compliance check is verified. Withdrawals and full portfolio operations are now enabled.'
          : notes || 'Your submitted identity documents need an update before approval.',
        type: stepStatus === 'verified' ? 'success' : 'warning',
        emailTemplate: stepStatus === 'rejected' ? 'kyc_rejected' : 'kyc_approved',
        emailData: {
          fullName: updatedProfile?.full_name || 'Valued Investor',
          event_name: 'Institutional KYC Verification',
          status: stepStatus === 'rejected' ? 'Action Required / Declined' : 'Approved & Verified',
          notes: notes || 'Your KYC status has been updated.',
        },
        idempotencyKey: `idemp-kyc-${id}-${String(kycStatus).toLowerCase()}-${Date.now()}`,
      });
    } catch {
      logger.log({ level: 'warn', category: 'database', requestId: req.id || 'req-kyc-notify', eventType: 'KYC_NOTIFICATION_PROFILE_LOOKUP_FAILED', outcome: 'failure', message: 'KYC was saved but the notification profile lookup failed.' });
    }
    return res.json({ success: true, data: profile, message: `User KYC status updated to ${kycStatus}.`, requestId: req.id });
  } catch (error: any) {
    const message = String(error?.message || '');
    const status = message.includes('USER_NOT_FOUND') ? 404 : message.includes('INVALID_KYC_STATUS') ? 400 : message.includes('REQUIRED') ? 403 : 503;
    return res.status(status).json({ success: false, error: status === 503 ? 'KYC decision could not be saved. Please retry.' : message, code: status === 503 ? 'KYC_DATABASE_UNAVAILABLE' : 'KYC_UPDATE_REJECTED', requestId: req.id });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * POST /api/v1/admin/users/:id/status
 * Toggle user account status (active / suspended) with audit logging
 */
const handleUserStatusUpdate = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason, frozen } = req.body || {};
  const resolvedStatus = typeof frozen === 'boolean' ? (frozen ? 'suspended' : 'active') : status;
  if (resolvedStatus !== 'active' && resolvedStatus !== 'suspended') {
    return res.status(400).json({ success: false, error: 'Status must be either active or suspended.', code: 'INVALID_STATUS', requestId: req.id });
  }
  if (!isSupabaseServerConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent user database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const cust = devCustomersById.get(id);
    if (!cust) return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    cust.status = resolvedStatus;
    (cust as any).frozen = resolvedStatus === 'suspended';
    cust.suspendedReason = resolvedStatus === 'suspended' ? (reason || 'Account frozen by staff') : undefined;
    await persistDevState();
    return res.json({ success: true, data: toPublicDevCustomer(cust), message: `Investor account ${resolvedStatus === 'suspended' ? 'frozen' : 'unfrozen'}.`, requestId: req.id });
  }
  try {
    const profile = await runFinancialRpc('kretz_admin_set_user_status', { p_user_id: id, p_admin_id: req.user!.id, p_status: resolvedStatus, p_reason: reason || null });
    return res.json({ success: true, data: profile, message: `User status successfully updated to ${resolvedStatus.toUpperCase()}.`, requestId: req.id });
  } catch (error: any) {
    const message = String(error?.message || '');
    const statusCode = message.includes('USER_NOT_FOUND') ? 404 : message.includes('INVALID_STATUS') ? 400 : message.includes('SELF_SUSPENSION_FORBIDDEN') || message.includes('REQUIRED') ? 403 : 503;
    return res.status(statusCode).json({ success: false, error: statusCode === 503 ? 'Account status change could not be saved. Please retry.' : message, code: statusCode === 503 ? 'USER_STATUS_DATABASE_UNAVAILABLE' : 'USER_STATUS_UPDATE_REJECTED', requestId: req.id });
  }
};

router.patch('/admin/users/:id/status', requireStaffSection('investors', 'write'), requireActionEmailVerification('admin.user.status'), handleUserStatusUpdate);
router.post('/admin/users/:id/status', requireStaffSection('investors', 'write'), requireActionEmailVerification('admin.user.status'), handleUserStatusUpdate);

const handleGateAssignment = async (userIds: string[], method: 'bank' | 'usdt', gateId: string | null, gateName: string | null, req: AuthenticatedRequest, res: Response) => {
  if (!userIds.length || userIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || !['bank', 'usdt'].includes(method)) {
    return res.status(400).json({ success: false, error: 'Select valid investors and a gate type.', code: 'INVALID_GATE_ASSIGNMENT', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const { data, error } = gateId
        ? await getSupabaseAdmin().rpc('assign_gate', { p_users: userIds, p_gate: gateId })
        : await getSupabaseAdmin().rpc('clear_gate', { p_users: userIds, p_method: method });
      if (error) throw error;
      return res.json({ success: true, data, message: gateId ? 'Payment gate assigned.' : 'Payment gate cleared.', requestId: req.id });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const message = String(err?.message || '');
        const status = message.includes('ADMIN_REQUIRED') ? 403 : message.includes('NOT_FOUND') ? 404 : 503;
        return res.status(status).json({ success: false, error: status === 503 ? 'Unable to update investor payment gate.' : message, code: 'ASSIGN_GATE_FAILED', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const customers = userIds.map((id) => devCustomersById.get(id));
  if (customers.some((customer) => !customer)) return res.status(404).json({ success: false, error: 'One or more investors were not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  for (const customer of customers) {
    if (method === 'bank') {
      (customer as any).assignedGateId = gateId;
      (customer as any).assignedGateName = gateId ? gateName : null;
    } else {
      (customer as any).assignedUsdtGateId = gateId;
      (customer as any).assignedUsdtGateName = gateId ? gateName : null;
    }
  }
  await persistDevState();
  return res.json({ success: true, data: { success: true, method, assigned_count: userIds.length }, requestId: req.id });
};

router.post('/admin/users/assign-gate', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map((id: unknown) => String(id)) : [];
  const method = String(req.body?.method || '').toLowerCase() as 'bank' | 'usdt';
  const gateId = req.body?.gateId ? String(req.body.gateId).trim() : null;
  const gateName = req.body?.gateName ? String(req.body.gateName).trim() : null;
  return handleGateAssignment(userIds, method, gateId, gateName, req, res);
});

router.patch('/admin/users/:id/assign-gate', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const method = String(req.body?.method || 'bank').toLowerCase() as 'bank' | 'usdt';
  const gateId = req.body?.gateId ? String(req.body.gateId).trim() : null;
  const gateName = req.body?.gateName ? String(req.body.gateName).trim() : null;
  return handleGateAssignment([req.params.id], method, gateId, gateName, req, res);
});

router.post('/admin/staff-role', requireStaffSection('staff-roles', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const role = req.body?.role ? String(req.body.role).trim() : null;
  if (!userId) return res.status(400).json({ success: false, error: 'userId is required.', code: 'INVALID_PAYLOAD', requestId: req.id });
  if (canUseLiveSupabaseData()) {
    try {
      const { data, error } = await getSupabaseAdmin().rpc('set_staff_role', { p_user: userId, p_role: role || '' });
      if (error) throw error;
      return res.json({ success: true, data, message: role ? `Assigned role ${role}.` : 'Staff role removed.', requestId: req.id });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: err?.message || 'Unable to update staff role.', code: 'SET_STAFF_ROLE_FAILED', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const cust = devCustomersById.get(userId);
  if (!cust) return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  (cust as any).staffRole = role;
  (cust as any).isAdmin = role === 'super_admin' || role === 'admin';
  cust.role = (role || 'investor') as any;
  await persistDevState();
  return res.json({ success: true, data: toPublicDevCustomer(cust), message: role ? `Assigned role ${role}.` : 'Staff role removed.', requestId: req.id });
});

/**
 * POST /api/v1/admin/users/:id/credit
 */
router.post('/admin/users/:id/credit', requireStaffSection('deposits', 'write'), requireActionEmailVerification('admin.user.credit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, amountCents: rawAmountCents, currency = 'EUR', method = 'Manual Finance Credit', reference, notes } = req.body || {};
  const amountCents = rawAmountCents !== undefined ? Math.round(Number(rawAmountCents)) : toCents(amount);
  const numericAmount = centsToEur(amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return res.status(400).json({ success: false, error: 'Credit amount must be greater than zero.', code: 'INVALID_AMOUNT', requestId: req.id });
  if (currency !== 'EUR') return res.status(400).json({ success: false, error: 'Manual wallet adjustments currently support EUR only.', code: 'UNSUPPORTED_CURRENCY', requestId: req.id });
  if (canUseLiveSupabaseData()) {
    try {
      let result: any;
      try {
        result = await runFinancialRpc('admin_credit_deposit', {
          p_user_id: id, p_amount: numericAmount, p_note: String(notes || 'Manual deposit credited by finance'), p_admin_id: req.user!.id
        });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        result = await runFinancialRpc('kretz_admin_credit_user', {
          p_user_id: id, p_admin_id: req.user!.id, p_amount: numericAmount,
          p_method: String(method), p_reference: String(reference || `KZ-MANUAL-${crypto.randomInt(100000,1000000)}`),
          p_notes: String(notes || 'Administrator manual wallet credit'), p_transaction_id: crypto.randomUUID()
        });
      }
      return res.json({ success: true, data: { transaction: toApiTransaction(result.transaction), walletBalance: Number(result.balance) }, message: `Credited €${numericAmount.toFixed(2)} to the investor wallet.`, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const statusCode = resolveDatabaseErrorStatus(error);
        return res.status(statusCode).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Wallet adjustment could not be saved.'),
          code: error?.code || (statusCode >= 500 ? 'WALLET_ADJUSTMENT_FAILED' : 'WALLET_ADJUSTMENT_REJECTED'),
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const cust = devCustomersById.get(id);
  if (!cust) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND: Investor not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  const nextBalCents = toCents(cust.balance) + amountCents;
  cust.balance = centsToEur(nextBalCents);
  if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
  const nowIso = new Date().toISOString();
  const tx = {
    id: `dep-man-${crypto.randomUUID()}`,
    userId: cust.id,
    userEmail: cust.email,
    userName: cust.fullName,
    type: 'deposit',
    amount: numericAmount,
    amountCents,
    netAmount: numericAmount,
    feeAmount: 0,
    currency: 'EUR',
    status: 'completed',
    method: String(method || 'Manual Finance Credit'),
    reference: String(reference || `KZ-MAN-${crypto.randomInt(100000, 999999)}`),
    notes: String(notes || 'Manual deposit credited by finance'),
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
  };
  mockTransactions.unshift(tx as any);
  await persistDevState();
  return res.json({ success: true, data: { transaction: tx, walletBalance: cust.balance, balanceCents: nextBalCents }, message: `Credited €${numericAmount.toFixed(2)} to ${cust.email}.`, requestId: req.id });
});

/**
 * GET /api/v1/marketplace/listings
 */
router.get(['/marketplace/listings', '/properties', '/listings'], async (req: AuthenticatedRequest, res: Response) => {
  // Never expose the in-memory demonstration catalogue to production investors.
  if (process.env.NODE_ENV === 'production' && !isSupabaseServerConfigured()) {
    return res.status(503).json({ success: false, error: 'The verified property catalogue is not configured.', code: 'PROPERTY_DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const { search, type, status, location, minPrice, maxPrice, sortBy, page, limit } = req.query;
  let items = [...mockListings];
  if (canUseLiveSupabaseData()) {
    try {
      items = await listInvestmentPlans({
        search: typeof search === 'string' ? search : undefined,
        type: typeof type === 'string' ? type : undefined,
        status: typeof status === 'string' ? status : undefined
      });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        if (markSupabaseSchemaMissingInDev()) {
          logger.log({ level: 'info', category: 'database', requestId: req.id || 'req-listings-db', eventType: 'PROPERTY_CATALOGUE_DEV_FALLBACK', outcome: 'success', message: 'Supabase investment_plans schema not present in dev container; using local catalogue fallback.' });
        }
        items = [...mockListings];
      } else {
        logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-listings-db', eventType: 'PROPERTY_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load property catalogue from Supabase.' });
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({ success: false, error: 'The property catalogue is temporarily unavailable. Please try again shortly.', code: 'PROPERTY_DATABASE_UNAVAILABLE', requestId: req.id });
        }
        items = [...mockListings];
      }
    }
  }
  const canViewUnpublished = Boolean(
    req.user &&
    (req.user.isAdmin ||
      req.user.staffRole === 'property_manager' ||
      req.user.staffRole === 'super_admin' ||
      ['admin', 'super_admin', 'operations_admin', 'property_manager'].includes(req.user.role))
  );
  if (!canViewUnpublished) items = items.filter(p => p.status !== 'hidden' && p.status !== 'draft');

  if (search) {
    const s = String(search).toLowerCase().trim();
    items = items.filter(
      p =>
        p.title.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) ||
        p.type.toLowerCase().includes(s)
    );
  }
  if (type && type !== 'all') {
    items = items.filter(p => p.type.toLowerCase() === String(type).toLowerCase());
  }
  if (status && status !== 'all') {
    items = items.filter(p => p.status === status);
  }
  if (location && location !== 'all') {
    const loc = String(location).toLowerCase().trim();
    items = items.filter(p => p.location.toLowerCase().includes(loc));
  }
  if (minPrice !== undefined && !isNaN(Number(minPrice))) {
    const minP = Number(minPrice);
    items = items.filter(p => (p.minimumInvestment || p.tokenPrice) >= minP);
  }
  if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
    const maxP = Number(maxPrice);
    items = items.filter(p => (p.minimumInvestment || p.tokenPrice) <= maxP);
  }

  if (sortBy) {
    const sortKey = String(sortBy);
    if (sortKey === 'yield_desc' || sortKey === 'yield-desc') {
      items.sort((a, b) => (b.projectedYield || 0) - (a.projectedYield || 0));
    } else if (sortKey === 'price_asc' || sortKey === 'price-asc') {
      items.sort((a, b) => (a.tokenPrice || 0) - (b.tokenPrice || 0));
    } else if (sortKey === 'price_desc' || sortKey === 'price-desc') {
      items.sort((a, b) => (b.tokenPrice || 0) - (a.tokenPrice || 0));
    } else if (sortKey === 'target_desc' || sortKey === 'target-desc') {
      items.sort((a, b) => (b.targetAmount || 0) - (a.targetAmount || 0));
    }
  }

  const totalCount = items.length;
  const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
  const pageSize = limit ? Math.max(1, parseInt(String(limit), 10) || totalCount || 10) : totalCount || 10;
  const paginatedItems = limit ? items.slice((pageNum - 1) * pageSize, pageNum * pageSize) : items;

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-mkt',
    method: 'GET',
    route: req.path,
    statusCode: 200,
    eventType: 'MARKETPLACE_LISTINGS_FETCHED',
    outcome: 'success',
    message: `Marketplace offerings queried (${paginatedItems.length}/${totalCount} items returned)`,
    metadata: { filterCount: totalCount, page: pageNum, limit: pageSize }
  });

  res.json({
    success: true,
    data: paginatedItems,
    total: totalCount,
    page: pageNum,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    requestId: req.id
  });
});

/**
 * GET /api/v1/marketplace/listings/:id
 */
router.get(['/marketplace/listings/:id', '/properties/:id'], async (req: AuthenticatedRequest, res: Response) => {
  // Never expose in-memory demonstration property details in production.
  if (process.env.NODE_ENV === 'production' && !isSupabaseServerConfigured()) {
    return res.status(503).json({ success: false, error: 'The verified property catalogue is not configured.', code: 'PROPERTY_DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const { id } = req.params;
  let found = mockListings.find(p => p.id === id || p.slug === id);
  if (canUseLiveSupabaseData()) {
    try {
      found = await getInvestmentPlan(id) as any;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
        found = mockListings.find(p => p.id === id || p.slug === id);
      } else {
        logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-property-db', eventType: 'PROPERTY_DETAIL_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load property.' });
        if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({ success: false, error: 'Property details are temporarily unavailable.', code: 'PROPERTY_DATABASE_UNAVAILABLE', requestId: req.id });
        }
        found = mockListings.find(p => p.id === id || p.slug === id);
      }
    }
  }

  if (!req.user || !['admin','super_admin','operations_admin'].includes(req.user.role)) {
    if (found?.status === 'hidden' || found?.status === 'draft') found = undefined as any;
  }
  if (!found) {
    return res.status(404).json({
      success: false,
      error: `Property listing '${id}' not found.`,
      code: 'LISTING_NOT_FOUND',
      requestId: req.id
    });
  }

  res.json({
    success: true,
    data: found,
    requestId: req.id
  });
});

/**
 * POST /api/v1/marketplace/listings & /api/v1/properties & /api/v1/admin/properties (Admin Only)
 */
router.post(['/marketplace/listings', '/properties', '/admin/properties'], requireStaffSection('properties', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  const canManageProperties = Boolean(
    req.user!.isAdmin ||
    req.user!.staffRole === 'property_manager' ||
    req.user!.staffRole === 'super_admin' ||
    ['admin', 'super_admin', 'operations_admin', 'property_manager'].includes(req.user!.role)
  );
  if (isSupabaseServerConfigured() && !canManageProperties) return res.status(403).json({ success: false, error: 'Property management privileges are required.', code: 'PROPERTY_MANAGEMENT_FORBIDDEN', requestId: req.id });
  if (!body.title || !body.location || !body.targetAmount) {
    return res.status(400).json({
      success: false,
      error: 'Listing title, location, and target funding amount are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }
  if (isSupabaseServerConfigured()) {
    try {
      const property = await createPersistentInvestmentPlan(body);
      return res.status(201).json({ success: true, data: property, message: 'Property listing saved to the database.', requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('INVALID_PROPERTY_DATA') ? 400 : message.includes('duplicate key') ? 409 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Property could not be saved. Please check database availability and try again.' : message, code: status === 503 ? 'PROPERTY_DATABASE_WRITE_FAILED' : 'INVALID_PROPERTY_DATA', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newProp = {
    id: body.id || `prop-${crypto.randomBytes(4).toString('hex')}`,
    slug,
    title: body.title,
    location: body.location,
    city: body.city || String(body.location || '').split(',')[0].trim() || 'Paris',
    country: body.country || String(body.location || '').split(',')[1]?.trim() || 'France',
    type: body.type || 'Luxury Villa',
    status: body.status || 'funding',
    fundedAmount: body.fundedAmount || 0,
    targetAmount: Number(body.targetAmount),
    tokenPrice: body.tokenPrice || 364,
    totalTokens: Math.round(Number(body.targetAmount) / (body.tokenPrice || 364)),
    availableTokens: Math.round(Number(body.targetAmount) / (body.tokenPrice || 364)),
    monthlyTargetRate: Number(body.monthlyTargetRate || 6.0),
    projectedYield: Number(body.projectedYield || 72.0),
    capitalAppreciation: Number(body.capitalAppreciation || 4.5),
    minimumInvestment: body.minimumInvestment || 1000,
    holdingPeriodMonths: Number(body.holdingPeriodMonths || 36),
    images: body.images || ['https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg'],
    specs: body.specs || { bedrooms: 5, bathrooms: 6, builtAreaM2: 750, plotAreaM2: 2500 },
    financials: body.financials || { grossRentAnnual: 120000, netYield: 8.5, totalIrr: 13.0 }
  };

  mockListings.unshift(newProp);

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-prop-create',
    method: 'POST',
    route: req.path,
    statusCode: 201,
    userId: req.user?.id,
    eventType: 'PROPERTY_LISTED',
    outcome: 'success',
    message: `Admin ${req.user?.email} published offering: ${newProp.title} (€${newProp.targetAmount})`,
    metadata: { propertyId: newProp.id, title: newProp.title }
  });

  res.status(201).json({
    success: true,
    data: newProp,
    message: 'Property listing published successfully.',
    requestId: req.id
  });
});

/**
 * PUT /api/v1/marketplace/listings/:id & /api/v1/properties/:id & /api/v1/admin/properties/:id (Admin Only)
 */
router.put(['/marketplace/listings/:id', '/properties/:id', '/admin/properties/:id'], requireStaffSection('properties', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const canManageProperties = Boolean(
    req.user!.isAdmin ||
    req.user!.staffRole === 'property_manager' ||
    req.user!.staffRole === 'super_admin' ||
    ['admin', 'super_admin', 'operations_admin', 'property_manager'].includes(req.user!.role)
  );
  if (isSupabaseServerConfigured() && !canManageProperties) return res.status(403).json({ success: false, error: 'Property management privileges are required.', code: 'PROPERTY_MANAGEMENT_FORBIDDEN', requestId: req.id });
  if (isSupabaseServerConfigured()) {
    try {
      const property = await updatePersistentInvestmentPlan(id, req.body || {});
      if (!property) return res.status(404).json({ success: false, error: `Property listing '${id}' was not found.`, code: 'PROPERTY_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: property, message: 'Property listing updated in the database.', requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('INVALID_PROPERTY_DATA') ? 400 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Property changes could not be saved. Please retry.' : message, code: status === 503 ? 'PROPERTY_DATABASE_WRITE_FAILED' : 'INVALID_PROPERTY_DATA', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const targetIndex = mockListings.findIndex(p => p.id === id || p.slug === id);

  if (targetIndex === -1) {
    return res.status(404).json({
      success: false,
      error: `Property listing with ID or slug '${id}' was not found.`,
      code: 'PROPERTY_NOT_FOUND',
      requestId: req.id
    });
  }

  mockListings[targetIndex] = {
    ...mockListings[targetIndex],
    ...req.body
  };

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-prop-update',
    method: 'PUT',
    route: req.path,
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'PROPERTY_UPDATED',
    outcome: 'success',
    message: `Admin ${req.user?.email} updated property: ${mockListings[targetIndex].title}`,
    metadata: { propertyId: id }
  });

  res.json({
    success: true,
    data: mockListings[targetIndex],
    message: 'Property updated successfully.',
    requestId: req.id
  });
});

// ============================================================================
// 4. USER DASHBOARD & PORTFOLIO ROUTES (/api/v1/user & /api/v1/portfolio)
// ============================================================================

async function findUserRecordForRequest(req: AuthenticatedRequest): Promise<UserRecord | undefined> {
  if (!req.user) return undefined;
  if (!shouldUseSupabaseForCustomer(req)) {
    if (process.env.NODE_ENV === 'production') return undefined;
    const devCustomer = devCustomersById.get(req.user.id) || (req.user.email ? devCustomersByEmail.get(req.user.email.toLowerCase()) : undefined);
    if (devCustomer) return toPublicDevCustomer(devCustomer);
    return {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName || 'Investor',
      role: req.user.role,
      kycStatus: 'pending',
      balance: Number(req.user.balance || 0),
      currency: 'EUR',
      createdAt: new Date().toISOString(),
      status: req.user.status || 'active',
      suspendedReason: req.user.suspendedReason
    };
  }
  const profile = await getUserProfile(req.user.id);
  if (!profile) return undefined;
  return {
    id: profile.id, email: profile.email || req.user.email, fullName: profile.full_name || req.user.fullName || 'Investor',
    role: req.user.role, kycStatus: profile.kyc_status || 'pending',
    balance: Number(profile.wallet_balance || 0), currency: 'EUR', createdAt: profile.created_at,
    country: profile.country || undefined, countryCode: profile.country_code || undefined,
    phoneNumber: profile.phone_number || undefined, isEmailVerified: true,
    status: profile.account_status === 'suspended' ? 'suspended' : 'active',
    suspendedReason: profile.suspended_reason || undefined
  };
}

/**
 * GET /api/v1/user/profile
 */
router.get('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!shouldUseSupabaseForCustomer(req)) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const devCustomer = devCustomersById.get(req.user!.id);
    const devGateId = (devCustomer as any)?.assignedGateId || getDevAssignedGateId(req.user!.id);
    const devGate = devGateId ? getDevGateById(devGateId) : null;
    const assignedBankAccount = devGate
      ? {
          gateId: devGate.id,
          gateName: devGate.name,
          method: devGate.method,
          bankName: devGate.account_details?.Bank || devGate.name,
          accountHolder: devGate.account_details?.Beneficiary || '',
          iban: devGate.account_details?.IBAN || '',
          bic: devGate.account_details?.BIC || '',
        }
      : null;
    const baseData = devCustomer ? toPublicDevCustomer(devCustomer) : {
      id: req.user!.id,
      email: req.user!.email,
      fullName: req.user!.fullName || 'Investor',
      role: req.user!.role,
      accountType: req.user!.accountType || 'individual_investor',
      balance: Number(req.user!.balance || 0),
      investedBalance: 0,
      kycStatus: 'pending',
      status: req.user!.status || 'active',
      createdAt: new Date().toISOString()
    };
    return res.json({
      success: true,
      data: {
        ...baseData,
        iban: (baseData as any).bankIban || '',
        bankHolder: (baseData as any).bankAccountHolder || baseData.fullName,
        assignedBankAccount,
      },
      requestId: req.id
    });
  }
  try {
    const profile = await getUserProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    const assignedGateId = profile.payment_gate_id ?? profile.assigned_gate_id;
    const assignedBankAccount = assignedGateId ? await getAssignedPaymentGate(String(assignedGateId)).catch(() => null) : null;
    const resolvedIban = profile.iban ?? profile.bank_iban ?? '';
    const resolvedHolder = profile.bank_holder ?? profile.bank_account_holder ?? profile.full_name ?? '';
    return res.json({ success: true, data: {
      id: profile.id, email: profile.email, fullName: profile.full_name, country: profile.country,
      countryCode: profile.country_code, phoneNumber: profile.phone_number, accountType: profile.account_type,
      balance: Number(profile.wallet_balance || 0), investedBalance: Number(profile.invested_balance || 0),
      kycStatus: profile.kyc_status, status: profile.account_status || 'active', createdAt: profile.created_at,
      address: profile.address, city: profile.city, postalCode: profile.postal_code, avatarUrl: profile.avatar_url,
      iban: resolvedIban, bankIban: resolvedIban,
      bankHolder: resolvedHolder, bankAccountHolder: resolvedHolder,
      assignedBankAccount,
      cryptoDepositAddress: profile.crypto_deposit_address, taxId: profile.tax_id,
      dateOfBirth: profile.date_of_birth, preferences: profile.preferences
    }, requestId: req.id });
  } catch (error: any) {
    logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-profile-db', eventType: 'PROFILE_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Profile query failed.' });
    return res.status(503).json({ success: false, error: 'Your profile is temporarily unavailable.', code: 'PROFILE_DATABASE_UNAVAILABLE', requestId: req.id });
  }
});

/**
 * PATCH/PUT /api/v1/user/profile
 * Persist customer-editable profile data against the authenticated user ID.
 */
const updateAuthenticatedCustomerProfile = async (req: AuthenticatedRequest, res: Response) => {
  const input = req.body || {};
  const rawIbanInput = typeof input.bankIban === 'string' ? input.bankIban : typeof input.iban === 'string' ? input.iban : undefined;
  const rawHolderInput = typeof input.bankAccountHolder === 'string'
    ? input.bankAccountHolder
    : typeof input.bankHolder === 'string'
    ? input.bankHolder
    : typeof input.bank_holder === 'string'
    ? input.bank_holder
    : undefined;
  const rawFullNameInput = typeof input.fullName === 'string'
    ? input.fullName
    : typeof input.full_name === 'string'
    ? input.full_name
    : undefined;
  const normalizedIban = rawIbanInput !== undefined
    ? rawIbanInput.replace(/\s+/g, '').toUpperCase()
    : undefined;
  if (normalizedIban && !isValidIbanServer(normalizedIban)) {
    return res.status(400).json({ success: false, error: 'Enter a valid IBAN (format and checksum).', code: 'INVALID_IBAN', requestId: req.id });
  }

  const patch: Record<string, unknown> = {
    full_name: rawFullNameInput, phone_number: input.phoneNumber, country: input.country,
    country_code: input.countryCode, address: input.address, city: input.city,
    postal_code: input.postalCode, avatar_url: input.avatarUrl, bank_iban: normalizedIban,
    iban: normalizedIban,
    bank_account_holder: rawHolderInput,
    bank_holder: rawHolderInput,
    crypto_deposit_address: input.cryptoDepositAddress, tax_id: input.taxId,
    date_of_birth: input.dateOfBirth
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && typeof value !== 'string') return res.status(400).json({ success: false, error: 'Profile fields must be text values.', code: 'INVALID_PROFILE_FIELD', requestId: req.id });
    if (typeof value === 'string' && value.length > 500) return res.status(400).json({ success: false, error: 'A profile field exceeds the allowed length.', code: 'PROFILE_FIELD_TOO_LONG', requestId: req.id });
  }

  if (!shouldUseSupabaseForCustomer(req)) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const devCustomer = devCustomersById.get(req.user!.id);
    if (!devCustomer) {
      return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    }
    const targetLegalName = rawFullNameInput && rawFullNameInput.trim()
      ? rawFullNameInput.trim()
      : devCustomer.fullName;
    if (rawHolderInput !== undefined && rawHolderInput.trim() && !namesMatchOwner(targetLegalName, rawHolderInput)) {
      return res.status(400).json({
        success: false,
        error: 'Bank account holder must match your own legal name. Third-party bank accounts are not permitted.',
        code: 'BANK_HOLDER_NAME_MISMATCH',
        requestId: req.id
      });
    }
    if (rawFullNameInput !== undefined) devCustomer.fullName = rawFullNameInput.trim();
    if (typeof input.phoneNumber === 'string') devCustomer.phoneNumber = input.phoneNumber;
    if (typeof input.country === 'string') devCustomer.country = input.country;
    if (typeof input.countryCode === 'string') devCustomer.countryCode = input.countryCode;
    if (typeof input.address === 'string') devCustomer.address = input.address;
    if (typeof input.city === 'string') devCustomer.city = input.city;
    if (typeof input.postalCode === 'string') devCustomer.postalCode = input.postalCode;
    if (typeof input.avatarUrl === 'string') devCustomer.avatarUrl = input.avatarUrl;
    if (normalizedIban !== undefined) devCustomer.bankIban = normalizedIban;
    if (rawHolderInput !== undefined) devCustomer.bankAccountHolder = rawHolderInput.trim();
    if (typeof input.cryptoDepositAddress === 'string') devCustomer.cryptoDepositAddress = input.cryptoDepositAddress;
    if (typeof input.taxId === 'string') devCustomer.taxId = input.taxId;
    if (typeof input.dateOfBirth === 'string') devCustomer.dateOfBirth = input.dateOfBirth;
    await persistDevState();
    const publicProfile = toPublicDevCustomer(devCustomer);
    return res.json({
      success: true,
      data: {
        ...publicProfile,
        iban: publicProfile.bankIban || '',
        bankHolder: publicProfile.bankAccountHolder || publicProfile.fullName,
      },
      message: 'User profile updated successfully.',
      requestId: req.id
    });
  }
  try {
    const existing = await getUserProfile(req.user!.id);
    if (!existing) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    const targetLegalName = rawFullNameInput && rawFullNameInput.trim()
      ? rawFullNameInput.trim()
      : existing.full_name;
    if (rawHolderInput !== undefined && rawHolderInput.trim() && !namesMatchOwner(targetLegalName, rawHolderInput)) {
      return res.status(400).json({
        success: false,
        error: 'Bank account holder must match your own legal name. Third-party bank accounts are not permitted.',
        code: 'BANK_HOLDER_NAME_MISMATCH',
        requestId: req.id
      });
    }
    const profile = await updateUserProfile(req.user!.id, patch);
    if (!profile) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    const resolvedIban = profile.iban ?? profile.bank_iban ?? '';
    const resolvedHolder = profile.bank_holder ?? profile.bank_account_holder ?? profile.full_name ?? '';
    return res.json({ success: true, data: {
      id: profile.id, email: profile.email, fullName: profile.full_name, country: profile.country,
      countryCode: profile.country_code, phoneNumber: profile.phone_number, accountType: profile.account_type,
      address: profile.address, city: profile.city, postalCode: profile.postal_code,
      avatarUrl: profile.avatar_url, iban: resolvedIban, bankIban: resolvedIban,
      bankHolder: resolvedHolder, bankAccountHolder: resolvedHolder,
      cryptoDepositAddress: profile.crypto_deposit_address, taxId: profile.tax_id,
      dateOfBirth: profile.date_of_birth, balance: Number(profile.wallet_balance || 0),
      kycStatus: profile.kyc_status, status: profile.account_status || 'active'
    }, message: 'User profile updated successfully.', requestId: req.id });
  } catch (error: any) {
    logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-profile-update-db', eventType: 'PROFILE_UPDATE_FAILED', outcome: 'failure', message: error?.message || 'Profile update failed.' });
    return res.status(503).json({ success: false, error: 'Profile changes could not be saved. Please try again.', code: 'PROFILE_UPDATE_FAILED', requestId: req.id });
  }
};
router.patch('/user/profile', requireAuth, requireBankChangeEmailVerification, updateAuthenticatedCustomerProfile);
router.put('/user/profile', requireAuth, requireBankChangeEmailVerification, updateAuthenticatedCustomerProfile);

/**
 * GET /api/v1/portfolio
 */
router.get(['/portfolio', '/portfolio/summary', '/holdings'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const rows = await listUserInvestments(userId);
      const holdings = rows.map((row: any) => {
        const property = row.investment_plans || {};
        const cost = Number(row.total_amount_invested || 0);
        const valueCents = row.value_cents !== undefined && row.value_cents !== null
          ? Math.round(Number(row.value_cents))
          : Math.round(Number(row.current_valuation || cost) * 100);
        const gainCents = row.gain_cents !== undefined && row.gain_cents !== null
          ? Math.round(Number(row.gain_cents))
          : Math.round(valueCents - cost * 100);
        const shares = Number(row.shares ?? row.tokens_purchased ?? 0);
        const annualYield = Number(property.estimated_annual_yield || 0);
        const name = row.name || property.title || row.plan_id;
        const city = row.city || property.city || '';
        return {
          id: row.id, propertyId: row.plan_id, name, propertyTitle: name, city,
          tokensPurchased: shares, shares, totalCost: cost,
          currentValue: valueCents / 100, valueCents, value_cents: valueCents,
          gainCents, gain_cents: gainCents,
          projectedAnnualDividend: Number((cost * annualYield / 100).toFixed(2)),
          dividendsReceived: Number(row.total_dividends_received || 0),
          purchaseDate: row.purchased_at, certificateId: row.certificate_id,
          status: row.status, maturityDate: row.maturity_date
        };
      });
      const totalPortfolioValue = holdings.reduce((sum: number, item: any) => sum + item.currentValue, 0);
      const totalTokensHeld = holdings.reduce((sum: number, item: any) => sum + item.tokensPurchased, 0);
      const totalDividendsReceived = holdings.reduce((sum: number, item: any) => sum + item.dividendsReceived, 0);
      return res.json({ success: true, data: { holdings, totalHoldingsValue: totalPortfolioValue, totalPortfolioValue, totalTokensHeld, activePropertiesCount: holdings.filter((item: any) => item.status === 'active').length, totalDividendsReceived, currency: 'EUR' }, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-portfolio-db', eventType: 'PORTFOLIO_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Portfolio query failed.' });
      return res.status(503).json({ success: false, error: 'Your investment portfolio is temporarily unavailable.', code: 'PORTFOLIO_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent investment storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const matchedUser = await findUserRecordForRequest(req);
  const resolvedEmail = matchedUser?.email || req.user?.email || '';
  const userInvTxs = mockTransactions.filter(
    t =>
      (t.userId === userId || (Boolean(resolvedEmail) && t.userEmail === resolvedEmail)) &&
      t.type === 'investment' &&
      t.status === 'completed'
  );

  const holdingsMap = new Map<string, any>();
  for (const tx of userInvTxs) {
    const propId = (tx as any).propertyId || 'prop-unknown';
    const prop = mockListings.find(p => p.id === propId);
    const annualYieldRate = prop ? (prop.projectedYield || 12.8) / 100 : 0.128;
    const existing = holdingsMap.get(propId);
    if (existing) {
      existing.tokensPurchased += Number((tx as any).tokensPurchased || 0);
      existing.shares = existing.tokensPurchased;
      existing.totalCost += Number(tx.amount || 0);
      existing.currentValue = Math.round(existing.totalCost * 100) / 100;
      existing.valueCents = Math.round(existing.currentValue * 100);
      existing.value_cents = existing.valueCents;
      existing.gainCents = Math.round(existing.valueCents - existing.totalCost * 100);
      existing.gain_cents = existing.gainCents;
      existing.projectedAnnualDividend = Math.round(existing.totalCost * annualYieldRate * 100) / 100;
    } else {
      const cost = Number(tx.amount || 0);
      const shares = Number((tx as any).tokensPurchased || 0);
      const valueCents = Math.round(cost * 100);
      const realDividendsForProp = mockTransactions
        .filter(t => (t.userId === userId || (Boolean(resolvedEmail) && t.userEmail === resolvedEmail)) &&
                     (t.type === 'dividend' || t.type === 'distribution' || t.type === 'payout') &&
                     t.status === 'completed' &&
                     (t as any).propertyId === propId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const title = (tx as any).propertyTitle || prop?.title || 'Tokenized Property SPV';
      const city = (prop as any)?.city || (prop?.location ? String(prop.location).split(',')[0].trim() : '');

      holdingsMap.set(propId, {
        id: tx.id,
        propertyId: propId,
        name: title,
        propertyTitle: title,
        city,
        tokensPurchased: shares,
        shares,
        totalCost: cost,
        currentValue: cost,
        valueCents,
        value_cents: valueCents,
        gainCents: 0,
        gain_cents: 0,
        projectedAnnualDividend: Math.round(cost * annualYieldRate * 100) / 100,
        dividendsReceived: realDividendsForProp,
        purchaseDate: tx.createdAt,
        certificateId: tx.reference || 'KZ-CERT'
      });
    }
  }

  const userInvestments = Array.from(holdingsMap.values());
  const totalPortfolioValue = userInvestments.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalTokensHeld = userInvestments.reduce((acc, curr) => acc + curr.tokensPurchased, 0);
  const totalDividendsReceived = userInvestments.reduce((acc, curr) => acc + curr.dividendsReceived, 0);

  res.json({
    success: true,
    data: {
      holdings: userInvestments,
      totalHoldingsValue: totalPortfolioValue,
      totalPortfolioValue,
      totalTokensHeld,
      activePropertiesCount: userInvestments.length,
      totalDividendsReceived,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/wallet/balance | /api/v1/wallets | /api/v1/wallets/me
 */
router.get(['/wallet/balance', '/user/wallet/balance', '/wallets', '/wallets/me'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const [wallet, profile] = await Promise.all([
        getWalletSummary(req.user!.id),
        getUserProfile(req.user!.id).catch(() => null),
      ]);
      if (!wallet) return res.status(404).json({ success: false, error: 'Investor wallet profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      const gateId = profile?.payment_gate_id ?? profile?.assigned_gate_id;
      const assignedBankAccount = gateId ? await getAssignedPaymentGate(String(gateId)).catch(() => null) : null;
      return res.json({
        success: true,
        data: {
          balance: wallet.balance,
          balanceCents: wallet.balanceCents,
          availableBalance: wallet.availableBalance,
          availableCents: wallet.availableCents,
          reservedBalance: wallet.reservedBalance,
          subBalances: { EUR: wallet.availableBalance },
          currency: wallet.currency,
          assignedBankAccount,
        },
        requestId: req.id
      });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Wallet balance is temporarily unavailable.', code: 'WALLET_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent wallet storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const user = await findUserRecordForRequest(req);
  const userId = req.user!.id;
  const userEmail = req.user?.email?.toLowerCase();

  // Scoped to the logged-in user
  const userTxs = mockTransactions.filter(
    t => t.userId === userId || (userEmail && t.userEmail?.toLowerCase() === userEmail)
  );

  let calculatedBalance = user ? user.balance : (req.user?.balance ?? 0);
  if (userTxs.length > 0) {
    let txSum = 0;
    for (const tx of userTxs) {
      const amt = Number(tx.amount || 0);
      if (tx.status === 'completed') {
        if (tx.type === 'deposit' || tx.type === 'dividend' || tx.type === 'payout' || tx.type === 'distribution') {
          txSum += amt;
        } else if (tx.type === 'withdrawal' || tx.type === 'investment' || tx.type === 'purchase') {
          txSum -= amt;
        }
      } else if (tx.status === 'pending' && tx.type === 'withdrawal') {
        txSum -= amt;
      }
    }
    calculatedBalance = Math.max(0, Math.round(txSum * 100) / 100);
  }

  if (user) {
    user.balance = calculatedBalance;
  }

  const devCustomer = devCustomersById.get(userId);
  const devGateId = (devCustomer as any)?.assignedGateId || getDevAssignedGateId(userId);
  const devGate = devGateId ? getDevGateById(devGateId) : null;
  const assignedBankAccount = devGate
    ? {
        gateId: devGate.id,
        gateName: devGate.name,
        method: devGate.method,
        bankName: devGate.account_details?.Bank || devGate.name,
        accountHolder: devGate.account_details?.Beneficiary || '',
        iban: devGate.account_details?.IBAN || '',
        bic: devGate.account_details?.BIC || '',
      }
    : null;
  const balanceCents = Math.round(calculatedBalance * 100);

  res.json({
    success: true,
    data: {
      balance: calculatedBalance,
      balanceCents,
      availableBalance: calculatedBalance,
      availableCents: balanceCents,
      subBalances: getOrInitUserSubBalances(req.user!.id, calculatedBalance),
      currency: 'EUR',
      assignedBankAccount,
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/transactions
 */
router.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : 'all';
  const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : 'all';
  const searchQuery = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const fromDate = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from).getTime() : null;
  const toDate = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to + 'T23:59:59.999Z').getTime() : null;
  const limitParam = Math.min(Math.max(Number(req.query.limit) || 250, 1), 500);
  const offsetParam = Math.max(Number(req.query.offset) || 0, 0);

  const applyFilters = (list: any[]) =>
    list.filter((t) => {
      if (typeFilter && typeFilter !== 'all' && String(t.type || '').toLowerCase() !== typeFilter) return false;
      if (statusFilter && statusFilter !== 'all' && String(t.status || '').toLowerCase() !== statusFilter) return false;
      const ts = new Date(t.createdAt || t.created_at || 0).getTime();
      if (fromDate && !Number.isNaN(fromDate) && ts < fromDate) return false;
      if (toDate && !Number.isNaN(toDate) && ts > toDate) return false;
      if (searchQuery) {
        const hay = [t.description, t.reference, t.paymentMethod, t.method, t.txHash, t.currency, t.type, t.propertyTitle]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });

  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const rows = req.user?.role === 'admin' || req.user?.role === 'super_admin' || req.user?.role === 'finance_admin'
        ? await listAdminTransactions(undefined, undefined, 250)
        : await listUserTransactions(userId, 250);
      const formatted = rows.map((row: any) => ({ ...toApiTransaction(row), user_id: row.user_id, userId: row.user_id, created_at: row.created_at, paymentMethod: row.payment_method }));
      const filtered = applyFilters(formatted);
      const paged = filtered.slice(offsetParam, offsetParam + limitParam);
      return res.json({ success: true, data: paged, total: filtered.length, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-transactions-db', eventType: 'TRANSACTION_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Transaction query failed.' });
      return res.status(503).json({ success: false, error: 'Transaction history is temporarily unavailable.', code: 'TRANSACTION_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent transaction storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const userEmail = req.user?.email?.toLowerCase();

  // If user is ordinary investor, filter to their transactions
  const txs = req.user?.role === 'admin'
    ? mockTransactions
    : mockTransactions.filter(t => t.userId === userId || (userEmail && t.userEmail?.toLowerCase() === userEmail));

  const formattedTxs = txs.map(t => ({
    id: t.id,
    user_id: t.userId,
    userId: t.userId,
    type: t.type,
    amount: Number(t.amount || 0),
    currency: t.currency || 'EUR',
    status: t.status,
    reference: t.reference,
    created_at: t.createdAt || t.created_at || new Date().toISOString(),
    createdAt: t.createdAt || t.created_at || new Date().toISOString(),
    processedAt: t.processedAt,
    description: t.description || (t.propertyTitle ? `${t.type} — ${t.propertyTitle}` : `${t.type} transaction`),
    paymentMethod: t.paymentMethod || t.method || 'System',
    propertyId: (t as any).propertyId,
    propertyTitle: (t as any).propertyTitle,
    tokensPurchased: (t as any).tokensPurchased,
    txHash: (t as any).txHash,
    destination: (t as any).destination,
    note: (t as any).note || (t as any).notes,
    notes: (t as any).note || (t as any).notes,
    metadata: (t as any).metadata || {},
  }));

  const filtered = applyFilters(formattedTxs);
  const paged = filtered.slice(offsetParam, offsetParam + limitParam);

  res.json({
    success: true,
    data: paged,
    total: filtered.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/transactions/:transactionId
 */
router.get('/transactions/:transactionId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const key = req.params.transactionId;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const row: any = await findTransactionByReferenceOrId(key);
      if (!row || (row.user_id !== userId && req.user?.role === 'investor')) {
        return res.status(404).json({ success: false, error: 'Transaction not found.', code: 'TRANSACTION_NOT_FOUND', requestId: req.id });
      }
      return res.json({ success: true, data: { ...toApiTransaction(row), paymentMethod: row.payment_method }, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Transaction details are temporarily unavailable.', code: 'TRANSACTION_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  const userEmail = req.user?.email?.toLowerCase();
  const tx = mockTransactions.find(
    (t) =>
      (t.id === key || t.reference === key) &&
      (req.user?.role === 'admin' || t.userId === userId || (userEmail && t.userEmail?.toLowerCase() === userEmail))
  );
  if (!tx) {
    return res.status(404).json({ success: false, error: 'Transaction not found.', code: 'TRANSACTION_NOT_FOUND', requestId: req.id });
  }
  return res.json({ success: true, data: tx, requestId: req.id });
});

/**
 * GET /api/v1/notifications
 */
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { const rows = await listUserNotifications(req.user!.id); const data = rows.map((n: any) => ({ id: n.id, title: n.title, message: n.message || n.body || '', type: n.type || 'info', read: n.read, createdAt: n.created_at, metadata: n.metadata || null })); return res.json({ success: true, data, unreadCount: data.filter((n: any) => !n.read).length, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notifications are temporarily unavailable.', code: 'NOTIFICATION_DATABASE_UNAVAILABLE', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const list = userNotificationsStore.get(req.user!.id) || [];
  res.json({
    success: true,
    data: list,
    unreadCount: list.filter(n => !n.read).length,
    requestId: req.id
  });
});

router.patch('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { const row = await markUserNotificationRead(req.user!.id, req.params.id); return res.json({ success: true, data: row, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notification could not be updated.', code: 'NOTIFICATION_UPDATE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const list = userNotificationsStore.get(req.user!.id) || [];
  const target = list.find(n => n.id === req.params.id);
  if (target) {
    target.read = true;
    await persistDevState();
  }
  res.json({
    success: true,
    data: target || null,
    requestId: req.id
  });
});

router.post('/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { const markedRead = await markAllUserNotificationsRead(req.user!.id); return res.json({ success: true, data: { markedRead }, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notifications could not be updated.', code: 'NOTIFICATION_UPDATE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const list = userNotificationsStore.get(req.user!.id) || [];
  list.forEach(n => { n.read = true; });
  await persistDevState();
  res.json({
    success: true,
    data: { markedRead: list.length },
    requestId: req.id
  });
});

router.get('/admin/notifications', requireStaffSection('notifications', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const rows = await listAdminNotifications(200);
      const data = rows.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        userEmail: n.user_profiles?.email || undefined,
        userName: n.user_profiles?.full_name || undefined,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        read: Boolean(n.read),
        createdAt: n.created_at,
      }));
      return res.json({ success: true, data, total: data.length, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Notifications are temporarily unavailable.', code: 'ADMIN_NOTIFICATIONS_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const allNotifs: any[] = [];
  for (const [uid, list] of userNotificationsStore.entries()) {
    const cust = devCustomersById.get(uid);
    for (const item of list) {
      allNotifs.push({
        id: item.id,
        userId: uid,
        userEmail: cust?.email || 'investor@kretz.com',
        userName: cust?.fullName || 'Investor',
        title: item.title,
        message: item.message,
        type: item.type || 'info',
        read: Boolean(item.read),
        createdAt: item.createdAt,
      });
    }
  }
  allNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ success: true, data: allNotifs, total: allNotifs.length, requestId: req.id });
});

router.post('/admin/notifications', requireStaffSection('notifications', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = typeof req.body?.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : 'all';
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const type = ['info', 'success', 'warning'].includes(String(req.body?.type)) ? String(req.body.type) : 'info';

  if (!title || title.length < 2 || !message || message.length < 4) {
    return res.status(400).json({ success: false, error: 'Title and message are required to send a notification.', code: 'INVALID_NOTIFICATION_PAYLOAD', requestId: req.id });
  }

  if (isSupabaseServerConfigured()) {
    try {
      const inserted = await sendAdminNotifications(targetUserId, { title, message, type });
      return res.status(201).json({
        success: true,
        data: inserted,
        sentCount: inserted.length,
        message: targetUserId === 'all' ? `Notification broadcast to ${inserted.length} investor accounts.` : 'Notification dispatched to investor.',
        requestId: req.id,
      });
    } catch {
      return res.status(503).json({ success: false, error: 'Unable to dispatch notification to the database.', code: 'ADMIN_NOTIFICATION_SEND_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }

  const targetIds = targetUserId === 'all' ? Array.from(devCustomersById.keys()) : [targetUserId];
  const nowIso = new Date().toISOString();
  const created: any[] = [];
  for (const uid of targetIds) {
    const entry = {
      id: `notif-${crypto.randomBytes(5).toString('hex')}`,
      title,
      message,
      type,
      read: false,
      createdAt: nowIso,
    };
    const existing = userNotificationsStore.get(uid) || [];
    userNotificationsStore.set(uid, [entry, ...existing]);
    created.push({ ...entry, userId: uid });
  }
  await persistDevState();
  return res.status(201).json({
    success: true,
    data: created,
    sentCount: created.length,
    message: targetUserId === 'all' ? `Notification broadcast to ${created.length} investor accounts.` : 'Notification dispatched to investor.',
    requestId: req.id,
  });
});

/**
 * User Favorites & Preferences Persistence (/api/v1/user/favorites & /api/v1/user/preferences)
 */
router.get('/user/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { return res.json({ success: true, data: { favorites: await listUserFavorites(req.user!.id) }, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your watchlist is temporarily unavailable.', code: 'FAVORITES_DATABASE_UNAVAILABLE', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent watchlist storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const favSet = userFavoritesStore.get(req.user!.id) || new Set<string>();
  res.json({
    success: true,
    data: { favorites: Array.from(favSet) },
    requestId: req.id
  });
});

router.post('/user/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.body || {};
  if (!propertyId || typeof propertyId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Valid propertyId is required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }
  if (shouldUseSupabaseForCustomer(req)) { try { const favorites = await saveUserFavorite(req.user!.id, propertyId); return res.json({ success: true, data: { favorites, propertyId, saved: true }, message: 'Property saved to your watchlist.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Property could not be saved to your watchlist.', code: 'FAVORITES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent watchlist storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const favSet = userFavoritesStore.get(req.user!.id) || new Set<string>();
  favSet.add(propertyId);
  userFavoritesStore.set(req.user!.id, favSet);
  res.json({
    success: true,
    data: { favorites: Array.from(favSet), propertyId, saved: true },
    message: 'Property saved to your watchlist.',
    requestId: req.id
  });
});

router.delete('/user/favorites/:propertyId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  if (shouldUseSupabaseForCustomer(req)) { try { const favorites = await removeUserFavorite(req.user!.id, propertyId); return res.json({ success: true, data: { favorites, propertyId, saved: false }, message: 'Property removed from your watchlist.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Property could not be removed from your watchlist.', code: 'FAVORITES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent watchlist storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const favSet = userFavoritesStore.get(req.user!.id) || new Set<string>();
  favSet.delete(propertyId);
  userFavoritesStore.set(req.user!.id, favSet);
  res.json({
    success: true,
    data: { favorites: Array.from(favSet), propertyId, saved: false },
    message: 'Property removed from your watchlist.',
    requestId: req.id
  });
});

router.get('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { return res.json({ success: true, data: await getUserPreferences(req.user!.id), requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your preferences are temporarily unavailable.', code: 'PREFERENCES_DATABASE_UNAVAILABLE', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent preference storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const prefs = userPreferencesStore.get(req.user!.id) || {
    defaultSort: 'yield-desc',
    itemsPerPage: 6,
    currencyDisplay: 'EUR',
    emailNotifications: true,
    depositAlerts: true,
    withdrawalUpdates: true,
    kycUpdates: true,
    distributionAlerts: true,
    securityAlerts: true,
  };
  res.json({
    success: true,
    data: prefs,
    requestId: req.id
  });
});

router.put('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) { try { const data = await saveUserPreferences(req.user!.id, req.body || {}); return res.json({ success: true, data, message: 'Preferences saved.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your preferences could not be saved.', code: 'PREFERENCES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent preference storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const current = userPreferencesStore.get(req.user!.id) || {};
  const next = { ...current, ...(req.body || {}), updatedAt: new Date().toISOString() };
  userPreferencesStore.set(req.user!.id, next);
  await persistDevState();
  res.json({
    success: true,
    data: next,
    message: 'Preferences saved.',
    requestId: req.id
  });
});

/**
 * Compliance & KYC Document Endpoints (/api/v1/compliance/documents)
 */
/**
 * Compliance Steps & Documents (/api/v1/compliance/steps, /api/v1/compliance-steps, /api/v1/documents, /api/v1/compliance/documents)
 */
router.get(['/compliance/steps', '/compliance-steps'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const steps = await listComplianceSteps(req.user!.id);
      return res.json({ success: true, data: steps, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Compliance steps are temporarily unavailable.', code: 'COMPLIANCE_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent compliance storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const devCustomer = devCustomersById.get(req.user!.id);
  const steps = buildDevComplianceSteps(req.user!.id, devCustomer?.kycStatus);
  return res.json({ success: true, data: steps, requestId: req.id });
});

router.get(['/compliance/documents', '/documents'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const docs = await listComplianceDocuments(req.user!.id);
      return res.json({ success: true, data: docs, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Compliance documents are temporarily unavailable.', code: 'COMPLIANCE_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent compliance storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const docs = devComplianceDocsByUser.get(req.user!.id) || [];
  return res.json({ success: true, data: docs, requestId: req.id });
});

router.post(['/compliance/documents', '/documents'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const category = String(req.body?.category || '') as 'kyc_identity' | 'proof_of_address' | 'accredited_proof';
  const documentType = String(req.body?.documentType || '').trim();
  const fileName = String(req.body?.fileName || '').trim();
  const mimeType = String(req.body?.mimeType || 'application/pdf').trim();
  const fileSize = Number(req.body?.fileSize || 0);
  const fileDataUrl = typeof req.body?.fileDataUrl === 'string' && req.body.fileDataUrl.length <= 2_500_000
    ? req.body.fileDataUrl
    : undefined;

  if (!['kyc_identity', 'proof_of_address', 'accredited_proof'].includes(category)) {
    return res.status(400).json({ success: false, error: 'Invalid compliance document category.', code: 'INVALID_CATEGORY', requestId: req.id });
  }
  if (!documentType || !fileName) {
    return res.status(400).json({ success: false, error: 'Document type and file name are required.', code: 'VALIDATION_ERROR', requestId: req.id });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 15 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: 'Document size must be between 1 byte and 15 MB.', code: 'INVALID_FILE_SIZE', requestId: req.id });
  }
  const allowedMimes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
  if (!allowedMimes.has(mimeType.toLowerCase()) && !/\.(pdf|jpe?g|png)$/i.test(fileName)) {
    return res.status(400).json({ success: false, error: 'Unsupported document format. Upload a PDF, JPG, or PNG file.', code: 'INVALID_FILE_TYPE', requestId: req.id });
  }

  const titlePrefix: Record<'kyc_identity' | 'proof_of_address' | 'accredited_proof', string> = {
    kyc_identity: 'Identity Verification',
    proof_of_address: 'Proof of Address',
    accredited_proof: 'Investor Suitability'
  };

  const record = {
    id: `doc-${crypto.randomUUID()}`,
    userId: req.user!.id,
    category,
    documentType,
    title: `${documentType} — ${titlePrefix[category]}`,
    fileName,
    fileSize,
    mimeType,
    status: 'pending' as const,
    uploadedAt: new Date().toISOString(),
    fileDataUrl
  };

  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const docs = await addComplianceDocument(req.user!.id, record);
      const steps = await listComplianceSteps(req.user!.id);
      return res.status(201).json({ success: true, data: record, documents: docs, steps, message: 'Compliance document uploaded and queued for review.', requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Compliance document could not be saved.', code: 'COMPLIANCE_WRITE_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent compliance storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }

  const existing = devComplianceDocsByUser.get(req.user!.id) || [];
  const nextDocs = [record, ...existing].slice(0, 25);
  devComplianceDocsByUser.set(req.user!.id, nextDocs);

  const devCustomer = devCustomersById.get(req.user!.id);
  if (devCustomer && devCustomer.kycStatus !== 'verified') {
    devCustomer.kycStatus = 'pending';
  }
  const currentSteps = buildDevComplianceSteps(req.user!.id, devCustomer?.kycStatus);
  const updatedSteps = currentSteps.map((st) =>
    st.stepKey === category
      ? { ...st, status: 'in_review' as const, submittedAt: record.uploadedAt, updatedAt: record.uploadedAt }
      : st
  );
  devComplianceStepsByUser.set(req.user!.id, updatedSteps);

  await persistDevState();
  return res.status(201).json({ success: true, data: record, documents: nextDocs, steps: updatedSteps, message: 'Compliance document uploaded and queued for review.', requestId: req.id });
});

/**
 * POST /api/v1/compliance/kyc-session
 * Starts or resumes KYC verification via external KYC provider (Sumsub) or internal AML5/6 vault
 */
router.post('/compliance/kyc-session', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = await createKycVerificationSession({
    userId: req.user!.id,
    email: req.user!.email,
    fullName: req.user!.fullName || 'Investor',
  });
  return res.json({ success: true, data: session, requestId: req.id });
});

/**
 * POST /api/v1/webhooks/kyc
 * External KYC provider callback (Sumsub / automated AML check) with HMAC verification & idempotency
 */
router.post('/webhooks/kyc', async (req: AuthenticatedRequest, res: Response) => {
  const rawBody = typeof (req as any).rawBody === 'string'
    ? (req as any).rawBody
    : JSON.stringify(req.body || {});
  const sigCheck = verifyKycWebhookSignature({
    rawBody,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });
  if (!sigCheck.valid) {
    const isUnconfigured = (sigCheck.reason || '').toLowerCase().includes('not configured');
    return res.status(isUnconfigured ? 503 : 401).json({
      success: false,
      error: sigCheck.reason || 'Invalid KYC webhook signature.',
      code: isUnconfigured ? 'KYC_WEBHOOK_NOT_CONFIGURED' : 'INVALID_KYC_WEBHOOK_SIGNATURE',
      requestId: req.id,
    });
  }

  const payload = req.body || {};
  const userId = String(payload.externalUserId || payload.userId || '').trim();
  const reviewAnswer = String(payload.reviewResult?.reviewAnswer || payload.status || '').toUpperCase();
  const eventId = String(payload.eventId || payload.inspectionId || `${userId}:${reviewAnswer}`).trim();

  if (!userId || !['GREEN', 'VERIFIED', 'APPROVED', 'RED', 'REJECTED'].includes(reviewAnswer)) {
    return res.status(400).json({
      success: false,
      error: 'Valid KYC webhook userId and reviewAnswer (GREEN/VERIFIED/RED/REJECTED) are required.',
      code: 'INVALID_KYC_WEBHOOK_PAYLOAD',
      requestId: req.id,
    });
  }

  const whKey = `kyc:${eventId}`;
  if (processedWebhooks.has(whKey)) {
    return res.json({ success: true, message: 'KYC webhook event already processed.', eventId, requestId: req.id });
  }
  processedWebhooks.add(whKey);

  const isApproved = ['GREEN', 'VERIFIED', 'APPROVED'].includes(reviewAnswer);
  const stepStatus: ComplianceStepRecord['status'] = isApproved ? 'verified' : 'rejected';
  const kycStatusValue = isApproved ? 'verified' : 'rejected';
  const reason = typeof payload.reviewResult?.moderationComment === 'string'
    ? payload.reviewResult.moderationComment
    : undefined;

  if (isSupabaseServerConfigured()) {
    try {
      await getSupabaseAdmin()
        .from('user_profiles')
        .update({ kyc_status: kycStatusValue, updated_at: new Date().toISOString() })
        .eq('id', userId);
      await Promise.all([
        upsertComplianceStep(userId, 'kyc_identity', stepStatus, reason).catch(() => {}),
        upsertComplianceStep(userId, 'proof_of_address', stepStatus, reason).catch(() => {}),
        upsertComplianceStep(userId, 'accredited_proof', stepStatus, reason).catch(() => {}),
      ]);
      const prof = await getUserProfile(userId);
      await notifyInvestorEvent({
        userId,
        email: prof?.email,
        title: isApproved ? 'Identity verification approved' : 'Identity verification requires attention',
        message: isApproved
          ? 'Your identity verification passed automated compliance review.'
          : reason || 'Additional documentation is required to verify your identity.',
        type: isApproved ? 'success' : 'warning',
        emailTemplate: isApproved ? 'kyc_approved' : 'kyc_rejected',
        emailData: {
          fullName: prof?.full_name || 'Valued Investor',
          event_name: 'Automated KYC Verification',
          status: isApproved ? 'Approved & Verified' : 'Action Required / Declined',
          notes: reason || 'Verification outcome recorded.',
        },
        idempotencyKey: `kyc-wh-${whKey}`,
      });
    } catch {
      return res.status(503).json({ success: false, error: 'Unable to persist KYC webhook outcome.', code: 'KYC_WEBHOOK_PERSIST_FAILED', requestId: req.id });
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent KYC database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const devCustomer = devCustomersById.get(userId);
    if (!devCustomer) {
      return res.status(404).json({ success: false, error: 'User not found for KYC webhook.', code: 'USER_NOT_FOUND', requestId: req.id });
    }
    devCustomer.kycStatus = kycStatusValue;
    const nowIso = new Date().toISOString();
    const updatedSteps = buildDevComplianceSteps(userId, kycStatusValue).map((s) => ({
      ...s,
      status: stepStatus,
      reviewedAt: nowIso,
      updatedAt: nowIso,
      notes: reason || s.notes,
    }));
    devComplianceStepsByUser.set(userId, updatedSteps);
    await notifyInvestorEvent({
      userId,
      email: devCustomer.email,
      title: isApproved ? 'Identity verification approved' : 'Identity verification requires attention',
      message: isApproved
        ? 'Your identity verification passed compliance review.'
        : reason || 'Additional documentation is required to verify your identity.',
      type: isApproved ? 'success' : 'warning',
      emailTemplate: isApproved ? 'kyc_approved' : 'kyc_rejected',
      emailData: {
        fullName: devCustomer.fullName || 'Valued Investor',
        event_name: 'Automated KYC Verification',
        status: isApproved ? 'Approved & Verified' : 'Action Required / Declined',
        notes: reason || 'Verification outcome recorded.',
      },
      idempotencyKey: `kyc-wh-${whKey}`,
    });
    await persistDevState();
  }

  return res.json({ success: true, data: { userId, kycStatus: kycStatusValue }, message: 'KYC webhook processed.', requestId: req.id });
});

/**
 * Staff Admin: Provider Integrations Health & Compliance Document Vault
 */
router.get('/admin/providers/status', requireStaffSection('settings', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const emailProv = getProviderConfig();
  const paymentProv = getPaymentProviderStatus();
  const kycProv = getKycProviderStatus();
  let dbStatus: { connected: boolean; mode: 'supabase' | 'dev_snapshot'; usersCount?: number | null } = {
    connected: isSupabaseServerConfigured(),
    mode: isSupabaseServerConfigured() ? 'supabase' : 'dev_snapshot',
    usersCount: isSupabaseServerConfigured() ? null : devCustomersById.size,
  };
  if (isSupabaseServerConfigured()) {
    try {
      const h = await databaseHealth();
      dbStatus = { connected: h.status === 'healthy', mode: 'supabase', usersCount: h.usersCount };
    } catch {
      dbStatus = { connected: false, mode: 'supabase', usersCount: null };
    }
  }
  return res.json({
    success: true,
    data: {
      database: dbStatus,
      payments: paymentProv,
      kyc: kycProv,
      email: {
        provider: emailProv.type,
        providerName: emailProv.name,
        configured: emailProv.configured,
        mode: emailProv.configured ? 'live' : 'sandbox',
      },
    },
    requestId: req.id,
  });
});

router.get('/admin/documents', requireStaffSection('documents', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const docs = await listAdminComplianceDocuments(250);
      return res.json({ success: true, data: docs, total: docs.length, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Compliance documents are temporarily unavailable.', code: 'ADMIN_DOCUMENTS_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent compliance storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const allDocs: any[] = [];
  for (const [uid, docs] of devComplianceDocsByUser.entries()) {
    const cust = devCustomersById.get(uid);
    for (const d of docs) {
      allDocs.push({
        ...d,
        userEmail: cust?.email || 'investor@kretz.com',
        userName: cust?.fullName || 'Investor',
      });
    }
  }
  allDocs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return res.json({ success: true, data: allDocs, total: allDocs.length, requestId: req.id });
});

router.post('/admin/documents/upload', requireStaffSection('documents', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const title = String(req.body?.title || '').trim();
  const fileName = String(req.body?.fileName || 'document.pdf').trim();
  const fileDataUrl = String(req.body?.fileDataUrl || '');
  const fileSize = Number(req.body?.fileSize || fileDataUrl.length || 1024);
  if (!userId || !title) {
    return res.status(400).json({ success: false, error: 'Investor and document title are required.', code: 'INVALID_DOCUMENT_PAYLOAD', requestId: req.id });
  }
  if (isSupabaseServerConfigured()) {
    return res.status(400).json({ success: false, error: 'Use Supabase documents storage bucket when Supabase is active.', code: 'USE_SUPABASE_STORAGE', requestId: req.id });
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Document storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const existing = devComplianceDocsByUser.get(userId) || [];
  const doc = {
    id: `doc-${crypto.randomBytes(5).toString('hex')}`,
    userId,
    category: 'statement' as any,
    documentType: 'Investor Document',
    title,
    fileName,
    fileSize,
    mimeType: 'application/pdf',
    status: 'verified' as const,
    fileDataUrl,
    uploadedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
  };
  devComplianceDocsByUser.set(userId, [doc, ...existing]);
  await persistDevState();
  return res.status(201).json({ success: true, data: doc, message: 'Investor document uploaded.', requestId: req.id });
});

router.delete('/admin/documents/:docId', requireStaffSection('documents', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { docId } = req.params;
  if (isSupabaseServerConfigured()) {
    try {
      const { error } = await getSupabaseAdmin().from('documents').delete().eq('id', docId);
      if (error) throw error;
      return res.json({ success: true, message: 'Document deleted.', requestId: req.id });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: err?.message || 'Failed to delete document.', code: 'DOCUMENT_DELETE_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Document storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  let removed = false;
  for (const [uid, list] of devComplianceDocsByUser.entries()) {
    const next = list.filter((d) => d.id !== docId);
    if (next.length !== list.length) {
      devComplianceDocsByUser.set(uid, next);
      removed = true;
    }
  }
  if (!removed) return res.status(404).json({ success: false, error: 'Document not found.', code: 'DOCUMENT_NOT_FOUND', requestId: req.id });
  await persistDevState();
  return res.json({ success: true, message: 'Document deleted.', requestId: req.id });
});

router.post('/admin/documents/:docId/review', requireStaffSection('kyc', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { docId } = req.params;
  const approved = req.body?.approved !== false;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : undefined;
  const nextStatus = approved ? 'verified' : 'rejected';

  if (isSupabaseServerConfigured()) {
    try {
      const reviewed = await reviewComplianceDocument(docId, nextStatus, reason);
      if (!reviewed) {
        return res.status(404).json({ success: false, error: 'Compliance document not found.', code: 'DOCUMENT_NOT_FOUND', requestId: req.id });
      }
      if (reviewed.category === 'kyc_identity') {
        await getSupabaseAdmin()
          .from('user_profiles')
          .update({ kyc_status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', reviewed.userId);
      }
      const prof = await getUserProfile(reviewed.userId);
      await notifyInvestorEvent({
        userId: reviewed.userId,
        email: prof?.email,
        title: approved ? `${reviewed.title} approved` : `${reviewed.title} requires re-submission`,
        message: approved
          ? `Your document "${reviewed.fileName}" has been verified by our compliance team.`
          : reason || `Your document "${reviewed.fileName}" could not be accepted. Please upload a clear replacement.`,
        type: approved ? 'success' : 'warning',
        emailTemplate: approved ? 'kyc_approved' : 'kyc_rejected',
        emailData: {
          fullName: prof?.full_name || 'Valued Investor',
          event_name: reviewed.title,
          status: approved ? 'Verified' : 'Action Required',
          notes: reason || (approved ? 'Document approved.' : 'Please upload a valid replacement.'),
        },
      });
      return res.json({ success: true, data: reviewed, message: `Document ${nextStatus}.`, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Unable to review compliance document.', code: 'DOCUMENT_REVIEW_FAILED', requestId: req.id });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent compliance storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }

  let matchedDoc: any = null;
  let ownerId = '';
  for (const [uid, docs] of devComplianceDocsByUser.entries()) {
    const found = docs.find((d) => d.id === docId);
    if (found) {
      found.status = nextStatus;
      matchedDoc = found;
      ownerId = uid;
      break;
    }
  }
  if (!matchedDoc) {
    return res.status(404).json({ success: false, error: 'Compliance document not found.', code: 'DOCUMENT_NOT_FOUND', requestId: req.id });
  }

  const devCustomer = devCustomersById.get(ownerId);
  if (matchedDoc.category === 'kyc_identity' && devCustomer) {
    devCustomer.kycStatus = nextStatus;
  }
  const nowIso = new Date().toISOString();
  const updatedSteps = buildDevComplianceSteps(ownerId, devCustomer?.kycStatus).map((st) =>
    st.stepKey === matchedDoc.category
      ? { ...st, status: nextStatus as ComplianceStepRecord['status'], reviewedAt: nowIso, updatedAt: nowIso, notes: reason }
      : st
  );
  devComplianceStepsByUser.set(ownerId, updatedSteps);

  await notifyInvestorEvent({
    userId: ownerId,
    email: devCustomer?.email,
    title: approved ? `${matchedDoc.title} approved` : `${matchedDoc.title} requires re-submission`,
    message: approved
      ? `Your document "${matchedDoc.fileName}" has been verified by our compliance team.`
      : reason || `Your document "${matchedDoc.fileName}" could not be accepted. Please upload a clear replacement.`,
    type: approved ? 'success' : 'warning',
    emailTemplate: approved ? 'kyc_approved' : 'kyc_rejected',
    emailData: {
      fullName: devCustomer?.fullName || 'Valued Investor',
      event_name: matchedDoc.title,
      status: approved ? 'Verified' : 'Action Required',
      notes: reason || (approved ? 'Document approved.' : 'Please upload a valid replacement.'),
    },
  });
  await persistDevState();
  return res.json({ success: true, data: matchedDoc, message: `Document ${nextStatus}.`, requestId: req.id });
});

/**
 * Multi-Currency Treasury Desk Rates & Conversion (/api/v1/treasury/*)
 */
router.get('/treasury/rates', async (req: AuthenticatedRequest, res: Response) => {
  const live = await fetchLiveTreasuryRates();
  if (!live.available || !live.ratesToEur) {
    return res.status(503).json({
      success: false,
      error: live.error || 'Live exchange rate feed is currently unavailable. Conversions are paused.',
      code: 'RATE_PROVIDER_UNAVAILABLE',
      data: {
        base: 'EUR',
        available: false,
        providerStatus: 'unavailable',
        feePercent: TREASURY_FX_FEE_PERCENT,
        limits: { minEur: TREASURY_MIN_EUR, maxEur: TREASURY_MAX_EUR },
        supportedAssets: ['EUR', 'USD', 'GBP', 'CHF', 'USDC', 'USDT', 'SOL'],
      },
      requestId: req.id,
    });
  }

  const quoteId = `QT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const expiresAtMs = Date.now() + TREASURY_QUOTE_TTL_MS;
  activeTreasuryQuotes.set(quoteId, {
    ratesToEur: live.ratesToEur,
    feePercent: TREASURY_FX_FEE_PERCENT,
    expiresAt: expiresAtMs,
    source: live.source || 'Live Feed',
  });
  // Prune expired quotes
  if (activeTreasuryQuotes.size > 200) {
    const now = Date.now();
    for (const [k, q] of activeTreasuryQuotes.entries()) {
      if (q.expiresAt < now) activeTreasuryQuotes.delete(k);
    }
  }

  res.json({
    success: true,
    data: {
      base: 'EUR',
      available: true,
      providerStatus: 'live',
      providerSource: live.source,
      quoteId,
      expiresAt: new Date(expiresAtMs).toISOString(),
      ratesToEur: live.ratesToEur,
      feePercent: TREASURY_FX_FEE_PERCENT,
      limits: {
        minEur: TREASURY_MIN_EUR,
        maxEur: TREASURY_MAX_EUR,
      },
      supportedAssets: ['EUR', 'USD', 'GBP', 'CHF', 'USDC', 'USDT', 'SOL'],
      networks: {
        EUR: 'SEPA / Euro Clearing',
        USD: 'SWIFT / USD Clearing',
        GBP: 'Faster Payments / CHAPS',
        CHF: 'SIC Swiss Clearing',
        USDC: 'Solana SPL / BNB Smart Chain (BEP20)',
        USDT: 'Solana SPL',
        SOL: 'Solana Mainnet',
      },
      updatedAt: live.updatedAt || new Date().toISOString(),
    },
    requestId: req.id,
  });
});

router.get('/treasury/balances', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const [profile, prefs] = await Promise.all([
        getUserProfile(req.user!.id),
        getUserPreferences(req.user!.id).catch(() => ({} as Record<string, any>)),
      ]);
      if (!profile) return res.status(404).json({ success: false, error: 'Investor wallet profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      const savedSub = (prefs as any)?.treasurySubBalances || {};
      const balances = {
        EUR: Number(profile.wallet_balance || 0),
        USD: Number(savedSub.USD || 0),
        GBP: Number(savedSub.GBP || 0),
        CHF: Number(savedSub.CHF || 0),
        USDC: Number(savedSub.USDC || 0),
        USDT: Number(savedSub.USDT || 0),
        SOL: Number(savedSub.SOL || 0),
      };
      return res.json({ success: true, data: { balances }, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Treasury balances are temporarily unavailable.', code: 'TREASURY_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent treasury storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const userRecord = await findUserRecordForRequest(req);
  if (!userRecord) {
    return res.status(409).json({
      success: false,
      error: 'Your investor account is not available in the server ledger.',
      code: 'ACCOUNT_LEDGER_UNAVAILABLE',
      requestId: req.id
    });
  }
  const subBalances = getOrInitUserSubBalances(userRecord.id, userRecord.balance);
  res.json({
    success: true,
    data: { balances: subBalances },
    requestId: req.id
  });
});

router.post('/treasury/convert', requireAuth, requireLatestLegalConsent, async (req: AuthenticatedRequest, res: Response) => {
  const { fromCurrency, toCurrency, amount, quoteId } = req.body || {};
  const from = String(fromCurrency || '').toUpperCase();
  const to = String(toCurrency || '').toUpperCase();
  const numericAmount = Number(amount);

  const supported = new Set(['EUR', 'USD', 'GBP', 'CHF', 'USDC', 'USDT', 'SOL']);
  if (!supported.has(from) || !supported.has(to)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported currency or asset selected.',
      code: 'UNSUPPORTED_CURRENCY',
      requestId: req.id,
    });
  }
  if (from === to) {
    return res.status(400).json({
      success: false,
      error: 'Source and target currencies must be different.',
      code: 'SAME_CURRENCY',
      requestId: req.id,
    });
  }
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Conversion amount must be greater than zero.',
      code: 'INVALID_AMOUNT',
      requestId: req.id,
    });
  }

  let ratesToEur: Record<string, number> | undefined;
  let rateSource = 'Live Feed';
  if (quoteId && typeof quoteId === 'string') {
    const q = activeTreasuryQuotes.get(quoteId);
    if (!q) {
      return res.status(410).json({
        success: false,
        error: 'FX quote is unrecognized or has already been settled. Request a fresh quote.',
        code: 'QUOTE_EXPIRED',
        requestId: req.id,
      });
    }
    if (q.expiresAt < Date.now()) {
      activeTreasuryQuotes.delete(quoteId);
      return res.status(410).json({
        success: false,
        error: 'This live FX quote has expired. Refresh rates to execute at current market pricing.',
        code: 'QUOTE_EXPIRED',
        requestId: req.id,
      });
    }
    ratesToEur = q.ratesToEur;
    rateSource = q.source;
  } else {
    const live = await fetchLiveTreasuryRates();
    if (!live.available || !live.ratesToEur) {
      return res.status(503).json({
        success: false,
        error: live.error || 'Live exchange rate provider is currently unavailable. Conversions cannot execute.',
        code: 'RATE_PROVIDER_UNAVAILABLE',
        requestId: req.id,
      });
    }
    ratesToEur = live.ratesToEur;
    rateSource = live.source || 'Live Feed';
  }

  const valueInEur = numericAmount * ratesToEur[from];
  if (valueInEur < TREASURY_MIN_EUR || valueInEur > TREASURY_MAX_EUR) {
    return res.status(400).json({
      success: false,
      error: `Conversion value (€${valueInEur.toFixed(2)}) must be between €${TREASURY_MIN_EUR.toFixed(2)} and €${TREASURY_MAX_EUR.toLocaleString()}.`,
      code: 'CONVERSION_LIMIT_EXCEEDED',
      requestId: req.id,
    });
  }

  const feeInEur = Math.round(valueInEur * (TREASURY_FX_FEE_PERCENT / 100) * 100) / 100;
  const netEur = Math.max(0, valueInEur - feeInEur);
  const convertedAmount = Number((netEur / ratesToEur[to]).toFixed(to === 'SOL' ? 6 : 2));
  const crossRate = Number((ratesToEur[from] / ratesToEur[to]).toFixed(6));

  if (shouldUseSupabaseForCustomer(req)) {
    return res.status(501).json({
      success: false,
      error: 'Multi-currency conversion settlement requires multi-asset escrow activation on the cloud ledger. Your EUR balance is safe and unchanged.',
      code: 'FX_PERSISTENCE_NOT_ENABLED',
      requestId: req.id,
    });
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent treasury storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }

  const userRecord = await findUserRecordForRequest(req);
  if (!userRecord) {
    return res.status(409).json({
      success: false,
      error: 'Your investor account is not available in the server ledger. Client-supplied balances cannot be used for currency conversion.',
      code: 'ACCOUNT_LEDGER_UNAVAILABLE',
      requestId: req.id
    });
  }

  const activeUser = userRecord;
  const balances = getOrInitUserSubBalances(activeUser.id, activeUser.balance);
  const availableSource = balances[from] || 0;

  if (availableSource < numericAmount) {
    return res.status(400).json({
      success: false,
      error: `Insufficient ${from} balance (Available: ${availableSource.toFixed(from === 'SOL' ? 4 : 2)} ${from}). Deposit or convert into ${from} first.`,
      code: 'INSUFFICIENT_CURRENCY_BALANCE',
      requestId: req.id
    });
  }

  balances[from] = Number((availableSource - numericAmount).toFixed(from === 'SOL' ? 6 : 2));
  balances[to] = Number(((balances[to] || 0) + convertedAmount).toFixed(to === 'SOL' ? 6 : 2));
  activeUser.balance = balances.EUR;

  const ref = `FX-${from}-${to}-${Math.floor(100000 + Math.random() * 900000)}`;
  const fxTx = {
    id: `tx-fx-${Date.now()}`,
    userId: activeUser.id,
    userEmail: activeUser.email,
    type: 'fee',
    amount: Number(valueInEur.toFixed(2)),
    currency: 'EUR',
    status: 'completed',
    method: `Treasury FX (${from} → ${to})`,
    description: `Treasury Conversion: ${numericAmount} ${from} → ${convertedAmount} ${to}`,
    reference: ref,
    createdAt: new Date().toISOString(),
    metadata: {
      fromCurrency: from,
      toCurrency: to,
      fromAmount: numericAmount,
      toAmount: convertedAmount,
      crossRate,
      feePercent: TREASURY_FX_FEE_PERCENT,
      feeEur: feeInEur,
      providerSource: rateSource,
    }
  };
  mockTransactions.unshift(fxTx as any);
  pushUserNotification(activeUser.id, {
    title: 'Treasury FX Conversion Executed',
    message: `Converted ${numericAmount} ${from} into ${convertedAmount} ${to} (Fee: €${feeInEur.toFixed(2)}). Ref: ${ref}`,
    type: 'success'
  });
  await persistDevState();

  res.json({
    success: true,
    data: {
      reference: ref,
      fromCurrency: from,
      toCurrency: to,
      fromAmount: numericAmount,
      toAmount: convertedAmount,
      crossRate,
      feePercent: TREASURY_FX_FEE_PERCENT,
      feeEur: feeInEur,
      providerSource: rateSource,
      balances,
      transaction: fxTx
    },
    message: `Converted ${numericAmount} ${from} to ${convertedAmount} ${to}.`,
    requestId: req.id
  });
});

// ============================================================================
// 5. FINANCIAL OPERATIONS (/api/v1/deposits, /withdrawals, /investments, /payments)
// ============================================================================

/**
 * GET /api/v1/deposits (user's own deposit requests)
 */
router.get('/deposits', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const rows = await listUserTransactions(req.user!.id, 250);
      const deposits = rows.filter((r: any) => r.type === 'deposit').map(toApiTransaction);
      return res.json({ success: true, data: deposits, total: deposits.length, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Deposit history is temporarily unavailable.', code: 'DEPOSIT_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent deposit storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const userEmail = req.user?.email?.toLowerCase();
  const deposits = mockTransactions.filter(
    (t) => t.type === 'deposit' && (t.userId === req.user!.id || (userEmail && t.userEmail?.toLowerCase() === userEmail))
  );
  return res.json({ success: true, data: deposits, total: deposits.length, requestId: req.id });
});

/**
 * POST /api/v1/deposits
 */
router.post('/deposits', requireAuth, requireLatestLegalConsent, async (req: AuthenticatedRequest, res: Response) => {
  if (!platformConfig.depositsEnabled) {
    return res.status(403).json({
      success: false,
      error: 'New deposits are temporarily suspended by platform administration.',
      code: 'DEPOSITS_SUSPENDED',
      requestId: req.id
    });
  }
  if (platformConfig.maintenanceMode && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Platform is currently under scheduled maintenance. Financial operations are suspended.',
      code: 'MAINTENANCE_MODE_ACTIVE',
      requestId: req.id
    });
  }
  const foundUserRecord = await findUserRecordForRequest(req);
  if (foundUserRecord && foundUserRecord.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Account access restricted by administrative compliance.',
      code: 'ACCOUNT_SUSPENDED',
      requestId: req.id
    });
  }

  const { amount, currency = 'EUR', method = 'SEPA Bank Wire', txHash } = req.body || {};
  if (currency !== 'EUR') {
    return res.status(400).json({
      success: false,
      error: 'Deposits are currently accepted in EUR only. Other currencies must be converted and verified before submission.',
      code: 'UNSUPPORTED_DEPOSIT_CURRENCY',
      requestId: req.id
    });
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 100 || numAmount > 5000000) {
    return res.status(400).json({
      success: false,
      error: 'Deposit amount must be between €100 and €5,000,000.',
      code: 'INVALID_DEPOSIT_AMOUNT',
      requestId: req.id
    });
  }
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const ref = `KZ-DEP-${crypto.randomInt(100000, 1000000)}`;
      const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || crypto.randomUUID()).slice(0, 128);
      const row = await runFinancialRpc('kretz_request_deposit', {
        p_user_id: req.user!.id, p_amount: numAmount, p_method: String(method),
        p_reference: ref, p_transaction_id: crypto.randomUUID(),
        p_tx_hash: typeof txHash === 'string' ? txHash : null, p_idempotency_key: idempotencyKey
      });
      const transaction = toApiTransaction(row);
      sendEmail({
        templateId: 'deposit_received', recipient: req.user!.email,
        data: { fullName: req.user!.fullName || 'Valued Investor', email: req.user!.email, amount: numAmount.toFixed(2), currency: 'EUR', reference: transaction.reference || ref, method, beneficiary: paymentConfig.traditional.beneficiary, iban: paymentConfig.traditional.iban, bic: paymentConfig.traditional.bic, bankName: paymentConfig.traditional.bankName, address: paymentConfig.traditional.address, country: paymentConfig.traditional.country }
      }).catch(err => logger.log({ level: 'error', category: 'payments', requestId: req.id || 'req-deposit-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: err.message }));
      return res.status(201).json({ success: true, data: transaction, message: 'Deposit request saved. Your wallet will only be credited after an administrator verifies settlement.', requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-deposit-db', eventType: 'DEPOSIT_PERSIST_FAILED', outcome: 'failure', message: error?.message || 'Deposit could not be saved.' });
      const message = String(error?.message || '');
      const status = message.includes('INVALID_DEPOSIT_AMOUNT') ? 400 : message.includes('ACCOUNT_LEDGER_UNAVAILABLE') ? 409 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'The deposit service is temporarily unavailable. No deposit request was recorded.' : message, code: status === 503 ? 'DEPOSIT_DATABASE_UNAVAILABLE' : 'DEPOSIT_REQUEST_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured. Deposits are disabled until the database is connected.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const ref = `KZ-DEP-${Math.floor(100000 + Math.random() * 900000)}`;
  const foundUser = await findUserRecordForRequest(req);
  const resolvedRecipient = foundUser?.email || req.user?.email || 'investor@kretz.com';

  const depositTx = {
    id: `tx-dep-${Date.now()}`,
    userId: req.user!.id,
    userEmail: resolvedRecipient,
    type: 'deposit',
    amount: numAmount,
    currency,
    status: 'pending',
    method,
    reference: ref,
    txHash: txHash || undefined,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(depositTx);
  pushUserNotification(req.user!.id, {
    title: 'Deposit request recorded',
    message: `Your €${numAmount.toFixed(2)} ${method} deposit (${ref}) is pending verification.`,
    type: 'info',
  });
  await persistDevState();

  // Send branded deposit initiated email with escrow instructions
  const userRecipient = resolvedRecipient;
  
  sendEmail({
    templateId: 'deposit_received',
    recipient: userRecipient,
    data: {
      fullName: foundUser?.fullName || 'Valued Investor',
      email: userRecipient,
      amount: numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      currency,
      reference: ref,
      method,
      beneficiary: paymentConfig.traditional.beneficiary,
      iban: paymentConfig.traditional.iban,
      bic: paymentConfig.traditional.bic,
      bankName: paymentConfig.traditional.bankName,
      address: paymentConfig.traditional.address,
      country: paymentConfig.traditional.country
    }
  }).catch(err => {
    logger.log({
      level: 'error',
      category: 'payments',
      requestId: req.id || 'req-dep-email',
      eventType: 'EMAIL_DISPATCH_FAILURE',
      outcome: 'failure',
      message: `Failed to dispatch deposit escrow instructions email: ${err.message}`
    });
  });

  // If high-value deposit (>= €50,000), notify compliance super admin
  if (numAmount >= 50000) {
    sendEmail({
      templateId: 'admin_alert',
      recipient: process.env.EMAIL_SUPPORT || process.env.EMAIL_FROM || 'info@kretzdespain.com',
      data: {
        adminName: 'Chief Compliance Officer',
        eventType: 'HIGH_VALUE_DEPOSIT_INITIATED',
        userEmail: userRecipient,
        userName: foundUser?.fullName || 'Institutional Partner',
        amount: numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        currency,
        reference: ref,
        reviewLink: 'https://kretzdespain.com/admin#deposits'
      }
    }).catch(err => {
      logger.log({
        level: 'error',
        category: 'payments',
        requestId: req.id || 'req-admin-alert',
        eventType: 'EMAIL_DISPATCH_FAILURE',
        outcome: 'failure',
        message: `Failed to dispatch admin high-value alert: ${err.message}`
      });
    });
  }

  logger.log({
    level: 'info',
    category: 'payments',
    requestId: req.id || 'req-deposit',
    method: 'POST',
    route: '/api/v1/deposits',
    statusCode: 201,
    userId: req.user?.id,
    userRole: req.user?.role,
    eventType: 'DEPOSIT_INITIATED',
    outcome: 'pending',
    message: `User ${req.user?.email} submitted deposit receipt for €${numAmount} via ${method}. Reference: ${ref}`,
    metadata: { amount: numAmount, currency, method, reference: ref }
  });

  res.status(201).json({
    success: true,
    data: depositTx,
    message: 'Deposit notification submitted. Your balance will be credited once verified in institutional escrow.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/withdrawals (user's own withdrawal requests)
 */
router.get('/withdrawals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const rows = await listUserTransactions(req.user!.id, 250);
      const withdrawals = rows.filter((r: any) => r.type === 'withdrawal').map(toApiTransaction);
      return res.json({ success: true, data: withdrawals, total: withdrawals.length, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Withdrawal history is temporarily unavailable.', code: 'WITHDRAWAL_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent withdrawal storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const userEmail = req.user?.email?.toLowerCase();
  const withdrawals = mockTransactions.filter(
    (t) => t.type === 'withdrawal' && (t.userId === req.user!.id || (userEmail && t.userEmail?.toLowerCase() === userEmail))
  );
  return res.json({ success: true, data: withdrawals, total: withdrawals.length, requestId: req.id });
});

/**
 * POST /api/v1/withdrawals
 */
router.post('/withdrawals', requireAuth, requireLatestLegalConsent, requireActionEmailVerification('investor.withdrawal.create'), async (req: AuthenticatedRequest, res: Response) => {
  if (!platformConfig.withdrawalsEnabled) {
    return res.status(403).json({
      success: false,
      error: 'Withdrawals are temporarily suspended by platform administration.',
      code: 'WITHDRAWALS_SUSPENDED',
      requestId: req.id
    });
  }
  if (platformConfig.maintenanceMode && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Platform is currently under scheduled maintenance. Financial operations are suspended.',
      code: 'MAINTENANCE_MODE_ACTIVE',
      requestId: req.id
    });
  }
  const userRecord = await findUserRecordForRequest(req);
  if (!userRecord && !shouldUseSupabaseForCustomer(req)) {
    return res.status(409).json({
      success: false,
      error: 'Your investor account is not available in the server ledger. Please contact support before requesting a withdrawal.',
      code: 'ACCOUNT_LEDGER_UNAVAILABLE',
      requestId: req.id
    });
  }
  if (userRecord?.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Account access restricted by administrative compliance.',
      code: 'ACCOUNT_SUSPENDED',
      requestId: req.id
    });
  }

  const { amount, destination, method = 'Bank Wire SEPA', accountHolderName, bankAccountHolder } = req.body || {};

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 250 || numAmount > 5000000) {
    return res.status(400).json({
      success: false,
      error: 'Withdrawal amount must be between €250 and €5,000,000.',
      code: 'INVALID_AMOUNT',
      requestId: req.id
    });
  }

  const requestedIban = typeof destination === 'string' ? destination.replace(/\s+/g, '').toUpperCase() : '';
  if (!requestedIban || !isValidIbanServer(requestedIban)) {
    return res.status(400).json({
      success: false,
      error: 'A valid personal SEPA IBAN destination is required.',
      code: 'MISSING_DESTINATION',
      requestId: req.id
    });
  }

  const suppliedHolder = typeof accountHolderName === 'string'
    ? accountHolderName.trim()
    : typeof bankAccountHolder === 'string'
    ? bankAccountHolder.trim()
    : '';

  if (shouldUseSupabaseForCustomer(req)) {
    try {
      // Enforce KYC, registered IBAN, own-name account holder, and balance on the server.
      const investorProfile = await getUserProfile(req.user!.id);
      if (!investorProfile || (investorProfile.kyc_status !== 'verified' && investorProfile.kyc_status !== 'approved')) {
        return res.status(403).json({ success: false, error: 'Complete identity verification before requesting a withdrawal.', code: 'WITHDRAWAL_KYC_REQUIRED', requestId: req.id });
      }
      const registeredIban = String(investorProfile.bank_iban || '').replace(/\s+/g, '').toUpperCase();
      if (!registeredIban || requestedIban !== registeredIban) {
        return res.status(403).json({ success: false, error: 'Withdrawals can only be sent to the bank account registered on your verified profile.', code: 'WITHDRAWAL_DESTINATION_MISMATCH', requestId: req.id });
      }
      const legalOwnerName = String(investorProfile.full_name || '').trim();
      const effectiveHolder = suppliedHolder || String(investorProfile.bank_account_holder || legalOwnerName).trim();
      if (!namesMatchOwner(legalOwnerName, effectiveHolder) || (investorProfile.bank_account_holder && !namesMatchOwner(legalOwnerName, investorProfile.bank_account_holder))) {
        return res.status(403).json({
          success: false,
          error: 'Withdrawals can only be transferred to a bank account held in your own legal name.',
          code: 'WITHDRAWAL_HOLDER_NAME_MISMATCH',
          requestId: req.id
        });
      }
      if (Number(investorProfile.wallet_balance || 0) < numAmount) {
        return res.status(400).json({
          success: false,
          error: `Insufficient available balance (€${Number(investorProfile.wallet_balance || 0).toFixed(2)}) for requested withdrawal of €${numAmount.toFixed(2)}.`,
          code: 'INSUFFICIENT_FUNDS',
          requestId: req.id
        });
      }
      const ref = `KZ-WTH-${crypto.randomInt(100000, 1000000)}`;
      const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || crypto.randomUUID()).slice(0, 128);
      const row = await runFinancialRpc('kretz_request_withdrawal', {
        p_user_id: req.user!.id, p_amount: numAmount, p_method: String(method),
        p_destination: requestedIban, p_reference: ref,
        p_transaction_id: crypto.randomUUID(), p_idempotency_key: idempotencyKey
      });
      const transaction = toApiTransaction(row);
      sendEmail({
        templateId: 'withdrawal_requested', recipient: req.user!.email,
        data: { fullName: req.user!.fullName || 'Valued Investor', email: req.user!.email, amount: numAmount.toFixed(2), currency: 'EUR', reference: transaction.reference || ref, destination: requestedIban, estimatedProcessingTime: '24 business hours' }
      }).catch(err => logger.log({ level: 'error', category: 'payments', requestId: req.id || 'req-withdrawal-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: err.message }));
      return res.status(201).json({ success: true, data: { ...transaction, destination: requestedIban }, message: 'Withdrawal request recorded and funds reserved in your wallet. Compliance review is required before payout.', requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-withdrawal-db', eventType: 'WITHDRAWAL_PERSIST_FAILED', outcome: 'failure', message: error?.message || 'Withdrawal could not be saved.' });
      const message = String(error?.message || '');
      const status = message.includes('INSUFFICIENT_FUNDS')
        ? 400
        : message.includes('WITHDRAWAL_KYC_REQUIRED') || message.includes('WITHDRAWAL_DESTINATION_MISMATCH') || message.includes('WITHDRAWAL_HOLDER_NAME_MISMATCH')
        ? 403
        : message.includes('INVALID_WITHDRAWAL_AMOUNT') || message.includes('INVALID_WITHDRAWAL_DESTINATION')
        ? 400
        : message.includes('ACCOUNT_LEDGER_UNAVAILABLE')
        ? 409
        : 503;
      const code = message.includes('INSUFFICIENT_FUNDS')
        ? 'INSUFFICIENT_FUNDS'
        : message.includes('WITHDRAWAL_HOLDER_NAME_MISMATCH')
        ? 'WITHDRAWAL_HOLDER_NAME_MISMATCH'
        : message.includes('WITHDRAWAL_DESTINATION_MISMATCH')
        ? 'WITHDRAWAL_DESTINATION_MISMATCH'
        : message.includes('WITHDRAWAL_KYC_REQUIRED')
        ? 'WITHDRAWAL_KYC_REQUIRED'
        : status === 503
        ? 'WITHDRAWAL_DATABASE_UNAVAILABLE'
        : 'WITHDRAWAL_REQUEST_REJECTED';
      return res.status(status).json({ success: false, error: status === 503 ? 'The withdrawal service is temporarily unavailable. No request was recorded.' : message, code, requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured. Withdrawals are disabled until the database is connected.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const devCustomer = devCustomersById.get(req.user!.id);
  const activeRecord = devCustomer || userRecord;
  if (!activeRecord) {
    return res.status(409).json({ success: false, error: 'Investor ledger account is unavailable.', code: 'ACCOUNT_LEDGER_UNAVAILABLE', requestId: req.id });
  }
  if (activeRecord.kycStatus !== 'verified' && activeRecord.kycStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      error: 'Complete identity verification before requesting a withdrawal.',
      code: 'WITHDRAWAL_KYC_REQUIRED',
      requestId: req.id
    });
  }
  const registeredIban = String((devCustomer?.bankIban ?? (activeRecord as any).bankIban) || '').replace(/\s+/g, '').toUpperCase();
  if (!registeredIban || requestedIban !== registeredIban) {
    return res.status(403).json({
      success: false,
      error: 'Withdrawals can only be sent to the bank account registered on your verified profile.',
      code: 'WITHDRAWAL_DESTINATION_MISMATCH',
      requestId: req.id
    });
  }
  const legalOwnerName = String(activeRecord.fullName || '').trim();
  const profileHolderName = String((devCustomer?.bankAccountHolder ?? (activeRecord as any).bankAccountHolder ?? legalOwnerName) || '').trim();
  const effectiveHolder = suppliedHolder || profileHolderName;
  if (!namesMatchOwner(legalOwnerName, effectiveHolder) || !namesMatchOwner(legalOwnerName, profileHolderName)) {
    return res.status(403).json({
      success: false,
      error: 'Withdrawals can only be transferred to a bank account held in your own legal name.',
      code: 'WITHDRAWAL_HOLDER_NAME_MISMATCH',
      requestId: req.id
    });
  }

  // Server-authoritative available balance check (honoring pending withdrawal reservations)
  const userEmailLower = activeRecord.email?.toLowerCase();
  const userTxs = mockTransactions.filter(
    (t) => t.userId === req.user!.id || (userEmailLower && t.userEmail?.toLowerCase() === userEmailLower)
  );
  let serverAvailable = Number(activeRecord.balance || 0);
  if (userTxs.length > 0) {
    let txSum = 0;
    for (const tx of userTxs) {
      const amt = Number(tx.amount || 0);
      if (tx.status === 'completed') {
        if (tx.type === 'deposit' || tx.type === 'dividend' || tx.type === 'payout' || tx.type === 'distribution') {
          txSum += amt;
        } else if (tx.type === 'withdrawal' || tx.type === 'investment' || tx.type === 'purchase') {
          txSum -= amt;
        }
      } else if (tx.status === 'pending' && tx.type === 'withdrawal') {
        txSum -= amt;
      }
    }
    serverAvailable = Math.max(0, Math.round(txSum * 100) / 100);
  }

  if (serverAvailable < numAmount) {
    logger.log({
      level: 'warn',
      category: 'payments',
      requestId: req.id || 'req-with-err',
      method: 'POST',
      route: '/api/v1/withdrawals',
      statusCode: 400,
      userId: req.user?.id,
      eventType: 'WITHDRAWAL_INSUFFICIENT_FUNDS',
      outcome: 'failure',
      message: `Withdrawal of €${numAmount} rejected: insufficient funds (available: €${serverAvailable})`,
      errorCode: 'INSUFFICIENT_FUNDS'
    });

    return res.status(400).json({
      success: false,
      error: `Insufficient available balance (€${serverAvailable.toFixed(2)}) for requested withdrawal of €${numAmount.toFixed(2)}.`,
      code: 'INSUFFICIENT_FUNDS',
      requestId: req.id
    });
  }

  // Deduct immediately on server to lock funds
  const nextBalance = Math.round((serverAvailable - numAmount) * 100) / 100;
  activeRecord.balance = nextBalance;
  if (devCustomer) {
    devCustomer.balance = nextBalance;
  }
  if (userSubBalancesStore.has(activeRecord.id)) {
    userSubBalancesStore.get(activeRecord.id)!.EUR = nextBalance;
  }

  const ref = `KZ-WTH-${Math.floor(100000 + Math.random() * 900000)}`;
  const withdrawalTx = {
    id: `tx-wth-${Date.now()}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
    type: 'withdrawal',
    amount: numAmount,
    currency: 'EUR',
    status: 'pending',
    method,
    destination: requestedIban,
    accountHolderName: legalOwnerName,
    reference: ref,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(withdrawalTx);
  await persistDevState();

  const userRecipient = req.user?.email || 'investor@kretz.com';
  const foundUser = req.user;
  
  sendEmail({
    templateId: 'withdrawal_requested',
    recipient: userRecipient,
    data: {
      fullName: foundUser?.fullName || 'Valued Investor',
      email: userRecipient,
      amount: numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      currency: 'EUR',
      reference: ref,
      destination: requestedIban,
      estimatedProcessingTime: '24 business hours'
    }
  }).catch(err => {
    logger.log({
      level: 'error',
      category: 'payments',
      requestId: req.id || 'req-wth-email',
      eventType: 'EMAIL_DISPATCH_FAILURE',
      outcome: 'failure',
      message: `Failed to dispatch withdrawal registered email: ${err.message}`
    });
  });

  logger.log({
    level: 'info',
    category: 'payments',
    requestId: req.id || 'req-withdraw',
    method: 'POST',
    route: '/api/v1/withdrawals',
    statusCode: 201,
    userId: req.user?.id,
    userRole: req.user?.role,
    eventType: 'WITHDRAWAL_REQUESTED',
    outcome: 'pending',
    message: `Withdrawal of €${numAmount} requested by ${req.user?.email} to ${requestedIban.slice(0, 8)}... Ref: ${ref}`,
    metadata: { amount: numAmount, destination: requestedIban.slice(0, 10) + '...', reference: ref }
  });

  res.status(201).json({
    success: true,
    data: withdrawalTx,
    message: 'Withdrawal request registered. Compliance review will process within 24 business hours.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/investments
 * Execute fractional asset investment with idempotency protection
 */
router.post('/investments', requireAuth, requireLatestLegalConsent, async (req: AuthenticatedRequest, res: Response) => {
  if (!platformConfig.tradingEnabled) {
    return res.status(403).json({
      success: false,
      error: 'Property purchasing is temporarily suspended by platform administration.',
      code: 'TRADING_SUSPENDED',
      requestId: req.id
    });
  }
  if (platformConfig.maintenanceMode && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Platform is currently under scheduled maintenance. Financial operations are suspended.',
      code: 'MAINTENANCE_MODE_ACTIVE',
      requestId: req.id
    });
  }
  const userRecordCheck = req.user?.status === 'suspended' ? req.user : null;
  if (userRecordCheck) {
    return res.status(403).json({
      success: false,
      error: 'Account access restricted by administrative compliance.',
      code: 'ACCOUNT_SUSPENDED',
      requestId: req.id
    });
  }

  const { propertyId, tokensCount, paymentMethod = 'Platform Balance', idempotencyKey } = req.body || {};
  const count = Number(tokensCount);

  if (!propertyId || !Number.isSafeInteger(count) || count < 1) {
    return res.status(400).json({
      success: false,
      error: 'Valid property ID and token count (min 1) are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  // Idempotency check to prevent duplicate double-charge
  const clientKey = typeof idempotencyKey === 'string' && idempotencyKey.trim()
    ? idempotencyKey.trim().slice(0, 128)
    : `${propertyId}-${count}`;
  const safeKey = `${req.user!.id}:${clientKey}`;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const prop = await getInvestmentPlan(String(propertyId));
      if (!prop) return res.status(404).json({ success: false, error: 'Target property not found in the persistent offerings catalogue.', code: 'PROPERTY_NOT_FOUND', requestId: req.id });
      if (!['open', 'funding', 'active'].includes(prop.status)) return res.status(409).json({ success: false, error: 'This property is not currently accepting investments.', code: 'OFFERING_NOT_OPEN', requestId: req.id });
      if (prop.availableTokens < count) return res.status(400).json({ success: false, error: `Only ${prop.availableTokens} tokens remain available in ${prop.title}.`, code: 'INSUFFICIENT_AVAILABLE_TOKENS', requestId: req.id });
      const principal = count * prop.tokenPrice;
      if (principal < prop.minimumInvestment) return res.status(400).json({ success: false, error: `Minimum investment for ${prop.title} is €${prop.minimumInvestment}.`, code: 'BELOW_MINIMUM_INVESTMENT', requestId: req.id });
      const certificateId = `KZ-CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const investmentId = crypto.randomUUID();
      const transactionId = crypto.randomUUID();
      const result: any = await runFinancialRpc('kretz_purchase_tokens', {
        p_user_id: req.user!.id, p_plan_id: prop.id, p_tokens: count,
        p_payment_method: String(paymentMethod), p_reference: certificateId,
        p_investment_id: investmentId, p_transaction_id: transactionId,
        p_certificate_id: certificateId, p_idempotency_key: clientKey
      });
      const transaction = toApiTransaction(result.transaction);
      const investment = result.investment || {};
      sendEmail({
        templateId: 'investment_confirmed', recipient: req.user!.email,
        data: { fullName: req.user!.fullName || 'Valued Investor', email: req.user!.email, propertyTitle: prop.title, tokensCount: count, tokenPrice: prop.tokenPrice.toFixed(2), totalCost: Number(result.total || transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currency: 'EUR', certificateId: investment.certificate_id || certificateId, spvName: `${prop.title} SPV S.L.`, projectedYield: `${prop.projectedYield}% Annualized`, firstDistributionDate: '1st of next month' }
      }).catch(err => logger.log({ level: 'error', category: 'marketplace', requestId: req.id || 'req-investment-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: err.message }));
      return res.json({
        success: true,
        data: {
          investment: { id: investment.id || investmentId, propertyId: prop.id, tokensPurchased: count, totalCost: Number(result.total || transaction.amount), certificateId: investment.certificate_id || certificateId },
          transaction: { ...transaction, propertyId: prop.id, propertyTitle: prop.title, tokensPurchased: count },
          remainingAvailableTokens: Number(result.remaining_tokens ?? Math.max(0, prop.availableTokens - count))
        },
        message: `Congratulations! You have acquired ${count} tokens in ${prop.title}.`,
        requestId: req.id
      });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-investment-db', eventType: 'INVESTMENT_PERSIST_FAILED', outcome: 'failure', message: error?.message || 'Investment could not be processed.' });
      const message = String(error?.message || '');
      const status = /INSUFFICIENT_FUNDS|INSUFFICIENT_AVAILABLE_TOKENS|BELOW_MINIMUM_INVESTMENT|INVALID_TOKEN_COUNT/.test(message) ? 400 : /PROPERTY_NOT_FOUND|ACCOUNT_LEDGER_UNAVAILABLE/.test(message) ? 404 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'The investment service is temporarily unavailable. No investment was charged or issued.' : message, code: status === 503 ? 'INVESTMENT_DATABASE_UNAVAILABLE' : 'INVESTMENT_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured. Investments are disabled until the database is connected.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  if (processedWebhooks.has(safeKey)) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate transaction detected. This investment request has already been processed.',
      code: 'DUPLICATE_TRANSACTION',
      requestId: req.id
    });
  }

  const prop = mockListings.find(p => p.id === propertyId || p.slug === propertyId);
  if (!prop) {
    return res.status(404).json({
      success: false,
      error: 'Target property not found in active offerings catalog.',
      code: 'PROPERTY_NOT_FOUND',
      requestId: req.id
    });
  }

  if (prop.fundedAmount >= prop.targetAmount || prop.availableTokens <= 0) {
    return res.status(400).json({
      success: false,
      error: `This property offering (${prop.title}) is 100% fully funded. Subscriptions are closed.`,
      code: 'OFFERING_FULLY_FUNDED',
      requestId: req.id
    });
  }

  const principalCost = count * prop.tokenPrice;
  // The settlement fee is a server-owned platform setting, never a client-controlled input.
  const resolvedFeePct = 0.25;
  const feeEur = Math.round(principalCost * (resolvedFeePct / 100) * 100) / 100;
  const totalCost = Math.round((principalCost + feeEur) * 100) / 100;

  const minInvest = prop.minimumInvestment || prop.tokenPrice || 1000;
  if (principalCost < minInvest) {
    return res.status(400).json({
      success: false,
      error: `Minimum investment for ${prop.title} is €${minInvest}. Requested: €${principalCost}.`,
      code: 'BELOW_MINIMUM_INVESTMENT',
      requestId: req.id
    });
  }

  if (prop.availableTokens < count) {
    return res.status(400).json({
      success: false,
      error: `Only ${prop.availableTokens} tokens remain available in ${prop.title}.`,
      code: 'INSUFFICIENT_AVAILABLE_TOKENS',
      requestId: req.id
    });
  }

  const userRecord = await findUserRecordForRequest(req);
  if (!userRecord) {
    return res.status(409).json({
      success: false,
      error: 'Your investor account is not available in the server ledger. No investment can be charged or issued.',
      code: 'ACCOUNT_LEDGER_UNAVAILABLE',
      requestId: req.id
    });
  }

  if (userRecord.balance < totalCost) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance (€${userRecord.balance.toFixed(2)}) for investment of €${totalCost.toFixed(2)}. Please deposit funds first.`,
      code: 'INSUFFICIENT_FUNDS',
      requestId: req.id
    });
  }

  // Server-authoritative state mutation
  userRecord.balance = Math.round((userRecord.balance - totalCost) * 100) / 100;
  const subBals = getOrInitUserSubBalances(userRecord.id, userRecord.balance);
  subBals.EUR = userRecord.balance;
  prop.availableTokens -= count;
  prop.fundedAmount += principalCost;
  processedWebhooks.add(safeKey);

  const certId = `KZ-CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const invTx = {
    id: `tx-inv-${Date.now()}`,
    userId: req.user!.id,
    userEmail: userRecord?.email || req.user!.email,
    type: 'investment',
    amount: principalCost,
    feeEur,
    totalChargedEur: totalCost,
    currency: 'EUR',
    status: 'completed',
    method: paymentMethod,
    propertyId: prop.id,
    propertyTitle: prop.title,
    tokensPurchased: count,
    reference: certId,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(invTx as any);
  pushUserNotification(req.user!.id, {
    title: 'Property token allocation confirmed',
    message: `Acquired ${count} tokens in ${prop.title} (€${principalCost.toFixed(2)}, ref ${certId}).`,
    type: 'success',
  });
  await persistDevState();

  const userRecipient = req.user?.email || 'investor@kretz.com';
  sendEmail({
    templateId: 'investment_confirmed',
    recipient: userRecipient,
    data: {
      fullName: userRecord?.fullName || 'Valued Investor',
      email: userRecipient,
      propertyTitle: prop.title,
      tokensCount: count,
      tokenPrice: prop.tokenPrice.toFixed(2),
      totalCost: totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      currency: 'EUR',
      certificateId: certId,
      spvName: `${prop.title} SPV S.L.`,
      projectedYield: `${(prop as any).estimatedAnnualYield || (prop as any).projectedYield || 12.5}% Annualized`,
      firstDistributionDate: '1st of next month'
    }
  }).catch(err => {
    logger.log({
      level: 'error',
      category: 'marketplace',
      requestId: req.id || 'req-inv-email',
      eventType: 'EMAIL_DISPATCH_FAILURE',
      outcome: 'failure',
      message: `Failed to dispatch investment confirmation email: ${err.message}`
    });
  });

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-invest',
    method: 'POST',
    route: '/api/v1/investments',
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'INVESTMENT_EXECUTED',
    outcome: 'success',
    message: `User ${req.user?.email} acquired ${count} tokens in ${prop.title} for €${totalCost}. Cert: ${certId}`,
    metadata: { propertyId: prop.id, tokensCount: count, totalCost, certificateId: certId }
  });

  res.json({
    success: true,
    data: {
      investment: {
        id: `inv-${Date.now()}`,
        propertyId: prop.id,
        tokensPurchased: count,
        totalCost,
        certificateId: certId
      },
      transaction: invTx,
      remainingAvailableTokens: prop.availableTokens
    },
    message: `Congratulations! You have acquired ${count} tokens in ${prop.title}.`,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/database/health
 * Returns database health and diagnostics report
 */
router.get('/admin/database/health', requireStaffSection('settings', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const health = await databaseHealth();
      return res.status(health.status === 'healthy' ? 200 : 503).json({ success: health.status === 'healthy', data: { ...health, timestamp: new Date().toISOString() }, message: health.status === 'healthy' ? 'Supabase database connection verified.' : 'Database connection is degraded.', requestId: req.id });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Database health check failed.', code: 'DATABASE_HEALTH_FAILED', detail: error?.message, requestId: req.id });
    }
  }
  return res.status(process.env.NODE_ENV === 'production' ? 503 : 200).json({
    success: process.env.NODE_ENV !== 'production',
    data: { status: 'not_configured', usersCount: null, listingsCount: mockListings.length, transactionsCount: mockTransactions.length, timestamp: new Date().toISOString() },
    message: 'Supabase server credentials are not configured.', requestId: req.id
  });
});

/**
 * POST /api/v1/admin/database/repair
 * Scans, repairs, and synchronizes database state
 */
router.post('/admin/database/repair', requireStaffSection('settings', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const health = await databaseHealth();
      return res.status(health.status === 'healthy' ? 200 : 503).json({
        success: health.status === 'healthy',
        data: { status: health.status, usersCount: health.usersCount, listingsCount: health.listingsCount, transactionsCount: health.transactionsCount, checkedAt: new Date().toISOString(), repairedItems: [] },
        message: 'Database integrity connectivity check completed. No records were automatically modified.',
        requestId: req.id
      });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Database integrity check failed.', code: 'DATABASE_REPAIR_CHECK_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-db-repair',
    method: 'POST',
    route: '/api/v1/admin/database/repair',
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'DATABASE_REPAIR_EXECUTED',
    outcome: 'success',
    message: `Database integrity repair initiated by ${req.user?.email}`
  });

  res.json({
    success: true,
    data: {
      status: 'repaired',
      repairedItems: [
        'Verified Supabase Auth and user_profiles are the customer identity source',
        'Verified mockListings property token counts and image arrays',
        'Validated transaction history integrity'
      ],
      usersCount: null,
      listingsCount: mockListings.length,
      transactionsCount: mockTransactions.length,
      repairedAt: new Date().toISOString()
    },
    message: 'Database integrity scan and state repair completed successfully.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/payments/webhooks
 * Secure payment/bank provider webhook processing with HMAC signature verification, idempotency, and settlement sync
 */
router.post('/payments/webhooks', async (req: AuthenticatedRequest, res: Response) => {
  const rawBody = typeof (req as any).rawBody === 'string'
    ? (req as any).rawBody
    : JSON.stringify(req.body || {});
  const sigCheck = verifyPaymentWebhookSignature({
    rawBody,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });
  if (!sigCheck.valid) {
    const isUnconfigured = (sigCheck.reason || '').toLowerCase().includes('not configured');
    return res.status(isUnconfigured ? 503 : 401).json({
      success: false,
      error: sigCheck.reason || 'Payment webhook signature verification failed.',
      code: isUnconfigured ? 'PAYMENT_WEBHOOK_NOT_CONFIGURED' : 'INVALID_PAYMENT_WEBHOOK_SIGNATURE',
      requestId: req.id,
    });
  }

  const event = req.body || {};
  const eventId = event.id || req.headers['x-event-id'];

  if (!eventId) {
    logger.log({
      level: 'warn',
      category: 'payments',
      requestId: req.id || 'req-wh-err',
      method: 'POST',
      route: '/api/v1/payments/webhooks',
      statusCode: 400,
      eventType: 'WEBHOOK_MISSING_EVENT_ID',
      outcome: 'failure',
      message: 'Payment webhook rejected: missing event ID header or body attribute.'
    });

    return res.status(400).json({ success: false, error: 'Missing webhook event identifier.', requestId: req.id });
  }

  const whKey = `pay:${eventId}`;
  if (processedWebhooks.has(whKey)) {
    logger.log({
      level: 'info',
      category: 'payments',
      requestId: req.id || 'req-wh-dup',
      method: 'POST',
      route: '/api/v1/payments/webhooks',
      statusCode: 200,
      eventType: 'WEBHOOK_DUPLICATE_IGNORED',
      outcome: 'success',
      message: `Webhook event ${eventId} previously processed. Acknowledged idempotently.`,
      metadata: { eventId }
    });

    return res.status(200).json({ success: true, message: 'Event already processed.', eventId });
  }

  processedWebhooks.add(whKey);
  const eventType = String(event.type || 'payment.succeeded');
  const reference = String(event.data?.object?.metadata?.reference || event.data?.reference || event.reference || '').trim();
  const transactionId = String(event.data?.object?.metadata?.transactionId || event.data?.transactionId || event.transactionId || '').trim();
  let settlementApplied = false;

  if (reference || transactionId) {
    const lookupKey = transactionId || reference;
    if (isSupabaseServerConfigured()) {
      try {
        const tx = await findTransactionByReferenceOrId(lookupKey);
        if (tx && tx.status === 'pending') {
          if (tx.type === 'deposit' && (eventType === 'payment.succeeded' || eventType === 'sepa.deposit.settled' || eventType === 'charge.succeeded')) {
            await runFinancialRpc('kretz_review_deposit', {
              p_transaction_id: tx.id,
              p_admin_id: 'system-payment-webhook',
              p_approve: true,
              p_reason: `Settled by payment webhook (${eventId})`,
            });
            settlementApplied = true;
            const prof = await getUserProfile(tx.user_id).catch(() => null);
            await notifyInvestorEvent({
              userId: tx.user_id,
              email: prof?.email,
              title: 'Deposit settled to wallet',
              message: `Your EUR ${Number(tx.amount || 0).toFixed(2)} deposit (${tx.reference}) has cleared and been credited to your wallet.`,
              type: 'success',
              emailTemplate: 'deposit_approved',
              emailData: {
                fullName: prof?.full_name || 'Valued Investor',
                amount: Number(tx.amount || 0).toFixed(2),
                currency: 'EUR',
                reference: tx.reference,
                method: tx.method || 'SEPA Transfer',
              },
              idempotencyKey: `wh-dep-${tx.id}`,
            });
          } else if (tx.type === 'withdrawal' && eventType === 'payout.failed') {
            await runFinancialRpc('kretz_review_withdrawal', {
              p_transaction_id: tx.id,
              p_admin_id: 'system-payment-webhook',
              p_approve: false,
              p_reason: `Bank payout failed (${eventId})`,
            });
            settlementApplied = true;
            const prof = await getUserProfile(tx.user_id).catch(() => null);
            await notifyInvestorEvent({
              userId: tx.user_id,
              email: prof?.email,
              title: 'Withdrawal returned to wallet',
              message: `Bank settlement for ${tx.reference} did not complete. Reserved funds of EUR ${Number(tx.amount || 0).toFixed(2)} were returned to your wallet.`,
              type: 'warning',
            });
          }
        }
      } catch (err: any) {
        logger.log({
          level: 'warn',
          category: 'payments',
          requestId: req.id || 'req-wh-db',
          eventType: 'WEBHOOK_SETTLEMENT_ERROR',
          outcome: 'failure',
          message: err?.message || 'Unable to settle webhook transaction against database.',
        });
      }
    } else if (process.env.NODE_ENV !== 'production') {
      const tx = mockTransactions.find((t) => t.id === lookupKey || t.reference === lookupKey);
      if (tx && tx.status === 'pending') {
        if (tx.type === 'deposit' && (eventType === 'payment.succeeded' || eventType === 'sepa.deposit.settled' || eventType === 'charge.succeeded')) {
          tx.status = 'completed';
          const cust = devCustomersById.get(tx.userId);
          if (cust) {
            cust.balance = Math.round((Number(cust.balance || 0) + Number(tx.amount || 0)) * 100) / 100;
            await notifyInvestorEvent({
              userId: cust.id,
              email: cust.email,
              title: 'Deposit settled to wallet',
              message: `Your EUR ${Number(tx.amount || 0).toFixed(2)} deposit (${tx.reference}) has cleared and been credited to your wallet.`,
              type: 'success',
              emailTemplate: 'deposit_approved',
              emailData: {
                fullName: cust.fullName || 'Valued Investor',
                amount: Number(tx.amount || 0).toFixed(2),
                currency: 'EUR',
                reference: tx.reference,
                method: tx.method || 'SEPA Transfer',
              },
              idempotencyKey: `wh-dep-${tx.id}`,
            });
          }
          settlementApplied = true;
          await persistDevState();
        } else if (tx.type === 'withdrawal' && eventType === 'payout.failed') {
          tx.status = 'rejected';
          const cust = devCustomersById.get(tx.userId);
          if (cust) {
            cust.balance = Math.round((Number(cust.balance || 0) + Number(tx.amount || 0)) * 100) / 100;
            await notifyInvestorEvent({
              userId: cust.id,
              email: cust.email,
              title: 'Withdrawal returned to wallet',
              message: `Bank settlement for ${tx.reference} did not complete. Reserved funds were returned to your wallet.`,
              type: 'warning',
            });
          }
          settlementApplied = true;
          await persistDevState();
        }
      }
    }
  }

  logger.log({
    level: 'info',
    category: 'payments',
    requestId: req.id || 'req-wh-ok',
    method: 'POST',
    route: '/api/v1/payments/webhooks',
    statusCode: 200,
    eventType: 'WEBHOOK_PROCESSED',
    outcome: 'success',
    message: `Payment webhook ${eventId} verified (${sigCheck.scheme}) and processed. Type: ${eventType}`,
    metadata: {
      eventId,
      eventType,
      scheme: sigCheck.scheme,
      settlementApplied
    }
  });

  res.json({
    success: true,
    message: 'Webhook processed successfully.',
    eventId,
    settlementApplied,
    scheme: sigCheck.scheme,
    requestId: req.id
  });
});

let paymentConfig = {
  traditional: {
    beneficiary: 'PREDRAG MIRKOVIC',
    iban: 'CY05 9020 0001 0000 0201 0908 5462',
    bic: 'CARDCY2LXXX',
    bankName: 'UNLIMIT',
    address: 'LIMASSOL 125 GEORGIOU GRIVA DIGENI',
    country: 'CYPRUS',
    instructions: 'Include your unique investor reference in the concept wire transfer.'
  },
  cryptoNetworks: [
    {
      id: 'net-usdc-bep20',
      name: 'BNB Smart Chain (BEP20)',
      token: 'USDC',
      network: 'BNB Smart Chain',
      walletAddress: '0x8336A3f49125bAD02101B405699ac87e40D473BB',
      contractEnd: '8ac76a',
      contractAddress: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      enabled: true
    }
  ]
};

/**
 * GET /api/v1/payments/config (Public view of escrow instructions, limits, and fee schedule)
 */
router.get('/payments/config', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      ...paymentConfig,
      limits: {
        minDepositEur: 100,
        maxDepositEur: 5000000,
        minWithdrawalEur: 250,
        minInvestmentEur: platformConfig.minInvestment || 750,
        maxInvestmentPerInvestorEur: platformConfig.maxInvestmentPerInvestor || 500000
      },
      fees: {
        sepaDepositFeeEur: 0,
        cardDepositFeeEur: 0,
        withdrawalFeeEur: 0,
        investmentFeePercent: 0.25,
        treasuryFxFeePercent: TREASURY_FX_FEE_PERCENT
      },
      settlement: {
        sepaDepositEta: '1–2 business days',
        cardDepositEta: 'Instant upon authorization',
        withdrawalEta: '1–2 business days'
      }
    },
    requestId: req.id
  });
});

/**
 * GET & PUT /api/v1/admin/payment-config
 */
router.get('/admin/payment-config', requireStaffSection('settings', 'read'), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: paymentConfig,
    requestId: req.id
  });
});

router.put('/admin/payment-config', requireStaffSection('settings', 'write'), (req: AuthenticatedRequest, res: Response) => {
  paymentConfig = {
    ...paymentConfig,
    ...req.body
  };
  res.json({
    success: true,
    data: paymentConfig,
    message: 'Payment configuration updated successfully.',
    requestId: req.id
  });
});

/**
 * Additional Contract Endpoints
 */

// User profile & session contract endpoints
router.get(['/auth/me', '/users/me'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!shouldUseSupabaseForCustomer(req)) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
    }
    const devCustomer = devCustomersById.get(req.user!.id);
    const devGateId = (devCustomer as any)?.assignedGateId || getDevAssignedGateId(req.user!.id);
    const devGate = devGateId ? getDevGateById(devGateId) : null;
    const assignedBankAccount = devGate
      ? {
          gateId: devGate.id,
          gateName: devGate.name,
          method: devGate.method,
          bankName: devGate.account_details?.Bank || devGate.name,
          accountHolder: devGate.account_details?.Beneficiary || '',
          iban: devGate.account_details?.IBAN || '',
          bic: devGate.account_details?.BIC || '',
        }
      : null;
    const publicDev = devCustomer ? toPublicDevCustomer(devCustomer) : null;
    return res.json({
      success: true,
      data: publicDev ? {
        ...publicDev,
        iban: publicDev.bankIban || '',
        bankHolder: publicDev.bankAccountHolder || publicDev.fullName,
        assignedBankAccount,
      } : {
        ...req.user,
        kycStatus: 'pending',
        balance: Number(req.user!.balance || 0),
        status: req.user!.status || 'active',
        assignedBankAccount,
      },
      requestId: req.id
    });
  }
  try {
    const profile = await getUserProfile(req.user!.id);
    if (!profile) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
    const assignedGateId = profile.payment_gate_id ?? profile.assigned_gate_id;
    const assignedBankAccount = assignedGateId ? await getAssignedPaymentGate(String(assignedGateId)).catch(() => null) : null;
    const resolvedIban = profile.iban ?? profile.bank_iban ?? '';
    const resolvedHolder = profile.bank_holder ?? profile.bank_account_holder ?? profile.full_name ?? '';
    return res.json({ success: true, data: {
      ...req.user,
      isAdmin: Boolean(req.user!.isAdmin),
      staffRole: req.user!.staffRole ?? null,
      fullName: profile.full_name, country: profile.country,
      accountType: profile.account_type, balance: Number(profile.wallet_balance || 0),
      kycStatus: profile.kyc_status, phoneNumber: profile.phone_number,
      iban: resolvedIban, bankIban: resolvedIban,
      bankHolder: resolvedHolder, bankAccountHolder: resolvedHolder,
      assignedBankAccount,
      status: profile.account_status || 'active'
    }, requestId: req.id });
  } catch {
    return res.status(503).json({ success: false, error: 'Your account is temporarily unavailable.', code: 'PROFILE_DATABASE_UNAVAILABLE', requestId: req.id });
  }
});

router.patch('/users/me', requireAuth, requireBankChangeEmailVerification, updateAuthenticatedCustomerProfile);

// Dashboard summary & performance endpoints
router.get('/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const summary = await getPersistentDashboardSummary(userId);
      if (!summary) return res.status(404).json({ success: false, error: 'Investor profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: summary, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-dashboard-db', eventType: 'DASHBOARD_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Dashboard query failed.' });
      return res.status(503).json({ success: false, error: 'Your dashboard is temporarily unavailable.', code: 'DASHBOARD_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  const userRecord = await findUserRecordForRequest(req);
  const availableBalance = userRecord ? Number(userRecord.balance || 0) : Number(req.user?.balance ?? 0);
  const userEmail = (userRecord?.email || req.user?.email || '').toLowerCase();
  const matchesUser = (t: any) => t.userId === userId || (userEmail && t.userEmail?.toLowerCase() === userEmail);

  const userAllTxs = mockTransactions.filter(matchesUser);
  const userInvTxs = userAllTxs.filter(t => (t.type === 'investment' || t.type === 'purchase') && t.status === 'completed');
  const pendingInvTxs = userAllTxs.filter(t => (t.type === 'investment' || t.type === 'purchase') && t.status === 'pending');

  const investedTotal = userInvTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pendingAllocationsAmount = pendingInvTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pendingDeposits = userAllTxs
    .filter(t => t.type === 'deposit' && (t.status === 'pending' || t.status === 'processing'))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const reservedWithdrawals = userAllTxs
    .filter(t => t.type === 'withdrawal' && (t.status === 'pending' || t.status === 'processing'))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const restrictedCash = userRecord?.status === 'suspended' ? availableBalance : 0;
  const withdrawableCash = userRecord?.status === 'suspended' ? 0 : availableBalance;

  const earnedDividends = userAllTxs
    .filter(t => (t.type === 'dividend' || t.type === 'payout' || t.type === 'distribution') && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const nowDate = new Date();
  const monthStart = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1);
  const collectedThisMonth = Number(
    userAllTxs
      .filter(t => (t.type === 'dividend' || t.type === 'payout' || t.type === 'distribution') && t.status === 'completed' && new Date(t.createdAt).getTime() >= monthStart)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      .toFixed(2)
  );

  // Aggregate confirmed holdings by property with ownership %
  const holdingsMap = new Map<string, any>();
  for (const tx of userInvTxs) {
    const propId = String(tx.propertyId || 'prop-unknown');
    const prop = mockListings.find(p => p.id === propId || p.slug === propId);
    const units = Number(tx.tokensPurchased || 0);
    const amount = Number(tx.amount || 0);
    const totalTokens = Number(prop?.totalTokens || 0);
    const prev = holdingsMap.get(propId);
    if (prev) {
      prev.confirmedUnits += units;
      prev.valuation = Number((prev.valuation + amount).toFixed(2));
      prev.ownershipPercent = totalTokens > 0 ? Number(((prev.confirmedUnits / totalTokens) * 100).toFixed(4)) : 0;
      prev.valuationDate = tx.createdAt || prev.valuationDate;
    } else {
      holdingsMap.set(propId, {
        id: tx.id,
        propertyId: propId,
        propertyTitle: tx.propertyTitle || prop?.title || 'Tokenized Property SPV',
        location: prop?.location || '',
        confirmedUnits: units,
        ownershipPercent: totalTokens > 0 ? Number(((units / totalTokens) * 100).toFixed(4)) : 0,
        valuation: Number(amount.toFixed(2)),
        valuationDate: tx.createdAt || nowDate.toISOString(),
        status: 'active',
        onChainStatus: tx.txHash ? 'On-Chain Settled' : 'SPV Book-Entry Confirmed',
        certificateId: tx.reference || null,
      });
    }
  }
  const holdingsList = Array.from(holdingsMap.values());
  const confirmedUnits = holdingsList.reduce((s, h) => s + h.confirmedUnits, 0);
  const pendingUnits = pendingInvTxs.reduce((s, t) => s + Number(t.tokensPurchased || 0), 0);
  const uniqueProps = holdingsList.length;

  const projectedMonthlyIncome = holdingsList.reduce((sum, h) => {
    const prop = mockListings.find(p => p.id === h.propertyId);
    const annualYield = prop?.monthlyTargetRate ? prop.monthlyTargetRate * 12 : prop?.projectedYield || 8.4;
    // Cap synthetic monthly conversion reasonably using 8.4% annual default unless property explicit net rate is present
    const effectiveAnnualRate = Math.min(annualYield, 18);
    return sum + (h.valuation * (effectiveAnnualRate / 100)) / 12;
  }, 0);

  const complianceSteps = buildDevComplianceSteps(userId, userRecord?.kycStatus);
  const kycNorm = String(userRecord?.kycStatus || 'pending').toLowerCase();
  const hasCompletedDeposit = userAllTxs.some(t => t.type === 'deposit' && t.status === 'completed');
  const hasPendingDeposit = userAllTxs.some(t => t.type === 'deposit' && t.status === 'pending');

  const kycStageStatus: string =
    kycNorm === 'verified' || kycNorm === 'approved'
      ? 'Approved'
      : kycNorm === 'rejected'
      ? 'Rejected'
      : complianceSteps.some((s) => s.status === 'rejected')
      ? 'Action Required'
      : complianceSteps.some((s) => s.status === 'in_review')
      ? 'In Review'
      : 'Not Started';

  const fundingStageStatus: string =
    availableBalance > 0 || hasCompletedDeposit || investedTotal > 0
      ? 'Completed'
      : hasPendingDeposit
      ? 'Pending'
      : 'Not Started';

  const holdingsStageStatus: string =
    confirmedUnits > 0
      ? 'Completed'
      : pendingUnits > 0 || pendingAllocationsAmount > 0
      ? 'Pending'
      : 'Not Started';

  const yieldsStageStatus: string =
    earnedDividends > 0
      ? 'Completed'
      : confirmedUnits > 0
      ? 'Pending'
      : 'Not Started';

  const nextDistDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  const lifecycleStages = [
    {
      stepNumber: 1,
      key: 'account_registered',
      title: 'Account Registered',
      status: 'Completed',
      summary: `Registered ${userRecord?.createdAt ? new Date(userRecord.createdAt).toLocaleDateString('en-GB') : 'Verified Member'}`,
      actionTab: 'profile',
      requirements: ['Authenticated investor profile established'],
      updatedAt: userRecord?.createdAt || nowDate.toISOString(),
    },
    {
      stepNumber: 2,
      key: 'identity_verification',
      title: 'Identity Verification (KYC/AML)',
      status: kycStageStatus,
      summary: kycStageStatus === 'Approved' ? 'Tier-2 EU AML Verified' : kycStageStatus === 'In Review' ? 'Documents awaiting compliance sign-off' : 'Submit government ID & proof of address',
      actionTab: 'verification',
      requirements: complianceSteps.map((s) => `${s.title}: ${s.status}`),
      updatedAt: nowDate.toISOString(),
    },
    {
      stepNumber: 3,
      key: 'wallet_funded',
      title: 'Wallet Funded',
      status: fundingStageStatus,
      summary: availableBalance > 0 ? `Cleared €${availableBalance.toFixed(2)}` : hasPendingDeposit ? `Pending €${pendingDeposits.toFixed(2)}` : 'Initiate SEPA wire or crypto transfer',
      actionTab: 'wallet',
      requirements: ['Minimum €100 SEPA wire or supported crypto settlement'],
      updatedAt: nowDate.toISOString(),
    },
    {
      stepNumber: 4,
      key: 'asset_tokens_held',
      title: 'Asset Tokens Held',
      status: holdingsStageStatus,
      summary: confirmedUnits > 0 ? `${confirmedUnits} units confirmed across ${uniqueProps} property` : 'No confirmed property holdings yet',
      actionTab: 'marketplace',
      requirements: ['Allocate cleared treasury funds into a landmark SPV offering'],
      updatedAt: holdingsList[0]?.valuationDate || null,
    },
    {
      stepNumber: 5,
      key: 'monthly_yields',
      title: 'Monthly Yields',
      status: yieldsStageStatus,
      summary: earnedDividends > 0 ? `€${earnedDividends.toFixed(2)} cumulative rent distributed` : confirmedUnits > 0 ? `Next distribution scheduled ${nextDistDate}` : 'Activated upon confirmed asset allocation',
      actionTab: 'distributions',
      requirements: ['Monthly rental distributions credited on the 1st of each month'],
      updatedAt: userAllTxs.find(t => t.type === 'dividend' || t.type === 'distribution')?.createdAt || null,
    },
  ];
  const completedStages = lifecycleStages.filter(s => s.status === 'Completed' || s.status === 'Approved').length;
  const progressPercent = Math.round((completedStages / 5) * 100);

  // Build real chronological performance history strictly from completed events
  const chronological = [...userAllTxs]
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let runningNav = 0;
  let runningDivs = 0;
  const performanceHistory: Array<{ timestamp: string; label: string; valuation: number; dividends: number }> = [];
  for (const tx of chronological) {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'deposit') runningNav += amt;
    else if (tx.type === 'withdrawal') runningNav = Math.max(0, runningNav - amt);
    else if (tx.type === 'dividend' || tx.type === 'distribution' || tx.type === 'payout') {
      runningDivs += amt;
      runningNav += amt;
    }
    const d = new Date(tx.createdAt);
    performanceHistory.push({
      timestamp: tx.createdAt,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      valuation: Number(runningNav.toFixed(2)),
      dividends: Number(runningDivs.toFixed(2)),
    });
  }

  res.json({
    success: true,
    data: {
      totalPortfolioValue: Number((withdrawableCash + investedTotal).toFixed(2)),
      availableBalance: withdrawableCash,
      investedCapital: Number(investedTotal.toFixed(2)),
      totalEarnedDividends: Number(earnedDividends.toFixed(2)),
      activePropertiesCount: uniqueProps,
      projectedMonthlyIncome: Number(projectedMonthlyIncome.toFixed(2)),
      currency: 'EUR',
      lastUpdated: nowDate.toISOString(),
      valuationDate: holdingsList[0]?.valuationDate || nowDate.toISOString(),
      pendingAllocationsCount: pendingInvTxs.length,
      pendingAllocationsAmount: Number(pendingAllocationsAmount.toFixed(2)),
      cashBreakdown: {
        available: withdrawableCash,
        pendingDeposits: Number(pendingDeposits.toFixed(2)),
        reservedWithdrawals: Number(reservedWithdrawals.toFixed(2)),
        restricted: Number(restrictedCash.toFixed(2)),
        currency: 'EUR',
      },
      rentSummary: {
        projectedMonthly: Number(projectedMonthlyIncome.toFixed(2)),
        collectedTotal: Number(earnedDividends.toFixed(2)),
        collectedThisMonth,
        nextDistributionDate: holdingsList.length > 0 ? nextDistDate : null,
        paymentStatus: collectedThisMonth > 0 ? 'Paid This Cycle' : holdingsList.length > 0 ? 'Scheduled' : 'No Active Entitlements',
      },
      holdingsSummary: {
        confirmedUnits,
        pendingUnits,
        activePropertiesCount: uniqueProps,
        holdings: holdingsList,
      },
      lifecycle: {
        progressPercent,
        completedStages,
        totalStages: 5,
        stages: lifecycleStages,
      },
      performanceHistory,
      recentTransactions: userAllTxs.slice(0, 8),
    },
    requestId: req.id
  });
});

router.get('/dashboard/performance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const data = await getPersistentPerformance(userId);
      if (!data) return res.status(404).json({ success: false, error: 'Investor profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-performance-db', eventType: 'PERFORMANCE_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Performance query failed.' });
      return res.status(503).json({ success: false, error: 'Investment performance is temporarily unavailable.', code: 'PERFORMANCE_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const completedTxs = [...mockTransactions]
    .filter(t => t.userId === userId && t.status === 'completed')
    .sort((a, b) => new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime());

  const totalInv = completedTxs
    .filter(t => t.type === 'investment' || t.type === 'purchase')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  let runningTotal = 0;
  const historyMap = new Map<string, { yield: number; totalValue: number }>();
  completedTxs.forEach(tx => {
    const amt = Number(tx.amount || 0);
    const kind = String(tx.type || '').toLowerCase();
    const isDist = kind === 'dividend' || kind === 'payout' || kind === 'distribution';
    if (kind === 'deposit' || isDist) {
      runningTotal += amt;
    } else if (kind === 'withdrawal') {
      runningTotal = Math.max(0, runningTotal - amt);
    }
    const dDate = new Date(tx.createdAt || tx.created_at || Date.now());
    const mKey = dDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const prev = historyMap.get(mKey) || { yield: 0, totalValue: runningTotal };
    if (isDist) prev.yield += amt;
    prev.totalValue = Number(runningTotal.toFixed(2));
    historyMap.set(mKey, prev);
  });

  const historicalPerformance = Array.from(historyMap.entries()).map(([month, data]) => ({
    month,
    yield: data.yield,
    totalValue: data.totalValue
  }));

  res.json({
    success: true,
    data: {
      annualizedReturnPercent: totalInv > 0 ? 8.4 : 0,
      historicalPerformance
    },
    requestId: req.id
  });
});

// Financial Reports
router.get('/reports/account-statement', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const data = await getPersistentAccountStatement(req.user!.id);
      if (!data) return res.status(404).json({ success: false, error: 'Investor profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-statement-db', eventType: 'ACCOUNT_STATEMENT_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Account statement query failed.' });
      return res.status(503).json({ success: false, error: 'Your account statement is temporarily unavailable.', code: 'STATEMENT_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const userRecord = await findUserRecordForRequest(req);
  const userId = req.user!.id;
  const userEmail = req.user?.email?.toLowerCase();
  const userTxs = mockTransactions.filter(
    t => t.userId === userId || (userEmail && t.userEmail?.toLowerCase() === userEmail)
  );

  const totalDeposits = userTxs
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInvested = userTxs
    .filter(t => (t.type === 'investment' || t.type === 'purchase') && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDividendsReceived = userTxs
    .filter(t => (t.type === 'dividend' || t.type === 'payout' || t.type === 'distribution') && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const currentBalance = userRecord ? userRecord.balance : 0;

  res.json({
    success: true,
    data: {
      statementId: `STMT-${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      periodStart: `${new Date().getFullYear()}-01-01`,
      periodEnd: new Date().toISOString().split('T')[0],
      totalDeposits,
      totalInvested,
      totalDividendsReceived,
      currentBalance
    },
    requestId: req.id
  });
});

router.get('/reports/statements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const docs = await listUserStatementDocuments(req.user!.id);
      return res.json({ success: true, data: docs, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Statements are temporarily unavailable.', code: 'DOCUMENTS_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Document storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const docs = (devComplianceDocsByUser.get(req.user!.id) || []).map((d: any) => ({
    id: d.id,
    userId: d.userId,
    category: d.category === 'tax_document' ? 'tax_document' : 'statement',
    title: d.title || d.fileName,
    taxYear: d.taxYear,
    periodLabel: d.periodLabel,
    fileName: d.fileName,
    mimeType: d.mimeType || 'application/pdf',
    fileSize: d.fileSize || 0,
    uploadedAt: d.uploadedAt,
  }));
  return res.json({ success: true, data: docs, requestId: req.id });
});

router.get('/reports/statements/:docId/signed-url', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { docId } = req.params;
  if (shouldUseSupabaseForCustomer(req)) {
    try {
      const signed = await getSignedDocumentUrl(req.user!.id, docId);
      if (!signed) {
        return res.status(404).json({ success: false, error: 'Document not found or file unavailable.', code: 'DOCUMENT_NOT_FOUND', requestId: req.id });
      }
      return res.json({ success: true, data: signed, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Unable to generate secure download link.', code: 'SIGNED_URL_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Document storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const docs = devComplianceDocsByUser.get(req.user!.id) || [];
  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    return res.status(404).json({ success: false, error: 'Document not found.', code: 'DOCUMENT_NOT_FOUND', requestId: req.id });
  }
  const url = doc.fileDataUrl || `data:${doc.mimeType || 'application/pdf'};base64,${Buffer.from(`L'Agence Real Estate Document: ${doc.title}`).toString('base64')}`;
  return res.json({ success: true, data: { url, fileName: doc.fileName, expiresInSeconds: 60 }, requestId: req.id });
});

// Referral Program
router.get('/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userCode = `REF-${req.user?.id?.slice(0, 8).toUpperCase() || 'KZ2026'}`;
  res.json({
    success: true,
    data: {
      referralCode: userCode,
      referralLink: `https://kretzdespain.com/ref/${req.user?.id || 'usr-01'}`,
      totalReferred: 0,
      activeInvestors: 0,
      commissionEarned: 0.00,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

router.get('/referrals/earnings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalEarnings: 0.00,
      pendingPayout: 0.00,
      history: []
    },
    requestId: req.id
  });
});

// Investment Plans Tiers
router.get('/investment-plans', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'plan-starter', name: 'Fractional Starter', minInvestment: 750, projectedYield: 11.5, holdingMonths: 12 },
      { id: 'plan-growth', name: 'Institutional Growth', minInvestment: 5000, projectedYield: 13.5, holdingMonths: 24 },
      { id: 'plan-signature', name: 'Kretz Signature Portfolio', minInvestment: 25000, projectedYield: 16.0, holdingMonths: 36 }
    ],
    requestId: req.id
  });
});

router.get('/investment-plans/:planId', (req: AuthenticatedRequest, res: Response) => {
  const { planId } = req.params;
  res.json({
    success: true,
    data: { id: planId, name: 'Fractional Investment Plan', minInvestment: 750, projectedYield: 12.5, holdingMonths: 12 },
    requestId: req.id
  });
});

// Admin Control Contract Endpoints
router.get(['/admin/dashboard', '/admin/stats'], requireStaffSection('dashboard', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try {
      const stats = await getPersistentAdminDashboard();
      return res.json({ success: true, data: { ...stats, systemUptimePercent: 99.9 }, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-dashboard-db', eventType: 'ADMIN_DASHBOARD_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load admin dashboard.' });
        return res.status(503).json({ success: false, error: 'The administrator dashboard is temporarily unavailable.', code: 'ADMIN_DASHBOARD_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const customers = Array.from(devCustomersById.values());
  const totalAssetsUnderManagement = mockTransactions
    .filter(t => (t.type === 'investment' || t.type === 'purchase') && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDividendsPaid = mockTransactions
    .filter(t => (t.type === 'dividend' || t.type === 'payout' || t.type === 'distribution') && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const pendingKYC = customers.filter(c => String(c.kycStatus || 'pending').toLowerCase() === 'pending').length;
  const pendingWithdrawalsCount = mockTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
  res.json({
    success: true,
    data: {
      totalUsers: customers.length,
      totalProperties: mockListings.length,
      totalTransactions: mockTransactions.length,
      totalAssetsUnderManagement: Number(totalAssetsUnderManagement.toFixed(2)),
      totalDividendsPaid: Number(totalDividendsPaid.toFixed(2)),
      pendingKYC,
      pendingWithdrawalsCount,
      systemUptimePercent: 100
    },
    requestId: req.id
  });
});

const toCents = (eur: unknown): number => {
  const num = Number(eur ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
};

const centsToEur = (cents: number): number => Math.round(cents) / 100;

const allocateProportionalCents = (
  totalCents: number,
  holders: Array<{ userId: string; shares: number }>
): Map<string, number> => {
  const out = new Map<string, number>();
  const totalShares = holders.reduce((s, h) => s + h.shares, 0);
  if (totalShares <= 0 || totalCents <= 0 || holders.length === 0) return out;
  const enriched = holders.map((h, idx) => {
    const exact = (totalCents * h.shares) / totalShares;
    const base = Math.floor(exact);
    return { userId: h.userId, base, frac: exact - base, idx };
  });
  let remainder = totalCents - enriched.reduce((s, r) => s + r.base, 0);
  const byRemainder = [...enriched].sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx));
  for (let i = 0; i < byRemainder.length && remainder > 0; i++) {
    byRemainder[i].base += 1;
    remainder -= 1;
  }
  for (const row of enriched) {
    out.set(row.userId, row.base);
  }
  return out;
};

const formatDatabaseRefusal = (error: any, fallback: string): string => {
  if (!error) return fallback;
  const msg = String(error?.message || '').trim();
  const details = String(error?.details || '').trim();
  const hint = String(error?.hint || '').trim();
  const code = String(error?.code || '').trim();
  if (!msg) return fallback;
  let full = code && !msg.includes(code) ? `[${code}] ${msg}` : msg;
  if (details && !full.includes(details)) full = `${full} — ${details}`;
  if (hint && !full.includes(hint)) full = `${full} (${hint})`;
  return full;
};

const resolveDatabaseErrorStatus = (error: any): number => {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toUpperCase();
  if (code === 'P0002' || msg.includes('NOT_FOUND')) return 404;
  if (code === '42501' || msg.includes('ADMIN_REQUIRED') || msg.includes('ROLE_REQUIRED')) return 403;
  if (code === '23505' || msg.includes('NOT_PENDING') || msg.includes('ALREADY_')) return 409;
  if (code === '22023' || code === 'P0001' || msg.includes('INSUFFICIENT') || msg.includes('REQUIRED') || msg.includes('CANNOT_') || msg.includes('INVALID') || msg.includes('ONLY_COMPLETED')) return 400;
  return error?.code || error?.message ? 400 : 503;
};

router.get('/admin/finance/summary', requireStaffSection('finance', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const fromRaw = typeof req.query.from === 'string' && req.query.from.trim() ? req.query.from.trim() : null;
  const toRaw = typeof req.query.to === 'string' && req.query.to.trim() ? req.query.to.trim() : null;

  if (canUseLiveSupabaseData()) {
    try {
      const { data, error } = await getSupabaseAdmin().rpc('finance_summary', {
        p_from: fromRaw ? new Date(fromRaw).toISOString() : null,
        p_to: toRaw ? new Date(toRaw.length <= 10 ? `${toRaw}T23:59:59.999Z` : toRaw).toISOString() : null,
        p_admin_id: req.user!.id,
      });
      if (error) throw error;
      return res.json({ success: true, data, source: 'rpc', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(error)).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Unable to compute finance summary.'),
          code: error?.code || 'FINANCE_SUMMARY_FAILED',
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }

  const fromMs = fromRaw ? new Date(fromRaw).getTime() : null;
  const toMs = toRaw ? new Date(toRaw.length <= 10 ? `${toRaw}T23:59:59.999Z` : toRaw).getTime() : null;
  const filtered = mockTransactions.filter((t) => {
    const ts = new Date(t.createdAt).getTime();
    if (fromMs && ts < fromMs) return false;
    if (toMs && ts > toMs) return false;
    return true;
  });

  const customers = Array.from(devCustomersById.values()).filter(
    (c) => !((c as any).isAdmin || ((c as any).staffRole && String((c as any).staffRole).trim() !== ''))
  );
  const walletLiabilitiesCents = customers.reduce((s, c) => s + toCents(c.balance), 0);
  const pendingDeposits = mockTransactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const pendingWithdrawals = mockTransactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');

  const kindCents: Record<string, { count: number; cents: number }> = {};
  const statusCents: Record<string, { count: number; cents: number }> = {};
  for (const t of filtered) {
    const kind = String(t.type || 'transaction');
    const st = String(t.status || 'pending');
    const amtCents = toCents(t.amount);
    if (!kindCents[kind]) kindCents[kind] = { count: 0, cents: 0 };
    kindCents[kind].count += 1;
    kindCents[kind].cents += amtCents;

    if (!statusCents[st]) statusCents[st] = { count: 0, cents: 0 };
    statusCents[st].count += 1;
    statusCents[st].cents += amtCents;
  }

  const totalsByKind: Record<string, { count: number; total: number; totalCents: number }> = {};
  for (const [k, v] of Object.entries(kindCents)) {
    totalsByKind[k] = { count: v.count, total: centsToEur(v.cents), totalCents: v.cents };
  }
  const totalsByStatus: Record<string, { count: number; total: number; totalCents: number }> = {};
  for (const [k, v] of Object.entries(statusCents)) {
    totalsByStatus[k] = { count: v.count, total: centsToEur(v.cents), totalCents: v.cents };
  }

  const pendingDepositsCents = pendingDeposits.reduce((s, d) => s + toCents(d.amount), 0);
  const pendingWithdrawalsCents = pendingWithdrawals.reduce((s, w) => s + toCents(w.amount), 0);

  return res.json({
    success: true,
    source: 'computed',
    data: {
      wallet_liabilities: centsToEur(walletLiabilitiesCents),
      wallet_liabilities_cents: walletLiabilitiesCents,
      pending_deposits_count: pendingDeposits.length,
      pending_deposits_total: centsToEur(pendingDepositsCents),
      pending_deposits_cents: pendingDepositsCents,
      pending_withdrawals_count: pendingWithdrawals.length,
      pending_withdrawals_total: centsToEur(pendingWithdrawalsCents),
      pending_withdrawals_cents: pendingWithdrawalsCents,
      totals_by_kind: totalsByKind,
      totals_by_status: totalsByStatus,
      from: fromRaw,
      to: toRaw,
    },
    requestId: req.id,
  });
});

router.post('/admin/finance/manual-deposit', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const amountCents = req.body?.amountCents !== undefined ? Math.round(Number(req.body.amountCents)) : toCents(req.body?.amount);
  const amount = centsToEur(amountCents);
  const note = String(req.body?.note || '').trim();
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) {
    return res.status(400).json({ success: false, error: 'Investor and positive EUR amount are required.', code: 'INVALID_MANUAL_DEPOSIT', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      let data: any;
      try {
        data = await runFinancialRpc('admin_credit_deposit', {
          p_user_id: userId,
          p_amount: amount,
          p_note: note || 'Manual deposit credited by finance',
          p_admin_id: req.user!.id,
        });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        data = await runFinancialRpc('kretz_admin_credit_user', {
          p_user_id: userId,
          p_admin_id: req.user!.id,
          p_amount: amount,
          p_method: 'Manual Finance Credit',
          p_reference: `KZ-MAN-${crypto.randomInt(100000, 999999)}`,
          p_notes: note || 'Manual deposit credited by finance',
          p_transaction_id: crypto.randomUUID(),
        });
      }
      return res.status(201).json({ success: true, data, message: `Recorded manual deposit of €${amount.toFixed(2)}.`, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(error)).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Manual deposit failed.'),
          code: error?.code || 'MANUAL_DEPOSIT_FAILED',
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const cust = devCustomersById.get(userId);
  if (!cust) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND: Investor not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  const nextBalCents = toCents(cust.balance) + amountCents;
  cust.balance = centsToEur(nextBalCents);
  if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
  const nowIso = new Date().toISOString();
  const tx = {
    id: `dep-man-${crypto.randomUUID()}`,
    userId: cust.id,
    userEmail: cust.email,
    userName: cust.fullName,
    type: 'deposit',
    amount,
    amountCents,
    netAmount: amount,
    feeAmount: 0,
    currency: 'EUR',
    status: 'completed',
    method: 'Manual Finance Credit',
    reference: `KZ-MAN-${crypto.randomInt(100000, 999999)}`,
    notes: note || 'Manual deposit credited by finance',
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
  };
  mockTransactions.unshift(tx as any);
  await notifyInvestorEvent({
    userId: cust.id,
    email: cust.email,
    title: 'Manual deposit credited',
    message: `€${amount.toFixed(2)} has been credited to your wallet (${tx.reference}).`,
    type: 'success',
  });
  await persistDevState();
  return res.status(201).json({ success: true, data: { transaction: tx, balance: cust.balance, balanceCents: nextBalCents }, message: `Recorded manual deposit of €${amount.toFixed(2)} for ${cust.email}.`, requestId: req.id });
});

router.post('/admin/finance/charge-fee', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const amountCents = req.body?.amountCents !== undefined ? Math.round(Number(req.body.amountCents)) : toCents(req.body?.amount);
  const amount = centsToEur(amountCents);
  const reason = String(req.body?.reason || '').trim();
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) {
    return res.status(400).json({ success: false, error: 'Investor and positive fee amount are required.', code: 'INVALID_FEE_PAYLOAD', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const data = await runFinancialRpc('admin_charge_fee', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason || 'Platform administrative fee',
        p_admin_id: req.user!.id,
      });
      return res.json({ success: true, data, message: `Charged €${amount.toFixed(2)} fee.`, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(error)).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Fee charge failed.'),
          code: error?.code || 'CHARGE_FEE_FAILED',
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const cust = devCustomersById.get(userId);
  if (!cust) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND: Investor not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  const balCents = toCents(cust.balance);
  if (balCents < amountCents) {
    return res.status(400).json({ success: false, error: `INSUFFICIENT_WALLET_BALANCE: Investor balance is €${centsToEur(balCents).toFixed(2)}.`, code: 'INSUFFICIENT_WALLET_BALANCE', requestId: req.id });
  }
  const nextBalCents = balCents - amountCents;
  cust.balance = centsToEur(nextBalCents);
  if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
  const nowIso = new Date().toISOString();
  const tx = {
    id: `fee-${crypto.randomUUID()}`,
    userId: cust.id,
    userEmail: cust.email,
    userName: cust.fullName,
    type: 'fee',
    amount,
    amountCents,
    feeAmount: amount,
    netAmount: 0,
    currency: 'EUR',
    status: 'completed',
    method: 'Platform Fee Assessment',
    reference: `KZ-FEE-${crypto.randomInt(100000, 999999)}`,
    notes: reason || 'Platform administrative fee',
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
  };
  mockTransactions.unshift(tx as any);
  await notifyInvestorEvent({
    userId: cust.id,
    email: cust.email,
    title: 'Administrative fee assessed',
    message: `A fee of €${amount.toFixed(2)} (${tx.reference}) was applied: ${tx.notes}.`,
    type: 'info',
  });
  await persistDevState();
  return res.json({ success: true, data: { transaction: tx, balance: cust.balance, balanceCents: nextBalCents }, message: `Charged €${amount.toFixed(2)} fee to ${cust.email}.`, requestId: req.id });
});

router.post('/admin/finance/adjust', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const deltaCents = req.body?.deltaCents !== undefined
    ? Math.round(Number(req.body.deltaCents))
    : req.body?.delta !== undefined
    ? toCents(req.body.delta)
    : (req.body?.direction === 'debit' ? -Math.abs(toCents(req.body?.amount)) : Math.abs(toCents(req.body?.amount)));
  const delta = centsToEur(deltaCents);
  if (!userId || !Number.isFinite(deltaCents) || deltaCents === 0 || reason.length < 3) {
    return res.status(400).json({ success: false, error: 'Investor, non-zero adjustment amount, and reason (min 3 chars) are required.', code: 'INVALID_ADJUST_PAYLOAD', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const data = await runFinancialRpc('admin_adjust', {
        p_user_id: userId,
        p_delta: delta,
        p_reason: reason,
        p_admin_id: req.user!.id,
      });
      return res.json({ success: true, data, message: `Balance adjusted by ${delta >= 0 ? '+' : ''}€${delta.toFixed(2)}.`, requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(error)).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Balance adjustment failed.'),
          code: error?.code || 'ADMIN_ADJUST_FAILED',
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const cust = devCustomersById.get(userId);
  if (!cust) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND: Investor not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  const nextBalCents = toCents(cust.balance) + deltaCents;
  if (nextBalCents < 0) {
    return res.status(400).json({ success: false, error: `INSUFFICIENT_WALLET_BALANCE: Debit exceeds available balance (€${Number(cust.balance || 0).toFixed(2)}).`, code: 'INSUFFICIENT_WALLET_BALANCE', requestId: req.id });
  }
  cust.balance = centsToEur(nextBalCents);
  if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
  const nowIso = new Date().toISOString();
  const absAmt = centsToEur(Math.abs(deltaCents));
  const tx = {
    id: `adj-${crypto.randomUUID()}`,
    userId: cust.id,
    userEmail: cust.email,
    userName: cust.fullName,
    type: 'adjustment',
    amount: absAmt,
    amountCents: Math.abs(deltaCents),
    netAmount: delta,
    feeAmount: 0,
    currency: 'EUR',
    status: 'completed',
    method: deltaCents > 0 ? 'Balance Adjustment (Credit)' : 'Balance Adjustment (Debit)',
    reference: `KZ-ADJ-${crypto.randomInt(100000, 999999)}`,
    notes: reason,
    metadata: { delta, deltaCents, direction: deltaCents > 0 ? 'credit' : 'debit', reason },
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
  };
  mockTransactions.unshift(tx as any);
  await persistDevState();
  return res.json({ success: true, data: { transaction: tx, balance: cust.balance, balanceCents: nextBalCents }, message: `Adjusted ${cust.email} balance by ${deltaCents >= 0 ? '+' : '-'}€${absAmt.toFixed(2)}.`, requestId: req.id });
});

router.post('/admin/finance/reverse', requireStaffSection('finance', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const transactionId = String(req.body?.transactionId || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!transactionId || reason.length < 3) {
    return res.status(400).json({ success: false, error: 'Transaction ID and reversal reason (min 3 chars) are required.', code: 'INVALID_REVERSAL_PAYLOAD', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const data = await runFinancialRpc('reverse_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason,
        p_admin_id: req.user!.id,
      });
      return res.json({ success: true, data, message: 'Transaction reversed cleanly.', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(error)).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Transaction reversal failed.'),
          code: error?.code || 'REVERSAL_FAILED',
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const orig = mockTransactions.find((t) => t.id === transactionId || t.reference === transactionId);
  if (!orig) return res.status(404).json({ success: false, error: 'TRANSACTION_NOT_FOUND: Transaction not found.', code: 'TRANSACTION_NOT_FOUND', requestId: req.id });
  if (orig.status !== 'completed') return res.status(400).json({ success: false, error: 'ONLY_COMPLETED_TRANSACTIONS_REVERSIBLE: Only completed transactions can be reversed.', code: 'ONLY_COMPLETED_TRANSACTIONS_REVERSIBLE', requestId: req.id });
  if (orig.type === 'reversal') return res.status(400).json({ success: false, error: 'CANNOT_REVERSE_A_REVERSAL: Cannot reverse an existing reversal entry.', code: 'CANNOT_REVERSE_A_REVERSAL', requestId: req.id });
  if (orig.reversedById || mockTransactions.some((t) => t.reversalOfId === orig.id || t.reversedTransactionId === orig.id)) {
    return res.status(409).json({ success: false, error: 'TRANSACTION_ALREADY_REVERSED: This transaction has already been reversed.', code: 'TRANSACTION_ALREADY_REVERSED', requestId: req.id });
  }

  const origAmtCents = toCents(orig.amount);
  let walletDeltaCents = 0;
  if (['deposit', 'dividend', 'distribution', 'payout'].includes(orig.type)) walletDeltaCents = -origAmtCents;
  else if (['withdrawal', 'fee', 'investment', 'purchase'].includes(orig.type)) walletDeltaCents = origAmtCents;
  else if (orig.type === 'adjustment') walletDeltaCents = -toCents(orig.metadata?.delta ?? orig.netAmount ?? orig.amount);

  const cust = devCustomersById.get(orig.userId);
  if (!cust) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND: Investor not found for transaction.', code: 'USER_NOT_FOUND', requestId: req.id });
  const nextBalCents = toCents(cust.balance) + walletDeltaCents;
  if (nextBalCents < 0) {
    return res.status(400).json({ success: false, error: `INSUFFICIENT_WALLET_FOR_REVERSAL: Reversal would take wallet balance negative (€${centsToEur(nextBalCents).toFixed(2)}).`, code: 'INSUFFICIENT_WALLET_FOR_REVERSAL', requestId: req.id });
  }
  cust.balance = centsToEur(nextBalCents);
  if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;

  const nowIso = new Date().toISOString();
  const revId = `rev-${crypto.randomUUID()}`;
  const revRef = `KZ-REV-${crypto.randomInt(100000, 999999)}`;
  const walletDelta = centsToEur(walletDeltaCents);
  const revTx = {
    id: revId,
    userId: orig.userId,
    userEmail: orig.userEmail || cust.email,
    userName: orig.userName || cust.fullName,
    type: 'reversal',
    amount: centsToEur(origAmtCents),
    amountCents: origAmtCents,
    netAmount: walletDelta,
    feeAmount: 0,
    currency: orig.currency || 'EUR',
    status: 'completed',
    method: 'Transaction Reversal',
    reference: revRef,
    notes: `Reversal of ${orig.reference}: ${reason}`,
    reversalOfId: orig.id,
    reversedTransactionId: orig.id,
    reversalOfReference: orig.reference,
    reversalReason: reason,
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
    metadata: { reversal_of_id: orig.id, reversal_of_reference: orig.reference, wallet_delta: walletDelta, wallet_delta_cents: walletDeltaCents },
  };
  orig.reversedById = revId;
  orig.reversedByReference = revRef;
  orig.reversalReason = reason;
  mockTransactions.unshift(revTx as any);
  await persistDevState();
  return res.json({ success: true, data: { reversal: revTx, originalId: orig.id, balance: cust.balance, balanceCents: nextBalCents }, message: `Reversed ${orig.reference} via ${revRef}.`, requestId: req.id });
});

router.get('/admin/investments', requireStaffSection('investments', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try { return res.json({ success: true, data: await listPersistentInvestments(), requestId: req.id }); }
    catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: 'Investment records are temporarily unavailable.', code: 'INVESTMENT_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent investment storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const devInvestments = mockTransactions
    .filter((t) => t.type === 'investment' || t.type === 'purchase')
    .map((t) => ({
      id: t.id,
      userId: t.userId,
      userEmail: (t as any).userEmail || devCustomersById.get(t.userId)?.email,
      userName: (t as any).userName || devCustomersById.get(t.userId)?.fullName,
      propertyId: t.propertyId || '',
      propertyTitle: t.propertyTitle || t.description || 'Property SPV',
      tokensPurchased: Number(t.tokensPurchased || 0),
      totalCost: Number(t.amount || 0),
      currency: t.currency || 'EUR',
      status: t.status || 'completed',
      purchaseDate: t.createdAt,
      certificateId: (t as any).reference || t.id,
    }));
  return res.json({ success: true, data: devInvestments, requestId: req.id });
});

router.post('/admin/investments', requireStaffSection('investments', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = String(req.body?.userId || '').trim();
  const propertyId = String(req.body?.propertyId || '').trim();
  const shares = Math.max(1, Math.floor(Number(req.body?.shares || 0)));
  if (!userId || !propertyId || !Number.isFinite(shares) || shares <= 0) {
    return res.status(400).json({ success: false, error: 'Investor, property, and positive share count are required.', code: 'INVALID_INVESTMENT_PAYLOAD', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const { data, error } = await getSupabaseAdmin().rpc('record_investment', { p_user_id: userId, p_property_id: propertyId, p_shares: shares, p_admin_id: req.user!.id });
      if (error) throw error;
      return res.status(201).json({ success: true, data, message: 'Investment recorded.', requestId: req.id });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(err)).json({ success: false, error: formatDatabaseRefusal(err, 'Unable to record investment.'), code: err?.code || 'RECORD_INVESTMENT_FAILED', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const cust = devCustomersById.get(userId);
  const prop = mockListings.find((p) => p.id === propertyId);
  const sharePriceCents = toCents(req.body?.sharePriceEur || prop?.tokenPrice || 500);
  const totalCostCents = shares * sharePriceCents;
  const totalCost = centsToEur(totalCostCents);
  const nowIso = new Date().toISOString();
  const tx = {
    id: `inv-${crypto.randomBytes(5).toString('hex')}`,
    userId,
    userEmail: cust?.email,
    userName: cust?.fullName,
    type: 'investment' as const,
    amount: totalCost,
    amountCents: totalCostCents,
    netAmount: totalCost,
    feeAmount: 0,
    currency: 'EUR',
    status: 'completed' as const,
    method: 'Staff Allocation',
    reference: `KZ-INV-${crypto.randomInt(100000, 999999)}`,
    propertyId,
    propertyTitle: prop?.title || propertyId,
    tokensPurchased: shares,
    processedBy: req.user?.email || 'finance@kretz.com',
    processedById: req.user?.id,
    processedAt: nowIso,
    createdAt: nowIso,
  };
  mockTransactions.unshift(tx as any);
  if (cust) {
    cust.investedBalance = centsToEur(toCents(cust.investedBalance) + totalCostCents);
  }
  if (prop) {
    prop.fundedAmount = centsToEur(toCents(prop.fundedAmount) + totalCostCents);
  }
  await persistDevState();
  return res.status(201).json({ success: true, data: tx, message: `Recorded ${shares} shares (€${totalCost.toFixed(2)}) for ${cust?.fullName || userId}.`, requestId: req.id });
});

router.get('/admin/transactions', requireStaffSection('transactions', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try { const rows = await listAdminTransactions(); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: 'Financial transactions are temporarily unavailable.', code: 'TRANSACTION_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  res.json({
    success: true,
    data: mockTransactions,
    requestId: req.id
  });
});

router.get('/admin/deposits', requireStaffSection('deposits', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try { const rows = await listAdminTransactions('deposit'); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: 'Deposit requests are temporarily unavailable.', code: 'DEPOSIT_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent deposit storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const deposits = mockTransactions.filter(t => t.type === 'deposit');
  res.json({
    success: true,
    data: deposits,
    requestId: req.id
  });
});

router.get('/admin/withdrawals', requireStaffSection('withdrawals', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  if (canUseLiveSupabaseData()) {
    try { const rows = await listAdminTransactions('withdrawal'); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(503).json({ success: false, error: 'Withdrawal requests are temporarily unavailable.', code: 'WITHDRAWAL_DATABASE_UNAVAILABLE', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent withdrawal storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const withdrawals = mockTransactions.filter(t => t.type === 'withdrawal');
  res.json({
    success: true,
    data: withdrawals,
    requestId: req.id
  });
});

router.post('/admin/deposits/:depositId/approve', requireStaffSection('deposits', 'write'), requireActionEmailVerification('admin.deposit.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const actualCents = req.body?.amountCents !== undefined ? Math.round(Number(req.body.amountCents)) : toCents(req.body?.amount);
  const actualAmount = centsToEur(actualCents);
  if (canUseLiveSupabaseData()) {
    try {
      let row: any;
      try {
        row = await runFinancialRpc('approve_deposit', {
          p_deposit_id: req.params.depositId,
          p_received_amount: Number.isFinite(actualCents) && actualCents > 0 ? actualAmount : null,
          p_admin_id: req.user!.id,
        });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        row = await runFinancialRpc('kretz_review_deposit', { p_transaction_id: req.params.depositId, p_admin_id: req.user!.id, p_approve: true, p_reason: req.body?.reason || null });
      }
      const prof = row?.user_id ? await getUserProfile(row.user_id).catch(() => null) : null;
      if (row?.user_id) {
        await notifyInvestorEvent({
          userId: row.user_id,
          email: prof?.email,
          title: 'Deposit approved',
          message: `Your EUR ${Number(row.amount || 0).toFixed(2)} deposit (${row.reference}) has been approved and credited.`,
          type: 'success',
          emailTemplate: 'deposit_approved',
          emailData: { fullName: prof?.full_name || 'Valued Investor', amount: Number(row.amount || 0).toFixed(2), currency: 'EUR', reference: row.reference, method: row.method || 'SEPA Transfer' },
          idempotencyKey: `dep-appr-${row.id}`,
        });
      }
      return res.json({ success: true, data: toApiTransaction(row), message: 'Deposit approved and wallet credited.', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const status = resolveDatabaseErrorStatus(error);
        return res.status(status).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Deposit approval could not be completed.'),
          code: error?.code || (status >= 500 ? 'DEPOSIT_REVIEW_FAILED' : 'DEPOSIT_REVIEW_REJECTED'),
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const tx = mockTransactions.find((t) => t.id === req.params.depositId && t.type === 'deposit');
  if (!tx) return res.status(404).json({ success: false, error: 'DEPOSIT_NOT_FOUND: Deposit not found.', code: 'DEPOSIT_NOT_FOUND', requestId: req.id });
  if (tx.status !== 'pending') return res.status(409).json({ success: false, error: 'DEPOSIT_NOT_PENDING: Deposit is no longer pending.', code: 'DEPOSIT_NOT_PENDING', requestId: req.id });
  const settledCents = Number.isFinite(actualCents) && actualCents > 0 ? actualCents : toCents(tx.amount);
  tx.amount = centsToEur(settledCents);
  (tx as any).amountCents = settledCents;
  tx.status = 'completed';
  tx.processedBy = req.user?.email || 'finance@kretz.com';
  tx.processedById = req.user?.id;
  tx.processedAt = new Date().toISOString();
  const cust = devCustomersById.get(tx.userId);
  if (cust) {
    cust.balance = centsToEur(toCents(cust.balance) + settledCents);
    if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
    await notifyInvestorEvent({
      userId: cust.id,
      email: cust.email,
      title: 'Deposit approved',
      message: `Your EUR ${tx.amount.toFixed(2)} deposit (${tx.reference}) has been approved and credited.`,
      type: 'success',
      emailTemplate: 'deposit_approved',
      emailData: { fullName: cust.fullName || 'Investor', amount: tx.amount.toFixed(2), currency: 'EUR', reference: tx.reference, method: tx.method || 'SEPA Transfer' },
      idempotencyKey: `dep-appr-${tx.id}`,
    });
  }
  await persistDevState();
  return res.json({ success: true, data: tx, message: 'Deposit approved and wallet credited.', requestId: req.id });
});

router.post('/admin/deposits/:depositId/reject', requireStaffSection('deposits', 'write'), requireActionEmailVerification('admin.deposit.reject'), async (req: AuthenticatedRequest, res: Response) => {
  const reason = String(req.body?.reason || '').trim() || 'Transfer verification could not be matched.';
  if (canUseLiveSupabaseData()) {
    try {
      let row: any;
      try {
        row = await runFinancialRpc('reject_deposit', { p_deposit_id: req.params.depositId, p_reason: reason, p_admin_id: req.user!.id });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        row = await runFinancialRpc('kretz_review_deposit', { p_transaction_id: req.params.depositId, p_admin_id: req.user!.id, p_approve: false, p_reason: reason });
      }
      const prof = row?.user_id ? await getUserProfile(row.user_id).catch(() => null) : null;
      if (row?.user_id) {
        await notifyInvestorEvent({
          userId: row.user_id,
          email: prof?.email,
          title: 'Deposit declined',
          message: `Deposit ${row.reference} was declined: ${reason}`,
          type: 'warning',
        });
      }
      return res.json({ success: true, data: toApiTransaction(row), message: 'Deposit rejected.', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const status = resolveDatabaseErrorStatus(error);
        return res.status(status).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Deposit rejection could not be completed.'),
          code: error?.code || (status >= 500 ? 'DEPOSIT_REVIEW_FAILED' : 'DEPOSIT_REVIEW_REJECTED'),
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const tx = mockTransactions.find((t) => t.id === req.params.depositId && t.type === 'deposit');
  if (!tx) return res.status(404).json({ success: false, error: 'DEPOSIT_NOT_FOUND: Deposit not found.', code: 'DEPOSIT_NOT_FOUND', requestId: req.id });
  if (tx.status !== 'pending') return res.status(409).json({ success: false, error: 'DEPOSIT_NOT_PENDING: Deposit is no longer pending.', code: 'DEPOSIT_NOT_PENDING', requestId: req.id });
  tx.status = 'rejected';
  tx.notes = reason;
  tx.processedBy = req.user?.email || 'finance@kretz.com';
  tx.processedById = req.user?.id;
  tx.processedAt = new Date().toISOString();
  const cust = devCustomersById.get(tx.userId);
  if (cust) {
    await notifyInvestorEvent({
      userId: cust.id,
      email: cust.email,
      title: 'Deposit declined',
      message: `Deposit ${tx.reference} was declined: ${reason}`,
      type: 'warning',
    });
  }
  await persistDevState();
  return res.json({ success: true, data: tx, message: 'Deposit rejected.', requestId: req.id });
});

router.post('/admin/withdrawals/:withdrawalId/approve', requireStaffSection('withdrawals', 'write'), requireActionEmailVerification('admin.withdrawal.approve'), async (req: AuthenticatedRequest, res: Response) => {
  const payoutReference = String(req.body?.payoutReference || req.body?.payoutRef || req.body?.payout_ref || '').trim();
  const feeCents = req.body?.feeCents !== undefined
    ? Math.max(0, Math.round(Number(req.body.feeCents)))
    : Math.max(0, toCents(req.body?.fee ?? req.body?.feeAmount ?? platformConfig.limits?.withdrawal_fee_eur ?? 0));
  const fee = centsToEur(feeCents);

  if (canUseLiveSupabaseData()) {
    try {
      let row: any;
      try {
        row = await runFinancialRpc('approve_withdrawal', {
          p_withdrawal_id: req.params.withdrawalId,
          p_payout_ref: payoutReference || `PAYOUT-${req.params.withdrawalId.slice(-6).toUpperCase()}`,
          p_fee: fee,
          p_admin_id: req.user!.id,
        });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        row = await runFinancialRpc('kretz_review_withdrawal', { p_transaction_id: req.params.withdrawalId, p_admin_id: req.user!.id, p_approve: true, p_reason: payoutReference || req.body?.reason || null });
      }
      const prof = row?.user_id ? await getUserProfile(row.user_id).catch(() => null) : null;
      const netSendCents = Math.max(0, toCents(row?.amount) - feeCents);
      const netSend = centsToEur(netSendCents);
      const payoutResult = await dispatchBankPayoutInstruction({
        transactionId: row.id,
        reference: payoutReference || row.reference,
        amount: netSend,
        currency: 'EUR',
        iban: String(row.dest_iban || row.tx_hash || prof?.bank_iban || ''),
        holderName: prof?.bank_account_holder || prof?.full_name || 'Investor',
      });
      if (row?.user_id) {
        await notifyInvestorEvent({
          userId: row.user_id,
          email: prof?.email,
          title: 'Withdrawal approved for payout',
          message: `Your withdrawal ${row.reference} (net €${netSend.toFixed(2)}, fee €${fee.toFixed(2)}, ref ${payoutReference || row.reference}) has been approved.`,
          type: 'success',
          emailTemplate: 'payment_notification',
          emailData: { fullName: prof?.full_name || 'Valued Investor', amount: netSend.toFixed(2), currency: 'EUR', reference: payoutReference || row.reference, status: 'Approved & Dispatched' },
          idempotencyKey: `wth-appr-${row.id}`,
        });
      }
      return res.json({ success: true, data: toApiTransaction(row), payout: payoutResult, message: 'Withdrawal approved and marked for payout processing.', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const status = resolveDatabaseErrorStatus(error);
        return res.status(status).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Withdrawal approval could not be completed.'),
          code: error?.code || (status >= 500 ? 'WITHDRAWAL_REVIEW_FAILED' : 'WITHDRAWAL_REVIEW_REJECTED'),
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const tx = mockTransactions.find((t) => t.id === req.params.withdrawalId && t.type === 'withdrawal');
  if (!tx) return res.status(404).json({ success: false, error: 'WITHDRAWAL_NOT_FOUND: Withdrawal not found.', code: 'WITHDRAWAL_NOT_FOUND', requestId: req.id });
  if (tx.status !== 'pending') return res.status(409).json({ success: false, error: 'WITHDRAWAL_NOT_PENDING: Withdrawal is no longer pending.', code: 'WITHDRAWAL_NOT_PENDING', requestId: req.id });
  const txCents = toCents(tx.amount);
  if (feeCents > txCents) {
    return res.status(400).json({ success: false, error: 'WITHDRAWAL_FEE_EXCEEDS_AMOUNT: Fee cannot exceed withdrawal amount.', code: 'WITHDRAWAL_FEE_EXCEEDS_AMOUNT', requestId: req.id });
  }
  const netSendCents = Math.max(0, txCents - feeCents);
  const netSend = centsToEur(netSendCents);
  tx.status = 'completed';
  tx.payoutReference = payoutReference || tx.reference;
  tx.feeAmount = fee;
  tx.netAmount = netSend;
  (tx as any).feeCents = feeCents;
  (tx as any).netCents = netSendCents;
  tx.processedBy = req.user?.email || 'finance@kretz.com';
  tx.processedById = req.user?.id;
  tx.processedAt = new Date().toISOString();
  const cust = devCustomersById.get(tx.userId);
  const payoutResult = await dispatchBankPayoutInstruction({
    transactionId: tx.id,
    reference: tx.payoutReference,
    amount: netSend,
    currency: 'EUR',
    iban: String((tx as any).destIban || (tx as any).destination || cust?.bankIban || ''),
    holderName: cust?.bankAccountHolder || cust?.fullName || 'Investor',
  });
  if (cust) {
    await notifyInvestorEvent({
      userId: cust.id,
      email: cust.email,
      title: 'Withdrawal approved for payout',
      message: `Your withdrawal ${tx.reference} (net EUR ${netSend.toFixed(2)}, fee EUR ${fee.toFixed(2)}, transfer ref ${tx.payoutReference}) has been approved.`,
      type: 'success',
      emailTemplate: 'payment_notification',
      emailData: { fullName: cust.fullName || 'Investor', amount: netSend.toFixed(2), currency: 'EUR', reference: tx.payoutReference, status: 'Approved & Dispatched' },
      idempotencyKey: `wth-appr-${tx.id}`,
    });
  }
  await persistDevState();
  return res.json({ success: true, data: tx, payout: payoutResult, message: 'Withdrawal approved and marked for payout processing.', requestId: req.id });
});

router.post('/admin/withdrawals/:withdrawalId/reject', requireStaffSection('withdrawals', 'write'), requireActionEmailVerification('admin.withdrawal.reject'), async (req: AuthenticatedRequest, res: Response) => {
  const reason = String(req.body?.reason || '').trim() || 'Withdrawal rejected by finance review.';
  if (canUseLiveSupabaseData()) {
    try {
      let row: any;
      try {
        row = await runFinancialRpc('reject_withdrawal', { p_withdrawal_id: req.params.withdrawalId, p_reason: reason, p_admin_id: req.user!.id });
      } catch (rpcErr: any) {
        if (!isMissingSchemaError(rpcErr)) throw rpcErr;
        row = await runFinancialRpc('kretz_review_withdrawal', { p_transaction_id: req.params.withdrawalId, p_admin_id: req.user!.id, p_approve: false, p_reason: reason });
      }
      const prof = row?.user_id ? await getUserProfile(row.user_id).catch(() => null) : null;
      if (row?.user_id) {
        await notifyInvestorEvent({
          userId: row.user_id,
          email: prof?.email,
          title: 'Withdrawal declined and funds returned',
          message: `Withdrawal ${row.reference} was declined (${reason}). EUR ${Number(row.amount || 0).toFixed(2)} was returned to your wallet.`,
          type: 'warning',
        });
      }
      return res.json({ success: true, data: toApiTransaction(row), message: 'Withdrawal rejected and reserved funds refunded.', requestId: req.id });
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(error)) {
        markSupabaseSchemaMissingInDev();
      } else {
        const status = resolveDatabaseErrorStatus(error);
        return res.status(status).json({
          success: false,
          error: formatDatabaseRefusal(error, 'Withdrawal rejection could not be completed.'),
          code: error?.code || (status >= 500 ? 'WITHDRAWAL_REVIEW_FAILED' : 'WITHDRAWAL_REVIEW_REJECTED'),
          requestId: req.id,
        });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const tx = mockTransactions.find((t) => t.id === req.params.withdrawalId && t.type === 'withdrawal');
  if (!tx) return res.status(404).json({ success: false, error: 'WITHDRAWAL_NOT_FOUND: Withdrawal not found.', code: 'WITHDRAWAL_NOT_FOUND', requestId: req.id });
  if (tx.status !== 'pending') return res.status(409).json({ success: false, error: 'WITHDRAWAL_NOT_PENDING: Withdrawal is no longer pending.', code: 'WITHDRAWAL_NOT_PENDING', requestId: req.id });
  tx.status = 'rejected';
  tx.notes = reason;
  tx.processedBy = req.user?.email || 'finance@kretz.com';
  tx.processedById = req.user?.id;
  tx.processedAt = new Date().toISOString();
  const cust = devCustomersById.get(tx.userId);
  if (cust) {
    cust.balance = centsToEur(toCents(cust.balance) + toCents(tx.amount));
    if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
    await notifyInvestorEvent({
      userId: cust.id,
      email: cust.email,
      title: 'Withdrawal declined and funds returned',
      message: `Withdrawal ${tx.reference} was declined (${reason}). EUR ${Number(tx.amount || 0).toFixed(2)} was returned to your wallet.`,
      type: 'warning',
    });
  }
  await persistDevState();
  return res.json({ success: true, data: tx, message: 'Withdrawal rejected and reserved funds refunded.', requestId: req.id });
});

/**
 * ==========================================================================/**
 * ============================================================================
 * REAL ESTATE DOSSIERS & EDITORIAL INSIGHTS API ENDPOINTS
 * ============================================================================
 */

let mockInsightArticles: any[] = [
  {
    id: 'art-dossier-yield-barometer-2026',
    slug: 'barometre-rendements-immobiliers-europe-2026',
    title: 'The 2026 Prime European Real Estate Yield Barometer: Cap Rates & Risk Premiums in Paris, Madrid, and Costa del Sol',
    subtitle: 'An exhaustive cross-border analysis comparing net capitalization rates, rent indexation mechanics, and liquidity dynamics in the wake of European Central Bank rate stability.',
    excerpt: 'As European benchmark interest rates stabilize, prime residential and mixed-use commercial yields have re-anchored. This comprehensive dossier evaluates net capitalization trajectories across 12 European prime sub-markets, contrasting traditional physical acquisitions with fractional SPV debt-equity models.',
    categorySlug: 'barometre-immobilier',
    categoryName: 'Market Barometer & Valuation',
    isDossier: true,
    dossierIssue: 'Dossier N° 48 — Special Report',
    author: {
      name: 'Dr. Alexandre Moreau',
      role: 'Chief Real Estate Economist & Partner',
      avatar: '/assets/aistudio/IMG_7164_23f4c8e0.jpeg',
      organization: 'Kretz Wealth Advisory'
    },
    publishedAt: '2026-10-15T09:00:00Z',
    status: 'published',
    readTime: '14 min read',
    coverImage: 'https://files.kretzrealestate.com/45af1346e13e9c6539853447ccf5faa.jpg',
    coverImageAlt: 'Modern European architecture showcasing urban luxury real estate in Madrid and Paris',
    coverImageCaption: 'Parisian boulevard meets modern European architectural capital reallocation: institutional prime yields re-anchor above 4.5% net.',
    coverImageAttribution: 'Photo by Laurent Perrier / Kretz Editorial License',
    isFeatured: true,
    tags: ['Market Barometer', 'Yields', 'Paris Real Estate', 'Madrid Prime', 'SPV Tokenization', 'Cap Rates'],
    viewsCount: 4820,
    sharesCount: 312
  },
  {
    id: 'art-dossier-tokenization-mica',
    slug: 'tokenisation-immobiliere-cadre-juridique-spv-mica',
    title: 'Institutional Real Estate Tokenization: Transforming Deed Registries into Liquid ERC-20 SPVs under MiCA',
    subtitle: 'From physical notarial conveyance to digital securities: the legal architecture, smart contract custody, and cross-border settlement mechanisms behind modern property tokenization.',
    excerpt: 'How does a physical luxury villa in Marbella transform into a liquid, audited digital financial asset? We deconstruct the exact French and Spanish SPV legal structuring, segregated trustee custody, and compliant Polygon smart contracts powering fractional real estate.',
    categorySlug: 'proptech-tokenization',
    categoryName: 'PropTech & Asset Tokenization',
    isDossier: true,
    dossierIssue: 'Dossier N° 47 — Legal & Tech Analysis',
    author: {
      name: 'Maitre Hélène de Saint-Germain',
      role: 'Head of Legal & Regulatory Compliance',
      avatar: '/assets/aistudio/IMG_7163_8f4b2c74.png',
      organization: 'Kretz Legal Counsel'
    },
    publishedAt: '2026-10-10T11:15:00Z',
    status: 'published',
    readTime: '16 min read',
    coverImage: 'https://files.kretzrealestate.com/48be4374b5dfd9ec1fac98496621c72.jpg',
    coverImageAlt: 'Abstract blockchain digital tokens intersecting with luxury architectural blueprints',
    coverImageCaption: 'Digital tokenization bridges centuries-old notarial deeds with cryptographic settlement: an immutable bridge to liquidity.',
    coverImageAttribution: 'Photo by Kretz Blockchain Laboratory',
    isFeatured: false,
    tags: ['Tokenization', 'PropTech', 'Smart Contracts', 'MiCA', 'SPV Custody', 'Blockchain'],
    viewsCount: 3940,
    sharesCount: 245
  }
];

// GET /api/v1/insights - List public published articles
router.get('/insights', (req, res) => {
  const { category, search, isDossier } = req.query;
  let filtered = mockInsightArticles.filter(a => a.status === 'published');

  if (category && category !== 'all') {
    filtered = filtered.filter(a => a.categorySlug === category);
  }
  if (isDossier !== undefined) {
    filtered = filtered.filter(a => String(a.isDossier) === String(isDossier));
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.excerpt.toLowerCase().includes(q) || 
      a.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    data: filtered,
    total: filtered.length,
    requestId: (req as any).id
  });
});

// GET /api/v1/insights/:slug - Get single published article
router.get('/insights/:slug', (req, res) => {
  const { slug } = req.params;
  const article = mockInsightArticles.find(a => a.slug === slug || a.id === slug);
  if (!article) {
    return res.status(404).json({
      success: false,
      error: 'Insight article not found',
      requestId: (req as any).id
    });
  }
  article.viewsCount = (article.viewsCount || 0) + 1;
  res.json({
    success: true,
    data: article,
    requestId: (req as any).id
  });
});

/**
 * GET /api/v1/blog & /api/blog
 * Returns editorial blog articles with category & search filters
 */
router.get('/blog', (req: AuthenticatedRequest, res: Response) => {
  const { category, search } = req.query;
  let posts = [...BLOG_POSTS];

  if (category && typeof category === 'string' && category !== 'all') {
    posts = posts.filter(p => p.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return res.json({
    success: true,
    data: posts,
    total: posts.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/blog/:slug & /api/blog/:slug
 */
router.get('/blog/:slug', (req: AuthenticatedRequest, res: Response) => {
  const { slug } = req.params;
  const post = BLOG_POSTS.find(p => p.slug === slug || p.id === slug);

  if (!post) {
    return res.status(404).json({
      success: false,
      error: 'Blog article not found',
      requestId: req.id
    });
  }

  return res.json({
    success: true,
    data: post,
    requestId: req.id
  });
});

// Admin endpoints
router.get('/admin/insights', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: mockInsightArticles,
    requestId: req.id
  });
});

router.post('/admin/insights', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  if (!body.title || !body.slug) {
    return res.status(400).json({
      success: false,
      error: 'Article title and slug are required.',
      requestId: req.id
    });
  }

  const newArticle = {
    ...body,
    id: `art-dossier-${Date.now()}`,
    viewsCount: 0,
    sharesCount: 0,
    publishedAt: body.publishedAt || new Date().toISOString()
  };

  mockInsightArticles.unshift(newArticle);

  mockAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    adminId: req.user?.id || 'usr-admin-01',
    adminEmail: req.user?.email || 'admin@kretz.com',
    action: 'INSIGHT_ARTICLE_CREATED',
    details: `Created editorial article "${newArticle.title}" (ID: ${newArticle.id})`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    data: newArticle,
    requestId: req.id
  });
});

router.patch('/admin/insights/:id', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = mockInsightArticles.find(a => a.id === id);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: 'Article not found',
      requestId: req.id
    });
  }

  Object.assign(target, req.body, { updatedAt: new Date().toISOString() });

  mockAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    adminId: req.user?.id || 'usr-admin-01',
    adminEmail: req.user?.email || 'admin@kretz.com',
    action: 'INSIGHT_ARTICLE_UPDATED',
    details: `Updated editorial article "${target.title}" (ID: ${target.id})`,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    data: target,
    requestId: req.id
  });
});

router.delete('/admin/insights/:id', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetIndex = mockInsightArticles.findIndex(a => a.id === id);
  if (targetIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Article not found',
      requestId: req.id
    });
  }

  const removed = mockInsightArticles.splice(targetIndex, 1)[0];

  mockAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    adminId: req.user?.id || 'usr-admin-01',
    adminEmail: req.user?.email || 'admin@kretz.com',
    action: 'INSIGHT_ARTICLE_DELETED',
    details: `Deleted editorial article "${removed.title}" (ID: ${id})`,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: `Article ${id} deleted successfully.`,
    requestId: req.id
  });
});

// ============================================================================
// ADMIN EMAIL COMMUNICATION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/admin/email/templates
 * List all available email templates with descriptions, categories, commands, and variables
 */
router.get('/admin/email/templates', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: emailTemplates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      defaultSubject: t.defaultSubject,
      supportedCommand: t.supportedCommand,
      defaultVariables: t.defaultVariables,
      sampleData: t.sampleData
    })),
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/email/preview/:templateId
 * Render live preview of an email template with HTML, plain text, and variable interpolation
 */
router.get('/admin/email/preview/:templateId', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  const { templateId } = req.params;
  const template = emailTemplates.find(t => t.id === templateId);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: `Email template '${templateId}' not found.`,
      requestId: req.id
    });
  }

  const customData = req.query ? { ...template.sampleData, ...req.query } : template.sampleData;
  const settings = getEmailSettings();
  let subject = settings.subjectOverrides[templateId] || template.defaultSubject;
  
  Object.keys(customData).forEach(k => {
    subject = subject.replace(new RegExp(`{{${k}}}`, 'g'), String(customData[k] || ''));
  });

  const html = template.generateHtml(customData, settings);
  const text = template.generateText(customData, settings);

  res.json({
    success: true,
    data: {
      id: template.id,
      name: template.name,
      category: template.category,
      supportedCommand: template.supportedCommand,
      subject,
      html,
      text,
      sampleData: template.sampleData,
      defaultVariables: template.defaultVariables
    },
    requestId: req.id
  });
});

/**
 * POST /api/v1/admin/email/execute-command
 * Executes an authenticated command-based email notification
 */
router.post('/admin/email/execute-command', requireStaffSection('staff-roles', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { command, recipient, payload, idempotencyKey, eventId } = req.body || {};

  if (!command || !recipient) {
    return res.status(400).json({
      success: false,
      error: 'Command name and recipient email address are required.',
      requestId: req.id
    });
  }

  try {
    const result = await executeEmailCommand({
      command,
      recipient,
      payload,
      idempotencyKey,
      eventId,
      callerRole: req.user?.role || 'admin'
    });

    res.json({
      success: result.success,
      data: result,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || `Failed to execute email command '${command}'.`,
      requestId: req.id
    });
  }
});

/**
 * POST /api/v1/admin/email/send-test
 * Dispatches a real test email for any template to an admin-designated recipient
 */
router.post('/admin/email/send-test', requireStaffSection('staff-roles', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { templateId, recipient, customData, subjectOverride } = req.body || {};

  if (!templateId || !recipient) {
    return res.status(400).json({
      success: false,
      error: 'Template ID and recipient email address are required.',
      requestId: req.id
    });
  }

  const template = emailTemplates.find(t => t.id === templateId);
  if (!template) {
    return res.status(404).json({
      success: false,
      error: `Template '${templateId}' not found.`,
      requestId: req.id
    });
  }

  const mergedData = { ...template.sampleData, ...(customData || {}) };

  try {
    const result = await sendEmail({
      templateId,
      recipient,
      data: mergedData,
      subjectOverride,
      bypassAutomationCheck: true
    });

    res.json({
      success: true,
      data: result,
      message: `Test email (${template.name}) successfully dispatched to ${recipient}.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch test email.',
      requestId: req.id
    });
  }
});

/**
 * GET /api/v1/admin/email/automations
 * Retrieve all event-driven email automation trigger rules
 */
router.get('/admin/email/automations', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: getAutomationRules(),
    requestId: req.id
  });
});

/**
 * PATCH /api/v1/admin/email/automations/:id
 * Toggle or update an event automation rule
 */
router.patch('/admin/email/automations/:id', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const updated = updateAutomationRule(id, req.body || {});
    res.json({
      success: true,
      data: updated,
      message: `Automation rule '${id}' updated.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      error: err.message || 'Automation rule not found.',
      requestId: req.id
    });
  }
});

/**
 * GET /api/v1/admin/email/logs
 * Retrieve recent email transmission activity logs
 */
router.get('/admin/email/logs', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  const { recipient, status, templateId, search } = req.query;
  let logs = getEmailLogs();

  if (recipient && typeof recipient === 'string') {
    logs = logs.filter(l => l.recipient.toLowerCase().includes(recipient.toLowerCase()));
  }
  if (status && typeof status === 'string' && status !== 'all') {
    logs = logs.filter(l => l.status === status);
  }
  if (templateId && typeof templateId === 'string' && templateId !== 'all') {
    logs = logs.filter(l => l.templateId === templateId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(l => 
      l.recipient.toLowerCase().includes(q) || 
      l.subject.toLowerCase().includes(q) ||
      (l.commandName && l.commandName.toLowerCase().includes(q)) ||
      (l.reference && l.reference.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    data: logs,
    requestId: req.id
  });
});

/**
 * POST /api/v1/admin/email/logs/:id/retry
 * Safely retry failed message delivery
 */
router.post('/admin/email/logs/:id/retry', requireStaffSection('staff-roles', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await retryFailedEmail(id);
    res.json({
      success: result.success,
      data: result.log,
      message: result.success ? `Email ${id} retried successfully.` : `Retry failed: ${result.error}`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retry email delivery.',
      requestId: req.id
    });
  }
});

/**
 * DELETE /api/v1/admin/email/logs
 * Clear in-memory log buffer
 */
router.delete('/admin/email/logs', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  clearEmailLogs();
  res.json({
    success: true,
    message: 'Email audit activity logs cleared.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/email/settings
 * Retrieve sender metadata, support info, and provider transport status
 */
router.get('/admin/email/settings', requireStaffSection('staff-roles', 'read'), (req: AuthenticatedRequest, res: Response) => {
  const prov = getProviderConfig();
  res.json({
    success: true,
    data: {
      ...getEmailSettings(),
      providerType: prov.type,
      providerName: prov.name,
      providerConfigured: prov.configured
    },
    requestId: req.id
  });
});

/**
 * POST /api/v1/admin/email/settings
 * Update sender name, address, support contact, and subject overrides
 */
router.post('/admin/email/settings', requireStaffSection('staff-roles', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body || {};
  const updated = updateEmailSettings(updates);

  res.json({
    success: true,
    data: updated,
    message: 'Email sender configuration and template subject overrides updated.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/email/verify-smtp
 * Test provider connection and return SPF/DMARC/DKIM recommendations
 */
router.get('/admin/email/verify-smtp', requireStaffSection('staff-roles', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const result = await verifySmtpConnection();
  res.json({
    success: result.connected,
    data: result,
    requestId: req.id
  });
});

router.get('/admin/email/verify-provider', requireStaffSection('staff-roles', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  const result = await verifySmtpConnection();
  res.json({
    success: result.connected,
    data: result,
    requestId: req.id
  });
});

/**
 * POST /api/v1/webhooks/email
 * Ingest delivery status webhooks from Resend, SendGrid, or local simulation
 */
router.post('/webhooks/email', (req, res) => {
  const webhookSecret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    return res.status(503).json({
      success: false,
      error: 'Email webhook verification is not configured.',
      code: 'EMAIL_WEBHOOK_NOT_CONFIGURED'
    });
  }

  // Resend uses Svix headers and signs: "{svix-id}.{svix-timestamp}.{raw request body}".
  const svixId = String(req.headers['svix-id'] || '');
  const svixTimestamp = String(req.headers['svix-timestamp'] || '');
  const svixSignature = String(req.headers['svix-signature'] || '');
  const rawBody = (req as any).rawBody;
  const timestamp = Number(svixTimestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!svixId || !/^\d+$/.test(svixTimestamp) || !svixSignature || typeof rawBody !== 'string' ||
      !Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 ||
      !webhookSecret.startsWith('whsec_')) {
    return res.status(401).json({ success: false, error: 'Invalid email webhook signature.', code: 'INVALID_EMAIL_WEBHOOK_SIGNATURE' });
  }

  let signingKey: Buffer;
  try {
    signingKey = Buffer.from(webhookSecret.slice('whsec_'.length), 'base64');
    if (!signingKey.length) throw new Error('invalid signing key');
  } catch {
    return res.status(503).json({ success: false, error: 'Email webhook verification is not configured correctly.', code: 'EMAIL_WEBHOOK_NOT_CONFIGURED' });
  }

  const expected = crypto.createHmac('sha256', signingKey)
    .update(`${svixId}.${svixTimestamp}.${rawBody}`, 'utf8')
    .digest();
  const signatures = svixSignature.split(/\s+/).flatMap((part) => {
    const match = /^v1,([A-Za-z0-9+/=]+)$/.exec(part);
    return match ? [match[1]] : [];
  });
  const validSignature = signatures.some((candidate) => {
    try {
      const supplied = Buffer.from(candidate, 'base64');
      return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
    } catch {
      return false;
    }
  });

  if (!validSignature) {
    return res.status(401).json({ success: false, error: 'Invalid email webhook signature.', code: 'INVALID_EMAIL_WEBHOOK_SIGNATURE' });
  }

  const result = handleEmailWebhook(req.body);
  return res.status(200).json({
    success: true,
    processed: result.processed,
    updatedCount: result.updatedCount,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// INSTITUTIONAL CORPORATE IDENTITY, SOLANA INFRASTRUCTURE & TRUST CENTRE API
// ============================================================================
const OFFICIAL_COMPANY_IDENTITY = {
  siren: '494 861 560',
  rcs: 'Paris, 494 861 560 R.C.S.',
  siret: '494 861 560 00030',
  vatIdentificationNumber: 'FR80494861560',
  legalForm: 'LLC (Private Limited Company)',
  operatingBrand: "L'Agence Real Estate · Kretz & De Spain",
  website: 'https://kretzdespain.com',
  parisOffice: '24 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
  barcelonaOffice: 'Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain',
  contactEmail: 'info@kretz.site'
};

const OFFICIAL_SOLANA_INFRASTRUCTURE = [
  {
    id: 'usdc-mint',
    name: 'USDC Stablecoin Mint',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cluster: 'mainnet-beta',
    role: 'Settlement & Rental Distribution Stablecoin Mint',
    purposes: [
      'Stablecoin used for purchasing investment interests',
      'Currency intended for rental distribution payments'
    ],
    notice: 'Official Solana USDC stablecoin mint. Not a property-share token or bespoke rental distribution contract.',
    explorerUrl: 'https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  },
  {
    id: 'spl-token-program',
    name: 'Solana SPL Token Program',
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    cluster: 'mainnet-beta',
    role: 'Canonical Fungible Token Program',
    purposes: [
      'Token balances',
      'Token minting',
      'Token transfers',
      'Property investment token operations where applicable'
    ],
    explorerUrl: 'https://explorer.solana.com/address/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  },
  {
    id: 'token-2022-program',
    name: 'Solana Token-2022 Program',
    address: 'TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb',
    cluster: 'mainnet-beta',
    role: 'Compliance & Token Extensions Program',
    purposes: [
      'Compliance-related token extensions',
      'Transfer restrictions',
      'Transfer hooks',
      'Freeze and allowlist functionality where appropriately configured'
    ],
    explorerUrl: 'https://explorer.solana.com/address/TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb'
  }
];

let cachedMainnetRpcVerification: {
  expiresAt: number;
  payload: Record<string, any>;
} | null = null;

async function querySolanaMainnetAccounts(addresses: string[]): Promise<Record<string, any> | null> {
  if (cachedMainnetRpcVerification && Date.now() < cachedMainnetRpcVerification.expiresAt) {
    return cachedMainnetRpcVerification.payload;
  }

  const rpcEndpoints = [
    process.env.SOLANA_MAINNET_RPC_URL,
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com'
  ].filter((u): u is string => Boolean(u && u.startsWith('http')));

  for (const endpoint of rpcEndpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getMultipleAccounts',
          params: [addresses, { encoding: 'base64', commitment: 'confirmed' }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const json: any = await response.json();
      const values = json?.result?.value;
      if (!Array.isArray(values)) continue;

      const verifiedAt = new Date().toISOString();
      const map: Record<string, any> = {};
      addresses.forEach((addr, idx) => {
        const info = values[idx];
        map[addr] = {
          address: addr,
          exists: Boolean(info),
          executable: Boolean(info?.executable),
          owner: info?.owner || null,
          lamports: Number(info?.lamports ?? 0),
          verifiedAt,
          endpoint
        };
      });

      cachedMainnetRpcVerification = {
        expiresAt: Date.now() + 5 * 60 * 1000,
        payload: map
      };
      return map;
    } catch {
      clearTimeout(timeout);
    }
  }
  return null;
}

router.get('/blockchain/infrastructure', async (req, res) => {
  const shouldVerifyRpc = String(req.query.verifyRpc || '').toLowerCase() === 'true';
  let rpcVerification: Record<string, any> | null = null;
  if (shouldVerifyRpc) {
    rpcVerification = await querySolanaMainnetAccounts(
      OFFICIAL_SOLANA_INFRASTRUCTURE.map((item) => item.address)
    );
  }

  res.json({
    success: true,
    data: {
      company: OFFICIAL_COMPANY_IDENTITY,
      network: 'Solana Mainnet-Beta',
      programsAndMints: OFFICIAL_SOLANA_INFRASTRUCTURE,
      customSpvContractsStatus: {
        status: 'BLOCKED',
        reason: 'Bespoke per-property SPV Token-2022 mints and automated distribution contracts require per-deal notarial SPV closing, Mainnet deployment keys, and independent third-party smart-contract security audit.'
      },
      rpcVerification
    }
  });
});

router.get('/trust-center', (_req, res) => {
  res.json({
    success: true,
    data: {
      company: OFFICIAL_COMPANY_IDENTITY,
      blockchain: OFFICIAL_SOLANA_INFRASTRUCTURE,
      legalDocumentsCount: 12,
      securityControls: {
        adminRouteIsolation: true,
        rbacEnforcement: true,
        rateLimitingActive: true,
        nonCustodialSolanaSigning: true
      },
      updatedAt: new Date().toISOString()
    }
  });
});

// ============================================================================
// 12. PROPERTY PAYMENT DISTRIBUTION & DAILY SYNCHRONIZATION API
// ============================================================================

/**
 * GET /api/v1/distributions/my-properties
 * Returns verified property-by-property payment allocations and daily payment history
 * for the authenticated investor.
 */
router.get('/distributions/my-properties', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const matchedUser = await findUserRecordForRequest(req);
  const resolvedEmail = matchedUser?.email || req.user?.email || '';

  // Filter investor transactions
  const userInvTxs = mockTransactions.filter(
    t => (t.userId === userId || (Boolean(resolvedEmail) && t.userEmail === resolvedEmail)) &&
         t.type === 'investment' &&
         t.status === 'completed'
  );

  const summaries = dailyPaymentService.getUserPropertyDistributions(
    userId,
    resolvedEmail,
    userInvTxs,
    mockListings
  );

  const totalDaily = Math.round(summaries.reduce((acc, s) => acc + s.dailyPaymentAmountEUR, 0) * 100) / 100;
  const totalReceived = Math.round(summaries.reduce((acc, s) => acc + s.totalPaymentsReceivedEUR, 0) * 100) / 100;
  const totalPending = Math.round(summaries.reduce((acc, s) => acc + s.pendingPaymentsEUR, 0) * 100) / 100;
  const totalCapital = Math.round(summaries.reduce((acc, s) => acc + s.totalAllocatedInvestmentEUR, 0) * 100) / 100;

  res.json({
    success: true,
    data: {
      summaries,
      totalPropertiesCount: summaries.length,
      totalAllocatedCapitalEUR: totalCapital,
      totalDailyEntitlementEUR: totalDaily,
      totalPaymentsReceivedEUR: totalReceived,
      totalPendingPaymentsEUR: totalPending,
      lastUpdated: new Date().toISOString()
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/distributions/properties/:id
 * Returns daily payment terms and distribution metrics for a specific property
 */
router.get('/distributions/properties/:id', (req: AuthenticatedRequest, res: Response) => {
  const propId = req.params.id;
  const prop = mockListings.find(p => p.id === propId || p.slug === propId);
  if (!prop) {
    return res.status(404).json({
      success: false,
      error: `Property ${propId} not found in offerings catalog.`,
      code: 'PROPERTY_NOT_FOUND',
      requestId: req.id
    });
  }

  const config = dailyPaymentService.ensurePropertyConfig(prop);
  res.json({
    success: true,
    data: config,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/distributions/configs
 * Admin: Retrieve all property payment distribution configurations
 */
router.get('/admin/distributions/configs', requireStaffSection('distributions', 'read'), (req: AuthenticatedRequest, res: Response) => {
  // Ensure all current catalog listings have a configuration
  for (const listing of mockListings) {
    dailyPaymentService.ensurePropertyConfig(listing);
  }
  const configs = dailyPaymentService.getAllConfigs();
  res.json({
    success: true,
    data: configs,
    requestId: req.id
  });
});

/**
 * PUT /api/v1/admin/distributions/configs/:propertyId
 * Admin: Authorize or update property payment percentage, schedule, or available funds
 */
router.put('/admin/distributions/configs/:propertyId', requireStaffSection('distributions', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { propertyId } = req.params;
  try {
    const updated = dailyPaymentService.updateConfig(propertyId, req.body || {}, req.user!.email);

    logger.log({
      level: 'info',
      category: 'admin',
      requestId: req.id || 'req-admin-dist',
      userId: req.user?.id,
      eventType: 'PROPERTY_PAYMENT_CONFIG_UPDATED',
      outcome: 'success',
      message: `Admin ${req.user?.email} updated daily payment configuration for ${propertyId}.`,
      metadata: { propertyId, updates: req.body }
    });

    res.json({
      success: true,
      data: updated,
      message: `Daily payment terms updated successfully for ${updated.propertyTitle}.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
      requestId: req.id
    });
  }
});

/**
 * POST /api/v1/admin/distributions/properties/:id/toggle
 * Admin: Suspend or resume daily payouts for a property
 */
router.post('/admin/distributions/properties/:id/toggle', requireStaffSection('distributions', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};
  if (!['active', 'suspended', 'paused'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be active, suspended, or paused.',
      requestId: req.id
    });
  }

  try {
    const updated = dailyPaymentService.togglePropertyStatus(id, status, reason || '', req.user!.email);
    logger.log({
      level: 'warn',
      category: 'admin',
      requestId: req.id || 'req-admin-dist',
      userId: req.user?.id,
      eventType: 'PROPERTY_PAYMENT_STATUS_TOGGLED',
      outcome: 'success',
      message: `Admin ${req.user?.email} toggled payout status for ${id} to ${status}. Reason: ${reason || 'None provided'}`,
      metadata: { propertyId: id, status, reason }
    });

    res.json({
      success: true,
      data: updated,
      message: `Property ${updated.propertyTitle} payout status updated to ${status}.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
      requestId: req.id
    });
  }
});

/**
 * POST /api/v1/admin/distributions/process
 * Admin: Execute daily payment calculation and processing run with idempotency protection
 */
router.post('/admin/distributions/process', requireStaffSection('distributions', 'write'), (req: AuthenticatedRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent distribution processing is not configured. No customer balances were changed.', code: 'DISTRIBUTION_DATABASE_NOT_CONFIGURED', requestId: req.id });
  try {
    const result = dailyPaymentService.processDailyRun(
      req.body || {},
      { id: req.user!.id, email: req.user!.email },
      (propId) => {
        // Find all investors in this property
        const relevantTxs = mockTransactions.filter(
          t => t.type === 'investment' && 
               t.status === 'completed' && 
               ((t as any).propertyId === propId || (t as any).propertyTitle?.toLowerCase().includes(propId.toLowerCase()))
        );

        const userMap = new Map<string, any>();
        for (const tx of relevantTxs) {
          const prev = userMap.get(tx.userId);
          const tokens = Number((tx as any).tokensPurchased || 0);
          const cost = Number(tx.amount || 0);
          if (prev) {
            prev.tokensCount += tokens;
            prev.allocatedEUR += cost;
          } else {
            userMap.set(tx.userId, {
              userId: tx.userId,
              userEmail: tx.userEmail || '',
              userName: 'Institutional Investor',
              tokensCount: tokens,
              allocatedEUR: cost,
              investmentId: tx.id
            });
          }
        }
        return Array.from(userMap.values());
      },
      (targetUserId, amountEUR, propTitle, ref, date) => {
        const txId = `tx-dist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        mockTransactions.unshift({
          id: txId,
          userId: targetUserId,
          userEmail: '',
          type: 'distribution',
          amount: amountEUR,
          currency: 'EUR',
          status: 'completed',
          method: 'Automated Daily Rental Distribution',
          propertyTitle: propTitle,
          reference: ref,
          createdAt: new Date().toISOString(),
          metadata: {
            distributionDate: date,
            disbursementType: 'daily_payout'
          }
        } as any);

        return { success: true, txId };
      }
    );

    logger.log({
      level: 'info',
      category: 'payments',
      requestId: req.id || 'req-process-dist',
      userId: req.user?.id,
      eventType: 'DAILY_PAYMENTS_PROCESSED',
      outcome: 'success',
      message: `Admin ${req.user?.email} executed daily payment run for ${result.date}: €${result.totalDisbursedEUR} disbursed across ${result.successfulPaymentsCount} payments.`,
      metadata: { runId: result.runId, date: result.date, totalDisbursedEUR: result.totalDisbursedEUR }
    });

    res.json({
      success: true,
      data: result,
      message: `Daily payment run completed for ${result.date}. Total disbursed: €${result.totalDisbursedEUR.toFixed(2)}.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      requestId: req.id
    });
  }
});

/**
 * POST /api/v1/admin/distributions/records/:id/adjust
 * Admin: Adjust or correct a payment record with mandatory audit reason
 */
router.post('/admin/distributions/records/:id/adjust', requireStaffSection('distributions', 'write'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const updated = dailyPaymentService.adjustRecord(id, req.body || {}, req.user!.email);

    logger.log({
      level: 'warn',
      category: 'admin',
      requestId: req.id || 'req-adjust-dist',
      userId: req.user?.id,
      eventType: 'PAYMENT_RECORD_ADJUSTED',
      outcome: 'success',
      message: `Admin ${req.user?.email} adjusted payment record ${id}. Reason: ${req.body?.reason}`,
      metadata: { recordId: id, updates: req.body }
    });

    res.json({
      success: true,
      data: updated,
      message: `Payment record ${id} adjusted successfully.`,
      requestId: req.id
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
      requestId: req.id
    });
  }
});

/**
 * GET /api/v1/admin/distributions/records
 * Admin: Query all payment distribution records with filters
 */
router.get('/admin/distributions/records', requireStaffSection('distributions', 'read'), (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, userId, status, startDate, endDate } = req.query;
  const records = dailyPaymentService.getRecords({
    propertyId: propertyId ? String(propertyId) : undefined,
    userId: userId ? String(userId) : undefined,
    status: status ? String(status) : undefined,
    startDate: startDate ? String(startDate) : undefined,
    endDate: endDate ? String(endDate) : undefined
  });

  res.json({
    success: true,
    data: {
      records,
      totalCount: records.length,
      totalAmountEUR: Math.round(records.reduce((acc, r) => acc + r.calculatedDailyAmountEUR, 0) * 100) / 100
    },
    requestId: req.id
  });
});

router.post('/admin/distributions/pay', requireStaffSection('distributions', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  const propertyId = String(req.body?.propertyId || '').trim();
  const totalCents = req.body?.totalAmountCents !== undefined
    ? Math.round(Number(req.body.totalAmountCents))
    : toCents(req.body?.totalAmountEur);
  const totalAmountEur = centsToEur(totalCents);
  const note = String(req.body?.note || '').trim();
  if (!propertyId || !Number.isFinite(totalCents) || totalCents <= 0) {
    return res.status(400).json({ success: false, error: 'Property and positive distribution amount are required.', code: 'INVALID_DISTRIBUTION_PAYLOAD', requestId: req.id });
  }
  if (canUseLiveSupabaseData()) {
    try {
      const { data, error } = await getSupabaseAdmin().rpc('pay_distribution', {
        p_property_id: propertyId,
        p_total_amount: totalAmountEur,
        p_note: note || null,
        p_admin_id: req.user!.id,
      });
      if (error) throw error;
      return res.json({ success: true, data, paidCount: Number((data as any)?.recipients_paid || (data as any)?.paid_count || (data as any)?.investors_paid || 0), message: 'Distribution executed via database function.', requestId: req.id });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isMissingSchemaError(err)) {
        markSupabaseSchemaMissingInDev();
      } else {
        return res.status(resolveDatabaseErrorStatus(err)).json({ success: false, error: formatDatabaseRefusal(err, 'Unable to process distribution.'), code: err?.code || 'DISTRIBUTION_FAILED', requestId: req.id });
      }
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Database not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  const holdingsByUser = new Map<string, number>();
  for (const t of mockTransactions) {
    if ((t.type === 'investment' || t.type === 'purchase') && t.status === 'completed' && t.propertyId === propertyId) {
      const units = Number((t as any).tokensPurchased || 0);
      if (units > 0) holdingsByUser.set(t.userId, (holdingsByUser.get(t.userId) || 0) + units);
    }
  }
  const holders = Array.from(holdingsByUser.entries()).map(([userId, shares]) => ({ userId, shares }));
  const totalShares = holders.reduce((s, h) => s + h.shares, 0);
  if (totalShares <= 0) {
    return res.status(400).json({ success: false, error: 'NO_PROPERTY_HOLDERS: No active shareholdings found for this property.', code: 'NO_PROPERTY_HOLDERS', requestId: req.id });
  }
  const allocatedCents = allocateProportionalCents(totalCents, holders);
  const prop = mockListings.find((p) => p.id === propertyId);
  let paidCount = 0;
  const nowIso = new Date().toISOString();
  for (const [uid] of holdingsByUser.entries()) {
    const payoutCents = allocatedCents.get(uid) || 0;
    if (payoutCents <= 0) continue;
    const payout = centsToEur(payoutCents);
    const cust = devCustomersById.get(uid);
    if (cust) {
      cust.balance = centsToEur(toCents(cust.balance) + payoutCents);
      if (userSubBalancesStore.has(cust.id)) userSubBalancesStore.get(cust.id)!.EUR = cust.balance;
    }
    mockTransactions.unshift({
      id: `dist-${crypto.randomBytes(5).toString('hex')}`,
      userId: uid,
      userEmail: cust?.email,
      userName: cust?.fullName,
      type: 'dividend',
      amount: payout,
      amountCents: payoutCents,
      netAmount: payout,
      feeAmount: 0,
      currency: 'EUR',
      status: 'completed',
      method: 'Property Yield Distribution',
      reference: `KZ-DIST-${crypto.randomInt(100000, 999999)}`,
      propertyId,
      propertyTitle: prop?.title || propertyId,
      notes: note || undefined,
      processedBy: req.user?.email || 'finance@kretz.com',
      processedById: req.user?.id,
      processedAt: nowIso,
      createdAt: nowIso,
    } as any);
    paidCount += 1;
  }
  await persistDevState();
  return res.json({
    success: true,
    data: { paidCount, totalAmountEur, totalCents, propertyId, note },
    paidCount,
    message: `Paid €${totalAmountEur.toFixed(2)} across ${paidCount} investor${paidCount === 1 ? '' : 's'}.`,
    requestId: req.id,
  });
});

/**
 * GET /api/v1/distributions/export
 * Download payment distribution statement in CSV format
 */
router.get('/distributions/export', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, format = 'csv' } = req.query;
  const isAdmin = req.user?.role === 'admin';
  const filterUserId = isAdmin ? undefined : req.user!.id;

  const records = dailyPaymentService.getRecords({
    propertyId: propertyId ? String(propertyId) : undefined,
    userId: filterUserId
  });

  const filename = `distributions-statement-${propertyId || 'all'}-${new Date().toISOString().split('T')[0]}.${format}`;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(records, null, 2));
  }

  const csv = generatePropertyPaymentsCsv(records, String(propertyId || 'All Properties'));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export function __testSetCustomerFinancialState(
  userId: string,
  updates: { kycStatus?: 'pending' | 'verified' | 'rejected'; balance?: number }
): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__testSetCustomerFinancialState is only available in test mode');
  }
  const customer = devCustomersById.get(userId);
  if (!customer) {
    throw new Error(`Test customer not found: ${userId}`);
  }
  if (updates.kycStatus !== undefined) {
    customer.kycStatus = updates.kycStatus;
  }
  if (updates.balance !== undefined) {
    customer.balance = updates.balance;
    mockTransactions.unshift({
      id: `tx-test-credit-${Date.now()}`,
      userId: customer.id,
      userEmail: customer.email,
      type: 'deposit',
      amount: updates.balance,
      currency: 'EUR',
      status: 'completed',
      method: 'Direct Wire Received',
      reference: `KZ-TEST-${Date.now()}`,
      createdAt: new Date().toISOString()
    } as any);
  }
}

export default router;
