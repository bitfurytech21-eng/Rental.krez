import assert from 'node:assert/strict';
import { eurToCents, centsToEur, formatEurCents, sumCents } from './money';

assert.equal(eurToCents('125.50'), 12550);
assert.equal(eurToCents('0.01'), 1);
assert.equal(eurToCents('-12.34'), -1234);
assert.equal(eurToCents(99), 9900);
assert.equal(centsToEur(12550), 125.5);
assert.equal(sumCents([100, 250, -50]), 300);
assert.match(formatEurCents(12550), /125,50/);
assert.throws(() => eurToCents('12.345'), TypeError);
assert.throws(() => eurToCents('not-money'), TypeError);
assert.throws(() => centsToEur(1.5), TypeError);
console.log('Portal money conversion tests passed.');
