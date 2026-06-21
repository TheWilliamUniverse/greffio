import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMollieMethod,
  resolveMollieCheckoutMode,
  getMollieProfileId,
  resolveMollieRefundState,
  isMollieRefundedStatus,
  hasMolliePendingRefund,
} from '../../mollie.js';
import { MolliePaymentAdapter } from '../providers/MolliePaymentAdapter.js';

test('resolveMollieRefundState détecte remboursement total et partiel', () => {
  assert.deepEqual(resolveMollieRefundState({
    status: 'refunded',
    amount: { value: '99.00' },
    amountRefunded: { value: '99.00' },
    modifiedAt: '2026-06-19T10:00:00.000Z',
  }), {
    internalStatus: 'refunded',
    refundedAt: '2026-06-19T10:00:00.000Z',
    refundPending: false,
  });

  assert.deepEqual(resolveMollieRefundState({
    status: 'paid',
    amount: { value: '99.00' },
    amountRefunded: { value: '30.00' },
    modifiedAt: '2026-06-19T10:00:00.000Z',
  }), {
    internalStatus: 'partially_refunded',
    refundedAt: '2026-06-19T10:00:00.000Z',
    refundPending: false,
  });
});

test('hasMolliePendingRefund détecte les remboursements en cours', () => {
  assert.equal(hasMolliePendingRefund([{ status: 'processing' }]), true);
  assert.equal(hasMolliePendingRefund([{ status: 'refunded' }]), false);
});

test('isMollieRefundedStatus reconnaît refunded', () => {
  assert.equal(isMollieRefundedStatus('refunded'), true);
  assert.equal(isMollieRefundedStatus('paid'), false);
});

test('normalizeMollieMethod mappe card → creditcard', () => {
  assert.equal(normalizeMollieMethod('card'), 'creditcard');
  assert.equal(normalizeMollieMethod('creditcard'), 'creditcard');
  assert.equal(normalizeMollieMethod('applepay'), 'applepay');
});

test('resolveMollieCheckoutMode distingue embedded_3ds et hosted', () => {
  assert.equal(resolveMollieCheckoutMode('creditcard', 'tkn_test'), 'embedded_3ds');
  assert.equal(resolveMollieCheckoutMode('creditcard', null), 'embedded');
  assert.equal(resolveMollieCheckoutMode('applepay', null), 'hosted');
  assert.equal(resolveMollieCheckoutMode('banktransfer', null), 'hosted');
});

test('getMollieProfileId utilise la valeur par défaut Greffio', () => {
  const original = process.env.MOLLIE_PROFILE_ID;
  delete process.env.MOLLIE_PROFILE_ID;
  assert.equal(getMollieProfileId(), 'pfl_Q6vFPJDb7P');
  if (original) process.env.MOLLIE_PROFILE_ID = original;
});

test('MolliePaymentAdapter transmet method et cardToken', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({
        id: 'tr_test123',
        status: 'open',
        _links: { checkout: { href: 'https://www.mollie.com/checkout/test' } },
      }),
    };
  };

  process.env.MOLLIE_API_KEY = 'test_key';

  try {
    const adapter = new MolliePaymentAdapter();
    const result = await adapter.createPayment({
      internalPaymentId: 'pay-1',
      customerId: 'user-1',
      customerType: 'b2c',
      amount: 9900,
      description: 'Test Greffio',
      returnUrl: 'https://greffio.willentreprises.com/paiement/verification',
      mollieMethod: 'creditcard',
      cardToken: 'tkn_abc',
      metadata: { resourceOrderId: 'ord-1' },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'creditcard');
    assert.equal(calls[0].cardToken, 'tkn_abc');
    assert.equal(result.checkoutMode, 'embedded_3ds');
    assert.equal(result.checkoutUrl, 'https://www.mollie.com/checkout/test');
  } finally {
    global.fetch = originalFetch;
    delete process.env.MOLLIE_API_KEY;
  }
});

test('MolliePaymentAdapter pré-sélection hosted sans cardToken', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return {
      ok: true,
      json: async () => ({
        id: 'tr_hosted',
        status: 'open',
        _links: { checkout: { href: 'https://www.mollie.com/checkout/hosted' } },
      }),
    };
  };

  process.env.MOLLIE_API_KEY = 'test_key';

  try {
    const adapter = new MolliePaymentAdapter();
    const result = await adapter.createPayment({
      internalPaymentId: 'pay-2',
      customerId: 'user-2',
      customerType: 'b2c',
      amount: 5000,
      returnUrl: 'https://greffio.willentreprises.com/paiement/verification',
      mollieMethod: 'applepay',
      metadata: {},
    });

    assert.equal(calls[0].method, 'applepay');
    assert.equal(calls[0].cardToken, undefined);
    assert.equal(result.checkoutMode, 'hosted');
  } finally {
    global.fetch = originalFetch;
    delete process.env.MOLLIE_API_KEY;
  }
});
