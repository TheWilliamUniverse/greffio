import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const assertOk = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  throw error;
};

const authedFetch = (path, options = {}) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

/**
 * Endpoint legacy — flow dossiers Greffio. Continue d'utiliser GoCardless
 * pour les dossiers B2B et refuse explicitement les paiements B2C.
 *
 * Pour les paiements B2C, boutique, services e-commerce, utiliser
 * {@link initiatePayment}.
 */
export const createPayment = async ({ dossierId, offerCode, userId, customerType }) => {
  const response = await authedFetch('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ dossierId, offerCode, userId, customerType }),
  });
  return assertOk(response);
};

/**
 * Endpoint multi-prestataires.
 *
 * Le provider est choisi côté serveur via PaymentProviderResolver :
 *   - customerType === 'b2c' → CAWL
 *   - customerType === 'b2b' → GoCardless (si configuré) sinon virement manuel
 *
 * Le frontend ne doit jamais choisir le provider, ni indiquer "GoCardless"
 * pour un client particulier.
 */
export const initiatePayment = async ({
  customerType,
  amount,
  currency = 'EUR',
  orderId,
  invoiceId,
  dossierId,
  description,
  metadata,
  returnUrl,
  cancelUrl,
}) => {
  const response = await authedFetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      customerType,
      amount,
      currency,
      orderId,
      invoiceId,
      dossierId,
      description,
      metadata,
      returnUrl,
      cancelUrl,
    }),
  });
  return assertOk(response);
};

export const getPayment = async (paymentId) => {
  const response = await authedFetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
  });
  return assertOk(response);
};

export const refundPayment = async (paymentId, amount) => {
  const response = await authedFetch(`/api/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return assertOk(response);
};

export const getProvidersStatus = async () => {
  const response = await authedFetch('/api/payments/providers/status', { method: 'GET' });
  return assertOk(response);
};
