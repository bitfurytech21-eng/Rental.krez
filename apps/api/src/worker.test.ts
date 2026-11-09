import assert from 'node:assert/strict';
import worker from './worker';

async function main() {
  const env = { API_VERSION: 'v1' };
  const call = (path: string, init?: RequestInit) => worker.fetch(new Request(`http://local${path}`, init), env as any, {} as any);

  let r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json() as any).apiVersion, 'v1');

  r = await call('/api/v1/config');
  assert.equal(r.status, 200);
  assert.equal((await r.json() as any).data.platformName, 'Rental-log');

  r = await call('/api/v1/marketplace/listings');
  assert.equal(r.status, 200);
  const listings = await r.json() as any;
  assert.ok(Array.isArray(listings.data) && listings.total >= 1);

  r = await call('/api/v1/marketplace/listings/prop-villa-mirador');
  assert.equal(r.status, 200);
  r = await call('/api/v1/blog');
  assert.equal(r.status, 200);

  r = await call('/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'contract@example.com', pass: 'StrongPass123!', fullName: 'Contract User' }) });
  assert.equal(r.status, 201);
  const reg = await r.json() as any;
  assert.ok(reg.token || reg.data?.token);

  r = await call('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'investor@kretz.com', pass: 'InvestorPass123!' }) });
  assert.equal(r.status, 200);
  const login = await r.json() as any;
  const token = login.token || login.data?.token;
  assert.ok(token);
  assert.ok(r.headers.get('x-csrf-token') || login.csrfToken || login.data?.csrfToken);

  r = await call('/api/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200);
  assert.equal((await r.json() as any).authenticated, true);

  for (const p of ['/api/v1/user/profile', '/api/v1/portfolio', '/api/v1/wallet/balance', '/api/v1/transactions', '/api/v1/notifications', '/api/v1/user/favorites']) {
    r = await call(p, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200, p);
  }

  r = await call('/api/v1/deposits', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 500, method: 'SEPA Bank Wire', idempotencyKey: 'dep-1' }) });
  assert.equal(r.status, 201);
  assert.equal((await r.json() as any).data.status, 'pending');
  r = await call('/api/v1/deposits', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 500, idempotencyKey: 'dep-1' }) });
  assert.ok([200, 201].includes(r.status));
  assert.equal((await r.json() as any).idempotentReplay, true);

  r = await call('/api/v1/investments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: 'prop-villa-mirador', tokensCount: 1, paymentMethod: 'external', idempotencyKey: 'inv-1' }) });
  assert.equal(r.status, 201);
  r = await call('/api/v1/investments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ propertyId: 'prop-villa-mirador', tokensCount: 1, paymentMethod: 'external', idempotencyKey: 'inv-1' }) });
  assert.equal(r.status, 409);

  r = await call('/api/v1/withdrawals', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 999999, destination: 'IBAN' }) });
  assert.equal(r.status, 400);

  r = await call('/api/v1/treasury/convert', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: 'EUR', to: 'USD', amount: 10 }) });
  assert.ok([201, 400].includes(r.status));

  r = await call('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'investor@kretz.com', pass: 'wrong' }) });
  assert.equal(r.status, 401);
  r = await call('/api/v1/user/profile');
  assert.equal(r.status, 401);
  r = await call('/api/v1/legacy-unmigrated');
  assert.equal(r.status, 501);
  r = await call('/api/v1/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fullName: 'A', email: 'a@b.com', message: 'hi' }) });
  assert.equal(r.status, 201);

  console.log('✓ PASS: workers/hono contract tests (migrated endpoints, auth, 401/501 parity, CSRF token exposure, idempotency)');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
