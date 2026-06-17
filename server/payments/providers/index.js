import { GoCardlessAdapter } from './GoCardlessAdapter.js';
import { MolliePaymentAdapter } from './MolliePaymentAdapter.js';
import { ManualBankTransferAdapter } from './ManualBankTransferAdapter.js';
import { QontoReconciliationAdapter } from './QontoReconciliationAdapter.js';
import {
  PayPlugStubAdapter,
  StripeStubAdapter,
} from './StubAdapters.js';
import { PAYMENT_PROVIDERS } from '../types.js';

/**
 * Registre des adapters. L'ordre de déclaration sert aussi à figer la liste
 * proposée à l'UI ops.
 */
export const buildProviderRegistry = (overrides = {}) => ({
  [PAYMENT_PROVIDERS.GOCARDLESS]: overrides.gocardless || new GoCardlessAdapter(),
  [PAYMENT_PROVIDERS.MOLLIE]: overrides.mollie || new MolliePaymentAdapter(),
  [PAYMENT_PROVIDERS.QONTO]: overrides.qonto || new QontoReconciliationAdapter(),
  [PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER]: overrides.manual_bank_transfer || new ManualBankTransferAdapter(),
  [PAYMENT_PROVIDERS.STRIPE]: overrides.stripe || new StripeStubAdapter(),
  [PAYMENT_PROVIDERS.PAYPLUG]: overrides.payplug || new PayPlugStubAdapter(),
});

export const getConfiguredProviders = (registry) => {
  const set = new Set();
  for (const [name, adapter] of Object.entries(registry)) {
    if (adapter?.isConfigured?.()) set.add(name);
  }
  return set;
};

export {
  GoCardlessAdapter,
  MolliePaymentAdapter,
  ManualBankTransferAdapter,
  QontoReconciliationAdapter,
  PayPlugStubAdapter,
  StripeStubAdapter,
};
