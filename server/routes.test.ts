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
