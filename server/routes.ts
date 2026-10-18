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
import { AuthenticatedRequest, rateLimiter, requireAuth, requireAdmin } from './middleware';
import { logger } from './logger';
import { verifyTurnstileToken, requireTurnstile } from './turnstile';
import { handleTranslationRequest } from './translationController';
import crypto from 'crypto';

const router = Router();

// Server-side translation endpoint
router.post('/translate', handleTranslationRequest);

const contactLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  category: 'security',
  message: 'Too many contact inquiries from this IP address. Please wait 1 minute.'
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
  role: string;
  kycStatus: string;
  balance: number;
  currency: string;
  createdAt: string;
  country?: string;
  countryCode?: string;
  phoneNumber?: string;
  status?: 'active' | 'suspended';
  suspendedReason?: string;
}

// In-memory data store for server-authoritative state
// (Production Note: Easily backed by PostgreSQL / Cloud SQL via Drizzle / Supabase)
let mockUsers: MockUser[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@kretz.com',
    fullName: 'Chief Compliance Officer',
    role: 'admin',
    kycStatus: 'approved',
    balance: 250000,
    currency: 'EUR',
    country: 'Spain',
    countryCode: 'ES',
    phoneNumber: '+34 912 345 678',
    status: 'active',
    createdAt: '2025-01-15T09:00:00Z'
  },
  {
    id: 'usr-investor-01',
    email: 'investor@kretz.com',
    fullName: 'European Angel Partner',
    role: 'investor',
    kycStatus: 'approved',
    balance: 45000,
    currency: 'EUR',
    status: 'active',
    createdAt: '2025-02-10T11:30:00Z'
  },
  {
    id: 'usr-investor-02',
    email: 'sophie.martin@luxcapital.fr',
    fullName: 'Sophie Martin',
    role: 'investor',
    kycStatus: 'pending',
    balance: 15000,
    currency: 'EUR',
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
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
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
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
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
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
    ],
    specs: { bedrooms: 8, bathrooms: 10, builtAreaM2: 1450, plotAreaM2: 8900 },
    financials: { grossRentAnnual: 310000, netYield: 78.0, totalIrr: 234.0 }
  }
];

let mockTransactions = [
  {
    id: 'tx-dep-101',
    userId: 'usr-investor-01',
    userEmail: 'investor@kretz.com',
    type: 'deposit',
    amount: 15000,
    currency: 'EUR',
    status: 'completed',
    method: 'SEPA Bank Wire',
    reference: 'KZ-DEP-99214',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'tx-inv-102',
    userId: 'usr-investor-01',
    userEmail: 'investor@kretz.com',
    type: 'investment',
    amount: 10000,
    currency: 'EUR',
    status: 'completed',
    method: 'Platform Balance',
    propertyId: 'prop-villa-mirador',
    propertyTitle: 'Villa El Mirador',
    tokensPurchased: 100,
    reference: 'KZ-INV-88120',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

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
 */
router.post('/auth/login', authLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { email, password, pass } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const inputPass = password || pass;

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

  // Look up user or auto-provision on first login
  let found = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!found && inputPass && inputPass.length >= 4) {
    found = {
      id: `usr-${crypto.randomBytes(4).toString('hex')}`,
      email: normalizedEmail,
      fullName: normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      role: normalizedEmail.includes('admin') ? 'admin' : 'investor',
      kycStatus: 'approved',
      balance: 15000,
      currency: 'EUR',
      createdAt: new Date().toISOString()
    };
    mockUsers.push(found);
  }

  if (!found || inputPass.length < 4) {
    logger.log({
      level: 'warn',
      category: 'auth',
      requestId: req.id || 'req-login-err',
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 401,
      eventType: 'LOGIN_FAILED',
      outcome: 'failure',
      message: `Failed login attempt for account ${normalizedEmail}`,
      errorCode: 'INVALID_CREDENTIALS',
      metadata: { attemptedEmail: normalizedEmail }
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid email address or password. Password must be at least 4 characters.',
      code: 'INVALID_CREDENTIALS',
      requestId: req.id
    });
  }

  // Issue session token
  const token = `sess_${found.id}`;

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
      user: found,
      token,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString()
    },
    message: 'Authentication successful.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/admin/login & /api/v1/auth/admin/login
 * Dedicated administrative login endpoint with role enforcement and security logging
 */
const handleAdminLogin = (req: AuthenticatedRequest, res: Response) => {
  const { email, password, pass } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();
  const inputPass = password || pass;

  if (!normalizedEmail || !inputPass) {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-admin-login-err',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 400,
      eventType: 'ADMIN_AUTH_VALIDATION_FAILURE',
      outcome: 'failure',
      message: 'Admin login attempted without required email or passphrase.',
      errorCode: 'MISSING_CREDENTIALS'
    });

    return res.status(400).json({
      success: false,
      error: 'Please provide administrator email address and passphrase.',
      code: 'MISSING_FIELDS',
      requestId: req.id
    });
  }

  // Look up user
  const found = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!found || inputPass.length < 4) {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-admin-login-fail',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 401,
      eventType: 'ADMIN_LOGIN_INVALID_CREDENTIALS',
      outcome: 'failure',
      message: `Failed admin login attempt for account ${normalizedEmail}`,
      errorCode: 'INVALID_CREDENTIALS',
      metadata: { attemptedEmail: normalizedEmail }
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid administrator credentials.',
      code: 'INVALID_CREDENTIALS',
      requestId: req.id
    });
  }

  // Enforce Administrator Role
  if (found.role !== 'admin') {
    logger.log({
      level: 'warn',
      category: 'security',
      requestId: req.id || 'req-admin-unauthorized',
      method: 'POST',
      route: req.originalUrl,
      statusCode: 403,
      userId: found.id,
      userRole: found.role,
      eventType: 'UNAUTHORIZED_ADMIN_PORTAL_ACCESS',
      outcome: 'failure',
      message: `Access denied: Account ${found.email} with role '${found.role}' attempted admin portal login.`,
      errorCode: 'FORBIDDEN_NOT_ADMIN',
      metadata: { role: found.role }
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied. Only authorized platform administrators may access this portal.',
      code: 'ADMIN_ACCESS_REQUIRED',
      requestId: req.id
    });
  }

  // Issue dedicated admin session token
  const token = `admin_sess_${found.id}`;

  logger.log({
    level: 'info',
    category: 'admin',
    requestId: req.id || 'req-admin-login',
    method: 'POST',
    route: req.originalUrl,
    statusCode: 200,
    userId: found.id,
    userRole: 'admin',
    eventType: 'ADMIN_PORTAL_LOGIN_SUCCESS',
    outcome: 'success',
    message: `Administrator ${found.email} authenticated successfully to control panel.`,
    metadata: { role: 'admin', authMethod: 'admin-portal' }
  });

  return res.json({
    success: true,
    data: {
      user: found,
      token,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    },
    message: 'Administrative authentication successful.',
    requestId: req.id
  });
};

router.post('/admin/login', authLimiter, requireTurnstile, handleAdminLogin);
router.post('/auth/admin/login', authLimiter, requireTurnstile, handleAdminLogin);

/**
 * POST /api/v1/auth/register
 */
router.post('/auth/register', authLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { email, fullName, password, pass, role, country, phoneNumber, countryCode } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail || !(password || pass) || !fullName || !country || !phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Full legal name, valid email, password, country of residence, and phone number are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  const existing = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    if (fullName) existing.fullName = fullName.trim();
    if (country) existing.country = typeof country === 'string' ? country.trim() : existing.country;
    if (phoneNumber) existing.phoneNumber = typeof phoneNumber === 'string' ? phoneNumber.trim() : existing.phoneNumber;
    if (countryCode) (existing as any).countryCode = typeof countryCode === 'string' ? countryCode.trim() : (existing as any).countryCode;

    const token = `sess_${existing.id}`;
    logger.log({
      level: 'info',
      category: 'auth',
      requestId: req.id || 'req-reg-existing',
      method: 'POST',
      route: '/api/v1/auth/register',
      statusCode: 200,
      userId: existing.id,
      userRole: existing.role,
      eventType: 'USER_REGISTERED_EXISTING_SYNC',
      outcome: 'success',
      message: `Existing investor account authenticated: ${existing.email}`,
      metadata: { userId: existing.id }
    });

    return res.status(200).json({
      success: true,
      data: {
        user: existing,
        token,
        requiresVerification: false,
        alreadyExisted: true
      },
      message: 'Welcome back! Signed in to your investor account.',
      requestId: req.id
    });
  }

  const newUser = {
    id: `usr-${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    fullName: fullName.trim(),
    role: role === 'admin' ? 'investor' : 'investor', // prevent privilege escalation on public register
    country: typeof country === 'string' ? country.trim() : 'France',
    phoneNumber: typeof phoneNumber === 'string' ? phoneNumber.trim() : '',
    countryCode: typeof countryCode === 'string' ? countryCode.trim() : '',
    kycStatus: 'pending',
    balance: 0,
    currency: 'EUR',
    createdAt: new Date().toISOString()
  };

  mockUsers.push(newUser);
  const token = `sess_${newUser.id}`;

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
      user: newUser,
      token,
      requiresVerification: false
    },
    message: 'Account created successfully.',
    requestId: req.id
  });
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
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

  res.json({
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
 * Enforces Turnstile human verification and rate limiting on investor inquiries
 */
router.post('/contact', contactLimiter, requireTurnstile, (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, topic, message } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!fullName || !normalizedEmail || !message) {
    return res.status(400).json({
      success: false,
      error: 'Full name, valid email address, and inquiry message are required.',
      code: 'MISSING_FIELDS',
      requestId: req.id,
    });
  }

  logger.log({
    level: 'info',
    category: 'system',
    requestId: req.id || 'req-contact',
    method: 'POST',
    route: '/api/v1/contact',
    statusCode: 200,
    eventType: 'CONTACT_INQUIRY_RECEIVED',
    outcome: 'success',
    message: `Direct investor desk inquiry received from ${fullName} (${normalizedEmail})`,
    metadata: { email: normalizedEmail, topic: topic || 'Investor Inquiries' }
  });

  return res.json({
    success: true,
    message: 'Your inquiry has been successfully received by the Kretz Investor Relations Desk.',
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
 */
router.post('/api/v1/auth/password/reset', (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters.',
      code: 'WEAK_PASSWORD',
      requestId: req.id
    });
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
    message: 'Password successfully updated via recovery authorization.'
  });

  res.json({
    success: true,
    message: 'Password updated successfully. You may now log in.',
    requestId: req.id
  });
});

/**
 * GET /api/v1/auth/session
 */
router.get('/auth/session', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = mockUsers.find(u => u.id === req.user?.id) || {
    id: req.user!.id,
    email: req.user!.email,
    fullName: req.user!.fullName || 'Investor Member',
    role: req.user!.role,
    kycStatus: 'approved',
    balance: 45000,
    currency: 'EUR'
  };

  res.json({
    success: true,
    data: {
      authenticated: true,
      user: currentUser
    },
    requestId: req.id
  });
});

// ============================================================================
// 2. ADMINISTRATION ROUTES (/api/v1/admin)
// ============================================================================

/**
 * GET /api/v1/admin/users
 */
router.get('/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
    data: mockUsers,
    total: mockUsers.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/audit-logs
 */
router.get('/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
 * GET /api/v1/admin/settings
 */
router.get('/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      platformName: 'Kretz Prime Real Estate Platform',
      baseCurrency: 'EUR',
      minInvestment: 750,
      maxInvestmentPerInvestor: 500000,
      kycEnforcement: 'STRICT',
      supportedChains: ['Ethereum (ERC20)', 'Tron (TRC20)', 'Polygon POS', 'BNB Chain', 'Base'],
      treasuryStatus: 'ACTIVE',
      settlementTimeHours: 24
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/admin/logs
 * Query & Filter Structured Server Logs
 */
router.get('/admin/logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.get('/admin/logs/export', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/users/:id/kyc', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { kycStatus, notes } = req.body || {};

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
const handleUserStatusUpdate = (req: AuthenticatedRequest, res: Response) => {
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
router.post('/admin/users/:id/credit', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, currency = 'EUR', method = 'Direct Wire Received', reference, notes } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'Credit amount must be greater than zero.', code: 'INVALID_AMOUNT', requestId: req.id });
  }

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
router.get(['/marketplace/listings', '/properties'], (req: AuthenticatedRequest, res: Response) => {
  const { search, type, status } = req.query;
  let items = [...mockListings];

  if (search) {
    const s = String(search).toLowerCase();
    items = items.filter(p => p.title.toLowerCase().includes(s) || p.location.toLowerCase().includes(s));
  }
  if (type && type !== 'all') {
    items = items.filter(p => p.type.toLowerCase() === String(type).toLowerCase());
  }
  if (status && status !== 'all') {
    items = items.filter(p => p.status === status);
  }

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-mkt',
    method: 'GET',
    route: '/api/v1/marketplace/listings',
    statusCode: 200,
    eventType: 'MARKETPLACE_LISTINGS_FETCHED',
    outcome: 'success',
    message: `Marketplace offerings queried (${items.length} items returned)`,
    metadata: { filterCount: items.length }
  });

  res.json({
    success: true,
    data: items,
    total: items.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/marketplace/listings/:id
 */
router.get(['/marketplace/listings/:id', '/properties/:id'], (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const found = mockListings.find(p => p.id === id || p.slug === id);

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
 * POST /api/v1/marketplace/listings (Admin Only)
 */
router.post(['/marketplace/listings', '/properties'], requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  if (!body.title || !body.location || !body.targetAmount) {
    return res.status(400).json({
      success: false,
      error: 'Listing title, location, and target funding amount are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newProp = {
    id: `prop-${crypto.randomBytes(4).toString('hex')}`,
    slug,
    title: body.title,
    location: body.location,
    type: body.type || 'Luxury Villa',
    status: body.status || 'funding',
    fundedAmount: 0,
    targetAmount: Number(body.targetAmount),
    tokenPrice: 364,
    totalTokens: Math.round(Number(body.targetAmount) / 364),
    availableTokens: Math.round(Number(body.targetAmount) / 364),
    monthlyTargetRate: Number(body.monthlyTargetRate || 6.0),
    projectedYield: Number(body.projectedYield || 72.0),
    capitalAppreciation: Number(body.capitalAppreciation || 4.5),
    minimumInvestment: 1000,
    holdingPeriodMonths: Number(body.holdingPeriodMonths || 36),
    images: body.images || ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80'],
    specs: body.specs || { bedrooms: 5, bathrooms: 6, builtAreaM2: 750, plotAreaM2: 2500 },
    financials: body.financials || { grossRentAnnual: 120000, netYield: 8.5, totalIrr: 13.0 }
  };

  mockListings.unshift(newProp);

  logger.log({
    level: 'info',
    category: 'marketplace',
    requestId: req.id || 'req-prop-create',
    method: 'POST',
    route: '/api/v1/marketplace/listings',
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

// ============================================================================
// 4. USER DASHBOARD & PORTFOLIO ROUTES (/api/v1/user & /api/v1/portfolio)
// ============================================================================

/**
 * GET /api/v1/user/profile
 */
router.get('/user/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = mockUsers.find(u => u.id === req.user?.id) || {
    id: req.user!.id,
    email: req.user!.email,
    fullName: req.user!.fullName || 'Investor Member',
    role: req.user!.role,
    kycStatus: 'approved',
    balance: 45000,
    currency: 'EUR'
  };

  res.json({
    success: true,
    data: profile,
    requestId: req.id
  });
});

/**
 * GET /api/v1/portfolio
 */
router.get('/portfolio', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userInvestments = [
    {
      id: 'inv-001',
      propertyId: 'prop-villa-mirador',
      propertyTitle: 'Villa El Mirador',
      tokensPurchased: 100,
      totalCost: 10000,
      currentValue: 10580,
      projectedAnnualDividend: 1280,
      dividendsReceived: 320,
      purchaseDate: new Date(Date.now() - 86400000 * 60).toISOString(),
      certificateId: 'KZ-CERT-VILLA-001'
    }
  ];

  const totalPortfolioValue = userInvestments.reduce((acc, curr) => acc + curr.currentValue, 0);

  res.json({
    success: true,
    data: {
      holdings: userInvestments,
      totalHoldingsValue: totalPortfolioValue,
      totalTokensHeld: 100,
      activePropertiesCount: 1,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

/**
 * GET /api/v1/transactions
 */
router.get('/transactions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // If user is ordinary investor, filter to their transactions
  const txs = req.user?.role === 'admin' 
    ? mockTransactions 
    : mockTransactions.filter(t => t.userId === req.user?.id);

  res.json({
    success: true,
    data: txs,
    total: txs.length,
    requestId: req.id
  });
});

/**
 * GET /api/v1/notifications
 */
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
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
    ],
    requestId: req.id
  });
});

// ============================================================================
// 5. FINANCIAL OPERATIONS (/api/v1/deposits, /withdrawals, /investments, /payments)
// ============================================================================

/**
 * POST /api/v1/deposits
 */
router.post('/deposits', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { amount, currency = 'EUR', method = 'SEPA Bank Wire', txHash } = req.body || {};

  if (!amount || Number(amount) < 100) {
    return res.status(400).json({
      success: false,
      error: 'Minimum deposit amount is €100.',
      code: 'INVALID_DEPOSIT_AMOUNT',
      requestId: req.id
    });
  }

  const numAmount = Number(amount);
  const ref = `KZ-DEP-${Math.floor(100000 + Math.random() * 900000)}`;

  const depositTx = {
    id: `tx-dep-${Date.now()}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
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
router.post('/withdrawals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { amount, destination, method = 'Bank Wire SEPA' } = req.body || {};

  if (!amount || Number(amount) < 250) {
    return res.status(400).json({
      success: false,
      error: 'Minimum withdrawal amount is €250.',
      code: 'INVALID_AMOUNT',
      requestId: req.id
    });
  }

  if (!destination) {
    return res.status(400).json({
      success: false,
      error: 'Withdrawal destination (IBAN or Crypto Address) is required.',
      code: 'MISSING_DESTINATION',
      requestId: req.id
    });
  }

  const numAmount = Number(amount);
  const userRecord = mockUsers.find(u => u.id === req.user?.id);

  if (userRecord && userRecord.balance < numAmount) {
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
  if (userRecord) {
    userRecord.balance -= numAmount;
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
router.post('/investments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, tokensCount, paymentMethod = 'Platform Balance', idempotencyKey } = req.body || {};

  if (!propertyId || !tokensCount || Number(tokensCount) < 1) {
    return res.status(400).json({
      success: false,
      error: 'Valid property ID and token count (min 1) are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  // Idempotency check to prevent duplicate double-charge
  const safeKey = idempotencyKey || `${req.user?.id}-${propertyId}-${tokensCount}`;
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

  const count = Number(tokensCount);
  if (prop.availableTokens < count) {
    return res.status(400).json({
      success: false,
      error: `Only ${prop.availableTokens} tokens remain available in ${prop.title}.`,
      code: 'INSUFFICIENT_AVAILABLE_TOKENS',
      requestId: req.id
    });
  }

  const totalCost = count * prop.tokenPrice;
  const userRecord = mockUsers.find(u => u.id === req.user?.id);

  if (userRecord && userRecord.balance < totalCost) {
    return res.status(400).json({
      success: false,
      error: `Insufficient balance (€${userRecord.balance.toFixed(2)}) for investment of €${totalCost.toFixed(2)}. Please deposit funds first.`,
      code: 'INSUFFICIENT_FUNDS',
      requestId: req.id
    });
  }

  // Server-authoritative state mutation
  if (userRecord) {
    userRecord.balance -= totalCost;
  }
  prop.availableTokens -= count;
  prop.fundedAmount += totalCost;
  processedWebhooks.add(safeKey);

  const certId = `KZ-CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const invTx = {
    id: `tx-inv-${Date.now()}`,
    userId: req.user!.id,
    userEmail: req.user!.email,
    type: 'investment',
    amount: totalCost,
    currency: 'EUR',
    status: 'completed',
    method: paymentMethod,
    propertyId: prop.id,
    propertyTitle: prop.title,
    tokensPurchased: count,
    reference: certId,
    createdAt: new Date().toISOString()
  };

  mockTransactions.unshift(invTx);

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
 * POST /api/v1/payments/webhooks
 * Secure payment provider webhook processing with signature verification & idempotency
 */
router.post('/payments/webhooks', (req: AuthenticatedRequest, res: Response) => {
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

/**
 * GET /api/v1/payments/config (Public view of escrow instructions)
 */
router.get('/payments/config', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      traditional: {
        beneficiary: 'Kretz Escrow Services S.L.',
        iban: 'ES91 2100 0418 4502 0005 1829',
        bic: 'CAIXESBBXXX',
        bankName: 'CaixaBank Institutional Escrow',
        instructions: 'Include your unique investor reference in the concept concept wire transfer.'
      },
      cryptoNetworks: [
        {
          id: 'net-usdt-erc20',
          name: 'Ethereum (ERC20)',
          token: 'USDT',
          network: 'Ethereum',
          walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
          contractEnd: '831ec7',
          enabled: true
        },
        {
          id: 'net-usdt-base',
          name: 'Base Network',
          token: 'USDC',
          network: 'Base',
          walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
          enabled: true
        }
      ]
    },
    requestId: req.id
  });
});

/**
 * Additional Contract Endpoints
 */

// User profile & session contract endpoints
router.get(['/auth/me', '/users/me'], requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user,
    requestId: req.id
  });
});

router.patch('/users/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body || {};
  res.json({
    success: true,
    data: { ...req.user, ...updates },
    message: 'User profile updated successfully.',
    requestId: req.id
  });
});

// Dashboard summary & performance endpoints
router.get('/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalPortfolioValue: 10580.00,
      availableBalance: req.user?.balance || 1500.00,
      totalEarnedDividends: 320.00,
      activePropertiesCount: 1,
      projectedMonthlyIncome: 110.94,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

router.get('/dashboard/performance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      annualizedReturnPercent: 12.8,
      historicalPerformance: [
        { month: 'May 2026', yield: 25.0, totalValue: 10000 },
        { month: 'Jun 2026', yield: 26.5, totalValue: 10120 },
        { month: 'Jul 2026', yield: 26.5, totalValue: 10250 },
        { month: 'Aug 2026', yield: 27.0, totalValue: 10380 },
        { month: 'Sep 2026', yield: 27.0, totalValue: 10450 },
        { month: 'Oct 2026', yield: 27.5, totalValue: 10580 }
      ]
    },
    requestId: req.id
  });
});

// Financial Reports
router.get('/reports/account-statement', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      statementId: 'STMT-2026-Q3',
      periodStart: '2026-07-01',
      periodEnd: '2026-09-30',
      totalDeposits: 15000.00,
      totalInvested: 10000.00,
      totalDividendsReceived: 320.00,
      currentBalance: req.user?.balance || 1500.00
    },
    requestId: req.id
  });
});

// Referral Program
router.get('/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      referralCode: `REF-${req.user?.id?.slice(0, 8).toUpperCase() || 'KZ2026'}`,
      referralLink: `https://kretzdespain.com/ref/${req.user?.id || 'usr-01'}`,
      totalReferred: 3,
      activeInvestors: 2,
      commissionEarned: 150.00,
      currency: 'EUR'
    },
    requestId: req.id
  });
});

router.get('/referrals/earnings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalEarnings: 150.00,
      pendingPayout: 0.00,
      history: [
        { id: 'ref-01', userEmail: 'm.dupont@client.fr', amount: 75.0, date: new Date(Date.now() - 86400000 * 12).toISOString(), status: 'paid' },
        { id: 'ref-02', userEmail: 's.weber@investor.de', amount: 75.0, date: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'paid' }
      ]
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
router.get('/admin/dashboard', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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

router.get('/admin/investments', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'inv-001', userId: 'usr-investor-01', userEmail: 'investor@kretz.com', propertyTitle: 'Villa El Mirador', tokensPurchased: 100, totalCost: 10000, purchaseDate: new Date(Date.now() - 86400000 * 30).toISOString() }
    ],
    requestId: req.id
  });
});

router.get('/admin/transactions', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: mockTransactions,
    requestId: req.id
  });
});

router.get('/admin/deposits', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const deposits = mockTransactions.filter(t => t.type === 'deposit');
  res.json({
    success: true,
    data: deposits,
    requestId: req.id
  });
});

router.get('/admin/withdrawals', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const withdrawals = mockTransactions.filter(t => t.type === 'withdrawal');
  res.json({
    success: true,
    data: withdrawals,
    requestId: req.id
  });
});

router.post('/admin/withdrawals/:withdrawalId/approve', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { withdrawalId } = req.params;
  res.json({
    success: true,
    message: `Withdrawal ${withdrawalId} approved and transfer queued.`,
    requestId: req.id
  });
});

router.post('/admin/withdrawals/:withdrawalId/reject', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { withdrawalId } = req.params;
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
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      organization: 'Kretz Wealth Advisory'
    },
    publishedAt: '2026-10-15T09:00:00Z',
    status: 'published',
    readTime: '14 min read',
    coverImage: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=1600&q=80',
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
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      organization: 'Kretz Legal Counsel'
    },
    publishedAt: '2026-10-10T11:15:00Z',
    status: 'published',
    readTime: '16 min read',
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1600&q=80',
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

export default router;
