import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentProviderResolver } from '../PaymentProviderResolver.js';
import { CUSTOMER_TYPES, PAYMENT_FLOWS, PAYMENT_PROVIDERS, PaymentError } from '../types.js';

const mollieConfigured = () => new PaymentProviderResolver({
  configuredProviders: new Set([PAYMENT_PROVIDERS.MOLLIE]),
});

test('B2C → Mollie si configuré', () => {
  const resolver = mollieConfigured();
  assert.equal(resolver.resolve(CUSTOMER_TYPES.B2C), PAYMENT_PROVIDERS.MOLLIE);
});

test('B2C flux carte → Mollie', () => {
  const resolver = mollieConfigured();
  assert.equal(
    resolver.resolveForFlow(PAYMENT_FLOWS.B2C_CARD, CUSTOMER_TYPES.B2C),
    PAYMENT_PROVIDERS.MOLLIE,
  );
});

test('B2C flux ressource → Mollie', () => {
  const resolver = mollieConfigured();
  assert.equal(
    resolver.resolveForFlow(PAYMENT_FLOWS.RESOURCE, CUSTOMER_TYPES.B2C),
    PAYMENT_PROVIDERS.MOLLIE,
  );
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

test('Facture → Mollie si configuré', () => {
  const resolver = mollieConfigured();
  assert.equal(
    resolver.resolveForFlow(PAYMENT_FLOWS.INVOICE, CUSTOMER_TYPES.B2B),
    PAYMENT_PROVIDERS.MOLLIE,
  );
});

test('GoCardless interdit en B2C → assertProviderAllowedForCustomerType throws', () => {
  const resolver = mollieConfigured();
  assert.throws(
    () => resolver.assertProviderAllowedForCustomerType(
      PAYMENT_PROVIDERS.GOCARDLESS,
      CUSTOMER_TYPES.B2C,
    ),
    (err) => err instanceof PaymentError && err.code === 'GOCARDLESS_FORBIDDEN_FOR_B2C',
  );
});

test('B2C avec provider non-Mollie → refus', () => {
  const resolver = mollieConfigured();
  assert.throws(
    () => resolver.assertProviderAllowedForCustomerType(
      PAYMENT_PROVIDERS.STRIPE,
      CUSTOMER_TYPES.B2C,
    ),
    (err) => err instanceof PaymentError && err.code === 'B2C_REQUIRES_MOLLIE',
  );
});

test('customerType inconnu → erreur dédiée', () => {
  const resolver = mollieConfigured();
  assert.throws(
    () => resolver.resolve('enterprise'),
    (err) => err instanceof PaymentError && err.code === 'UNSUPPORTED_CUSTOMER_TYPE',
  );
});

test('describeTerminalConfig B2C → carte Mollie, pas Google Pay', () => {
  const resolver = mollieConfigured();
  const config = resolver.describeTerminalConfig(CUSTOMER_TYPES.B2C);
  assert.equal(config.methods.card, true);
  assert.equal(config.methods.mollie, true);
  assert.equal(config.methods.googlePay, false);
  assert.equal(config.defaultProvider, PAYMENT_PROVIDERS.MOLLIE);
});

test('isProviderAllowedForCustomerType ne throw pas', () => {
  const resolver = mollieConfigured();
  assert.equal(
    resolver.isProviderAllowedForCustomerType(PAYMENT_PROVIDERS.GOCARDLESS, CUSTOMER_TYPES.B2C),
    false,
  );
  assert.equal(
    resolver.isProviderAllowedForCustomerType(PAYMENT_PROVIDERS.MOLLIE, CUSTOMER_TYPES.B2C),
    true,
  );
});
