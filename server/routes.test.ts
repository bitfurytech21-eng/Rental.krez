process.env.NODE_ENV = 'test';

/**
 * Backend API smoke & contract tests.
 *
 * Verifies authentication guards, email login & session handling, the 10
 * investor-portal domain endpoints, compliance step tracking, own-name bank
 * account ownership rules, and server-side withdrawal & balance enforcement.
 */

import express from 'express';
import http from 'http';
import v1Routes, { __testSetCustomerFinancialState } from './routes';
import { correlationAndTimingMiddleware, authenticateToken, errorHandler, normalizeStaffRole } from './middleware';
import { setDevAssignedGateId } from './manualPaymentRoutes';
import { toApiProperty } from './supabaseDatabase';
import { isValidIBAN } from '../src/lib/validation';
import {
  formatEmailCodeSendError,
  sanitizeErrorForMonitoring,
  markActionVerified,
  isActionVerifiedInSession,
  getValidActionGrant,
  clearActionVerification,
} from '../src/lib/actionVerificationSession';

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
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }));
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
  ) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, json: await response.json().catch(() => ({})) };
  }

  try {
    console.log('\n============================================================');
    console.log(' CUSTOMER ACCOUNT AUTHORITY & PORTAL API TESTS');
    console.log('============================================================\n');

    const listings = await api('GET', '/listings');
    assert(listings.status === 200 && listings.json.success === true, 'Public listings endpoint remains available');

    const session = await api('GET', '/auth/session');
    assert(session.status === 200 && session.json.authenticated === false, 'Unauthenticated session probe returns a guest state');

    const login = await api('POST', '/auth/login', {});
    assert(login.status === 400 && login.json.code === 'MISSING_FIELDS', 'Customer login validates credentials before authentication');

    const registration = await api('POST', '/auth/register', {});
    assert(registration.status === 400 && registration.json.code === 'VALIDATION_ERROR', 'Customer registration validates required fields');

    const weakPassRegistration = await api('POST', '/auth/register', {
      fullName: 'Claire Moreau',
      email: `claire.${Date.now()}@example.com`,
      password: 'PasswordNoDigit',
    });
    assert(weakPassRegistration.status === 400 && weakPassRegistration.json.code === 'WEAK_PASSWORD', 'Customer registration rejects password missing required digit');

    const validRegEmail = `investor.${Date.now()}@example.com`;
    const validRegistration = await api('POST', '/auth/register', {
      fullName: 'Claire Moreau',
      email: validRegEmail,
      password: 'Password123',
      accountType: 'family_office',
      country: 'France',
    });
    assert(
      validRegistration.status === 201 &&
        validRegistration.json.success === true &&
        validRegistration.json.user?.accountType === 'family_office',
      'Customer registration succeeds with valid credentials and preserves accountType'
    );

    const duplicateRegistration = await api('POST', '/auth/register', {
      fullName: 'Claire Moreau',
      email: validRegEmail,
      password: 'Password123',
    });
    assert(duplicateRegistration.status === 409 && duplicateRegistration.json.code === 'EMAIL_ALREADY_EXISTS', 'Duplicate registration email returns 409 EMAIL_ALREADY_EXISTS');

    const recovery = await api('POST', '/auth/password/forgot', {});
    assert(recovery.status === 400 && recovery.json.code === 'INVALID_EMAIL', 'Password recovery validates email input');

    const profile = await api('GET', '/user/profile');
    assert(profile.status === 401, 'Customer profile endpoint requires an authenticated identity');

    const me = await api('GET', '/auth/me');
    assert(me.status === 401, 'Current-user endpoint requires authentication');

    const profileUpdate = await api('PATCH', '/users/me', { fullName: 'Should Not Persist' });
    assert(profileUpdate.status === 401, 'Profile updates cannot run without an authenticated customer identity');

    const adminUsers = await api('GET', '/admin/users');
    assert(adminUsers.status === 401, 'Administrator user registry requires an authorized admin identity');

    const adminKyc = await api('POST', '/admin/users/00000000-0000-0000-0000-000000000000/kyc', { kycStatus: 'approved' });
    assert(adminKyc.status === 401, 'KYC management requires an authorized admin identity');

    const adminStatus = await api('PATCH', '/admin/users/00000000-0000-0000-0000-000000000000/status', { status: 'suspended' });
    assert(adminStatus.status === 401, 'Account status management requires an authorized admin identity');

    // Authenticated customer login & session probe
    const loginRes = await api('POST', '/auth/login', {
      email: validRegEmail,
      password: 'Password123',
    });
    const customerToken = String(loginRes.json?.data?.token || '');
    const customerId = String(loginRes.json?.user?.id || validRegistration.json?.user?.id || '');
    // Give this smoke-test investor exactly one sandbox bank gate. The API
    // must not expose unassigned bank or USDT rails.
    if (customerId) setDevAssignedGateId(customerId, 'method-sepa-wire');
    assert(
      loginRes.status === 200 && Boolean(customerToken) && Boolean(customerId),
      'Customer email login succeeds and issues an active session token'
    );

    const authSession = await api('GET', '/auth/session', undefined, customerToken);
    assert(
      authSession.status === 200 &&
        authSession.json.authenticated === true &&
        authSession.json.user?.email === validRegEmail,
      'Authenticated session probe returns the signed-in investor'
    );

    // Verify all 10 required domain endpoints
    const [
      usersRes,
      walletsRes,
      propertiesRes,
      holdingsRes,
      transactionsRes,
      depositsRes,
      withdrawalsRes,
      documentsRes,
      notificationsRes,
      complianceStepsRes,
    ] = await Promise.all([
      api('GET', '/users/me', undefined, customerToken),
      api('GET', '/wallets/me', undefined, customerToken),
      api('GET', '/properties', undefined, customerToken),
      api('GET', '/holdings', undefined, customerToken),
      api('GET', '/transactions', undefined, customerToken),
      api('GET', '/deposits', undefined, customerToken),
      api('GET', '/withdrawals', undefined, customerToken),
      api('GET', '/documents', undefined, customerToken),
      api('GET', '/notifications', undefined, customerToken),
      api('GET', '/compliance/steps', undefined, customerToken),
    ]);

    assert(usersRes.status === 200 && usersRes.json.data?.email === validRegEmail, 'GET /users/me returns user profile');
    assert(walletsRes.status === 200 && walletsRes.json.data?.currency === 'EUR', 'GET /wallets/me returns EUR wallet');
    assert(propertiesRes.status === 200 && Array.isArray(propertiesRes.json.data), 'GET /properties returns property catalogue');
    assert(holdingsRes.status === 200 && Array.isArray(holdingsRes.json.data?.holdings), 'GET /holdings returns investor holdings');
    assert(transactionsRes.status === 200 && Array.isArray(transactionsRes.json.data), 'GET /transactions returns ledger transactions');
    assert(depositsRes.status === 200 && Array.isArray(depositsRes.json.data), 'GET /deposits returns investor deposits');
    assert(withdrawalsRes.status === 200 && Array.isArray(withdrawalsRes.json.data), 'GET /withdrawals returns investor withdrawals');
    assert(documentsRes.status === 200 && Array.isArray(documentsRes.json.data), 'GET /documents returns compliance documents');
    assert(notificationsRes.status === 200 && Array.isArray(notificationsRes.json.data), 'GET /notifications returns notifications');
    assert(
      complianceStepsRes.status === 200 &&
        Array.isArray(complianceStepsRes.json.data) &&
        complianceStepsRes.json.data.length === 3,
      'GET /compliance/steps returns the 3 verification steps'
    );

    // Own-name bank account enforcement on profile update
    const ownIban = 'FR7630006000011234567890189';
    const thirdPartyProfilePatch = await api(
      'PATCH',
      '/users/me',
      { bankIban: ownIban, bankAccountHolder: 'Jean Dupont' },
      customerToken
    );
    assert(
      thirdPartyProfilePatch.status === 400 &&
        thirdPartyProfilePatch.json.code === 'BANK_HOLDER_NAME_MISMATCH',
      'Profile update rejects registering a third-party bank account holder'
    );

    const ownProfilePatch = await api(
      'PATCH',
      '/users/me',
      { bankIban: ownIban, bankAccountHolder: 'Claire Moreau' },
      customerToken
    );
    assert(
      ownProfilePatch.status === 200 &&
        ownProfilePatch.json.data?.bankIban === ownIban &&
        ownProfilePatch.json.data?.bankAccountHolder === 'Claire Moreau',
      'Profile update accepts and persists own-name IBAN'
    );

    // Document upload transitions compliance step to in_review
    const docUpload = await api(
      'POST',
      '/documents',
      {
        category: 'kyc_identity',
        documentType: 'Passport',
        fileName: 'claire-passport.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
      },
      customerToken
    );
    assert(docUpload.status === 201 && docUpload.json.success === true, 'POST /documents records compliance document');

    const stepsAfterDoc = await api('GET', '/compliance/steps', undefined, customerToken);
    const kycStep = Array.isArray(stepsAfterDoc.json?.data)
      ? stepsAfterDoc.json.data.find((s: any) => s.stepKey === 'kyc_identity')
      : null;
    assert(kycStep?.status === 'in_review', 'Uploading document updates compliance_steps status to in_review');

    // Server-side withdrawal checks
    const unverifiedWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 500, destination: ownIban, accountHolderName: 'Claire Moreau' },
      customerToken
    );
    assert(
      unverifiedWithdraw.status === 403 &&
        unverifiedWithdraw.json.code === 'WITHDRAWAL_KYC_REQUIRED',
      'Server rejects withdrawal when KYC is not verified'
    );

    // Mark KYC verified and credit test balance strictly via test helper
    __testSetCustomerFinancialState(customerId, { kycStatus: 'verified', balance: 1500 });

    const mismatchedIbanWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 500, destination: 'DE89370400440532013000', accountHolderName: 'Claire Moreau' },
      customerToken
    );
    assert(
      mismatchedIbanWithdraw.status === 403 &&
        mismatchedIbanWithdraw.json.code === 'WITHDRAWAL_DESTINATION_MISMATCH',
      'Server rejects withdrawal to an unregistered IBAN'
    );

    const thirdPartyWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 500, destination: ownIban, accountHolderName: 'Jean Dupont' },
      customerToken
    );
    assert(
      thirdPartyWithdraw.status === 403 &&
        thirdPartyWithdraw.json.code === 'WITHDRAWAL_HOLDER_NAME_MISMATCH',
      'Server rejects withdrawal to a third-party account holder name'
    );

    const overBalanceWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 5000, destination: ownIban, accountHolderName: 'Claire Moreau' },
      customerToken
    );
    assert(
      overBalanceWithdraw.status === 400 &&
        overBalanceWithdraw.json.code === 'INSUFFICIENT_FUNDS',
      'Server rejects withdrawal exceeding available wallet balance'
    );

    const validWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 1000, destination: ownIban, accountHolderName: 'Claire Moreau' },
      customerToken
    );
    assert(
      validWithdraw.status === 201 &&
        validWithdraw.json.data?.status === 'pending' &&
        Number(validWithdraw.json.data?.amount) === 1000,
      'Server accepts valid own-name withdrawal and reserves funds'
    );

    const walletAfterWithdraw = await api('GET', '/wallets/me', undefined, customerToken);
    assert(
      walletAfterWithdraw.status === 200 &&
        Number(walletAfterWithdraw.json.data?.availableBalance) === 500,
      'Server wallet balance reflects reserved withdrawal amount (€500 remaining)'
    );

    const secondOverBalanceWithdraw = await api(
      'POST',
      '/withdrawals',
      { amount: 600, destination: ownIban, accountHolderName: 'Claire Moreau' },
      customerToken
    );
    assert(
      secondOverBalanceWithdraw.status === 400 &&
        secondOverBalanceWithdraw.json.code === 'INSUFFICIENT_FUNDS',
      'Server rejects second withdrawal exceeding remaining balance after reservation'
    );

    // Full-stack Staff Admin, KYC Provider, Payment Webhook & Notification flows
    const adminToken = 'admin_sess_usr-admin-01';
    const providerStatus = await api('GET', '/admin/providers/status', undefined, adminToken);
    assert(
      providerStatus.status === 200 &&
        Boolean(providerStatus.json.data?.database) &&
        Boolean(providerStatus.json.data?.payments?.provider) &&
        Boolean(providerStatus.json.data?.kyc?.provider) &&
        Boolean(providerStatus.json.data?.email),
      'GET /admin/providers/status returns live status for Database, Payments, KYC, and Email'
    );

    const kycSessionRes = await api('POST', '/compliance/kyc-session', {}, customerToken);
    assert(
      kycSessionRes.status === 200 &&
        Boolean(kycSessionRes.json.data?.provider) &&
        Array.isArray(kycSessionRes.json.data?.requiredSteps),
      'POST /compliance/kyc-session initializes investor KYC verification session'
    );

    const adminDocsList = await api('GET', '/admin/documents', undefined, adminToken);
    const uploadedDocId = String(docUpload.json?.data?.id || '');
    assert(
      adminDocsList.status === 200 &&
        Array.isArray(adminDocsList.json.data) &&
        adminDocsList.json.data.some((d: any) => d.id === uploadedDocId),
      'GET /admin/documents surfaces investor compliance upload to staff admin'
    );

    const docReviewRes = await api(
      'POST',
      `/admin/documents/${uploadedDocId}/review`,
      { approved: true },
      adminToken
    );
    assert(
      docReviewRes.status === 200 && docReviewRes.json.data?.status === 'verified',
      'POST /admin/documents/:docId/review marks uploaded proof verified'
    );

    const stepsAfterReview = await api('GET', '/compliance/steps', undefined, customerToken);
    const kycStepVerified = Array.isArray(stepsAfterReview.json?.data)
      ? stepsAfterReview.json.data.find((s: any) => s.stepKey === 'kyc_identity')
      : null;
    assert(
      kycStepVerified?.status === 'verified',
      'Admin document approval advances compliance_steps status to verified'
    );

    const kycWebhookEvent = {
      eventId: `kyc-evt-${Date.now()}`,
      externalUserId: customerId,
      reviewResult: { reviewAnswer: 'GREEN', moderationComment: 'Automated passport match passed' },
    };
    const kycWebhookRes = await api('POST', '/webhooks/kyc', kycWebhookEvent);
    assert(
      kycWebhookRes.status === 200 && kycWebhookRes.json.data?.kycStatus === 'verified',
      'POST /webhooks/kyc processes automated KYC verification approval'
    );
    const kycWebhookDup = await api('POST', '/webhooks/kyc', kycWebhookEvent);
    assert(
      kycWebhookDup.status === 200 &&
        String(kycWebhookDup.json.message || '').toLowerCase().includes('already processed'),
      'POST /webhooks/kyc handles duplicate webhook events idempotently'
    );

    // Payment webhook deposit settlement & idempotency
    const createdDeposit = await api(
      'POST',
      '/deposits',
      { amount: 2500, currency: 'EUR', method: 'SEPA Bank Wire' },
      customerToken
    );
    const depositId = String(createdDeposit.json?.data?.id || '');
    const depositRef = String(createdDeposit.json?.data?.reference || '');
    assert(
      createdDeposit.status === 201 && Boolean(depositId) && Boolean(depositRef),
      'POST /deposits creates a pending EUR deposit'
    );

    const payWebhookEvt = {
      id: `evt-sepa-${Date.now()}`,
      type: 'sepa.deposit.settled',
      data: { object: { metadata: { transactionId: depositId, reference: depositRef } } },
    };
    const payWebhookRes = await api('POST', '/payments/webhooks', payWebhookEvt);
    assert(
      payWebhookRes.status === 200 && payWebhookRes.json.settlementApplied === true,
      'POST /payments/webhooks settles pending deposit and credits wallet'
    );

    const walletAfterPayWebhook = await api('GET', '/wallets/me', undefined, customerToken);
    assert(
      walletAfterPayWebhook.status === 200 &&
        Number(walletAfterPayWebhook.json.data?.availableBalance) === 3000,
      'Wallet balance increases by €2,500 after payment webhook settlement (€3,000 total)'
    );

    const payWebhookReplay = await api('POST', '/payments/webhooks', payWebhookEvt);
    const walletAfterReplay = await api('GET', '/wallets/me', undefined, customerToken);
    assert(
      payWebhookReplay.status === 200 &&
        Number(walletAfterReplay.json.data?.availableBalance) === 3000,
      'Duplicate payment webhook does not double-credit wallet'
    );

    // Admin direct approval of deposit + withdrawal payout dispatch + investor notification sync
    const secondDeposit = await api(
      'POST',
      '/deposits',
      { amount: 1000, currency: 'EUR', method: 'SEPA Bank Wire' },
      customerToken
    );
    const secondDepositId = String(secondDeposit.json?.data?.id || '');
    const adminDepositApprove = await api(
      'POST',
      `/admin/deposits/${secondDepositId}/approve`,
      {},
      adminToken
    );
    assert(
      adminDepositApprove.status === 200 &&
        adminDepositApprove.json.data?.status === 'completed',
      'POST /admin/deposits/:depositId/approve marks deposit completed'
    );

    const pendingWithdrawalId = String(validWithdraw.json?.data?.id || '');
    const adminWithdrawApprove = await api(
      'POST',
      `/admin/withdrawals/${pendingWithdrawalId}/approve`,
      {},
      adminToken
    );
    assert(
      adminWithdrawApprove.status === 200 &&
        adminWithdrawApprove.json.data?.status === 'completed' &&
        Boolean(adminWithdrawApprove.json.payout?.provider),
      'POST /admin/withdrawals/:withdrawalId/approve approves payout and dispatches bank provider instruction'
    );

    const notifAfterFlows = await api('GET', '/notifications', undefined, customerToken);
    assert(
      notifAfterFlows.status === 200 &&
        Array.isArray(notifAfterFlows.json.data) &&
        notifAfterFlows.json.data.length >= 3,
      'GET /notifications records investor alerts from compliance, deposit, and withdrawal events'
    );

    // Dashboard Summary (real breakdowns, 5-stage lifecycle & performanceHistory)
    const dashSummary = await api('GET', '/dashboard/summary', undefined, customerToken);
    const sumData = dashSummary.json?.data || {};
    assert(
      dashSummary.status === 200 &&
        Boolean(sumData.lastUpdated) &&
        Boolean(sumData.valuationDate) &&
        typeof sumData.cashBreakdown?.available === 'number' &&
        typeof sumData.cashBreakdown?.pendingDeposits === 'number' &&
        typeof sumData.cashBreakdown?.reservedWithdrawals === 'number' &&
        typeof sumData.cashBreakdown?.restricted === 'number' &&
        typeof sumData.rentSummary?.projectedMonthly === 'number' &&
        typeof sumData.rentSummary?.collectedThisMonth === 'number' &&
        typeof sumData.holdingsSummary?.confirmedUnits === 'number' &&
        Array.isArray(sumData.performanceHistory) &&
        sumData.lifecycle?.stages?.length === 5 &&
        typeof sumData.lifecycle?.progressPercent === 'number',
      'GET /dashboard/summary returns cashBreakdown, rentSummary, holdingsSummary, 5-stage lifecycle, performanceHistory, valuationDate, and lastUpdated'
    );

    // Treasury Rates & FX Conversion
    const ratesRes = await api('GET', '/treasury/rates', undefined, customerToken);
    const ratesData = ratesRes.json?.data || {};
    const expectedAssets = ['EUR', 'USD', 'GBP', 'CHF', 'USDC', 'USDT', 'SOL'];
    assert(
      ratesRes.status === 200 &&
        Boolean(ratesData.quoteId) &&
        Boolean(ratesData.expiresAt) &&
        typeof ratesData.limits?.minEur === 'number' &&
        typeof ratesData.limits?.maxEur === 'number' &&
        expectedAssets.every((a) => Array.isArray(ratesData.supportedAssets) && ratesData.supportedAssets.includes(a)),
      'GET /treasury/rates returns quoteId, expiresAt, limits, and all 7 supported assets'
    );

    const convertOk = await api(
      'POST',
      '/treasury/convert',
      { fromCurrency: 'EUR', toCurrency: 'USDC', amount: 250, quoteId: ratesData.quoteId },
      customerToken
    );
    const convertTxRef = String(convertOk.json?.data?.transaction?.reference || '');
    assert(
      convertOk.status === 200 &&
        convertTxRef.startsWith('FX-') &&
        Number(convertOk.json?.data?.balances?.USDC || 0) > 0,
      'POST /treasury/convert executes EUR -> USDC conversion with quoteId and credits USDC sub-balance'
    );

    const notifAfterFx = await api('GET', '/notifications', undefined, customerToken);
    assert(
      notifAfterFx.status === 200 &&
        Array.isArray(notifAfterFx.json.data) &&
        notifAfterFx.json.data.some((n: any) => String(n.title || '').includes('Treasury FX Conversion')),
      'Treasury FX conversion records an investor notification'
    );

    const convertInsufficient = await api(
      'POST',
      '/treasury/convert',
      { fromCurrency: 'EUR', toCurrency: 'USDC', amount: 200000, quoteId: ratesData.quoteId },
      customerToken
    );
    assert(
      convertInsufficient.status === 400 &&
        convertInsufficient.json.code === 'INSUFFICIENT_CURRENCY_BALANCE',
      'POST /treasury/convert rejects conversion exceeding available source balance'
    );

    const convertExpiredQuote = await api(
      'POST',
      '/treasury/convert',
      { fromCurrency: 'EUR', toCurrency: 'USDC', amount: 50, quoteId: 'QT-EXPIRED-UNKNOWN' },
      customerToken
    );
    assert(
      convertExpiredQuote.status === 410 &&
        convertExpiredQuote.json.code === 'QUOTE_EXPIRED',
      'POST /treasury/convert rejects unknown/expired quoteId with 410'
    );

    // Filtered transaction list & detail lookup
    const filteredTxs = await api('GET', '/transactions?type=fee', undefined, customerToken);
    const fxTxId = String(convertOk.json?.data?.transaction?.id || '');
    assert(
      filteredTxs.status === 200 &&
        Array.isArray(filteredTxs.json.data) &&
        filteredTxs.json.data.some((t: any) => t.id === fxTxId),
      'GET /transactions?type=fee returns FX conversion ledger entry'
    );

    const singleTxRes = await api('GET', `/transactions/${encodeURIComponent(fxTxId)}`, undefined, customerToken);
    assert(
      singleTxRes.status === 200 &&
        singleTxRes.json.data?.id === fxTxId &&
        singleTxRes.json.data?.reference === convertTxRef,
      'GET /transactions/:transactionId returns full transaction detail'
    );

    // Manual payment methods & deposit submission
    const manualMethodsRes = await api('GET', '/manual-payments/methods', undefined, customerToken);
    assert(
      manualMethodsRes.status === 200 &&
        Array.isArray(manualMethodsRes.json.data) &&
        manualMethodsRes.json.data.length === 1 &&
        manualMethodsRes.json.data[0]?.id === 'method-sepa-wire',
      'GET /manual-payments/methods returns configured bank & crypto deposit rails'
    );

    const pdfProofBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n').toString('base64');
    const manualDepositRes = await api(
      'POST',
      '/manual-payments/deposits',
      {
        methodId: 'method-sepa-wire',
        amount: 500,
        transactionId: `WIRE-${Date.now()}`,
        senderName: 'Claire Moreau',
        paymentDate: new Date().toISOString().slice(0, 10),
        proofMimeType: 'application/pdf',
        proofBase64: pdfProofBase64,
        extraValues: { sending_iban: ownIban },
      },
      customerToken
    );
    assert(
      manualDepositRes.status === 201 &&
        manualDepositRes.json.data?.status === 'pending' &&
        String(manualDepositRes.json.data?.reference || '').startsWith('KZ-MAN-'),
      'POST /manual-payments/deposits records pending manual deposit in dev/test mode'
    );

    // User notification preferences persistence
    const prefUpdateRes = await api(
      'PUT',
      '/user/preferences',
      { depositAlerts: false, withdrawalUpdates: true, kycUpdates: false },
      customerToken
    );
    const prefGetRes = await api('GET', '/user/preferences', undefined, customerToken);
    assert(
      prefUpdateRes.status === 200 &&
        prefGetRes.status === 200 &&
        prefGetRes.json.data?.depositAlerts === false &&
        prefGetRes.json.data?.withdrawalUpdates === true &&
        prefGetRes.json.data?.kycUpdates === false,
      'PUT /user/preferences persists notification alert toggles cleanly'
    );

    // Real aggregated Admin Dashboard metrics
    const adminDashRes = await api('GET', '/admin/dashboard', undefined, adminToken);
    const adminStats = adminDashRes.json?.data || {};
    assert(
      adminDashRes.status === 200 &&
        typeof adminStats.totalUsers === 'number' &&
        adminStats.totalUsers >= 1 &&
        typeof adminStats.totalProperties === 'number' &&
        typeof adminStats.totalTransactions === 'number' &&
        adminStats.totalTransactions >= 3 &&
        typeof adminStats.totalAssetsUnderManagement === 'number' &&
        typeof adminStats.totalDividendsPaid === 'number' &&
        typeof adminStats.pendingKYC === 'number' &&
        typeof adminStats.pendingWithdrawalsCount === 'number',
      'GET /admin/dashboard returns live aggregated platform metrics'
    );

    // Role guard: non-staff investors are rejected from admin endpoints
    const nonStaffUsersRes = await api('GET', '/admin/users', undefined, customerToken);
    const nonStaffNotifRes = await api('GET', '/admin/notifications', undefined, customerToken);
    const nonStaffInvRes = await api('GET', '/admin/investments', undefined, customerToken);
    assert(
      nonStaffUsersRes.status === 403 &&
        nonStaffNotifRes.status === 403 &&
        nonStaffInvRes.status === 403,
      'Non-staff investor token receives 403 Forbidden on /admin/users, /admin/notifications, /admin/investments'
    );

    // Admin Investments endpoint returns live array
    const adminInvRes = await api('GET', '/admin/investments', undefined, adminToken);
    assert(
      adminInvRes.status === 200 && Array.isArray(adminInvRes.json?.data),
      'GET /admin/investments returns array of investor holdings for staff'
    );

    // Admin Notifications dispatch and history listing
    const notifTitle = `Compliance Review Notice ${Date.now()}`;
    const sendNotifRes = await api(
      'POST',
      '/admin/notifications',
      {
        userId: customerId,
        type: 'warning',
        title: notifTitle,
        message: 'Your supporting documentation is queued for final review.',
      },
      adminToken
    );
    const listNotifRes = await api('GET', '/admin/notifications', undefined, adminToken);
    const sentFound = Array.isArray(listNotifRes.json?.data)
      ? listNotifRes.json.data.some((n: any) => n.title === notifTitle && n.userId === customerId)
      : false;
    assert(
      sendNotifRes.status === 201 &&
        Array.isArray(sendNotifRes.json?.data) &&
        sendNotifRes.json.data[0]?.title === notifTitle &&
        sendNotifRes.json?.sentCount === 1 &&
        listNotifRes.status === 200 &&
        sentFound,
      'POST /admin/notifications dispatches alert and GET /admin/notifications lists it'
    );

    // Deliverable 1: Generic wrong-password error & OTP scope rules
    const badLoginRes = await api('POST', '/auth/login', {
      email: validRegEmail,
      password: 'WrongPassword999',
    });
    assert(
      badLoginRes.status === 401 && badLoginRes.json.error === 'Email or password is incorrect.',
      'POST /auth/login returns generic "Email or password is incorrect." message on invalid credentials'
    );

    const investmentOtpRes = await api(
      'POST',
      '/security/action-code/request',
      { actionScope: 'investor.investment.create' },
      customerToken
    );
    assert(
      investmentOtpRes.status === 400 && investmentOtpRes.json.code === 'INVALID_ACTION_SCOPE',
      'Investments no longer use or allow action security-code scope'
    );

    const withdrawOtpReq = await api(
      'POST',
      '/security/action-code/request',
      { actionScope: 'investor.withdrawal.create' },
      customerToken
    );
    const otpStatusAfter = await api('GET', '/security/action-code/status', undefined, customerToken);
    const repeatBankOtpReq = await api(
      'POST',
      '/security/action-code/request',
      { actionScope: 'investor.profile.bank.update' },
      customerToken
    );
    assert(
      withdrawOtpReq.status === 200 &&
        withdrawOtpReq.json.success === true &&
        otpStatusAfter.status === 200 &&
        otpStatusAfter.json.verified === true &&
        Number(otpStatusAfter.json.remainingSeconds) > 0 &&
        repeatBankOtpReq.status === 200 &&
        repeatBankOtpReq.json.otpRequired === false &&
        repeatBankOtpReq.json.alreadyVerified === true,
      'Sensitive action security verification is cached in session for 10 minutes across sensitive scopes'
    );

    // Deliverable 1 client-side helpers: error formatting, monitoring redaction, 10m session store
    assert(
      formatEmailCodeSendError({ status: 429, message: 'Rate limit raw SMTP trace' }) ===
        'Too many attempts. Please wait a few minutes and try again.' &&
        formatEmailCodeSendError({ status: 500, message: 'Internal SMTP socket ECONNREFUSED' }) ===
        'We couldn’t send your code. Please try again, or contact support.',
      'formatEmailCodeSendError hides raw error text and distinguishes rate-limit vs generic failures'
    );

    const redactedMon = sanitizeErrorForMonitoring({
      status: 502,
      message: 'Failed for investor@example.com with code 482910 and Bearer secret.jwt.token',
    });
    assert(
      !redactedMon.message.includes('investor@example.com') &&
        !redactedMon.message.includes('482910') &&
        !redactedMon.message.includes('secret.jwt.token'),
      'sanitizeErrorForMonitoring strips email, OTP code, and bearer token before logging'
    );

    const monitoringRes = await api('POST', '/monitoring/client-error', {
      category: 'security',
      eventType: 'EMAIL_CODE_SEND_FAILED',
      errorCode: redactedMon.errorCode,
      message: redactedMon.message,
      scope: 'login_email_code',
    });
    assert(monitoringRes.status === 200 && monitoringRes.json.success === true, 'POST /monitoring/client-error accepts sanitized failure telemetry');

    clearActionVerification();
    assert(!isActionVerifiedInSession(), 'clearActionVerification clears active 10m session cache');
    markActionVerified('investor.password.change', 'grant-test-123');
    assert(
      isActionVerifiedInSession() && getValidActionGrant('investor.password.change') === 'grant-test-123',
      'Client session cache remembers action verification for 10 minutes and clears on logout'
    );
    clearActionVerification();

    // Deliverable 2: IBAN checksum validation, transaction pagination, and signed document URL
    assert(
      isValidIBAN('FR7630006000011234567890189') === true &&
        isValidIBAN('DE89370400440532013000') === true &&
        isValidIBAN('FR7630006000011234567890100') === false &&
        isValidIBAN('INVALID-IBAN') === false,
      'ISO 7064 mod-97 IBAN validation accepts valid IBANs and rejects bad checksums/formats'
    );

    const pagedTxs = await api('GET', '/transactions?limit=2&offset=0', undefined, customerToken);
    assert(
      pagedTxs.status === 200 &&
        Array.isArray(pagedTxs.json.data) &&
        pagedTxs.json.data.length <= 2 &&
        typeof pagedTxs.json.total === 'number',
      'GET /transactions honors limit & offset pagination parameters and reports total'
    );

    const signedUrlRes = await api(
      'GET',
      `/reports/statements/${encodeURIComponent(uploadedDocId)}/signed-url`,
      undefined,
      customerToken
    );
    assert(
      signedUrlRes.status === 200 &&
        Boolean(signedUrlRes.json.data?.url) &&
        Number(signedUrlRes.json.data?.expiresInSeconds) === 60,
      'GET /reports/statements/:docId/signed-url returns short-lived 60s download URL'
    );

    // Deliverable 3: Staff role normalization
    assert(
      normalizeStaffRole('super_admin') === 'super_admin' &&
        normalizeStaffRole('finance_admin') === 'finance' &&
        normalizeStaffRole('compliance_officer') === 'compliance' &&
        normalizeStaffRole('operations_admin') === 'property_manager' &&
        normalizeStaffRole('support_agent') === 'support' &&
        normalizeStaffRole('admin') === 'super_admin' &&
        normalizeStaffRole('investor') === null,
      'normalizeStaffRole maps valid staff roles to canonical RBAC roles and rejects non-staff roles'
    );

    const mappedProp = toApiProperty({
      id: 'prop-paris-01',
      name: 'Hôtel Particulier Trocadéro',
      city: 'Paris',
      type: 'Residential',
      share_price_cents: 50000,
      funding_target_cents: 200000000,
      funded_pct: 65,
      target_yield: 7.4,
      target_irr: 11.8,
      term: '48 months',
      photos: ['https://example.com/p1.jpg'],
      status: 'open',
    });
    assert(
      mappedProp.id === 'prop-paris-01' &&
        mappedProp.title === 'Hôtel Particulier Trocadéro' &&
        mappedProp.city === 'Paris' &&
        mappedProp.tokenPrice === 500 &&
        mappedProp.targetAmount === 2000000 &&
        mappedProp.fundedAmount === 1300000 &&
        mappedProp.projectedYield === 7.4 &&
        mappedProp.financials?.totalIrr === 11.8 &&
        mappedProp.holdingPeriodMonths === 48 &&
        mappedProp.images[0] === 'https://example.com/p1.jpg' &&
        mappedProp.status === 'open',
      'toApiProperty maps Supabase properties table columns accurately'
    );

    console.log(`\nAPI Smoke & Contract Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runApiTests().catch((error) => {
  console.error('Unhandled error in API smoke tests:', error);
  process.exitCode = 1;
});
