/**
 * Core Hono routes migrated for Workers/fetch compatibility (step 1a/4).
 * Uses shared in-memory store and existing auth/admin primitives where Workers-safe.
 * CSRF: bearer-token auth accepted; cookie-session mutations should send X-CSRF-Token when session has csrfToken (client already does). Turnstile: enforce via binding in production (TODO: wire env.TURNSTILE_SECRET_KEY).
 */
import { Hono } from 'hono';
import { ALL_KRETZ_MEMBERS } from '../../../packages/database/src/kretzTeam';
import { BLOG_POSTS } from '../../../packages/database/src/blogPosts';
import { dailyPaymentService } from './dailyPaymentService';
import { generatePropertyPaymentsCsv } from '../../../packages/validation/src/distributionService';
import { mockUsers, mockListings, mockTransactions, platformConfig, sanitizeUser, newId } from './shared-store';
import { hashPassword, verifyPassword, validateEmail, validatePasswordStrength, createSession, getSession, revokeSession, checkBruteForceLimit, recordFailedLogin, resetFailedLogin, touchSession } from './authService';
import { createAdminSession, verifyAdminSessionToken, revokeAdminSession, checkAdminRateLimit, recordAdminFailedAttempt, resetAdminFailedAttempts, getAdminConfig, verifyAdminCredentials } from './adminAuth';
import { createDeposit, createWithdrawal, createInvestment, convertTreasury } from './ledger-store';
import { verifyTurnstile, requireCsrfForCookieAuth } from './security';

export type Bindings = { API_VERSION?: string; ALLOWED_ORIGINS?: string; ADMIN_EMAIL?: string; ADMIN_PASSWORD_HASH?: string; TURNSTILE_SECRET_KEY?: string };
type Vars = { user?: any; session?: any; requestId: string };

export const core = new Hono<{ Bindings: Bindings; Variables: Vars }>();

function rid() { const b = new Uint8Array(4); crypto.getRandomValues(b); return `req-${Array.from(b, x => x.toString(16).padStart(2, '0')).join('')}`; }
function ok(c: any, data: any, extra: any = {}, status = 200) { return c.json({ success: true, data, requestId: c.get('requestId'), apiVersion: c.env?.API_VERSION || 'v1', ...extra }, status); }
function fail(c: any, error: string, status = 400, extra: any = {}) { return c.json({ success: false, error, requestId: c.get('requestId'), apiVersion: c.env?.API_VERSION || 'v1', ...extra }, status); }

core.use('*', async (c, next) => {
  c.set('requestId', c.req.header('x-request-id') || rid());
  c.header('X-Request-Id', c.get('requestId'));
  await next();
});

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function authUser(c: any) {
  let token = c.req.header('authorization')?.startsWith('Bearer ') ? c.req.header('authorization')!.slice(7) : null;
  let viaCookie = false;
  if (!token) {
    const ck = c.req.header('cookie');
    token = parseCookie(ck, 'kretz_session') || parseCookie(ck, 'kretz_admin_session');
    viaCookie = !!token;
  }
  if (!token) return null;
  if (token.startsWith('kz_sess_')) {
    const s = getSession(token);
    if (!s) return null;
    touchSession(token);
    return { user: { id: s.userId, email: s.email, role: s.role, fullName: s.fullName }, csrfToken: s.csrfToken, kind: 'user', token, viaCookie };
  }
  if (token.startsWith('kretz_adm_')) {
    const a = verifyAdminSessionToken(token);
    if (!a) return null;
    return { user: { id: a.sub, email: a.email, role: 'admin', fullName: a.fullName }, kind: 'admin', token, viaCookie };
  }
  return null;
}

function csrfMw(){ return async (c:any,next:any)=>{ const sess=c.get('session'); const r=requireCsrfForCookieAuth(sess,c); if(!r.ok) return fail(c,r.message||'CSRF failed',403,{code:'CSRF_INVALID'}); await next(); }; }
function requireAuthMw() {
  return async (c: any, next: any) => {
    const a = await authUser(c);
    if (!a) return fail(c, 'Authentication required', 401, { code: 'UNAUTHORIZED' });
    c.set('user', a.user); c.set('session', a);
    if (a.csrfToken) c.header('X-CSRF-Token', a.csrfToken);
    await next();
  };
}
function requireAdminMw() {
  return async (c: any, next: any) => {
    const a = await authUser(c);
    if (!a) return fail(c, 'Authentication required', 401, { code: 'UNAUTHORIZED' });
    if (a.user.role !== 'admin') return fail(c, 'Admin access required', 403, { code: 'FORBIDDEN' });
    c.set('user', a.user); c.set('session', a);
    await next();
  };
}

core.get('/api/health', (c) => c.json({ status: 'healthy', platform: 'Kretz API (Workers/Hono)', version: '1.0.0', apiVersion: c.env?.API_VERSION || 'v1', timestamp: new Date().toISOString(), requestId: c.get('requestId') }));
core.get('/api/v1/health', (c) => core.fetch(new Request(new URL('/api/health', c.req.url), c.req.raw), c.env, c.executionCtx));

core.get('/api/v1/config', (c) => ok(c, platformConfig));
core.get('/api/config', (c) => ok(c, platformConfig));

core.get('/api/v1/blog', (c) => {
  const category = c.req.query('category') || 'all';
  const search = (c.req.query('search') || c.req.query('q') || '').toLowerCase();
  let posts = [...BLOG_POSTS];
  if (category && category !== 'all') posts = posts.filter((p) => p.category === category);
  if (search) posts = posts.filter((p) => p.title.toLowerCase().includes(search) || p.excerpt.toLowerCase().includes(search) || p.tags?.some((t: string) => t.toLowerCase().includes(search)));
  return c.json({ success: true, data: posts, total: posts.length, requestId: c.get('requestId') });
});
core.get('/api/blog', (c) => core.fetch(new Request(new URL('/api/v1/blog?' + new URL(c.req.url).searchParams.toString(), c.req.url), c.req.raw), c.env, c.executionCtx));
core.get('/api/v1/blog/:slug', (c) => { const p = BLOG_POSTS.find((x) => x.slug === c.req.param('slug') || x.id === c.req.param('slug')); return p ? ok(c, p) : fail(c, 'Blog article not found', 404); });
core.get('/api/blog/:slug', (c) => core.fetch(new Request(new URL(`/api/v1/blog/${c.req.param('slug')}`, c.req.url), c.req.raw), c.env, c.executionCtx));
core.get('/api/v1/team', (c) => ok(c, ALL_KRETZ_MEMBERS));

function listingQuery(c: any) {
  let items = [...mockListings];
  const search = (c.req.query('search') || '').toLowerCase().trim();
  const type = c.req.query('type'); const status = c.req.query('status'); const location = (c.req.query('location') || '').toLowerCase();
  if (search) items = items.filter((p) => p.title.toLowerCase().includes(search) || p.location.toLowerCase().includes(search) || (p.type || '').toLowerCase().includes(search));
  if (type && type !== 'all') items = items.filter((p) => (p.type || '').toLowerCase() === String(type).toLowerCase());
  if (status && status !== 'all') items = items.filter((p) => p.status === status);
  if (location && location !== 'all') items = items.filter((p) => p.location.toLowerCase().includes(location));
  const totalCount = items.length; const pageNum = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const pageSize = Math.max(1, parseInt(c.req.query('limit') || String(totalCount || 10), 10) || totalCount || 10);
  const paginated = items.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  return { paginated, totalCount, pageNum, pageSize };
}
for (const p of ['/api/v1/marketplace/listings', '/api/v1/properties', '/api/v1/listings', '/api/marketplace/listings', '/api/properties']) {
  core.get(p, (c) => { const { paginated, totalCount, pageNum, pageSize } = listingQuery(c); return c.json({ success: true, data: paginated, total: totalCount, page: pageNum, limit: pageSize, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), requestId: c.get('requestId') }); });
}
for (const p of ['/api/v1/marketplace/listings/:id', '/api/v1/properties/:id', '/api/marketplace/listings/:id', '/api/properties/:id']) {
  core.get(p, (c) => { const id = c.req.param('id'); const f = mockListings.find((x) => x.id === id || x.slug === id); return f ? ok(c, f) : fail(c, `Property listing '${id}' not found.`, 404, { code: 'LISTING_NOT_FOUND' }); });
}

core.post('/api/v1/auth/register', async (c) => {
  const body0 = await c.req.json().catch(() => ({})) as any; const tv = await verifyTurnstile(c, body0?.turnstileToken); if(!tv.ok && c.env?.TURNSTILE_SECRET_KEY) return fail(c, tv.message||'Turnstile failed', 403, {code:'TURNSTILE_FAILED'});
  const body = body0 as any;
  const email = (body.email || '').toLowerCase().trim(); const pass = body.password || body.pass; const fullName = body.fullName;
  if (!email || !pass || !fullName) return fail(c, 'Full legal name, valid email, and password are required.', 400, { code: 'VALIDATION_ERROR' });
  if (!validateEmail(email)) return fail(c, 'Please provide a valid email address.', 400, { code: 'INVALID_EMAIL_FORMAT' });
  const pw = validatePasswordStrength(pass); if (!pw.valid) return fail(c, pw.error || 'Weak password', 400, { code: 'WEAK_PASSWORD' });
  if (mockUsers.find((u) => u.email.toLowerCase() === email)) return fail(c, 'An account with this email address already exists. Please sign in.', 409, { code: 'EMAIL_ALREADY_EXISTS' });
  const user = { id: newId('usr'), email, fullName: String(fullName).trim(), passwordHash: hashPassword(pass), role: 'investor', country: body.country || '', phoneNumber: body.phoneNumber || '', countryCode: body.countryCode || '', kycStatus: 'pending', balance: 0, currency: 'EUR', isEmailVerified: false, status: 'active', createdAt: new Date().toISOString() };
  mockUsers.push(user as any);
  const session = createSession({ userId: user.id, email: user.email, role: 'investor' as any, fullName: user.fullName, ip: c.req.header('cf-connecting-ip') || '0.0.0.0', userAgent: c.req.header('user-agent') || 'unknown' });
  c.header('X-CSRF-Token', session.csrfToken);
  c.header('Set-Cookie', `kretz_session=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
  const safe = sanitizeUser(user as any);
  return c.json({ success: true, data: { user: safe, token: session.id, csrfToken: session.csrfToken, requiresVerification: true }, token: session.id, csrfToken: session.csrfToken, user: safe, requestId: c.get('requestId') }, 201);
});

core.post('/api/v1/auth/login', async (c) => {
  const body0 = await c.req.json().catch(() => ({})) as any; const tv = await verifyTurnstile(c, body0?.turnstileToken); if(!tv.ok && c.env?.TURNSTILE_SECRET_KEY) return fail(c, tv.message||'Turnstile failed', 403, {code:'TURNSTILE_FAILED'});
  const body = body0 as any;
  const email = (body.email || '').toLowerCase().trim(); const pass = body.password || body.pass;
  if (!email || !pass) return fail(c, 'Please provide both email address and password.', 400, { code: 'MISSING_FIELDS' });
  const lockKey = `${c.req.header('cf-connecting-ip') || 'ip'}:${email}`;
  const lock = checkBruteForceLimit(lockKey);
  if (lock.isLocked) return fail(c, `Too many failed login attempts. Locked for ${lock.remainingSeconds}s.`, 429, { code: 'RATE_LIMIT_EXCEEDED', remainingSeconds: lock.remainingSeconds });
  const found = mockUsers.find((u) => u.email.toLowerCase() === email);
  if (!found || !verifyPassword(pass, found.passwordHash)) { const fr = recordFailedLogin(lockKey); return fail(c, 'Invalid email address or password.', 401, { code: 'INVALID_CREDENTIALS', remainingAttempts: Math.max(0, 5 - fr.attempts) }); }
  if (found.status === 'suspended') return fail(c, found.suspendedReason || 'Account suspended.', 403, { code: 'ACCOUNT_SUSPENDED' });
  resetFailedLogin(lockKey);
  const session = createSession({ userId: found.id, email: found.email, role: found.role as any, fullName: found.fullName, ip: c.req.header('cf-connecting-ip') || '0.0.0.0', userAgent: c.req.header('user-agent') || 'unknown' });
  c.header('X-CSRF-Token', session.csrfToken);
  c.header('Set-Cookie', `kretz_session=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
  const safe = sanitizeUser(found);
  return c.json({ success: true, data: { user: safe, token: session.id, csrfToken: session.csrfToken }, token: session.id, csrfToken: session.csrfToken, user: safe, requestId: c.get('requestId') });
});

core.post('/api/v1/auth/logout', async (c) => {
  const a = await authUser(c);
  if (a?.token) revokeSession(a.token);
  c.header('Set-Cookie', 'kretz_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return c.json({ success: true, message: 'Session closed successfully.', requestId: c.get('requestId') });
});

core.get('/api/v1/auth/session', requireAuthMw(), (c) => ok(c, c.get('user'), { authenticated: true }));
core.get('/api/v1/auth/me', requireAuthMw(), (c) => ok(c, c.get('user')));

for (const p of ['/api/v1/admin/login', '/api/v1/auth/admin/login', '/api/v1/auth/admin-login']) core.post(p, async (c) => {
  const body = await c.req.json().catch(() => ({})) as any;
  const email = (body.email || '').toLowerCase().trim(); const pass = body.password || body.pass;
  const ip = c.req.header('cf-connecting-ip') || 'ip'; const rl = checkAdminRateLimit(ip);
  if (rl.isLocked) return fail(c, `Admin login locked for ${rl.remainingSeconds}s.`, 429, { code: 'RATE_LIMIT_EXCEEDED' });
  if (!email || !pass) return fail(c, 'Administrator email and password required.', 400, { code: 'MISSING_FIELDS' });
  const cfg = getAdminConfig(); const okc = email === cfg.adminEmail && await verifyAdminCredentials(pass);
  if (!okc) { recordAdminFailedAttempt(ip); return fail(c, 'Invalid administrator email or security credentials.', 401, { code: 'INVALID_CREDENTIALS' }); }
  resetAdminFailedAttempts(ip);
  const session = createAdminSession(cfg.adminEmail, cfg.fullName);
  c.header('Set-Cookie', `kretz_admin_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}`);
  const user = { id: session.payload.sub, email: session.payload.email, role: 'admin', fullName: session.payload.fullName };
  return c.json({ success: true, data: { user, token: session.token }, token: session.token, user, requestId: c.get('requestId') });
});
for (const p of ['/api/v1/admin/logout', '/api/v1/auth/admin/logout', '/api/v1/auth/admin-logout']) core.post(p, async (c) => { const a = await authUser(c); if (a?.token) revokeAdminSession(a.token); c.header('Set-Cookie', 'kretz_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); return c.json({ success: true, requestId: c.get('requestId') }); });
for (const p of ['/api/v1/admin/session', '/api/v1/auth/admin/session']) core.get(p, requireAdminMw(), (c) => ok(c, c.get('user')));

core.get('/api/v1/user/profile', requireAuthMw(), (c) => {
  const u = c.get('user'); const rec = mockUsers.find((x) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
  return rec ? ok(c, sanitizeUser(rec)) : fail(c, 'User profile not found.', 404, { code: 'USER_NOT_FOUND' });
});
for (const p of ['/api/v1/portfolio', '/api/v1/portfolio/summary']) core.get(p, requireAuthMw(), (c) => {
  const u = c.get('user'); const rec = mockUsers.find((x) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
  const txs = mockTransactions.filter((t) => (t.userId === u.id || (rec && t.userEmail === rec.email)) && t.type === 'investment' && t.status === 'completed');
  const holdingsMap = new Map<string, any>();
  for (const tx of txs) { const propId = tx.propertyId || 'prop-unknown'; const prop = mockListings.find((x) => x.id === propId); const y = prop ? (prop.projectedYield || 12.8) / 100 : 0.128; const ex = holdingsMap.get(propId); const amt = Number(tx.amount) || 0; if (ex) { ex.tokensPurchased += tx.tokensCount || 0; ex.totalAmountInvested += amt; ex.currentValue += amt; ex.totalEarned += amt * y * 0.25; } else holdingsMap.set(propId, { id: `inv-${propId}`, propertyId: propId, propertyTitle: prop?.title || 'Property', tokensPurchased: tx.tokensCount || 0, totalAmountInvested: amt, currentValue: amt, totalEarned: +(amt * y * 0.25).toFixed(2), status: 'active', purchaseDate: tx.createdAt }); }
  const holdings = [...holdingsMap.values()]; const totalInvested = holdings.reduce((s, h) => s + h.totalAmountInvested, 0); const totalEarned = holdings.reduce((s, h) => s + h.totalEarned, 0);
  return ok(c, { summary: { totalInvested, currentValue: totalInvested, totalEarned, availableBalance: rec?.balance || 0, currency: 'EUR' }, holdings, recentTransactions: mockTransactions.filter((t) => t.userId === u.id).slice(0, 10) });
});

core.get('/api/v1/admin/distributions/records', (c) => {
  const records = dailyPaymentService.getRecords({ propertyId: c.req.query('propertyId') || undefined, userId: c.req.query('userId') || undefined });
  if (c.req.query('format') === 'csv') return new Response(generatePropertyPaymentsCsv(records), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  return ok(c, records);
});
core.get('/api/v1/distributions/export', (c) => {
  const records = dailyPaymentService.getRecords({ propertyId: c.req.query('propertyId') || undefined });
  if ((c.req.query('format') || 'csv') === 'json') return c.json(records);
  return new Response(generatePropertyPaymentsCsv(records, c.req.query('propertyId') || 'All Properties'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="distributions-${c.req.query('propertyId') || 'all'}.csv"` } });
});

core.get('/api/v1/wallet/balance', requireAuthMw(), (c) => { const rec = mockUsers.find((x) => x.id === c.get('user').id); return ok(c, { balance: rec?.balance || 0, currency: 'EUR' }); });
core.get('/api/v1/user/wallet/balance', requireAuthMw(), (c) => core.fetch(new Request(new URL('/api/v1/wallet/balance', c.req.url), c.req.raw), c.env, c.executionCtx));
core.get('/api/v1/transactions', requireAuthMw(), (c) => { const u = c.get('user'); const txs = u.role === 'admin' ? mockTransactions : mockTransactions.filter((t) => t.userId === u.id); return ok(c, txs, { total: txs.length }); });
core.get('/api/v1/notifications', requireAuthMw(), (c) => ok(c, [], { unreadCount: 0 }));
core.patch('/api/v1/notifications/:id/read', requireAuthMw(), (c) => ok(c, null));
core.post('/api/v1/notifications/read-all', requireAuthMw(), (c) => ok(c, { markedRead: 0 }));
core.get('/api/v1/user/favorites', requireAuthMw(), (c) => ok(c, { favorites: [] }));
core.post('/api/v1/user/favorites', requireAuthMw(), async (c) => { const b: any = await c.req.json().catch(() => ({})); return ok(c, { favorites: b.propertyId ? [b.propertyId] : [], saved: true }); });
core.delete('/api/v1/user/favorites/:propertyId', requireAuthMw(), (c) => ok(c, { favorites: [], saved: false }));
core.get('/api/v1/user/preferences', requireAuthMw(), (c) => ok(c, {}));
core.put('/api/v1/user/preferences', requireAuthMw(), async (c) => { const b: any = await c.req.json().catch(() => ({})); return ok(c, b || {}); });
core.patch('/api/v1/users/me', requireAuthMw(), async (c) => { const b: any = await c.req.json().catch(() => ({})); const rec = mockUsers.find((x) => x.id === c.get('user').id); if (!rec) return fail(c, 'User profile not found.', 404); if (b.fullName) rec.fullName = b.fullName; if (b.country) rec.country = b.country; if (b.phoneNumber) rec.phoneNumber = b.phoneNumber; return ok(c, sanitizeUser(rec), { message: 'Profile updated.' }); });
core.get('/api/v1/treasury/rates', (c) => ok(c, { base: 'EUR', ratesToEur: { EUR: 1, USD: 0.92, GBP: 1.18, CHF: 1.06, USDC: 0.92, USDT: 0.92, SOL: 158.4 }, feePercent: 0.15, updatedAt: new Date().toISOString() }));
core.get('/api/v1/treasury/balances', requireAuthMw(), (c) => ok(c, { balances: { EUR: mockUsers.find((x) => x.id === c.get('user').id)?.balance || 0 } }));
core.get('/api/v1/payments/config', (c) => ok(c, { traditional: { enabled: true, beneficiary: 'Kretz Group', iban: '', bic: '', bankName: '', country: 'FR', instructions: '' }, cryptoNetworks: [] }));

async function fin(c:any, fn:any){ const csrf=requireCsrfForCookieAuth(c.get('session'),c); if(!csrf.ok) return fail(c, csrf.message||'CSRF failed',403,{code:'CSRF_INVALID'}); const body:any=await c.req.json().catch(()=>({})); const t=await verifyTurnstile(c, body?.turnstileToken); if(!t.ok) return fail(c,t.message||'Turnstile failed',403,{code:'TURNSTILE_FAILED'}); const r=await fn(c.env,c.get('user'),body); return c.json({...r.body, requestId:c.get('requestId')}, r.status as any); }
core.post('/api/v1/deposits', requireAuthMw(), (c)=>fin(c,createDeposit));
core.post('/api/v1/withdrawals', requireAuthMw(), (c)=>fin(c,createWithdrawal));
core.post('/api/v1/investments', requireAuthMw(), (c)=>fin(c,createInvestment));
core.post('/api/v1/treasury/convert', requireAuthMw(), (c)=>fin(c,convertTreasury));

core.post('/api/v1/contact', async (c) => { const b: any = await c.req.json().catch(() => ({})); if (!b?.email || !b?.fullName || !b?.message) return fail(c, 'fullName, email and message required', 400); return c.json({ success: true, data: { ticketId: newId('tkt'), createdAt: new Date().toISOString() }, message: 'Request received.', requestId: c.get('requestId') }, 201); });
core.post('/api/v1/memberships/apply', async (c) => { await c.req.json().catch(() => ({})); return c.json({ success: true, data: { id: newId('mem') }, message: 'Application received.', requestId: c.get('requestId') }, 201); });
core.post('/api/v1/newsletter/subscribe', async (c) => c.json({ success: true, message: 'Subscribed.', requestId: c.get('requestId') }));
core.post('/api/v1/security/verify-turnstile', async (c) => c.json({ success: true, message: 'Turnstile verification delegated in Workers demo mode.', requestId: c.get('requestId') }));
core.post('/api/v1/auth/password/forgot', async (c) => c.json({ success: true, message: 'If the account exists, a reset email has been sent.', requestId: c.get('requestId') }));
core.post('/api/v1/auth/password/reset', async (c) => fail(c, 'Password reset token processing not yet migrated to Workers runtime.', 501, { code: 'NOT_MIGRATED' }));
core.post('/api/v1/admin/customize', requireAdminMw(), async (c) => fail(c, 'Admin credential customization uses Node fs; migrate to D1/KV binding.', 501, { code: 'NOT_MIGRATED' }));
core.get('/api/v1/user/referrals', requireAuthMw(), (c) => ok(c, { referralCode: 'REF-' + c.get('user').id.slice(-6).toUpperCase(), referralLink: 'https://rental.log/register?ref=REF', totalInvited: 0, totalRegistered: 0, totalFunded: 0, pendingReward: 0, earnedReward: 0, referrals: [] }));
core.post('/api/v1/user/referrals/invite', requireAuthMw(), async (c) => { const b: any = await c.req.json().catch(() => ({})); return c.json({ success: true, message: 'Invite queued.', data: { referral: { id: newId('ref'), email: b.email || '', date: new Date().toISOString(), status: 'invited', reward: 0 }, referrals: [] }, requestId: c.get('requestId') }); });


core.get('/api/v1/dashboard/summary', requireAuthMw(), (c)=> ok(c, { summary: { availableBalance: mockUsers.find((x)=>x.id===c.get('user').id)?.balance||0, currency:'EUR' } }));
core.get('/api/v1/admin/system-health', (c)=> c.json({ status:'healthy', apiVersion:'v1', requestId:c.get('requestId') }));
core.get('/api/v1/admin/settings', (c)=> ok(c, platformConfig));
core.get('/api/v1/team', (c)=> ok(c, ALL_KRETZ_MEMBERS));

export default core;
