import assert from 'node:assert/strict';
import worker from './worker';

const json = async (r: Response) => ({ status: r.status, body: await r.json() as any, headers: r.headers });

let r = await worker.fetch(new Request('http://local/api/health'), {}, {} as any);
assert.equal(r.status, 200);
r = await worker.fetch(new Request('http://local/api/v1/config'), {}, {} as any);
assert.equal(r.status, 200);
assert.equal((await r.json() as any).data.platformName, 'Rental-log');

r = await worker.fetch(new Request('http://local/api/v1/marketplace/listings'), {}, {} as any);
assert.equal(r.status, 200);
const listings = await r.json() as any;
assert.ok(Array.isArray(listings.data));
assert.ok(listings.total >= 1);

r = await worker.fetch(new Request('http://local/api/v1/blog'), {}, {} as any);
assert.equal(r.status, 200);

r = await worker.fetch(new Request('http://local/api/v1/auth/register', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email: 'newuser@example.com', pass: 'StrongPass123!', fullName: 'New User' }) }), {}, {} as any);
assert.equal(r.status, 201);
const reg = await r.json() as any;
assert.ok(reg.token || reg.data?.token);

r = await worker.fetch(new Request('http://local/api/v1/auth/login', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email: 'investor@kretz.com', pass: 'InvestorPass123!' }) }), {}, {} as any);
assert.equal(r.status, 200);
const login = await r.json() as any;
const token = login.token || login.data?.token;
assert.ok(token);

r = await worker.fetch(new Request('http://local/api/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } }), {}, {} as any);
assert.equal(r.status, 200);
assert.equal((await r.json() as any).authenticated, true);

r = await worker.fetch(new Request('http://local/api/v1/user/profile', { headers: { Authorization: `Bearer ${token}` } }), {}, {} as any);
assert.equal(r.status, 200);

r = await worker.fetch(new Request('http://local/api/v1/portfolio', { headers: { Authorization: `Bearer ${token}` } }), {}, {} as any);
assert.equal(r.status, 200);

r = await worker.fetch(new Request('http://local/api/v1/legacy-unmigrated'), {}, {} as any);
assert.equal(r.status, 501);

console.log('✓ PASS: workers/hono core routes (health/config/listings/blog/auth/profile/portfolio/fallback)');
