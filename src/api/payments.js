import { apiGet, apiPost } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';

/**
 * Endpoint legacy – flow dossiers B2B Greffio (GoCardless / virement).
 */
export const createPayment = async ({ dossierId, offerCode, userId, customerType }) => apiPost('/api/payments/create', {
  dossierId,
  offerCode,
  userId,
  customerType,
});

/**
 * Endpoint multi-prestataires (CAWL B2C / GoCardless B2B / virement manuel).
 */
export const initiatePayment = async ({
  customerType,
  amount,
  currency = 'EUR',
  orderId,
  invoiceId,
  dossierId,
  offerCode,
  description,
  metadata,
  returnUrl,
  cancelUrl,
}) => apiPost('/api/payments', {
  customerType,
  amount,
  currency,
  orderId,
  invoiceId,
  dossierId,
  offerCode,
  description,
  metadata,
  returnUrl,
  cancelUrl,
});

export const checkoutDossierPayment = async ({ dossierId, offerCode, customerType }) => {
  const normalized = String(customerType || '').toLowerCase();
  if (normalized === 'b2c') {
    return initiatePayment({
      dossierId,
      offerCode,
      customerType: 'b2c',
      returnUrl: `${runtimeConfig.appUrl}/paiement/verification?dossierId=${encodeURIComponent(dossierId)}`,
      cancelUrl: `${runtimeConfig.appUrl}/paiement?offer=${encodeURIComponent(offerCode || 'Dossier Standard')}`,
    });
  }
  return createPayment({ dossierId, offerCode, customerType });
};

export const getPayment = async (paymentId) => apiGet(`/api/payments/${encodeURIComponent(paymentId)}`);

export const refundPayment = async (paymentId, amount) => apiPost(`/api/payments/${encodeURIComponent(paymentId)}/refund`, { amount });

export const getProvidersStatus = async () => apiGet('/api/payments/providers/status');

export const getGooglePayConfig = async () => apiGet('/api/payments/google-pay/config');

export const processGooglePayPayment = async ({
  dossierId,
  resourceOrderId,
  offerCode,
  paymentData,
}) => apiPost('/api/payments/google-pay', {
  dossierId,
  resourceOrderId,
  offerCode,
  paymentData,
});
