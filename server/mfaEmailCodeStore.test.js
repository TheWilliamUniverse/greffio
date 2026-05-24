import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSendMfaEmailCode,
  issueMfaEmailCode,
  maskEmailAddress,
  verifyMfaEmailCode,
} from './mfaEmailCodeStore.js';

test('maskEmailAddress hides most of the local part', () => {
  assert.equal(maskEmailAddress('william@willentreprises.com'), 'wi*****@willentreprises.com');
});

test('issue and verify MFA email code', () => {
  const userId = 'usr_test_email_mfa';
  const { code } = issueMfaEmailCode(userId);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyMfaEmailCode({ userId, code }), true);
  assert.equal(verifyMfaEmailCode({ userId, code }), false);
});

test('canSendMfaEmailCode enforces cooldown', () => {
  const userId = 'usr_test_email_cooldown';
  issueMfaEmailCode(userId);
  const blocked = canSendMfaEmailCode(userId);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});
