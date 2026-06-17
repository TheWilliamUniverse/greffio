import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentService } from '../PaymentService.js';
import { PaymentProviderResolver } from '../PaymentProviderResolver.js';
import {
  CUSTOMER_TYPES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PaymentError,
} from '../types.js';

const makeAdapter = (name, overrides = {}) => ({
  provider: name,
  isConfigured: () => true,
  createPayment: overrides.createPayment || (async (input) => ({
    internalPaymentId: input.internalPaymentId,
    provider: name,
    providerPaymentId: `${name}_${input.internalPaymentId.slice(0, 6)}`,
    checkoutUrl: `https://psp.example/${name}/${input.internalPaymentId}`,
    status: PAYMENT_STATUSES.PENDING,
    raw: { mock: true },
  })),
  getPaymentStatus: async () => PAYMENT_STATUSES.PENDING,
});

const buildService = (overrides = {}) => {
  const stored = [];
  const upsertPayment = async (payload) => {
    const persisted = { ...payload };
    stored.push(persisted);
    return persisted;
  };
  const providers = {
    [PAYMENT_PROVIDERS.MOLLIE]: overrides.mollie || makeAdapter(PAYMENT_PROVIDERS.MOLLIE),
    [PAYMENT_PROVIDERS.GOCARDLESS]: overrides.gocardless || makeAdapter(PAYMENT_PROVIDERS.GOCARDLESS),
    [PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER]: makeAdapter(PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER),
    [PAYMENT_PROVIDERS.QONTO]: makeAdapter(PAYMENT_PROVIDERS.QONTO),
  };
  const resolver = new PaymentProviderResolver({
    configuredProviders: new Set([
      PAYMENT_PROVIDERS.MOLLIE,
      PAYMENT_PROVIDERS.GOCARDLESS,
    ]),
  });
  const service = new PaymentService({ upsertPayment, providers, resolver });
  return { service, stored };
};

test('B2C → utilise Mollie', async () => {
  const { service, stored } = buildService();
  const result = await service.createPayment({
    customerId: 'cust_1',
    customerType: CUSTOMER_TYPES.B2C,
    amount: 9900,
  });
  assert.equal(result.provider, PAYMENT_PROVIDERS.MOLLIE);
  assert.equal(stored[0].provider, PAYMENT_PROVIDERS.MOLLIE);
  assert.equal(stored[0].customerType, CUSTOMER_TYPES.B2C);
});

test('B2B → utilise GoCardless par défaut', async () => {
  const { service } = buildService();
  const result = await service.createPayment({
    customerId: 'cust_2',
    customerType: CUSTOMER_TYPES.B2B,
    amount: 19900,
  });
  assert.equal(result.provider, PAYMENT_PROVIDERS.GOCARDLESS);
});

test('B2C avec providerOverride=gocardless → refus', async () => {
  const { service } = buildService();
  await assert.rejects(
    () => service.createPayment({
      customerId: 'cust_3',
      customerType: CUSTOMER_TYPES.B2C,
      amount: 5000,
      providerOverride: PAYMENT_PROVIDERS.GOCARDLESS,
    }),
    (err) => err instanceof PaymentError && err.code === 'GOCARDLESS_FORBIDDEN_FOR_B2C',
  );
});

test('amount invalide → refus', async () => {
  const { service } = buildService();
  await assert.rejects(
    () => service.createPayment({
      customerId: 'cust_4',
      customerType: CUSTOMER_TYPES.B2C,
      amount: 0,
    }),
    (err) => err instanceof PaymentError && err.code === 'INVALID_AMOUNT',
  );
});

test('currency != EUR → refus', async () => {
  const { service } = buildService();
  await assert.rejects(
    () => service.createPayment({
      customerId: 'cust_5',
      customerType: CUSTOMER_TYPES.B2C,
      amount: 1000,
      currency: 'USD',
    }),
    (err) => err instanceof PaymentError && err.code === 'UNSUPPORTED_CURRENCY',
  );
});

test('customerId peut être dérivé de userId', async () => {
  const { service, stored } = buildService();
  const result = await service.createPayment({
    userId: 'user_42',
    customerType: CUSTOMER_TYPES.B2C,
    amount: 490,
  });
  assert.equal(result.provider, PAYMENT_PROVIDERS.MOLLIE);
  assert.equal(stored[0].customerId, 'user_42');
  assert.equal(stored[0].userId, 'user_42');
});

test('echec adapter → PaymentError propre', async () => {
  const { service } = buildService({
    mollie: {
      provider: PAYMENT_PROVIDERS.MOLLIE,
      isConfigured: () => true,
      createPayment: async () => { throw new Error('network down'); },
      getPaymentStatus: async () => PAYMENT_STATUSES.PENDING,
    },
  });
  await assert.rejects(
    () => service.createPayment({
      customerId: 'cust_6',
      customerType: CUSTOMER_TYPES.B2C,
      amount: 1000,
    }),
    (err) => err instanceof PaymentError && err.code === 'PROVIDER_CREATE_FAILED',
  );
});
