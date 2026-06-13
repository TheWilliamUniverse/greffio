/**
 * Routage fournisseur Kbis/RNE – file manuelle OPS tant que l’API n’est pas branchée.
 */

const PROVIDER_BY_SERVICE = Object.freeze({
  'kbis-extract': 'provider_kbis',
  'rne-extract': 'provider_rne',
  'company-verify': 'manual_ops',
  'company-search': 'manual_ops',
});

export const resolveFulfillmentMode = (serviceId) => (
  PROVIDER_BY_SERVICE[serviceId] || 'manual_ops'
);

export const isAutomatedProvider = (fulfillmentMode) => (
  fulfillmentMode === 'provider_kbis' || fulfillmentMode === 'provider_rne'
);

/**
 * Stub : en production réelle, appeler l’API greffe/partenaire.
 * Pour l’instant : passage en processing + référence interne.
 */
export const enqueueProviderFulfillment = async ({ order, updateResourceOrder }) => {
  if (!isAutomatedProvider(order.fulfillmentMode)) {
    return { queued: false, reason: 'manual_ops' };
  }

  const providerRef = `GREFFIO-${order.fulfillmentMode.toUpperCase()}-${Date.now()}`;
  await updateResourceOrder(order.id, {
    status: 'processing',
    providerRef,
    metadata: {
      ...(order.metadata || {}),
      providerQueue: order.fulfillmentMode,
      providerStatus: 'queued_manual_fallback',
      message: 'Fournisseur non connecté – traitement OPS prioritaire.',
    },
  });

  return {
    queued: true,
    providerRef,
    mode: 'manual_fallback',
  };
};
