import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  handleWorldlineEndpointVerification,
  isCawlWorldlineConfigured,
  mapWorldlineStatus,
  parseWorldlineWebhookEvent,
  verifyWorldlineWebhookSignature,
} from '../providers/cawlWorldlineConnect.js';
import { PAYMENT_STATUSES } from '../types.js';

const TEST_SECRET = 'test-webhook-secret-key';
const TEST_KEY_ID = 'D3070D34A939F7CE7DB3';

function signBody(body, secret = TEST_SECRET) {
  return crypto.createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(Buffer.from(body, 'utf8'))
    .digest('base64');
}

test('isCawlWorldlineConfigured requires webhook id and secret', () => {
  assert.equal(isCawlWorldlineConfigured({
    CAWL_WEBHOOK_ID: TEST_KEY_ID,
    CAWL_WEBHOOK_SECRET: TEST_SECRET,
  }), true);
  assert.equal(isCawlWorldlineConfigured({ CAWL_WEBHOOK_ID: TEST_KEY_ID }), false);
  assert.equal(isCawlWorldlineConfigured({}), false);
});

test('verifyWorldlineWebhookSignature validates X-GCS-Signature', () => {
  const body = JSON.stringify({ type: 'payment.created', payment: { id: 'pay-1' } });
  const signature = signBody(body);
  const result = verifyWorldlineWebhookSignature({
    rawBody: body,
    headers: {
      'X-GCS-KeyId': TEST_KEY_ID,
      'X-GCS-Signature': signature,
    },
    webhookSecret: TEST_SECRET,
    expectedKeyId: TEST_KEY_ID,
  });
  assert.equal(result.ok, true);
});

test('verifyWorldlineWebhookSignature rejects invalid signature', () => {
  const body = '{"type":"payment.created"}';
  const result = verifyWorldlineWebhookSignature({
    rawBody: body,
    headers: {
      'X-GCS-KeyId': TEST_KEY_ID,
      'X-GCS-Signature': 'invalid',
    },
    webhookSecret: TEST_SECRET,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'CAWL_WORLDLINE_SIGNATURE_MISMATCH');
});

test('handleWorldlineEndpointVerification echoes challenge header', () => {
  const result = handleWorldlineEndpointVerification({
    'X-GCS-Webhooks-Endpoint-Verification': 'abc123challenge',
  });
  assert.deepEqual(result, { ok: true, body: 'abc123challenge' });
});

test('parseWorldlineWebhookEvent extracts payment id and status', () => {
  const parsed = parseWorldlineWebhookEvent({
    type: 'payment.captured',
    payment: { id: 'worldline-pay-42', status: 'CAPTURED' },
  });
  assert.equal(parsed.providerPaymentId, 'worldline-pay-42');
  assert.equal(parsed.status, PAYMENT_STATUSES.PAID);
});

test('mapWorldlineStatus maps common codes', () => {
  assert.equal(mapWorldlineStatus('PENDING'), PAYMENT_STATUSES.PENDING);
  assert.equal(mapWorldlineStatus('CAPTURED'), PAYMENT_STATUSES.PAID);
  assert.equal(mapWorldlineStatus('DECLINED'), PAYMENT_STATUSES.FAILED);
});
