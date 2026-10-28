/**
 * Automated Backend API Integration & User Isolation Test Suite
 * Tests real Express /api/v1 endpoints across registration, session isolation,
 * listings filtering/pagination, favorites, preferences, profile updates,
 * deposits/admin approval/rejection, FX treasury conversion, and idempotent investments.
 */

import express from 'express';
import http from 'http';
import v1Routes from './routes';
import { correlationAndTimingMiddleware, authenticateToken, errorHandler } from './middleware';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${description}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${description}${details ? ` — ${details}` : ''}`);
  }
}

async function runApiTests() {
  const app = express();
  app.use(express.json());
  app.use(correlationAndTimingMiddleware);
  app.use(authenticateToken);
  app.use('/api/v1', v1Routes);
  app.use('/api', errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  async function api(
    method: string,
    path: string,
    body?: Record<string, any>,
    token?: string
  ): Promise<{ status: number; json: any }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  try {
    console.log('\n============================================================');
    console.log(' BACKEND API INTEGRATION TEST SUITE (/api/v1)');
    console.log('============================================================\n');

    // 1. Listings search, filters, sorting, and pagination
    const listAll = await api('GET', '/listings?sortBy=yield_desc&limit=5&page=1');
    assert(listAll.status === 200 && listAll.json.success === true, 'GET /listings returns 200 with paginated offerings');
    assert(Array.isArray(listAll.json.data) && listAll.json.data.length > 0, 'GET /listings returns non-empty listings array');

    const listSearchEmpty = await api('GET', '/listings?search=nonexistent_castle_xyz_999');
    assert(
      listSearchEmpty.status === 200 && Array.isArray(listSearchEmpty.json.data) && listSearchEmpty.json.data.length === 0,
      'GET /listings returns honest empty array on unmatched search query'
    );

    // 2. Registration validation & isolated account creation
    const badReg = await api('POST', '/auth/register', {
      fullName: 'Missing Phone Investor',
      email: `nophone_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    assert(badReg.status === 400 && badReg.json.success === false, 'POST /auth/register rejects missing phoneNumber with 400');

    const uniqueEmail = `investor_${Date.now()}@example.com`;
    const goodReg = await api('POST', '/auth/register', {
      fullName: 'Elena Vance',
      email: uniqueEmail,
      phoneNumber: '+34600987654',
      password: 'StrongPassword123!',
      country: 'Spain',
    });
    assert(goodReg.status === 201 && goodReg.json.success === true, 'POST /auth/register creates new investor with 201');
    const userToken: string = goodReg.json.data?.token;
    const userId: string = goodReg.json.data?.user?.id;
    assert(Boolean(userToken) && Boolean(userId), 'POST /auth/register returns session token and user ID');
    assert(goodReg.json.data?.user?.balance === 0, 'Newly registered user starts with honest €0.00 balance');

    // 3. Strict per-user isolation on portfolio, dashboard summary, and wallet balance
    const initialPortfolio = await api('GET', '/portfolio', undefined, userToken);
    assert(
      initialPortfolio.status === 200 &&
        Array.isArray(initialPortfolio.json.data?.holdings) &&
        initialPortfolio.json.data.holdings.length === 0 &&
        initialPortfolio.json.data.totalPortfolioValue === 0,
      'GET /portfolio returns empty holdings (0) for new user with zero cross-account leakage',
      JSON.stringify(initialPortfolio.json.data)
    );

    const initialDash = await api('GET', '/dashboard/summary', undefined, userToken);
    assert(
      initialDash.status === 200 &&
        initialDash.json.data?.availableBalance === 0 &&
        initialDash.json.data?.investedCapital === 0,
      'GET /dashboard/summary returns €0 available and €0 invested for new user'
    );

    // 4. Password reset route (fixed double /api/v1 prefix)
    const pwResetInvalid = await api('POST', '/auth/password/reset', { token: '', newPassword: '123' });
    assert(pwResetInvalid.status === 400, 'POST /auth/password/reset is mounted at /api/v1/auth/password/reset and validates input');

    // 5. Authenticated support inquiry without Turnstile challenge
    const supportRes = await api(
      'POST',
      '/contact',
      {
        name: 'Elena Vance',
        email: uniqueEmail,
        subject: 'SPV Tax Certificate Inquiry',
        message: 'Please confirm Q4 fiscal withholding schedule for Spanish non-residents.',
      },
      userToken
    );
    assert(
      (supportRes.status === 200 || supportRes.status === 201) &&
        supportRes.json.success === true &&
        Boolean(supportRes.json.data?.ticketId),
      'POST /contact accepts authenticated dashboard support inquiry and issues ticketId'
    );

    // 6. Persistent Watchlist Favorites CRUD
    const addFav = await api('POST', '/user/favorites', { propertyId: 'prop-villa-mirador' }, userToken);
    assert(
      addFav.status === 200 && addFav.json.data?.favorites?.includes('prop-villa-mirador'),
      'POST /user/favorites persists saved property'
    );
    const getFav = await api('GET', '/user/favorites', undefined, userToken);
    assert(
      getFav.status === 200 && getFav.json.data?.favorites?.length === 1,
      'GET /user/favorites retrieves saved watchlist'
    );
    const delFav = await api('DELETE', '/user/favorites/prop-villa-mirador', undefined, userToken);
    assert(
      delFav.status === 200 && delFav.json.data?.favorites?.length === 0,
      'DELETE /user/favorites/:propertyId removes property from watchlist'
    );

    // 7. User Preferences & Profile / IBAN update
    const savePrefs = await api(
      'PUT',
      '/user/preferences',
      { defaultSort: 'price-asc', itemsPerPage: 9, currencyDisplay: 'EUR' },
      userToken
    );
    assert(
      savePrefs.status === 200 && savePrefs.json.data?.defaultSort === 'price-asc' && savePrefs.json.data?.itemsPerPage === 9,
      'PUT /user/preferences persists sorting and pagination preferences'
    );

    const patchProfile = await api(
      'PATCH',
      '/users/me',
      { bankIban: 'ES9121000418450200051332', city: 'Madrid', taxId: 'Y1234567Z' },
      userToken
    );
    assert(
      patchProfile.status === 200 && patchProfile.json.data?.bankIban === 'ES9121000418450200051332',
      'PATCH /users/me updates investor IBAN and profile fields'
    );

    // 8. Treasury FX conversion rejects insufficient €0 balance, succeeds after approved deposit
    const fxFail = await api(
      'POST',
      '/treasury/convert',
      { fromCurrency: 'EUR', toCurrency: 'USDC', amount: 250 },
      userToken
    );
    assert(
      fxFail.status === 400 && fxFail.json.code === 'INSUFFICIENT_CURRENCY_BALANCE',
      'POST /treasury/convert rejects conversion with 400 when EUR balance is €0',
      JSON.stringify(fxFail.json)
    );

    // Create two deposits: approve one, reject one
    const adminToken = 'admin_sess_usr-admin-01';
    const depToApprove = await api('POST', '/deposits', { amount: 5000, method: 'SEPA Bank Wire' }, userToken);
    assert(depToApprove.status === 201 && depToApprove.json.data?.status === 'pending', 'POST /deposits creates pending deposit');

    const depApproveRes = await api(
      'POST',
      `/admin/deposits/${depToApprove.json.data.id}/approve`,
      {},
      adminToken
    );
    assert(depApproveRes.status === 200 && depApproveRes.json.success === true, 'Admin approves deposit and credits EUR balance');

    const depToReject = await api('POST', '/deposits', { amount: 500, method: 'SEPA Bank Wire' }, userToken);
    const depRejectRes = await api(
      'POST',
      `/admin/deposits/${depToReject.json.data.id}/reject`,
      { reason: 'Unmatched bank wire reference' },
      adminToken
    );
    assert(
      depRejectRes.status === 200 && depRejectRes.json.data?.status === 'rejected',
      'POST /admin/deposits/:id/reject marks deposit rejected and notifies user'
    );

    // Now execute real EUR -> USDC conversion
    const fxOk = await api(
      'POST',
      '/treasury/convert',
      { fromCurrency: 'EUR', toCurrency: 'USDC', amount: 1000 },
      userToken
    );
    assert(
      fxOk.status === 200 &&
        fxOk.json.data?.balances?.EUR === 4000 &&
        fxOk.json.data?.balances?.USDC > 1000,
      'POST /treasury/convert deducts €1,000 EUR, applies 0.15% spread, and credits USDC sub-balance'
    );

    // 9. Primary token investment with feePercent + idempotency replay protection + synchronized portfolio
    const activeOffering = listAll.json.data.find((p: any) => p.availableTokens >= 2 && p.fundedAmount < p.targetAmount);
    assert(Boolean(activeOffering), 'Catalog includes active offering with available tokens');

    const idemKey = `idem-inv-${Date.now()}`;
    const tokensToBuy = Math.max(1, Math.ceil((activeOffering.minimumInvestment || activeOffering.tokenPrice) / activeOffering.tokenPrice));
    const invRes = await api(
      'POST',
      '/investments',
      {
        propertyId: activeOffering.id,
        tokensCount: tokensToBuy,
        paymentMethod: 'SEPA Instant Settlement',
        feePercent: 0.25,
        idempotencyKey: idemKey,
      },
      userToken
    );
    assert(
      invRes.status === 200 && invRes.json.success === true,
      'POST /investments executes token purchase with 0.25% settlement fee',
      JSON.stringify(invRes.json)
    );

    const invReplay = await api(
      'POST',
      '/investments',
      {
        propertyId: activeOffering.id,
        tokensCount: tokensToBuy,
        paymentMethod: 'SEPA Instant Settlement',
        feePercent: 0.25,
        idempotencyKey: idemKey,
      },
      userToken
    );
    assert(
      invReplay.status === 409 && invReplay.json.code === 'DUPLICATE_TRANSACTION',
      'POST /investments blocks duplicate submission with 409 DUPLICATE_TRANSACTION'
    );

    const syncedPortfolio = await api('GET', '/portfolio', undefined, userToken);
    assert(
      syncedPortfolio.status === 200 &&
        syncedPortfolio.json.data?.holdings?.length === 1 &&
        syncedPortfolio.json.data?.totalTokensHeld === tokensToBuy,
      'GET /portfolio synchronizes immediately with newly acquired property tokens'
    );

    // 10. Notifications synchronization & read-all
    const notifsBefore = await api('GET', '/notifications', undefined, userToken);
    assert(
      notifsBefore.status === 200 && notifsBefore.json.unreadCount >= 2,
      'GET /notifications records real deposit/rejection/FX events for user'
    );
    const markAll = await api('POST', '/notifications/read-all', {}, userToken);
    const notifsAfter = await api('GET', '/notifications', undefined, userToken);
    assert(
      markAll.status === 200 && notifsAfter.json.unreadCount === 0,
      'POST /notifications/read-all marks all user notifications read (unreadCount = 0)'
    );

    // 11. Advisor/Wealth/Contact inquiries, Editorial Dispatch, Club Privé Onboarding & Referrals
    const contactBad = await api('POST', '/contact', { fullName: 'Jean', email: 'not-an-email', message: 'Hello' }, userToken);
    assert(contactBad.status === 400 && contactBad.json.code === 'INVALID_EMAIL', 'POST /contact rejects malformed email address');

    const contactOk = await api(
      'POST',
      '/contact',
      {
        fullName: 'Jean de Montfort',
        email: 'jean@montfort-family.fr',
        phone: '+33 6 12 34 56 78',
        advisorName: 'Martin Kretz',
        topic: 'Direct Mandate (Martin Kretz)',
        message: 'Interested in private off-market Parisian Hôtel Particulier syndication.',
      },
      userToken
    );
    assert(
      contactOk.status === 200 && typeof contactOk.json.data?.ticketId === 'string' && contactOk.json.data.ticketId.startsWith('KZ-INQ-'),
      'POST /contact persists advisor/wealth inquiry and issues KZ-INQ ticket reference'
    );

    const newsBad = await api('POST', '/newsletter/subscribe', { email: 'invalid-email' });
    assert(newsBad.status === 400 && newsBad.json.code === 'INVALID_EMAIL', 'POST /newsletter/subscribe rejects invalid email');

    const newsEmail = `allocator-${Date.now()}@familyoffice.ch`;
    const newsFirst = await api('POST', '/newsletter/subscribe', { email: newsEmail, source: 'editorial_dispatch' });
    assert(
      newsFirst.status === 201 && newsFirst.json.data?.alreadySubscribed === false && newsFirst.json.data?.reference?.startsWith('KZ-DSP-'),
      'POST /newsletter/subscribe registers new Editorial Dispatch subscriber'
    );

    const newsRepeat = await api('POST', '/newsletter/subscribe', { email: newsEmail, source: 'editorial_dispatch' });
    assert(
      newsRepeat.status === 200 && newsRepeat.json.data?.alreadySubscribed === true,
      'POST /newsletter/subscribe handles repeat subscription idempotently'
    );

    const clubMissingCode = await api(
      'POST',
      '/memberships/apply',
      {
        fullName: 'Claire Delacroix',
        email: 'claire@elysee.fr',
        tierId: 'sovereign',
        billingCycle: 'annual',
        paymentMethod: 'complimentary_invitation',
      },
      userToken
    );
    assert(
      clubMissingCode.status === 400 && clubMissingCode.json.code === 'MISSING_INVITATION_CODE',
      'POST /memberships/apply enforces invitation code for complimentary onboarding'
    );

    const clubOk = await api(
      'POST',
      '/memberships/apply',
      {
        fullName: 'Claire Delacroix',
        email: 'claire@elysee.fr',
        phone: '+33 6 98 76 54 32',
        tierId: 'sovereign',
        billingCycle: 'annual',
        paymentMethod: 'bank_wire',
        preferredRegion: 'French Riviera & Paris',
      },
      userToken
    );
    assert(
      clubOk.status === 201 && clubOk.json.data?.applicationId?.startsWith('KZ-CLUB-') && clubOk.json.data?.status === 'pending_payment',
      'POST /memberships/apply records Club Privé onboarding application and issues KZ-CLUB reference'
    );

    const refSelf = await api(
      'POST',
      '/user/referrals/invite',
      { email: 'self@kretz.com', referralCode: 'KRETZ-SELF', inviterEmail: 'self@kretz.com' },
      userToken
    );
    assert(refSelf.status === 400 && refSelf.json.code === 'SELF_REFERRAL', 'POST /user/referrals/invite blocks self-referral');

    const refOk = await api(
      'POST',
      '/user/referrals/invite',
      { email: 'partner@zurichwealth.ch', referralCode: 'KRETZ-VIP', inviterEmail: 'self@kretz.com' },
      userToken
    );
    assert(
      refOk.status === 201 && refOk.json.data?.referral?.email === 'partner@zurichwealth.ch',
      'POST /user/referrals/invite logs and dispatches partner invitation'
    );

    const refDup = await api(
      'POST',
      '/user/referrals/invite',
      { email: 'partner@zurichwealth.ch', referralCode: 'KRETZ-VIP', inviterEmail: 'self@kretz.com' },
      userToken
    );
    assert(refDup.status === 409 && refDup.json.code === 'ALREADY_INVITED', 'POST /user/referrals/invite blocks duplicate invite');

    const refList = await api('GET', '/user/referrals', undefined, userToken);
    assert(
      refList.status === 200 && Array.isArray(refList.json.data?.referrals) && refList.json.data.referrals.length === 1,
      'GET /user/referrals returns persisted referral invitations'
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log(`\nAPI Test Summary: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runApiTests().catch((err) => {
  console.error('Unhandled error in API test runner:', err);
  process.exit(1);
});
