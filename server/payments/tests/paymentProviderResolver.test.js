import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentProviderResolver } from '../PaymentProviderResolver.js';
import { CUSTOMER_TYPES, PAYMENT_PROVIDERS, PaymentError } from '../types.js';

test('B2C → CAWL', () => {
  const resolver = new PaymentProviderResolver();
  assert.equal(resolver.resolve(CUSTOMER_TYPES.B2C), PAYMENT_PROVIDERS.CAWL);
});

test('B2B → GoCardless si configuré', () => {
  const resolver = new PaymentProviderResolver({
    configuredProviders: new Set([PAYMENT_PROVIDERS.GOCARDLESS]),
  });
  assert.equal(resolver.resolve(CUSTOMER_TYPES.B2B), PAYMENT_PROVIDERS.GOCARDLESS);
});

test('B2B → Mollie si GoCardless absent et Mollie configuré', () => {
  const resolver = new PaymentProviderResolver({
    configuredProviders: new Set([PAYMENT_PROVIDERS.MOLLIE]),
  });
  assert.equal(resolver.resolve(CUSTOMER_TYPES.B2B), PAYMENT_PROVIDERS.MOLLIE);
});

test('B2B → manual_bank_transfer si GoCardless et Mollie absents', () => {
  const resolver = new PaymentProviderResolver({ configuredProviders: new Set() });
  assert.equal(resolver.resolve(CUSTOMER_TYPES.B2B), PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER);
});

test('GoCardless interdit en B2C → assertProviderAllowedForCustomerType throws', () => {
  const resolver = new PaymentProviderResolver();
  assert.throws(
    () => resolver.assertProviderAllowedForCustomerType(
      PAYMENT_PROVIDERS.GOCARDLESS,
      CUSTOMER_TYPES.B2C,
    ),
    (err) => err instanceof PaymentError && err.code === 'GOCARDLESS_FORBIDDEN_FOR_B2C',
  );
});

test('B2C avec provider non-CAWL → refus', () => {
  const resolver = new PaymentProviderResolver();
  assert.throws(
    () => resolver.assertProviderAllowedForCustomerType(
      PAYMENT_PROVIDERS.STRIPE,
      CUSTOMER_TYPES.B2C,
    ),
    (err) => err instanceof PaymentError && err.code === 'B2C_REQUIRES_CAWL',
  );
});

test('B2B avec provider CAWL → refus', () => {
  const resolver = new PaymentProviderResolver();
  assert.throws(
    () => resolver.assertProviderAllowedForCustomerType(
      PAYMENT_PROVIDERS.CAWL,
      CUSTOMER_TYPES.B2B,
    ),
    (err) => err instanceof PaymentError && err.code === 'CAWL_NOT_CONFIGURED_FOR_B2B',
  );
});

test('customerType inconnu → erreur dédiée', () => {
  const resolver = new PaymentProviderResolver();
  assert.throws(
    () => resolver.resolve('enterprise'),
    (err) => err instanceof PaymentError && err.code === 'UNSUPPORTED_CUSTOMER_TYPE',
  );
});

test('isProviderAllowedForCustomerType ne throw pas', () => {
  const resolver = new PaymentProviderResolver();
  assert.equal(
    resolver.isProviderAllowedForCustomerType(PAYMENT_PROVIDERS.GOCARDLESS, CUSTOMER_TYPES.B2C),
    false,
  );
  assert.equal(
    resolver.isProviderAllowedForCustomerType(PAYMENT_PROVIDERS.CAWL, CUSTOMER_TYPES.B2C),
    true,
  );
});
