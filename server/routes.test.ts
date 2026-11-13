process.env.NODE_ENV = 'test';

/**
 * Backend API smoke tests.
 *
 * Customer identities are now owned by Supabase Auth. These tests deliberately
 * do not seed local users or fake sessions: they verify public routing and that
 * account/profile/admin endpoints reject unauthenticated requests.
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

  async function api(method: string, path: string, body?: Record<string, any>) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, json: await response.json().catch(() => ({})) };
  }

  try {
    console.log('\n============================================================');
    console.log(' CUSTOMER ACCOUNT AUTHORITY & API SMOKE TESTS');
    console.log('============================================================\n');

    const listings = await api('GET', '/listings');
    assert(listings.status === 200 && listings.json.success === true, 'Public listings endpoint remains available');

    const session = await api('GET', '/auth/session');
    assert(session.status === 200 && session.json.authenticated === false, 'Unauthenticated session probe returns a guest state');

    const login = await api('POST', '/auth/login', {});
    assert(login.status === 400 && login.json.code === 'MISSING_FIELDS', 'Customer login validates credentials before authentication');

    const registration = await api('POST', '/auth/register', {});
    assert(registration.status === 400 && registration.json.code === 'VALIDATION_ERROR', 'Customer registration validates required fields');

    const recovery = await api('POST', '/auth/password/forgot', {});
    assert(recovery.status === 400 && recovery.json.code === 'INVALID_EMAIL', 'Password recovery validates email input');

    const profile = await api('GET', '/user/profile');
    assert(profile.status === 401, 'Customer profile endpoint requires a verified Supabase identity');

    const me = await api('GET', '/auth/me');
    assert(me.status === 401, 'Current-user endpoint requires authentication');

    const profileUpdate = await api('PATCH', '/users/me', { fullName: 'Should Not Persist' });
    assert(profileUpdate.status === 401, 'Profile updates cannot run without a verified customer identity');

    const adminUsers = await api('GET', '/admin/users');
    assert(adminUsers.status === 401, 'Administrator user registry requires an authorized admin identity');

    const adminKyc = await api('POST', '/admin/users/00000000-0000-0000-0000-000000000000/kyc', { kycStatus: 'approved' });
    assert(adminKyc.status === 401, 'KYC management requires an authorized admin identity');

    const adminStatus = await api('PATCH', '/admin/users/00000000-0000-0000-0000-000000000000/status', { status: 'suspended' });
    assert(adminStatus.status === 401, 'Account status management requires an authorized admin identity');

    console.log(`\nAPI Smoke Test Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runApiTests().catch((error) => {
  console.error('Unhandled error in API smoke tests:', error);
  process.exitCode = 1;
});
