import assert from 'node:assert/strict';
import router from './routes';

assert.ok(router, 'router exported');
console.log('✓ PASS: api routes module loads');
process.exit(0);
