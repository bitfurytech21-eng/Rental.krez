import assert from 'node:assert/strict';
import { safeErrorMessage } from './safeErrorMessage';

const fallback = 'Something went wrong.';
const cases: Array<[string, string]> = [
  ['Bearer abc.def.ghi', 'Bearer [redacted]'],
  ['Authorization: Bearer abc.def.ghi', '[redacted]'],
  ['security_code=123456', '[redacted]'],
  ['email_code: 123456', '[redacted]'],
  ['access_token=eyJabcdefgh.abcdefgh.abcdefgh', '[redacted]'],
  ['?token=private-value', '?token=[redacted]'],
  ['Password: my-private-password', '[redacted]'],
  ['Verification code 123456 expired', 'Verification code [redacted] expired'],
];

for (const [input, expected] of cases) {
  const actual = safeErrorMessage(new Error(input), fallback);
  assert.equal(actual, expected, `Unexpected sanitization for: ${input}`);
}
assert.equal(safeErrorMessage(new Error('A normal validation error.'), fallback), 'A normal validation error.');
assert.equal(safeErrorMessage(new Error(''), fallback), fallback);
console.log('Safe error message tests passed.');
