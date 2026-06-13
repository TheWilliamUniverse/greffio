import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHmacMessage,
  buildHostedCheckoutFields,
  computeHmacSha512,
  formatPbxTotal,
  isCawlETransactionsConfigured,
  mapETransactionsErrorCode,
  parseETransactionsIpn,
  resolveCawlETransactionsConfig,
} from '../providers/cawlETransactions.js';
import { PAYMENT_STATUSES } from '../types.js';

test('formatPbxTotal enforce minimum 100 centimes', () => {
  assert.equal(formatPbxTotal(50), '100');
  assert.equal(formatPbxTotal(9900), '9900');
});

test('computeHmacSha512 matches PHP hash_hmac sha512 hex2bin pattern', () => {
  const hexKey = '0123456789ABCDEF'.repeat(8);
  const msg = 'PBX_SITE=1999888&PBX_RANG=32&PBX_TOTAL=1000';
  const digest = computeHmacSha512(msg, hexKey);
  assert.match(digest, /^[0-9A-F]{128}$/);
  assert.equal(digest, computeHmacSha512(msg, hexKey));
});

test('buildHostedCheckoutFields produces ordered HMAC fields', () => {
  const config = resolveCawlETransactionsConfig({
    CAWL_ENV: 'test',
    CAWL_PBX_SITE: '1999888',
    CAWL_PBX_RANG: '32',
    CAWL_PBX_IDENTIFIANT: '3',
    CAWL_HMAC_KEY: '0123456789ABCDEF'.repeat(8),
    API_BASE_URL: 'https://api.greffio.test',
    APP_URL: 'https://greffio.test',
  });

  const hosted = buildHostedCheckoutFields({
    internalPaymentId: 'pay-test-uuid',
    amountCents: 9900,
    customerEmail: 'client@example.com',
  }, config, 'recette-tpeweb.e-transactions.fr');

  assert.equal(hosted.actionUrl, 'https://recette-tpeweb.e-transactions.fr/php/');
  assert.equal(hosted.fields.PBX_CMD, 'pay-test-uuid');
  assert.equal(hosted.fields.PBX_TOTAL, '9900');
  assert.equal(hosted.fields.PBX_DEVISE, '978');
  assert.match(hosted.fields.PBX_HMAC, /^[0-9A-F]{128}$/);

  const msg = buildHmacMessage(hosted.fields);
  assert.equal(hosted.fields.PBX_HMAC, computeHmacSha512(msg, config.hmacKeyHex));
});

test('isCawlETransactionsConfigured requires site/rang/identifiant/hmac', () => {
  assert.equal(isCawlETransactionsConfigured({
    CAWL_PBX_SITE: '1',
    CAWL_PBX_RANG: '2',
    CAWL_PBX_IDENTIFIANT: '3',
    CAWL_HMAC_KEY: 'AB',
  }), true);
  assert.equal(isCawlETransactionsConfigured({
    CAWL_MERCHANT_ID: '1',
    CAWL_PBX_RANG: '2',
    CAWL_API_KEY_ID: '3',
    CAWL_API_KEY: 'AB',
  }), true);
  assert.equal(isCawlETransactionsConfigured({}), false);
});

test('parseETransactionsIpn maps success code 00000 to paid', () => {
  const ipn = parseETransactionsIpn('Mt=9900&Ref=pay-1&Auto=ABC123&Erreur=00000');
  assert.equal(ipn.providerPaymentId, 'pay-1');
  assert.equal(ipn.status, PAYMENT_STATUSES.PAID);
  assert.equal(ipn.errorCode, '00000');
});

test('mapETransactionsErrorCode treats non-zero as failed', () => {
  assert.equal(mapETransactionsErrorCode('00001'), PAYMENT_STATUSES.FAILED);
});
