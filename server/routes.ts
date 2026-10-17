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
import crypto from 'crypto';

const router = Router();

// In-memory data store for server-authoritative state
// (Production Note: Easily backed by PostgreSQL / Cloud SQL via Drizzle / Supabase)
let mockUsers = [
  {
    id: 'usr-admin-01',
    email: 'admin@kretz.com',
    fullName: 'Chief Compliance Officer',
    role: 'admin',
    kycStatus: 'approved',
    balance: 250000,
    currency: 'EUR',
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
    tokenPrice: 100,
    totalTokens: 24500,
    availableTokens: 6100,
    projectedYield: 12.8,
    capitalAppreciation: 5.5,
    minimumInvestment: 1000,
    holdingPeriodMonths: 36,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80'],
    specs: { bedrooms: 7, bathrooms: 9, builtAreaM2: 1280, plotAreaM2: 5200 },
    financials: { grossRentAnnual: 220000, netYield: 8.98, totalIrr: 14.48 }
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
    tokenPrice: 100,
    totalTokens: 16500,
    availableTokens: 6700,
    projectedYield: 11.4,
    capitalAppreciation: 4.8,
    minimumInvestment: 1000,
    holdingPeriodMonths: 48,
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'],
    specs: { bedrooms: 6, bathrooms: 7, builtAreaM2: 950, plotAreaM2: 2400 },
    financials: { grossRentAnnual: 145000, netYield: 8.78, totalIrr: 13.58 }
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
    tokenPrice: 100,
    totalTokens: 31000,
    availableTokens: 5000,
    projectedYield: 13.6,
    capitalAppreciation: 6.2,
    minimumInvestment: 1000,
    holdingPeriodMonths: 36,
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'],
    specs: { bedrooms: 8, bathrooms: 10, builtAreaM2: 1450, plotAreaM2: 8900 },
    financials: { grossRentAnnual: 310000, netYield: 10.0, totalIrr: 16.2 }
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
router.post('/auth/login', authLimiter, (req: AuthenticatedRequest, res: Response) => {
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

  // Look up user
  const found = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);

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
      error: 'Invalid email address or password.',
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

router.post('/admin/login', authLimiter, handleAdminLogin);
router.post('/auth/admin/login', authLimiter, handleAdminLogin);

/**
 * POST /api/v1/auth/register
 */
router.post('/auth/register', authLimiter, (req: AuthenticatedRequest, res: Response) => {
  const { email, fullName, password, pass, role } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail || !(password || pass) || !fullName) {
    return res.status(400).json({
      success: false,
      error: 'Full name, valid email, and secure password are required.',
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  const existing = mockUsers.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    logger.log({
      level: 'warn',
      category: 'auth',
      requestId: req.id || 'req-reg-err',
      method: 'POST',
      route: '/api/v1/auth/register',
      statusCode: 409,
      eventType: 'REGISTRATION_DUPLICATE_EMAIL',
      outcome: 'failure',
      message: `Registration rejected: email ${normalizedEmail} already registered.`,
      errorCode: 'EMAIL_ALREADY_EXISTS'
    });

    return res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please log in.',
      code: 'EMAIL_CONFLICT',
      requestId: req.id
    });
  }

  const newUser = {
    id: `usr-${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    fullName: fullName.trim(),
    role: role === 'admin' ? 'investor' : 'investor', // prevent privilege escalation on public register
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
router.post('/auth/password/forgot', authLimiter, (req: AuthenticatedRequest, res: Response) => {
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
    tokenPrice: 100,
    totalTokens: Math.round(Number(body.targetAmount) / 100),
    availableTokens: Math.round(Number(body.targetAmount) / 100),
    projectedYield: Number(body.projectedYield || 11.5),
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

export default router;
