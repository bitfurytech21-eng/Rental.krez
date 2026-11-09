import assert from 'node:assert/strict';
import worker from './worker';

const health = await worker.fetch(new Request('http://local/api/health'), {}, {} as any);
assert.equal(health.status, 200);
const body = await health.json() as any;
assert.equal(body.apiVersion, 'v1');

const blog = await worker.fetch(new Request('http://local/api/v1/blog'), {}, {} as any);
assert.equal(blog.status, 200);
const blogBody = await blog.json() as any;
assert.equal(blogBody.success, true);
assert.ok(Array.isArray(blogBody.data));

const missing = await worker.fetch(new Request('http://local/api/v1/legacy-unmigrated'), {}, {} as any);
assert.equal(missing.status, 501);

console.log('✓ PASS: workers/hono fetch entry (health, blog, 501 fallback)');
