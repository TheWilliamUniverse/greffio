import {
  PaymentService,
  buildProviderRegistry,
  getConfiguredProviders,
  PaymentProviderResolver,
} from './index.js';

let cachedService = null;

/**
 * Singleton de PaymentService – initialisé paresseusement avec les
 * dépendances réelles (store SQL).
 */
export const getPaymentService = ({
  upsertPayment,
  getPaymentByProviderId,
  getPaymentById,
} = {}) => {
  if (cachedService) return cachedService;
  if (!upsertPayment) {
    throw new Error('getPaymentService: dependencies missing');
  }
  const providers = buildProviderRegistry();
  const resolver = new PaymentProviderResolver({
    configuredProviders: getConfiguredProviders(providers),
  });
  cachedService = new PaymentService({
    upsertPayment,
    getPaymentByProviderId,
    getPaymentById,
    providers,
    resolver,
  });
  return cachedService;
};

export const resetPaymentService = () => {
  cachedService = null;
};
