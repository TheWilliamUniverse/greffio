const MOLLIE_API_BASE = 'https://api.mollie.com/v2';

const getMollieApiKey = () => {
  const key = process.env.MOLLIE_API_KEY || '';
  if (!key) throw new Error('MOLLIE_API_KEY_MISSING');
  return key;
};

export const isMollieConfigured = () => Boolean(process.env.MOLLIE_API_KEY);

const mollieRequest = async (method, path, body = null) => {
  const response = await fetch(`${MOLLIE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getMollieApiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.title || JSON.stringify(payload);
    throw new Error(`MOLLIE_${method}_${path}_FAILED:${detail}`);
  }
  return payload;
};

export const isMolliePaidStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'paid' || normalized === 'authorized';
};

export const isMollieFailedStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'failed' || normalized === 'expired' || normalized === 'cancelled';
};

const formatMollieAmount = (amountTotalCents, currency = 'EUR') => ({
  currency,
  value: (amountTotalCents / 100).toFixed(2),
});

/**
 * Crée un paiement Mollie (checkout hosted : carte, iDEAL, etc.).
 */
export const createMolliePayment = async ({
  amountTotalCents,
  currency = 'EUR',
  description,
  metadata = {},
  redirectUrl,
  webhookUrl,
  method = null,
}) => {
  const body = {
    amount: formatMollieAmount(amountTotalCents, currency),
    description: description || 'Paiement Greffio',
    redirectUrl,
    webhookUrl,
    metadata,
  };
  if (method) body.method = method;

  const payment = await mollieRequest('POST', '/payments', body);
  return {
    providerPaymentId: payment.id,
    status: payment.status,
    checkoutUrl: payment._links?.checkout?.href || null,
    paidAt: payment.paidAt || null,
    raw: payment,
  };
};

export const retrieveMolliePayment = async ({ providerPaymentId }) => {
  const payment = await mollieRequest('GET', `/payments/${encodeURIComponent(providerPaymentId)}`);
  return {
    providerPaymentId: payment.id,
    status: payment.status,
    paidAt: payment.paidAt || null,
    raw: payment,
  };
};
