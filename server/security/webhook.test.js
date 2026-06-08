import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { verifyGoCardlessWebhook } from '../gocardless.js';
import { requireWebhookSecret } from '../utils/webhookSecurity.js';

test('webhook: secret manquant bloqué en production', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const result = requireWebhookSecret('', 'TEST_WEBHOOK');
  assert.equal(result.ok, false);
  process.env.NODE_ENV = previous;
});

test('webhook: signature GoCardless invalide rejetée', () => {
  const result = verifyGoCardlessWebhook({
    rawBody: '{"events":[]}',
    signatureHeader: 't=123,v1=deadbeef',
    secret: 'test-secret',
  });
  assert.equal(result.ok, false);
});

test('webhook: signature GoCardless valide acceptée', () => {
  const secret = 'test-secret';
  const rawBody = '{"events":[]}';
  const timestamp = '1710000000';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const result = verifyGoCardlessWebhook({
    rawBody,
    signatureHeader: `t=${timestamp},v1=${signature}`,
    secret,
  });
  assert.equal(result.ok, true);
});
