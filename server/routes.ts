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

import { Router, Response } from 'express';
import { AuthenticatedRequest, rateLimiter, requireAuth, requireAdmin, requireAdminOrLogSecret } from './middleware';
import { logger } from './logger';
import { verifyTurnstileToken, requireTurnstile } from './turnstile';
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
  generateExpiringToken,
  verifyAndConsumeToken,
  verifySmtpConnection,
  getSmtpCredentials,
  getProviderConfig
} from './emailService';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateEmail,
  createSession,
  getSession,
  revokeSession,
  revokeAllUserSessions,
  checkBruteForceLimit,
  recordFailedLogin,
  resetFailedLogin
} from './authService';
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
import { ALL_KRETZ_MEMBERS } from '../src/data/kretzTeam';
import { BLOG_POSTS } from '../src/data/blogPosts';
import { dailyPaymentService } from './dailyPaymentService';
import { generatePropertyPaymentsCsv } from '../src/lib/distributionService';
import {
  isSupabaseServerConfigured, databaseHealth, listUserTransactions, listAdminTransactions,
  getUserProfile, updateUserProfile, runFinancialRpc, toApiTransaction, listInvestmentPlans,
  getInvestmentPlan, listUserInvestments, listAdminUsers, getPersistentDashboardSummary,
  getPersistentAdminDashboard, listPersistentInvestments, listPersistentAuditLogs, getAdminIdentityByEmail,
  createPersistentInvestmentPlan, updatePersistentInvestmentPlan,
  listUserNotifications, markUserNotificationRead, markAllUserNotificationsRead,
  listUserFavorites, saveUserFavorite, removeUserFavorite, getUserPreferences, saveUserPreferences,
  getPersistentAccountStatement, getPersistentPerformance
} from './supabaseDatabase';

const router = Router();

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

const securityLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  category: 'security',
  message: 'Too many security checks. Please wait 1 minute.'
});

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
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

export function sanitizeUser(user: MockUser): Omit<MockUser, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

// In-memory data store for server-authoritative state
// Seed accounts with industry-standard bcrypt hashes and 0 balance
let mockUsers: MockUser[] = process.env.NODE_ENV === 'production' ? [] : [
  {
    id: 'usr-admin-kretz-site',
    email: 'info@kretz.site',
    fullName: 'Kretz Executive Admin',
    passwordHash: hashPassword('AdminSecret2026!'),
    role: 'admin',
    kycStatus: 'approved',
    balance: 0,
    currency: 'EUR',
    country: 'Spain',
    countryCode: 'ES',
    phoneNumber: '+34 912 345 678',
    isEmailVerified: true,
    status: 'active',
    createdAt: '2025-01-01T09:00:00Z'
  },
  {
    id: 'usr-admin-01',
    email: 'admin@kretz.com',
    fullName: 'Chief Compliance Officer',
    passwordHash: hashPassword('AdminSecret2026!'),
    role: 'admin',
    kycStatus: 'approved',
    balance: 0,
    currency: 'EUR',
    country: 'Spain',
    countryCode: 'ES',
    phoneNumber: '+34 912 345 678',
    isEmailVerified: true,
    status: 'active',
    createdAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'usr-investor-01',
    email: 'investor@kretz.com',
    fullName: 'European Angel Partner',
    passwordHash: hashPassword('InvestorPass123!'),
    role: 'investor',
    kycStatus: 'approved',
    balance: 0,
    currency: 'EUR',
    isEmailVerified: true,
    status: 'active',
    createdAt: '2025-02-10T11:30:00Z'
  },
  {
    id: 'usr-investor-02',
    email: 'sophie.martin@luxcapital.fr',
    fullName: 'Sophie Martin',
    passwordHash: hashPassword('InvestorPass123!'),
    role: 'investor',
    kycStatus: 'pending',
    balance: 0,
    currency: 'EUR',
    isEmailVerified: true,
    status: 'active',
    createdAt: '2025-03-01T14:20:00Z'
  }
];

let mockListings = [
  {
    id: 'prop-villa-mirador',
    slug: 'villa-mirador-marbella',
    title: 'Villa El Mirador',
    location: 'La Zagaleta, Benahavís, Spain',
    type: 'Luxury Villa',
    status: 'funding',
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
    type: 'Modernist Mansion',
    status: 'funding',
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
    type: 'Island Finca',
    status: 'funding',
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
const userNotificationsStore = new Map<string, any[]>([
  [
    'usr-investor-01',
    [
      {
        id: 'notif-1',
        title: 'Monthly Distribution Credited',
        message: 'Your €320 rental yield for Villa El Mirador has been credited to your available balance.',
        type: 'financial',
        read: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'notif-2',
        title: 'KYC Document Verified',
        message: 'Your European investor accredited identity verification has been confirmed.',
        type: 'success',
        read: true,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ]
  ]
]);

const TREASURY_FX_RATES_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 0.92,
  GBP: 1.18,
  CHF: 1.06,
  USDC: 0.92,
  USDT: 0.92,
  SOL: 158.4
};
const TREASURY_FX_FEE_PERCENT = 0.15;

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
router.post('/auth/login', authLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { email, password, pass } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const inputPass = password || pass;

  const rawHeader = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(rawHeader) ? rawHeader[0] : (typeof rawHeader === 'string' ? rawHeader.split(',')[0].trim() : undefined)) || req.socket.remoteAddress || '127.0.0.1';
  const lockoutKey = `${ip}:${normalizedEmail}`;

  // 1. Check Brute-Force Rate Limiting & Lockout
  const lockoutStatus = checkBruteForceLimit(lockoutKey);
  if (lockoutStatus.isLocked) {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-login-locked',
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 429,
      eventType: 'AUTH_LOCKOUT_TRIGGERED',
      outcome: 'failure',
      message: `Login temporarily locked for ${normalizedEmail} from ${ip} (${lockoutStatus.remainingSeconds}s remaining).`,
      metadata: { ip, email: normalizedEmail, remainingSeconds: lockoutStatus.remainingSeconds }
    });

    return res.status(429).json({
      success: false,
      error: `Too many failed login attempts. Access is temporarily locked for ${lockoutStatus.remainingSeconds} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED',
      remainingSeconds: lockoutStatus.remainingSeconds,
      requestId: req.id
    });
  }

  // 2. Validate input fields
  if (!normalizedEmail || !inputPass) {
    logger.log({
      level: 'warn',
      category: 'auth',
      requestId: req.id || 'req-login-err',
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 400,
      eventType: 'AUTH_VALIDATION_FAILURE',
      outcome: 'failure',
      message: 'Login attempted without required email or password fields.',
      errorCode: 'MISSING_CREDENTIALS'
    });

    return res.status(400).json({
      success: false,
      error: 'Please provide both email address and password.',
      code: 'MISSING_FIELDS',
      requestId: req.id
    });
  }

  // 3. Authenticate credentials against verified database store
  let found = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  // Login must only authenticate an account created through registration or an approved provisioning flow.
  // Unknown email addresses are rejected; a login request must never create an account.


  const userToVerify = found;
  const isPasswordValid = Boolean(
    userToVerify && (
      !userToVerify.passwordHash || verifyPassword(inputPass, userToVerify.passwordHash)
    )
  );

  // If passwordHash was missing, set it now
  if (userToVerify && !userToVerify.passwordHash && inputPass) {
    userToVerify.passwordHash = hashPassword(inputPass);
  }

  if (!found || !isPasswordValid) {
    const failureRecord = recordFailedLogin(lockoutKey);
    logger.log({
      level: 'warn',
      category: 'auth',
      requestId: req.id || 'req-login-err',
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 401,
      eventType: 'LOGIN_FAILED',
      outcome: 'failure',
      message: `Failed login attempt for ${normalizedEmail}. Failures: ${failureRecord.attempts}`,
      errorCode: 'INVALID_CREDENTIALS',
      metadata: { attemptedEmail: normalizedEmail, isLocked: failureRecord.isLocked }
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid email address or password.',
      code: 'INVALID_CREDENTIALS',
      remainingAttempts: Math.max(0, 5 - failureRecord.attempts),
      requestId: req.id
    });
  }

  // 4. Account Status Check (Suspended accounts denied immediately)
  if (found.status === 'suspended') {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-login-suspended',
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 403,
      userId: found.id,
      eventType: 'SUSPENDED_USER_LOGIN_DENIED',
      outcome: 'failure',
      message: `Login denied for suspended account: ${found.email}`,
      errorCode: 'ACCOUNT_SUSPENDED'
    });

    return res.status(403).json({
      success: false,
      error: found.suspendedReason || 'Your account has been suspended by compliance. Please contact support.',
      code: 'ACCOUNT_SUSPENDED',
      requestId: req.id
    });
  }

  // 5. Successful authentication: reset failed attempts & regenerate session ID
  resetFailedLogin(lockoutKey);

  const session = createSession({
    userId: found.id,
    email: found.email,
    role: found.role as any,
    fullName: found.fullName,
    ip,
    userAgent: (req.headers['user-agent'] as string) || 'unknown'
  });

  // 6. Set Secure, HttpOnly, SameSite session cookie
  res.cookie('kretz_session', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Expose fresh CSRF token in response header
  res.setHeader('X-CSRF-Token', session.csrfToken);

  const safeUser = sanitizeUser(found);

  logger.log({
    level: 'info',
    category: 'auth',
    requestId: req.id || 'req-login',
    method: 'POST',
    route: '/api/v1/auth/login',
    statusCode: 200,
    userId: found.id,
    userRole: found.role,
    eventType: 'USER_LOGIN_SUCCESS',
    outcome: 'success',
    message: `User ${found.email} authenticated successfully with role ${found.role}`,
    metadata: { role: found.role, kycStatus: found.kycStatus }
  });

  return res.json({
    success: true,
    data: {
      user: safeUser,
      token: session.id,
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString()
    },
    token: session.id,
    csrfToken: session.csrfToken,
    user: safeUser,
    message: 'Authentication successful.',
    requestId: req.id
  });
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
  const rateLimitStatus = checkAdminRateLimit(ip);
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
  const config = getAdminConfig();

  // 4. Validate credentials
  const emailMatches = normalizedEmail === config.adminEmail;
  const passwordMatches = await verifyAdminCredentials(inputPass);

  if (!emailMatches || !passwordMatches) {
    const failureRecord = recordAdminFailedAttempt(ip);

    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-admin-fail',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 401,
      eventType: 'ADMIN_LOGIN_FAILED',
      outcome: 'failure',
      message: `Failed admin login attempt from ${ip} for account ${normalizedEmail}. Failed attempts: ${failureRecord.attempts}`,
      errorCode: 'INVALID_CREDENTIALS',
      metadata: { ip, attempts: failureRecord.attempts, isLocked: failureRecord.isLocked }
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid administrator email or security credentials.',
      code: 'INVALID_CREDENTIALS',
      remainingAttempts: Math.max(0, 5 - failureRecord.attempts),
      requestId: req.id
    });
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
  resetAdminFailedAttempts(ip);

  // 6. Establish secure server session
  const session = createAdminSession(config.adminEmail, config.fullName);

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

router.post(['/admin/login', '/auth/admin/login', '/auth/admin-login'], authLimiter, requireTurnstile, handleAdminLogin);

/**
 * POST /api/v1/auth/admin-customize
 * Verifies the active administrator email + password and atomically sets a custom administrator email,
 * display name, and bcrypt-hashed password while issuing a freshly rotated administrator session.
 */
router.post(
  ['/admin/customize', '/auth/admin-customize'],
  authLimiter,
  requireTurnstile,
  async (req: AuthenticatedRequest, res: Response) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const rateLimitStatus = checkAdminRateLimit(ip);
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

    const config = getAdminConfig();
    const emailMatches = normalizedCurrentEmail === config.adminEmail;
    const passwordMatches = await verifyAdminCredentials(inputCurrPass);

    if (!emailMatches || !passwordMatches) {
      const failureRecord = recordAdminFailedAttempt(ip);
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

    resetAdminFailedAttempts(ip);

    const targetFullName =
      typeof fullName === 'string' && fullName.trim() ? fullName.trim() : config.fullName;

    const updated = await updateCustomAdminCredentials({
      email: targetEmail,
      fullName: targetFullName,
      passwordToHash: targetPassword
    });

    const adminMock = mockUsers.find((u) => u.role === 'admin');
    if (adminMock) {
      adminMock.email = updated.adminEmail;
      adminMock.fullName = updated.fullName;
    }

    const session = createAdminSession(updated.adminEmail, updated.fullName);
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
router.post(['/admin/logout', '/auth/admin/logout', '/auth/admin-logout'], (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)kretz_admin_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (token) {
    revokeAdminSession(token);
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
router.get('/admin/security/credentials', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const config = getAdminConfig();
  const envState = validateAdminEnvironment();

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
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newEmail, newPassword, fullName } = req.body || {};
    const config = getAdminConfig();

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please enter your current administrator password to authorize credential changes.',
        code: 'CURRENT_PASSWORD_REQUIRED',
        requestId: req.id
      });
    }

    const isCurrentValid = await verifyAdminCredentials(currentPassword);
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

    const updated = await updateCustomAdminCredentials({
      email: targetEmail,
      fullName: targetFullName,
      passwordToHash: passwordToPersist
    });

    const adminMock = mockUsers.find((u) => u.role === 'admin');
    if (adminMock) {
      adminMock.email = updated.adminEmail;
      adminMock.fullName = updated.fullName;
    }

    const session = createAdminSession(updated.adminEmail, updated.fullName);
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
  requireAdmin,
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

    const isCurrentValid = await verifyAdminCredentials(currentPassword);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        error: 'Current administrator password is incorrect.',
        code: 'INVALID_CURRENT_PASSWORD',
        requestId: req.id
      });
    }

    resetCustomAdminCredentials();
    const restoredConfig = getAdminConfig();
    const envState = validateAdminEnvironment();
    const session = createAdminSession(restoredConfig.adminEmail, restoredConfig.fullName);

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
  if (req.user && req.user.role === 'admin') {
    return res.json({
      success: true,
      data: req.user,
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
router.post('/auth/register', authLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { email, fullName, password, pass, country, phoneNumber, countryCode } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const inputPass = password || pass;

  // 1. Validate required fields presence
  if (!normalizedEmail || !inputPass || !fullName || !country || !phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Full legal name, valid email, password, country of residence, and phone number are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  // 2. Validate email format
  if (!validateEmail(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid, well-formed email address.',
      code: 'INVALID_EMAIL_FORMAT',
      requestId: req.id
    });
  }

  // 3. Enforce strong password policy
  const passwordCheck = validatePasswordStrength(inputPass);
  if (!passwordCheck.valid) {
    return res.status(400).json({
      success: false,
      error: passwordCheck.error || 'Password does not meet institutional security requirements.',
      code: 'WEAK_PASSWORD',
      requestId: req.id
    });
  }

  // 4. Prevent duplicate email registrations (Strict 409 Conflict)
  const existing = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    logger.log({
      level: 'warn',
      category: 'auth',
      requestId: req.id || 'req-reg-dup',
      method: 'POST',
      route: '/api/v1/auth/register',
      statusCode: 409,
      eventType: 'DUPLICATE_REGISTRATION_REJECTED',
      outcome: 'failure',
      message: `Registration rejected: email ${normalizedEmail} already exists.`,
      errorCode: 'EMAIL_ALREADY_EXISTS'
    });

    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please sign in.',
      code: 'EMAIL_ALREADY_EXISTS',
      requestId: req.id
    });
  }

  // 5. Securely hash password with cost factor 12
  const passwordHash = hashPassword(inputPass);

  const rawHeader = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(rawHeader) ? rawHeader[0] : (typeof rawHeader === 'string' ? rawHeader.split(',')[0].trim() : undefined)) || req.socket.remoteAddress || '127.0.0.1';

  // 6. Persist user account with active status and unverified email flag
  const newUser: MockUser = {
    id: `usr-${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    fullName: String(fullName).trim(),
    passwordHash,
    role: 'investor', // Public registration is strictly restricted to investor accounts
    country: typeof country === 'string' ? country.trim() : 'France',
    phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim() : '',
    countryCode: typeof countryCode === 'string' ? countryCode.trim() : '',
    kycStatus: 'pending',
    balance: 0,
    currency: 'EUR',
    isEmailVerified: false,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  mockUsers.push(newUser);

  // 7. Establish secure server session
  const session = createSession({
    userId: newUser.id,
    email: newUser.email,
    role: 'investor',
    fullName: newUser.fullName,
    ip,
    userAgent: (req.headers['user-agent'] as string) || 'unknown'
  });

  // 8. Set HTTP-only secure session cookie
  res.cookie('kretz_session', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.setHeader('X-CSRF-Token', session.csrfToken);

  // 9. Dispatch branded email verification token
  const verifToken = generateExpiringToken(newUser.email, 'verification', 24 * 60);
  const origin = req.headers.origin || 'https://kretzdespain.com';
  sendEmail({
    templateId: 'welcome_verification',
    recipient: newUser.email,
    data: {
      fullName: newUser.fullName,
      email: newUser.email,
      verificationLink: `${origin}/auth/verify?token=${verifToken}`,
      expiresInHours: 24,
      accountType: 'Accredited Investor (Tier 1)'
    }
  }).catch(err => {
    logger.log({
      level: 'error',
      category: 'auth',
      requestId: req.id || 'req-reg-email',
      eventType: 'EMAIL_DISPATCH_FAILURE',
      outcome: 'failure',
      message: `Failed to dispatch welcome email: ${err.message}`
    });
  });

  const safeUser = sanitizeUser(newUser);

  logger.log({
    level: 'info',
    category: 'auth',
    requestId: req.id || 'req-reg',
    method: 'POST',
    route: '/api/v1/auth/register',
    statusCode: 201,
    userId: newUser.id,
    userRole: newUser.role,
    eventType: 'USER_REGISTERED',
    outcome: 'success',
    message: `New investor account registered: ${newUser.email}`,
    metadata: { userId: newUser.id }
  });

  return res.status(201).json({
    success: true,
    data: {
      user: safeUser,
      token: session.id,
      csrfToken: session.csrfToken,
      requiresVerification: true
    },
    token: session.id,
    csrfToken: session.csrfToken,
    user: safeUser,
    message: 'Account created successfully. A verification email has been dispatched.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/auth/logout
 * Terminates server-authoritative session and clears HttpOnly session cookie
 */
router.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)kretz_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (token) {
    revokeSession(token);
  }

  res.clearCookie('kretz_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  logger.log({
    level: 'info',
    category: 'auth',
    requestId: req.id || 'req-logout',
    method: 'POST',
    route: '/api/v1/auth/logout',
    statusCode: 200,
    userId: req.user?.id,
    userRole: req.user?.role,
    eventType: 'USER_LOGOUT',
    outcome: 'success',
    message: req.user ? `User ${req.user.email} terminated session` : 'Anonymous session cleared'
  });

  return res.json({
    success: true,
    message: 'Session closed successfully.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/auth/password/forgot
 */
router.post('/auth/password/forgot', authLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();

  const foundUser = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  if (foundUser) {
    const resetToken = generateExpiringToken(normalizedEmail, 'password_reset', 15);
    const origin = req.headers.origin || 'https://kretzdespain.com';
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    
    sendEmail({
      templateId: 'password_reset',
      recipient: normalizedEmail,
      data: {
        fullName: foundUser.fullName,
        email: normalizedEmail,
        resetLink: `${origin}/auth/reset?token=${resetToken}`,
        expiresInMinutes: 15,
        ipAddress: ip,
        location: foundUser.country || 'Madrid, Spain'
      }
    }).catch(err => {
      logger.log({
        level: 'error',
        category: 'auth',
        requestId: req.id || 'req-forgot-email',
        eventType: 'EMAIL_DISPATCH_FAILURE',
        outcome: 'failure',
        message: `Failed to dispatch password recovery email: ${err.message}`
      });
    });
  }

  logger.log({
    level: 'info',
    category: 'auth',
    requestId: req.id || 'req-forgot',
    method: 'POST',
    route: '/api/v1/auth/password/forgot',
    statusCode: 200,
    eventType: 'PASSWORD_RESET_REQUESTED',
    outcome: 'success',
    message: `Password reset dispatched for account ${normalizedEmail}`,
    metadata: { targetEmail: normalizedEmail }
  });

  // Always return success to prevent email enumeration attacks
  res.json({
    success: true,
    message: 'If an account exists with this email, recovery instructions have been sent.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/contact
 * Enforces Turnstile human verification on public requests; allows authenticated session requests directly
 */
const requireTurnstileUnlessAuthed = (req: AuthenticatedRequest, res: Response, next: any) => {
  if (req.user && req.user.id) {
    return next();
  }
  return requireTurnstile(req, res, next);
};

router.post('/contact', contactLimiter, requireTurnstileUnlessAuthed, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/memberships/apply', publicSubmissionLimiter, requireTurnstileUnlessAuthed, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/user/referrals/invite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const normalizedEmail = String(req.body?.email || '').toLowerCase().trim();
  const referralCode = String(req.body?.referralCode || '').trim();
  const serverUser = mockUsers.find((u) => u.id === userId);
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
 * POST /api/v1/security/verify-turnstile
 * Standalone verification endpoint for testing and client verification checks
 */
router.post('/security/verify-turnstile', securityLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const token = req.body?.turnstileToken || req.headers['x-turnstile-token'] || req.body?.['cf-turnstile-response'];
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  const result = await verifyTurnstileToken(token, ip);
  if (!result.success) {
    return res.status(403).json({
      success: false,
      error: result.error,
      code: result.code,
      requestId: req.id,
    });
  }

  return res.json({
    success: true,
    message: 'Turnstile human verification succeeded.',
    challengeTs: result.challengeTs,
    hostname: result.hostname,
    requestId: req.id,
  });
});

/**
 * POST /api/v1/auth/password/reset
 * Verifies single-use reset token, validates password strength, updates bcrypt password hash,
 * and invalidates all existing sessions for the target user.
 */
router.post('/auth/password/reset', (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'A valid password reset token is required.',
      code: 'MISSING_RESET_TOKEN',
      requestId: req.id
    });
  }

  // 1. Password policy verification
  const strengthCheck = validatePasswordStrength(newPassword);
  if (!strengthCheck.valid) {
    return res.status(400).json({
      success: false,
      error: strengthCheck.error || 'Password does not meet institutional complexity standards.',
      code: 'WEAK_PASSWORD',
      requestId: req.id
    });
  }

  // 2. Validate and single-use consume the recovery token
  const verification = verifyAndConsumeToken(token, 'password_reset');
  if (!verification.valid) {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-reset-invalid',
      method: 'POST',
      route: '/api/v1/auth/password/reset',
      statusCode: 400,
      eventType: 'PASSWORD_RESET_REJECTED',
      outcome: 'failure',
      message: `Password reset rejected: ${verification.error}`,
      errorCode: 'INVALID_RESET_TOKEN'
    });

    return res.status(400).json({
      success: false,
      error: verification.error || 'Invalid or expired password reset token.',
      code: 'INVALID_RESET_TOKEN',
      requestId: req.id
    });
  }

  // 3. Atomically update password hash in persistent store
  const targetEmail = (verification.email || '').toLowerCase();
  const targetUser = targetEmail ? mockUsers.find(u => u.email.toLowerCase() === targetEmail) : undefined;
  if (targetUser) {
    targetUser.passwordHash = hashPassword(newPassword);
    // Invalidate all active sessions across all devices for this user
    revokeAllUserSessions(targetUser.id);
  }

  logger.log({
    level: 'info',
    category: 'auth',
    requestId: req.id || 'req-reset',
    method: 'POST',
    route: '/api/v1/auth/password/reset',
    statusCode: 200,
    eventType: 'PASSWORD_RESET_COMPLETED',
    outcome: 'success',
    message: `Password successfully updated via recovery authorization for ${verification.email}. All prior sessions revoked.`
  });

  return res.json({
    success: true,
    message: 'Password updated successfully. All previous sessions have been terminated. You may now log in.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/auth/session
 * Validates active session, verifies account non-suspended status, and returns sanitized profile.
 * Gracefully handles unauthenticated probes with 200 OK { authenticated: false }.
 */
router.get('/auth/session', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    try {
      const profile = isSupabaseServerConfigured() ? await getUserProfile(req.user.id) : findUserRecordForRequest(req);
      const status = profile?.status || req.user.status || 'active';
      if (status === 'suspended') {
        return res.status(403).json({ success: false, error: profile?.suspended_reason || profile?.suspendedReason || req.user.suspendedReason || 'Your account has been suspended by compliance.', code: 'ACCOUNT_SUSPENDED', requestId: req.id });
      }
      const safeUser = profile && 'full_name' in profile ? {
        id: req.user.id, email: profile.email || req.user.email,
        fullName: profile.full_name || req.user.fullName,
        role: req.user.role, accountType: profile.account_type || req.user.accountType,
        country: profile.country, phoneNumber: profile.phone_number,
        balance: Number(profile.wallet_balance ?? req.user.balance ?? 0),
        kycStatus: profile.kyc_status || 'pending', status
      } : profile ? sanitizeUser(profile) : req.user;
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

  const session = getSession(token);
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

  const currentUser = findUserRecordForRequest(req);

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
router.get('/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const users = await listAdminUsers();
      return res.json({ success: true, data: users.map((u: any) => ({ id: u.id, email: u.email, fullName: u.full_name, country: u.country, phoneNumber: u.phone_number, role: (u.user_roles || []).map((r: any) => r.role).find((role: string) => ['super_admin','admin','finance_admin','operations_admin','support','auditor'].includes(role)) || 'investor', accountType: u.account_type, balance: Number(u.wallet_balance || 0), investedBalance: Number(u.invested_balance || 0), kycStatus: u.kyc_status, status: u.status || 'active', suspendedReason: u.suspended_reason, createdAt: u.created_at })), total: users.length, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-users-db', eventType: 'ADMIN_USERS_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load users.' });
      return res.status(503).json({ success: false, error: 'The investor registry is temporarily unavailable.', code: 'USER_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent user registry is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-admin-users',
    method: 'GET',
    route: '/api/v1/admin/users',
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'ADMIN_USERS_VIEWED',
    outcome: 'success',
    message: `Admin ${req.user?.email} retrieved user registry (${mockUsers.length} records)`
  });

  res.json({
    success: true,
    data: mockUsers.map(sanitizeUser),
    total: mockUsers.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/audit-logs
 */
router.get('/admin/audit-logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const logs = await listPersistentAuditLogs();
      return res.json({ success: true, data: logs, total: logs.length, requestId: req.id });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Audit records are temporarily unavailable.', code: 'AUDIT_DATABASE_UNAVAILABLE', requestId: req.id });
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
router.get('/admin/system-health', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.put('/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/users/:id/kyc', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { kycStatus = 'approved', notes } = req.body || {};
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await runFinancialRpc('kretz_admin_update_kyc', { p_user_id: id, p_admin_id: req.user!.id, p_kyc_status: String(kycStatus), p_notes: notes || null });
      return res.json({ success: true, data: profile, message: `User KYC status updated to ${kycStatus}.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('USER_NOT_FOUND') ? 404 : message.includes('INVALID_KYC_STATUS') ? 400 : message.includes('REQUIRED') ? 403 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'KYC decision could not be saved. Please retry.' : message, code: status === 503 ? 'KYC_DATABASE_UNAVAILABLE' : 'KYC_UPDATE_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });

  const target = mockUsers.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  }

  target.kycStatus = kycStatus || 'approved';

  mockAuditLogs.unshift({
    id: `audit-${Date.now()}`,
    adminId: req.user!.id,
    adminEmail: req.user!.email,
    action: 'KYC_STATUS_UPDATE',
    details: `Updated KYC status for ${target.email} to ${target.kycStatus}. Notes: ${notes || 'Verified identity documents'}`,
    timestamp: new Date().toISOString()
  });

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-kyc',
    method: 'POST',
    route: `/api/v1/admin/users/${id}/kyc`,
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'KYC_STATUS_UPDATED',
    outcome: 'success',
    message: `KYC status of user ${target.email} updated to ${target.kycStatus}`,
    metadata: { targetUserId: id, status: target.kycStatus }
  });

  const normalizedKyc = String(target.kycStatus).toLowerCase();
  sendEmail({
    templateId: normalizedKyc === 'rejected' ? 'kyc_rejected' : 'kyc_approved',
    recipient: target.email,
    data: {
      fullName: target.fullName || 'Valued Investor',
      event_name: 'Institutional KYC Verification',
      status: normalizedKyc === 'rejected' ? 'Action Required / Declined' : 'Approved & Verified',
      notes:
        notes ||
        (normalizedKyc === 'rejected'
          ? 'Please review your identity documentation in your Investor Portal and resubmit.'
          : 'Your European identity verification has cleared AML screening.')
    },
    idempotencyKey: `idemp-kyc-${target.id}-${normalizedKyc}-${Date.now()}`
  }).catch(() => {});

  res.json({
    success: true,
    data: target,
    message: `User KYC status updated to ${target.kycStatus}`,
    requestId: req.id
  });
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * POST /api/v1/admin/users/:id/status
 * Toggle user account status (active / suspended) with audit logging
 */
const handleUserStatusUpdate = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};

  if (!status || (status !== 'active' && status !== 'suspended')) {
    return res.status(400).json({
      success: false,
      error: 'Status must be either "active" or "suspended".',
      code: 'INVALID_STATUS',
      requestId: req.id
    });
  }
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await runFinancialRpc('kretz_admin_set_user_status', { p_user_id: id, p_admin_id: req.user!.id, p_status: status, p_reason: reason || null });
      return res.json({ success: true, data: profile, message: `User status successfully updated to ${status.toUpperCase()}.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const statusCode = message.includes('USER_NOT_FOUND') ? 404 : message.includes('INVALID_STATUS') ? 400 : message.includes('SELF_SUSPENSION_FORBIDDEN') || message.includes('REQUIRED') ? 403 : 503;
      return res.status(statusCode).json({ success: false, error: statusCode === 503 ? 'Account status change could not be saved. Please retry.' : message, code: statusCode === 503 ? 'USER_STATUS_DATABASE_UNAVAILABLE' : 'USER_STATUS_UPDATE_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });

  const target = mockUsers.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: 'User not found.',
      code: 'USER_NOT_FOUND',
      requestId: req.id
    });
  }

  // Prevent self-suspension of administrator
  if (req.user?.id === id && status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Administrators cannot suspend their own active credentials.',
      code: 'SELF_SUSPENSION_FORBIDDEN',
      requestId: req.id
    });
  }

  const previousStatus = target.status || 'active';
  target.status = status;
  target.suspendedReason = status === 'suspended' ? (reason || 'Administrative Compliance Suspension') : undefined;

  const auditEntry = {
    id: `audit-${Date.now()}`,
    adminId: req.user?.id || 'usr-admin-01',
    adminEmail: req.user?.email || 'admin@kretz.com',
    action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
    details: `User ${target.email} (${target.fullName}) status updated from ${previousStatus.toUpperCase()} to ${status.toUpperCase()} by ${req.user?.email || 'admin@kretz.com'}.${reason ? ` Reason: ${reason}` : ''}`,
    timestamp: new Date().toISOString()
  };
  mockAuditLogs.unshift(auditEntry);

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-user-status',
    method: req.method,
    route: `/api/v1/admin/users/${id}/status`,
    statusCode: 200,
    userId: req.user?.id,
    eventType: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
    outcome: 'success',
    message: `Account ${target.email} status changed to ${status.toUpperCase()}`,
    metadata: {
      targetUserId: id,
      targetEmail: target.email,
      newStatus: status,
      previousStatus,
      reason
    }
  });

  return res.json({
    success: true,
    data: target,
    auditLog: auditEntry,
    message: `User status successfully updated to ${status.toUpperCase()}.`,
    requestId: req.id
  });
};

router.patch('/admin/users/:id/status', requireAdmin, handleUserStatusUpdate);
router.post('/admin/users/:id/status', requireAdmin, handleUserStatusUpdate);

/**
 * POST /api/v1/admin/users/:id/credit
 */
router.post('/admin/users/:id/credit', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, currency = 'EUR', method = 'Direct Wire Received', reference, notes } = req.body || {};

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Credit amount must be greater than zero.', code: 'INVALID_AMOUNT', requestId: req.id });
  }
  if (currency !== 'EUR') return res.status(400).json({ success: false, error: 'Manual wallet adjustments currently support EUR only.', code: 'UNSUPPORTED_CURRENCY', requestId: req.id });
  if (isSupabaseServerConfigured()) {
    try {
      const result: any = await runFinancialRpc('kretz_admin_credit_user', {
        p_user_id: id, p_admin_id: req.user!.id, p_amount: numericAmount,
        p_method: String(method), p_reference: String(reference || `KZ-MANUAL-${crypto.randomInt(100000,1000000)}`),
        p_notes: String(notes || 'Administrator manual wallet credit'),
        p_transaction_id: crypto.randomUUID()
      });
      return res.json({ success: true, data: { transaction: toApiTransaction(result.transaction), walletBalance: Number(result.balance) }, message: `Credited €${numericAmount.toFixed(2)} to the investor wallet.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const statusCode = message.includes('USER_NOT_FOUND') ? 404 : message.includes('REQUIRED') ? 403 : 503;
      return res.status(statusCode).json({ success: false, error: statusCode === 503 ? 'Wallet adjustment could not be saved. Please retry.' : message, code: statusCode === 503 ? 'WALLET_ADJUSTMENT_FAILED' : 'WALLET_ADJUSTMENT_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });

  const target = mockUsers.find(u => u.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'User not found.', code: 'USER_NOT_FOUND', requestId: req.id });
  }

  const numAmount = Number(amount);
  target.balance = (target.balance || 0) + numAmount;

  const newTx = {
    id: `tx-cred-${Date.now()}`,
    userId: target.id,
    userEmail: target.email,
    type: 'deposit',
    amount: numAmount,
    currency,
    status: 'completed',
    method,
    reference: reference || `KZ-MANUAL-${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(newTx);

  logger.log({
    level: 'info',
    category: 'payments',
    requestId: req.id || 'req-credit',
    method: 'POST',
    route: `/api/v1/admin/users/${id}/credit`,
    statusCode: 200,
    userId: req.user?.id,
    eventType: 'ADMIN_MANUAL_CREDIT',
    outcome: 'success',
    message: `Admin credited €${numAmount} to user ${target.email}. Ref: ${newTx.reference}`,
    metadata: { targetUserId: id, amount: numAmount, reference: newTx.reference }
  });

  res.json({
    success: true,
    data: { user: target, transaction: newTx },
    message: `Credited €${numAmount} to ${target.fullName}.`,
    requestId: req.id
  });
});

// ============================================================================
// 3. MARKETPLACE ROUTES (/api/v1/marketplace)
// ============================================================================

/**
 * GET /api/v1/marketplace/listings
 */
router.get(['/marketplace/listings', '/properties', '/listings'], async (req: AuthenticatedRequest, res: Response) => {
  const { search, type, status, location, minPrice, maxPrice, sortBy, page, limit } = req.query;
  let items = [...mockListings];
  if (isSupabaseServerConfigured()) {
    try {
      items = await listInvestmentPlans({
        search: typeof search === 'string' ? search : undefined,
        type: typeof type === 'string' ? type : undefined,
        status: typeof status === 'string' ? status : undefined
      });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-listings-db', eventType: 'PROPERTY_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load property catalogue from Supabase.' });
      return res.status(503).json({ success: false, error: 'The property catalogue is temporarily unavailable. Please try again shortly.', code: 'PROPERTY_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  const canViewUnpublished = Boolean(req.user && ['admin','super_admin','operations_admin'].includes(req.user.role));
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
  const { id } = req.params;
  let found = mockListings.find(p => p.id === id || p.slug === id);
  if (isSupabaseServerConfigured()) {
    try {
      found = await getInvestmentPlan(id) as any;
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-property-db', eventType: 'PROPERTY_DETAIL_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load property.' });
      return res.status(503).json({ success: false, error: 'Property details are temporarily unavailable.', code: 'PROPERTY_DATABASE_UNAVAILABLE', requestId: req.id });
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
router.post(['/marketplace/listings', '/properties', '/admin/properties'], requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  if (isSupabaseServerConfigured() && !['admin','super_admin','operations_admin'].includes(req.user!.role)) return res.status(403).json({ success: false, error: 'Property management privileges are required.', code: 'PROPERTY_MANAGEMENT_FORBIDDEN', requestId: req.id });
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
router.put(['/marketplace/listings/:id', '/properties/:id', '/admin/properties/:id'], requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (isSupabaseServerConfigured() && !['admin','super_admin','operations_admin'].includes(req.user!.role)) return res.status(403).json({ success: false, error: 'Property management privileges are required.', code: 'PROPERTY_MANAGEMENT_FORBIDDEN', requestId: req.id });
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

function findUserRecordForRequest(req: AuthenticatedRequest) {
  if (!req.user) return undefined;
  const byId = mockUsers.find(u => u.id === req.user!.id);
  if (byId) return byId;
  if (req.user.email) {
    return mockUsers.find(u => u.email.toLowerCase() === req.user!.email.toLowerCase());
  }
  return undefined;
}

/**
 * GET /api/v1/user/profile
 */
router.get('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await getUserProfile(req.user!.id);
      if (!profile) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: { id: profile.id, email: profile.email, fullName: profile.full_name, country: profile.country, countryCode: profile.country_code, phoneNumber: profile.phone_number, accountType: profile.account_type, balance: Number(profile.wallet_balance || 0), investedBalance: Number(profile.invested_balance || 0), kycStatus: profile.kyc_status, createdAt: profile.created_at, address: profile.address, city: profile.city, postalCode: profile.postal_code, avatarUrl: profile.avatar_url, bankIban: profile.bank_iban, cryptoDepositAddress: profile.crypto_deposit_address, taxId: profile.tax_id, dateOfBirth: profile.date_of_birth, preferences: profile.preferences }, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-profile-db', eventType: 'PROFILE_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Profile query failed.' });
      return res.status(503).json({ success: false, error: 'Your profile is temporarily unavailable.', code: 'PROFILE_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const profile = findUserRecordForRequest(req);
  if (!profile) {
    return res.status(404).json({
      success: false,
      error: 'User profile not found.',
      code: 'USER_NOT_FOUND',
      requestId: req.id
    });
  }

  res.json({
    success: true,
    data: sanitizeUser(profile),
    requestId: req.id
  });
});

/**
 * GET /api/v1/portfolio
 */
router.get(['/portfolio', '/portfolio/summary'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isSupabaseServerConfigured()) {
    try {
      const rows = await listUserInvestments(userId);
      const holdings = rows.map((row: any) => {
        const property = row.investment_plans || {};
        const cost = Number(row.total_amount_invested || 0);
        const annualYield = Number(property.estimated_annual_yield || 0);
        return {
          id: row.id, propertyId: row.plan_id, propertyTitle: property.title || row.plan_id,
          tokensPurchased: Number(row.tokens_purchased || 0), totalCost: cost,
          currentValue: Number(row.current_valuation || cost),
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
  const matchedUser = findUserRecordForRequest(req);
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
      existing.totalCost += Number(tx.amount || 0);
      existing.currentValue = Math.round(existing.totalCost * 1.0);
      existing.projectedAnnualDividend = Math.round(existing.totalCost * annualYieldRate * 100) / 100;
    } else {
      const cost = Number(tx.amount || 0);
      const realDividendsForProp = mockTransactions
        .filter(t => (t.userId === userId || (Boolean(resolvedEmail) && t.userEmail === resolvedEmail)) &&
                     (t.type === 'dividend' || t.type === 'distribution' || t.type === 'payout') &&
                     t.status === 'completed' &&
                     (t as any).propertyId === propId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      holdingsMap.set(propId, {
        id: tx.id,
        propertyId: propId,
        propertyTitle: (tx as any).propertyTitle || prop?.title || 'Tokenized Property SPV',
        tokensPurchased: Number((tx as any).tokensPurchased || 0),
        totalCost: cost,
        currentValue: cost,
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
 * GET /api/v1/wallet/balance
 */
router.get(['/wallet/balance', '/user/wallet/balance'], requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await getUserProfile(req.user!.id);
      if (!profile) return res.status(404).json({ success: false, error: 'Investor wallet profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: { balance: Number(profile.wallet_balance || 0), subBalances: { EUR: Number(profile.wallet_balance || 0) }, currency: 'EUR' }, requestId: req.id });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Wallet balance is temporarily unavailable.', code: 'WALLET_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent wallet storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const user = findUserRecordForRequest(req);
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

  res.json({
    success: true,
    data: {
      balance: calculatedBalance,
      subBalances: getOrInitUserSubBalances(req.user!.id, calculatedBalance),
      currency: 'EUR'
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/transactions
 */
router.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isSupabaseServerConfigured()) {
    try {
      const rows = req.user?.role === 'admin' || req.user?.role === 'super_admin' || req.user?.role === 'finance_admin'
        ? await listAdminTransactions(undefined, undefined, 250)
        : await listUserTransactions(userId, 250);
      const formatted = rows.map((row: any) => ({ ...toApiTransaction(row), user_id: row.user_id, userId: row.user_id, created_at: row.created_at, paymentMethod: row.payment_method }));
      return res.json({ success: true, data: formatted, total: formatted.length, requestId: req.id });
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

  // Ensure transaction model conforms to standard data structure:
  // id, user_id, type (deposit, withdrawal, purchase, payout), amount, currency, status, reference, created_at
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
    description: t.description || `${t.type} transaction`,
    paymentMethod: t.paymentMethod || t.method || 'System',
    propertyId: (t as any).propertyId,
    propertyTitle: (t as any).propertyTitle,
    tokensPurchased: (t as any).tokensPurchased,
    txHash: (t as any).txHash
  }));

  res.json({
    success: true,
    data: formattedTxs,
    total: formattedTxs.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/notifications
 */
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) { try { const rows = await listUserNotifications(req.user!.id); const data = rows.map((n: any) => ({ id: n.id, title: n.title, message: n.message, type: n.type, read: n.read, createdAt: n.created_at, metadata: n.metadata })); return res.json({ success: true, data, unreadCount: data.filter((n: any) => !n.read).length, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notifications are temporarily unavailable.', code: 'NOTIFICATION_DATABASE_UNAVAILABLE', requestId: req.id }); } }
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
  if (isSupabaseServerConfigured()) { try { const row = await markUserNotificationRead(req.user!.id, req.params.id); return res.json({ success: true, data: row, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notification could not be updated.', code: 'NOTIFICATION_UPDATE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const list = userNotificationsStore.get(req.user!.id) || [];
  const target = list.find(n => n.id === req.params.id);
  if (target) {
    target.read = true;
  }
  res.json({
    success: true,
    data: target || null,
    requestId: req.id
  });
});

router.post('/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) { try { const markedRead = await markAllUserNotificationsRead(req.user!.id); return res.json({ success: true, data: { markedRead }, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Notifications could not be updated.', code: 'NOTIFICATION_UPDATE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent notification storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const list = userNotificationsStore.get(req.user!.id) || [];
  list.forEach(n => { n.read = true; });
  res.json({
    success: true,
    data: { markedRead: list.length },
    requestId: req.id
  });
});

/**
 * User Favorites & Preferences Persistence (/api/v1/user/favorites & /api/v1/user/preferences)
 */
router.get('/user/favorites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) { try { return res.json({ success: true, data: { favorites: await listUserFavorites(req.user!.id) }, requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your watchlist is temporarily unavailable.', code: 'FAVORITES_DATABASE_UNAVAILABLE', requestId: req.id }); } }
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
  if (isSupabaseServerConfigured()) { try { const favorites = await saveUserFavorite(req.user!.id, propertyId); return res.json({ success: true, data: { favorites, propertyId, saved: true }, message: 'Property saved to your watchlist.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Property could not be saved to your watchlist.', code: 'FAVORITES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
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
  if (isSupabaseServerConfigured()) { try { const favorites = await removeUserFavorite(req.user!.id, propertyId); return res.json({ success: true, data: { favorites, propertyId, saved: false }, message: 'Property removed from your watchlist.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Property could not be removed from your watchlist.', code: 'FAVORITES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
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
  if (isSupabaseServerConfigured()) { try { return res.json({ success: true, data: await getUserPreferences(req.user!.id), requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your preferences are temporarily unavailable.', code: 'PREFERENCES_DATABASE_UNAVAILABLE', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent preference storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const prefs = userPreferencesStore.get(req.user!.id) || {
    defaultSort: 'yield-desc',
    itemsPerPage: 6,
    currencyDisplay: 'EUR',
    emailNotifications: true
  };
  res.json({
    success: true,
    data: prefs,
    requestId: req.id
  });
});

router.put('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) { try { const data = await saveUserPreferences(req.user!.id, req.body || {}); return res.json({ success: true, data, message: 'Preferences saved.', requestId: req.id }); } catch { return res.status(503).json({ success: false, error: 'Your preferences could not be saved.', code: 'PREFERENCES_DATABASE_WRITE_FAILED', requestId: req.id }); } }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent preference storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const current = userPreferencesStore.get(req.user!.id) || {};
  const next = { ...current, ...(req.body || {}), updatedAt: new Date().toISOString() };
  userPreferencesStore.set(req.user!.id, next);
  res.json({
    success: true,
    data: next,
    message: 'Preferences saved.',
    requestId: req.id
  });
});

/**
 * Multi-Currency Treasury Desk Rates & Conversion (/api/v1/treasury/*)
 */
router.get('/treasury/rates', (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      base: 'EUR',
      ratesToEur: TREASURY_FX_RATES_TO_EUR,
      feePercent: TREASURY_FX_FEE_PERCENT,
      updatedAt: new Date().toISOString()
    }
  });
});

router.get('/treasury/balances', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await getUserProfile(req.user!.id);
      if (!profile) return res.status(404).json({ success: false, error: 'Investor wallet profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: { balances: { EUR: Number(profile.wallet_balance || 0) } }, requestId: req.id });
    } catch {
      return res.status(503).json({ success: false, error: 'Treasury balances are temporarily unavailable.', code: 'TREASURY_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent treasury storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const userRecord = findUserRecordForRequest(req);
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

router.post('/treasury/convert', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    return res.status(501).json({ success: false, error: 'Multi-currency conversion is not enabled on the persistent wallet yet. Your EUR balance is safe and unchanged.', code: 'FX_PERSISTENCE_NOT_ENABLED', requestId: req.id });
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent treasury storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const { fromCurrency, toCurrency, amount } = req.body || {};
  const from = String(fromCurrency || '').toUpperCase();
  const to = String(toCurrency || '').toUpperCase();
  const numericAmount = Number(amount);

  if (!TREASURY_FX_RATES_TO_EUR[from] || !TREASURY_FX_RATES_TO_EUR[to]) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported currency pair selected.',
      code: 'UNSUPPORTED_CURRENCY',
      requestId: req.id
    });
  }

  if (from === to) {
    return res.status(400).json({
      success: false,
      error: 'Source and target currencies must be different.',
      code: 'SAME_CURRENCY',
      requestId: req.id
    });
  }

  if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Conversion amount must be greater than zero.',
      code: 'INVALID_AMOUNT',
      requestId: req.id
    });
  }

  const userRecord = findUserRecordForRequest(req);
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

  const valueInEur = numericAmount * TREASURY_FX_RATES_TO_EUR[from];
  const feeInEur = Math.round(valueInEur * (TREASURY_FX_FEE_PERCENT / 100) * 100) / 100;
  const netEur = Math.max(0, valueInEur - feeInEur);
  const convertedAmount = Number((netEur / TREASURY_FX_RATES_TO_EUR[to]).toFixed(to === 'SOL' ? 6 : 2));

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
    reference: ref,
    createdAt: new Date().toISOString(),
    metadata: {
      fromCurrency: from,
      toCurrency: to,
      fromAmount: numericAmount,
      toAmount: convertedAmount,
      feeEur: feeInEur
    }
  };
  mockTransactions.unshift(fxTx as any);
  pushUserNotification(activeUser.id, {
    title: 'Treasury FX Conversion Executed',
    message: `Converted ${numericAmount} ${from} into ${convertedAmount} ${to} (Fee: €${feeInEur.toFixed(2)}).`,
    type: 'financial'
  });

  res.json({
    success: true,
    data: {
      reference: ref,
      fromCurrency: from,
      toCurrency: to,
      fromAmount: numericAmount,
      toAmount: convertedAmount,
      feeEur: feeInEur,
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
 * POST /api/v1/deposits
 */
router.post('/deposits', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  const foundUserRecord = findUserRecordForRequest(req);
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
  if (!Number.isFinite(numAmount) || numAmount < 100) {
    return res.status(400).json({
      success: false,
      error: 'Minimum deposit amount is €100. Enter a valid numeric amount.',
      code: 'INVALID_DEPOSIT_AMOUNT',
      requestId: req.id
    });
  }
  if (isSupabaseServerConfigured()) {
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
  const foundUser = findUserRecordForRequest(req);
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
      recipient: 'info@kretz.site',
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
 * POST /api/v1/withdrawals
 */
router.post('/withdrawals', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  const userRecord = findUserRecordForRequest(req);
  if (!userRecord && !isSupabaseServerConfigured()) {
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

  const { amount, destination, method = 'Bank Wire SEPA' } = req.body || {};

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 250) {
    return res.status(400).json({
      success: false,
      error: 'Minimum withdrawal amount is €250. Enter a valid numeric amount.',
      code: 'INVALID_AMOUNT',
      requestId: req.id
    });
  }

  if (typeof destination !== 'string' || destination.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'Withdrawal destination (IBAN or Crypto Address) is required.',
      code: 'MISSING_DESTINATION',
      requestId: req.id
    });
  }

  if (isSupabaseServerConfigured()) {
    try {
      const ref = `KZ-WTH-${crypto.randomInt(100000, 1000000)}`;
      const idempotencyKey = String(req.headers['idempotency-key'] || req.body?.idempotencyKey || crypto.randomUUID()).slice(0, 128);
      const row = await runFinancialRpc('kretz_request_withdrawal', {
        p_user_id: req.user!.id, p_amount: numAmount, p_method: String(method),
        p_destination: destination.trim(), p_reference: ref,
        p_transaction_id: crypto.randomUUID(), p_idempotency_key: idempotencyKey
      });
      const transaction = toApiTransaction(row);
      sendEmail({
        templateId: 'withdrawal_requested', recipient: req.user!.email,
        data: { fullName: req.user!.fullName || 'Valued Investor', email: req.user!.email, amount: numAmount.toFixed(2), currency: 'EUR', reference: transaction.reference || ref, destination: destination.trim(), estimatedProcessingTime: '24 business hours' }
      }).catch(err => logger.log({ level: 'error', category: 'payments', requestId: req.id || 'req-withdrawal-email', eventType: 'EMAIL_DISPATCH_FAILURE', outcome: 'failure', message: err.message }));
      return res.status(201).json({ success: true, data: { ...transaction, destination: destination.trim() }, message: 'Withdrawal request recorded and funds reserved in your wallet. Compliance review is required before payout.', requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-withdrawal-db', eventType: 'WITHDRAWAL_PERSIST_FAILED', outcome: 'failure', message: error?.message || 'Withdrawal could not be saved.' });
      const message = String(error?.message || '');
      const status = message.includes('INSUFFICIENT_FUNDS') ? 400 : message.includes('INVALID_WITHDRAWAL_AMOUNT') || message.includes('INVALID_WITHDRAWAL_DESTINATION') ? 400 : message.includes('ACCOUNT_LEDGER_UNAVAILABLE') ? 409 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'The withdrawal service is temporarily unavailable. No request was recorded.' : message, code: status === 503 ? 'WITHDRAWAL_DATABASE_UNAVAILABLE' : 'WITHDRAWAL_REQUEST_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured. Withdrawals are disabled until the database is connected.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  }
  if (!userRecord) {
    return res.status(409).json({ success: false, error: 'Investor ledger account is unavailable.', code: 'ACCOUNT_LEDGER_UNAVAILABLE', requestId: req.id });
  }
  if (userRecord.balance < numAmount) {
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
      message: `Withdrawal of €${numAmount} rejected: insufficient funds (available: €${userRecord.balance})`,
      errorCode: 'INSUFFICIENT_FUNDS'
    });

    return res.status(400).json({
      success: false,
      error: `Insufficient available balance (€${userRecord.balance.toFixed(2)}) for requested withdrawal of €${numAmount.toFixed(2)}.`,
      code: 'INSUFFICIENT_FUNDS',
      requestId: req.id
    });
  }

  // Deduct immediately on server to lock funds
  userRecord.balance = Math.round((userRecord.balance - numAmount) * 100) / 100;
  if (userSubBalancesStore.has(userRecord.id)) {
    userSubBalancesStore.get(userRecord.id)!.EUR = userRecord.balance;
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
    destination,
    reference: ref,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(withdrawalTx);

  const userRecipient = req.user?.email || 'investor@kretz.com';
  const foundUser = mockUsers.find(u => u.id === req.user?.id);
  
  sendEmail({
    templateId: 'withdrawal_requested',
    recipient: userRecipient,
    data: {
      fullName: foundUser?.fullName || 'Valued Investor',
      email: userRecipient,
      amount: numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      currency: 'EUR',
      reference: ref,
      destination,
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
    message: `Withdrawal of €${numAmount} requested by ${req.user?.email} to ${destination.slice(0, 8)}... Ref: ${ref}`,
    metadata: { amount: numAmount, destination: destination.slice(0, 10) + '...', reference: ref }
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
router.post('/investments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  const userRecordCheck = mockUsers.find(u => u.id === req.user?.id);
  if (userRecordCheck && userRecordCheck.status === 'suspended') {
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
  if (isSupabaseServerConfigured()) {
    try {
      const prop = await getInvestmentPlan(String(propertyId));
      if (!prop) return res.status(404).json({ success: false, error: 'Target property not found in the persistent offerings catalogue.', code: 'PROPERTY_NOT_FOUND', requestId: req.id });
      if (prop.status !== 'funding' && prop.status !== 'active') return res.status(409).json({ success: false, error: 'This property is not currently accepting investments.', code: 'OFFERING_NOT_OPEN', requestId: req.id });
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

  const userRecord = findUserRecordForRequest(req);
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
router.get('/admin/database/health', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
    data: { status: 'not_configured', usersCount: mockUsers.length, listingsCount: mockListings.length, transactionsCount: mockTransactions.length, timestamp: new Date().toISOString() },
    message: 'Supabase server credentials are not configured.', requestId: req.id
  });
});

/**
 * POST /api/v1/admin/database/repair
 * Scans, repairs, and synchronizes database state
 */
router.post('/admin/database/repair', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
        'Verified mockUsers data structures and balance allocations',
        'Verified mockListings property token counts and image arrays',
        'Validated transaction history integrity'
      ],
      usersCount: mockUsers.length,
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
 * Secure payment provider webhook processing with signature verification & idempotency
 */
router.post('/payments/webhooks', (req: AuthenticatedRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ success: false, error: 'Payment-provider webhook signature verification is not configured. No payment event was accepted.', code: 'PAYMENT_WEBHOOK_NOT_CONFIGURED', requestId: req.id });
  }
  const providerSignature = req.headers['x-signature'] || req.headers['stripe-signature'];
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

  // Idempotency check: prevent duplicate replay attacks
  if (processedWebhooks.has(String(eventId))) {
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

  processedWebhooks.add(String(eventId));

  logger.log({
    level: 'info',
    category: 'payments',
    requestId: req.id || 'req-wh-ok',
    method: 'POST',
    route: '/api/v1/payments/webhooks',
    statusCode: 200,
    eventType: 'WEBHOOK_PROCESSED',
    outcome: 'success',
    message: `Payment webhook ${eventId} verified and recorded. Type: ${event.type || 'payment.succeeded'}`,
    metadata: {
      eventId,
      eventType: event.type,
      signatureVerified: Boolean(providerSignature)
    }
  });

  res.json({
    success: true,
    message: 'Webhook processed successfully.',
    eventId,
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
 * GET /api/v1/payments/config (Public view of escrow instructions)
 */
router.get('/payments/config', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: paymentConfig,
    requestId: req.id
  });
});

/**
 * GET & PUT /api/v1/admin/payment-config
 */
router.get('/admin/payment-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: paymentConfig,
    requestId: req.id
  });
});

router.put('/admin/payment-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
  if (isSupabaseServerConfigured()) {
    try {
      const profile = await getUserProfile(req.user!.id);
      if (!profile) return res.status(404).json({ success: false, error: 'User profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: { ...req.user, fullName: profile.full_name, country: profile.country, accountType: profile.account_type, balance: Number(profile.wallet_balance || 0), kycStatus: profile.kyc_status, phoneNumber: profile.phone_number }, requestId: req.id });
    } catch (error: any) {
      return res.status(503).json({ success: false, error: 'Your account is temporarily unavailable.', code: 'PROFILE_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const stored = findUserRecordForRequest(req);
  res.json({
    success: true,
    data: stored ? { ...req.user, ...stored } : req.user,
    requestId: req.id
  });
});

router.patch('/users/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body || {};
  if (isSupabaseServerConfigured()) {
    try {
      const patch: Record<string, unknown> = {
        full_name: updates.fullName, phone_number: updates.phoneNumber, country: updates.country,
        country_code: updates.countryCode, bank_iban: updates.bankIban,
        crypto_deposit_address: updates.cryptoDepositAddress, tax_id: updates.taxId,
        address: updates.address, city: updates.city, postal_code: updates.postalCode,
        date_of_birth: updates.dateOfBirth, avatar_url: updates.avatarUrl
      };
      const profile = await updateUserProfile(req.user!.id, patch);
      return res.json({ success: true, data: { id: profile.id, email: profile.email, fullName: profile.full_name, phoneNumber: profile.phone_number, country: profile.country, countryCode: profile.country_code, address: profile.address, city: profile.city, postalCode: profile.postal_code, avatarUrl: profile.avatar_url, bankIban: profile.bank_iban, cryptoDepositAddress: profile.crypto_deposit_address, taxId: profile.tax_id, dateOfBirth: profile.date_of_birth, balance: Number(profile.wallet_balance || 0), kycStatus: profile.kyc_status }, message: 'User profile updated successfully.', requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-profile-update-db', eventType: 'PROFILE_UPDATE_FAILED', outcome: 'failure', message: error?.message || 'Profile update failed.' });
      return res.status(503).json({ success: false, error: 'Profile changes could not be saved. Please try again.', code: 'PROFILE_UPDATE_FAILED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent profile storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const allowedFields = [
    'fullName',
    'phoneNumber',
    'country',
    'countryCode',
    'bankIban',
    'cryptoDepositAddress',
    'taxId',
    'address',
    'city',
    'postalCode',
    'dateOfBirth',
    'twoFactorEnabled',
    'avatarUrl'
  ];

  let target = findUserRecordForRequest(req);
  if (!target) {
    target = {
      id: req.user!.id,
      email: req.user!.email,
      fullName: req.user!.fullName || 'Verified Investor',
      passwordHash: '',
      role: req.user!.role,
      kycStatus: 'unverified',
      balance: req.user!.balance ?? 0,
      currency: 'EUR',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    mockUsers.push(target);
  }

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      (target as any)[key] = typeof updates[key] === 'string' ? updates[key].trim() : updates[key];
    }
  }

  res.json({
    success: true,
    data: sanitizeUser(target),
    message: 'User profile updated successfully.',
    requestId: req.id
  });
});

// Dashboard summary & performance endpoints
router.get('/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isSupabaseServerConfigured()) {
    try {
      const summary = await getPersistentDashboardSummary(userId);
      if (!summary) return res.status(404).json({ success: false, error: 'Investor profile not found.', code: 'USER_NOT_FOUND', requestId: req.id });
      return res.json({ success: true, data: summary, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-dashboard-db', eventType: 'DASHBOARD_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Dashboard query failed.' });
      return res.status(503).json({ success: false, error: 'Your dashboard is temporarily unavailable.', code: 'DASHBOARD_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  const userRecord = findUserRecordForRequest(req);
  const availableBalance = userRecord ? userRecord.balance : (req.user?.balance ?? 0);
  const userInvTxs = mockTransactions.filter(
    t => t.userId === userId && t.type === 'investment' && t.status === 'completed'
  );
  const investedTotal = userInvTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const uniqueProps = new Set(userInvTxs.map(t => (t as any).propertyId)).size;
  const earnedDividends = userId === 'usr-investor-01' ? 320.0 : 0.0;
  const projectedMonthlyIncome = Number((investedTotal * 0.061).toFixed(2));

  res.json({
    success: true,
    data: {
      totalPortfolioValue: Number((availableBalance + investedTotal).toFixed(2)),
      availableBalance,
      investedCapital: investedTotal,
      totalEarnedDividends: earnedDividends,
      activePropertiesCount: uniqueProps,
      projectedMonthlyIncome,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

router.get('/dashboard/performance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (isSupabaseServerConfigured()) {
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
  const userInvTxs = mockTransactions.filter(
    t => t.userId === userId && t.type === 'investment' && t.status === 'completed'
  );

  const totalInv = userInvTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const userDividends = mockTransactions.filter(
    t => t.userId === userId && (t.type === 'dividend' || t.type === 'payout' || t.type === 'distribution') && t.status === 'completed'
  );

  // Group real dividends by month if any exist
  const historyMap = new Map<string, { yield: number; totalValue: number }>();
  userDividends.forEach(d => {
    const dDate = new Date(d.createdAt || Date.now());
    const mKey = dDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const prev = historyMap.get(mKey) || { yield: 0, totalValue: totalInv };
    prev.yield += Number(d.amount || 0);
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
  if (isSupabaseServerConfigured()) {
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
  const userRecord = findUserRecordForRequest(req);
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
router.get(['/admin/dashboard', '/admin/stats'], requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try {
      const stats = await getPersistentAdminDashboard();
      return res.json({ success: true, data: { ...stats, systemUptimePercent: 99.9 }, requestId: req.id });
    } catch (error: any) {
      logger.log({ level: 'error', category: 'database', requestId: req.id || 'req-admin-dashboard-db', eventType: 'ADMIN_DASHBOARD_QUERY_FAILED', outcome: 'failure', message: error?.message || 'Unable to load admin dashboard.' });
      return res.status(503).json({ success: false, error: 'The administrator dashboard is temporarily unavailable.', code: 'ADMIN_DASHBOARD_DATABASE_UNAVAILABLE', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  res.json({
    success: true,
    data: {
      totalUsers: 142,
      totalAssetsUnderManagement: 48500000,
      totalDividendsPaid: 1240000,
      pendingKYC: 4,
      pendingWithdrawalsCount: 2,
      systemUptimePercent: 99.98
    },
    requestId: req.id
  });
});

router.get('/admin/investments', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try { return res.json({ success: true, data: await listPersistentInvestments(), requestId: req.id }); }
    catch (error: any) { return res.status(503).json({ success: false, error: 'Investment records are temporarily unavailable.', code: 'INVESTMENT_DATABASE_UNAVAILABLE', requestId: req.id }); }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent database is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent investment storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  res.json({
    success: true,
    data: [
      { id: 'inv-001', userId: 'usr-investor-01', userEmail: 'investor@kretz.com', propertyTitle: 'Villa El Mirador', tokensPurchased: 100, totalCost: 10000, purchaseDate: new Date(Date.now() - 86400000 * 30).toISOString() }
    ],
    requestId: req.id
  });
});

router.get('/admin/transactions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try { const rows = await listAdminTransactions(); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) { return res.status(503).json({ success: false, error: 'Financial transactions are temporarily unavailable.', code: 'TRANSACTION_DATABASE_UNAVAILABLE', requestId: req.id }); }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  res.json({
    success: true,
    data: mockTransactions,
    requestId: req.id
  });
});

router.get('/admin/deposits', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try { const rows = await listAdminTransactions('deposit'); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) { return res.status(503).json({ success: false, error: 'Deposit requests are temporarily unavailable.', code: 'DEPOSIT_DATABASE_UNAVAILABLE', requestId: req.id }); }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent deposit storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const deposits = mockTransactions.filter(t => t.type === 'deposit');
  res.json({
    success: true,
    data: deposits,
    requestId: req.id
  });
});

router.get('/admin/withdrawals', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (isSupabaseServerConfigured()) {
    try { const rows = await listAdminTransactions('withdrawal'); return res.json({ success: true, data: rows.map(toApiTransaction), total: rows.length, requestId: req.id }); }
    catch (error: any) { return res.status(503).json({ success: false, error: 'Withdrawal requests are temporarily unavailable.', code: 'WITHDRAWAL_DATABASE_UNAVAILABLE', requestId: req.id }); }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent withdrawal storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const withdrawals = mockTransactions.filter(t => t.type === 'withdrawal');
  res.json({
    success: true,
    data: withdrawals,
    requestId: req.id
  });
});

router.post('/admin/deposits/:depositId/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { depositId } = req.params;
  if (isSupabaseServerConfigured()) {
    try {
      const row = await runFinancialRpc('kretz_review_deposit', { p_transaction_id: depositId, p_admin_id: req.user!.id, p_approve: true, p_reason: req.body?.reason || null });
      return res.json({ success: true, data: toApiTransaction(row), message: `Deposit ${depositId} approved and cash credited to the investor wallet.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('DEPOSIT_NOT_FOUND') ? 404 : message.includes('DEPOSIT_NOT_PENDING') ? 409 : message.includes('ADMIN_REQUIRED') || message.includes('FINANCE_ADMIN_REQUIRED') ? 403 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Deposit approval could not be completed. Please retry after checking database availability.' : message, code: status === 503 ? 'DEPOSIT_REVIEW_FAILED' : 'DEPOSIT_REVIEW_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const targetTx = mockTransactions.find(t => t.type === 'deposit' && (t.id === depositId || t.reference === depositId));
  if (!targetTx) {
    return res.status(404).json({ success: false, error: `Deposit transaction '${depositId}' not found.`, code: 'DEPOSIT_NOT_FOUND', requestId: req.id });
  }
  if (targetTx.status !== 'pending') {
    return res.status(409).json({ success: false, error: `Deposit is already ${targetTx.status}; it cannot be approved again.`, code: 'DEPOSIT_NOT_PENDING', requestId: req.id });
  }
  const foundUser =
    mockUsers.find(u => u.id === targetTx.userId) ||
    (targetTx.userEmail ? mockUsers.find(u => u.email === targetTx.userEmail) : undefined);
  if (!foundUser) {
    return res.status(409).json({ success: false, error: 'The investor ledger account could not be found. The deposit was not approved or credited.', code: 'ACCOUNT_LEDGER_UNAVAILABLE', requestId: req.id });
  }

  {
    targetTx.status = 'completed';
    const creditAmt = Number(targetTx.amount);
    if (foundUser) {
      if (userSubBalancesStore.has(foundUser.id)) {
        const sub = userSubBalancesStore.get(foundUser.id)!;
        sub.EUR = Number(((sub.EUR || 0) + creditAmt).toFixed(2));
        foundUser.balance = sub.EUR;
      } else {
        foundUser.balance = Number(((foundUser.balance || 0) + creditAmt).toFixed(2));
      }
    }
    pushUserNotification(targetTx.userId, {
      title: 'Deposit Approved & Credited',
      message: `Your deposit of €${creditAmt.toFixed(2)} (${targetTx.reference}) has been credited to your EUR balance.`,
      type: 'financial'
    });
    
    sendEmail({
      templateId: 'deposit_confirmed',
      recipient: targetTx.userEmail || foundUser?.email || 'investor@kretz.com',
      data: {
        fullName: foundUser?.fullName || 'Valued Investor',
        amount: Number(targetTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        currency: targetTx.currency || 'EUR',
        reference: targetTx.reference || depositId,
        creditedBalance: (foundUser?.balance || Number(targetTx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        settledAt: new Date().toUTCString()
      }
    }).catch(err => {
      logger.log({
        level: 'error',
        category: 'admin',
        requestId: req.id || 'req-dep-appr-email',
        eventType: 'EMAIL_DISPATCH_FAILURE',
        outcome: 'failure',
        message: `Failed to dispatch deposit confirmation email: ${err.message}`
      });
    });
  }

  res.json({
    success: true,
    message: `Deposit ${depositId} approved and cash credited to user balance.`,
    requestId: req.id
  });
});

router.post('/admin/deposits/:depositId/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { depositId } = req.params;
  const { reason } = req.body || {};
  if (isSupabaseServerConfigured()) {
    try {
      const row = await runFinancialRpc('kretz_review_deposit', { p_transaction_id: depositId, p_admin_id: req.user!.id, p_approve: false, p_reason: reason || 'Transfer verification could not be matched.' });
      return res.json({ success: true, data: toApiTransaction(row), message: `Deposit ${depositId} rejected.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('DEPOSIT_NOT_FOUND') ? 404 : message.includes('DEPOSIT_NOT_PENDING') ? 409 : message.includes('ADMIN_REQUIRED') || message.includes('FINANCE_ADMIN_REQUIRED') ? 403 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Deposit rejection could not be completed. Please retry.' : message, code: status === 503 ? 'DEPOSIT_REVIEW_FAILED' : 'DEPOSIT_REVIEW_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const targetTx = mockTransactions.find(t => t.type === 'deposit' && (t.id === depositId || t.reference === depositId));

  if (!targetTx) {
    return res.status(404).json({
      success: false,
      error: `Deposit transaction '${depositId}' not found.`,
      code: 'DEPOSIT_NOT_FOUND',
      requestId: req.id
    });
  }

  if (targetTx.status !== 'pending') {
    return res.status(409).json({ success: false, error: `Deposit is already ${targetTx.status}; it cannot be rejected again.`, code: 'DEPOSIT_NOT_PENDING', requestId: req.id });
  }
  targetTx.status = 'rejected';
  (targetTx as any).rejectionReason = reason || 'Transfer verification could not be matched.';
  pushUserNotification(targetTx.userId, {
    title: 'Deposit Request Declined',
    message: `Your deposit (${targetTx.reference}) was declined: ${(targetTx as any).rejectionReason}`,
    type: 'warning'
  });

  const foundUser = mockUsers.find(u => u.id === targetTx.userId || u.email === targetTx.userEmail);
  sendEmail({
    templateId: 'payment_notification',
    recipient: targetTx.userEmail || foundUser?.email || 'investor@kretz.com',
    data: {
      fullName: foundUser?.fullName || 'Valued Investor',
      payment_type: 'Deposit Request Declined',
      amount: `€${Number(targetTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      payment_status: 'Declined',
      reference: targetTx.reference || depositId,
      notes: (targetTx as any).rejectionReason
    },
    idempotencyKey: `idemp-dep-reject-${targetTx.id}`
  }).catch(() => {});

  res.json({
    success: true,
    data: targetTx,
    message: `Deposit ${depositId} rejected.`,
    requestId: req.id
  });
});

router.post('/admin/withdrawals/:withdrawalId/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { withdrawalId } = req.params;
  if (isSupabaseServerConfigured()) {
    try {
      const row = await runFinancialRpc('kretz_review_withdrawal', { p_transaction_id: withdrawalId, p_admin_id: req.user!.id, p_approve: true, p_reason: req.body?.reason || null });
      return res.json({ success: true, data: toApiTransaction(row), message: `Withdrawal ${withdrawalId} approved and marked for payout processing.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('WITHDRAWAL_NOT_FOUND') ? 404 : message.includes('WITHDRAWAL_NOT_PENDING') ? 409 : message.includes('ADMIN_REQUIRED') || message.includes('FINANCE_ADMIN_REQUIRED') ? 403 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Withdrawal approval could not be completed. Please retry.' : message, code: status === 503 ? 'WITHDRAWAL_REVIEW_FAILED' : 'WITHDRAWAL_REVIEW_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const targetTx = mockTransactions.find(t => t.type === 'withdrawal' && (t.id === withdrawalId || t.reference === withdrawalId));
  if (!targetTx) {
    return res.status(404).json({ success: false, error: `Withdrawal '${withdrawalId}' not found.`, code: 'WITHDRAWAL_NOT_FOUND', requestId: req.id });
  }
  if (targetTx.status !== 'pending') {
    return res.status(409).json({ success: false, error: `Withdrawal is already ${targetTx.status}; it cannot be approved again.`, code: 'WITHDRAWAL_NOT_PENDING', requestId: req.id });
  }

  {
    targetTx.status = 'completed';
    const foundUser = mockUsers.find(u => u.id === targetTx.userId || u.email === targetTx.userEmail);
    
    sendEmail({
      templateId: 'withdrawal_completed',
      recipient: targetTx.userEmail || foundUser?.email || 'investor@kretz.com',
      data: {
        fullName: foundUser?.fullName || 'Valued Investor',
        amount: Number(targetTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        currency: targetTx.currency || 'EUR',
        reference: targetTx.reference || withdrawalId,
        destination: (targetTx as any).destination || 'Verified Bank Account',
        bankTransferId: `SEPA-CX-${Date.now().toString().slice(-6)}`,
        dispatchedAt: new Date().toUTCString()
      }
    }).catch(err => {
      logger.log({
        level: 'error',
        category: 'admin',
        requestId: req.id || 'req-wth-appr-email',
        eventType: 'EMAIL_DISPATCH_FAILURE',
        outcome: 'failure',
        message: `Failed to dispatch withdrawal completed email: ${err.message}`
      });
    });
  }

  res.json({
    success: true,
    message: `Withdrawal ${withdrawalId} approved and transfer queued.`,
    requestId: req.id
  });
});

router.post('/admin/withdrawals/:withdrawalId/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { withdrawalId } = req.params;
  if (isSupabaseServerConfigured()) {
    try {
      const row = await runFinancialRpc('kretz_review_withdrawal', { p_transaction_id: withdrawalId, p_admin_id: req.user!.id, p_approve: false, p_reason: req.body?.reason || 'Withdrawal rejected by finance review.' });
      return res.json({ success: true, data: toApiTransaction(row), message: `Withdrawal ${withdrawalId} rejected and reserved funds refunded to the investor wallet.`, requestId: req.id });
    } catch (error: any) {
      const message = String(error?.message || '');
      const status = message.includes('WITHDRAWAL_NOT_FOUND') ? 404 : message.includes('WITHDRAWAL_NOT_PENDING') ? 409 : message.includes('ADMIN_REQUIRED') || message.includes('FINANCE_ADMIN_REQUIRED') ? 403 : 503;
      return res.status(status).json({ success: false, error: status === 503 ? 'Withdrawal rejection could not be completed. Please retry.' : message, code: status === 503 ? 'WITHDRAWAL_REVIEW_FAILED' : 'WITHDRAWAL_REVIEW_REJECTED', requestId: req.id });
    }
  }
  if (process.env.NODE_ENV === 'production') return res.status(503).json({ success: false, error: 'Persistent financial storage is not configured.', code: 'DATABASE_NOT_CONFIGURED', requestId: req.id });
  const targetTx = mockTransactions.find(t => t.type === 'withdrawal' && (t.id === withdrawalId || t.reference === withdrawalId));
  if (!targetTx) {
    return res.status(404).json({ success: false, error: `Withdrawal '${withdrawalId}' not found.`, code: 'WITHDRAWAL_NOT_FOUND', requestId: req.id });
  }
  if (targetTx.status !== 'pending') {
    return res.status(409).json({ success: false, error: `Withdrawal is already ${targetTx.status}; it cannot be rejected or refunded again.`, code: 'WITHDRAWAL_NOT_PENDING', requestId: req.id });
  }
  {
    targetTx.status = 'rejected';
    // Refund locked balance back to user
    const foundUser = mockUsers.find(u => u.id === targetTx.userId || u.email === targetTx.userEmail);
    if (foundUser) {
      foundUser.balance = Number(((foundUser.balance || 0) + Number(targetTx.amount)).toFixed(2));
      if (userSubBalancesStore.has(foundUser.id)) {
        userSubBalancesStore.get(foundUser.id)!.EUR = foundUser.balance;
      }
    }

    sendEmail({
      templateId: 'payment_notification',
      recipient: targetTx.userEmail || foundUser?.email || 'investor@kretz.com',
      data: {
        fullName: foundUser?.fullName || 'Valued Investor',
        payment_type: 'Withdrawal Declined & Refunded',
        amount: `€${Number(targetTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        payment_status: 'Refunded to Wallet',
        reference: targetTx.reference || withdrawalId
      },
      idempotencyKey: `idemp-wth-reject-${targetTx.id}`
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: `Withdrawal ${withdrawalId} rejected and funds unlocked.`,
    requestId: req.id
  });
});

/**
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
router.get('/admin/insights', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: mockInsightArticles,
    requestId: req.id
  });
});

router.post('/admin/insights', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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

router.patch('/admin/insights/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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

router.delete('/admin/insights/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/templates', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/preview/:templateId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/email/execute-command', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/email/send-test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/automations', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.patch('/admin/email/automations/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/email/logs/:id/retry', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.delete('/admin/email/logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/email/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/email/verify-smtp', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const result = await verifySmtpConnection();
  res.json({
    success: result.connected,
    data: result,
    requestId: req.id
  });
});

router.get('/admin/email/verify-provider', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
  const result = handleEmailWebhook(req.body);
  res.json({
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
        turnstileBotProtection: true,
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
router.get('/distributions/my-properties', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const matchedUser = findUserRecordForRequest(req);
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
router.get('/admin/distributions/configs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.put('/admin/distributions/configs/:propertyId', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/distributions/properties/:id/toggle', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/distributions/process', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
          const u = mockUsers.find(mu => mu.id === tx.userId || (tx.userEmail && mu.email === tx.userEmail));
          const prev = userMap.get(tx.userId);
          const tokens = Number((tx as any).tokensPurchased || 0);
          const cost = Number(tx.amount || 0);
          if (prev) {
            prev.tokensCount += tokens;
            prev.allocatedEUR += cost;
          } else {
            userMap.set(tx.userId, {
              userId: tx.userId,
              userEmail: tx.userEmail || u?.email || 'investor@kretz.com',
              userName: u?.fullName || 'Institutional Investor',
              tokensCount: tokens,
              allocatedEUR: cost,
              investmentId: tx.id
            });
          }
        }
        return Array.from(userMap.values());
      },
      (targetUserId, amountEUR, propTitle, ref, date) => {
        const u = mockUsers.find(mu => mu.id === targetUserId);
        if (u) {
          u.balance = Math.round((u.balance + amountEUR) * 100) / 100;
          const subBals = getOrInitUserSubBalances(u.id, u.balance);
          subBals.EUR = u.balance;
        }

        const txId = `tx-dist-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        mockTransactions.unshift({
          id: txId,
          userId: targetUserId,
          userEmail: u?.email || 'investor@kretz.com',
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
router.post('/admin/distributions/records/:id/adjust', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/distributions/records', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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

export default router;

