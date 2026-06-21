const MOLLIE_API_BASE = 'https://api.mollie.com/v2';
const DEFAULT_MOLLIE_PROFILE_ID = 'pfl_Q6vFPJDb7P';

const getMollieApiKey = () => {
  const key = process.env.MOLLIE_API_KEY || '';
  if (!key) throw new Error('MOLLIE_API_KEY_MISSING');
  return key;
};

export const isMollieConfigured = () => Boolean(process.env.MOLLIE_API_KEY);

/** Profile ID public (Mollie Components) – jamais confondre avec la clé API. */
export const getMollieProfileId = () => (
  process.env.MOLLIE_PROFILE_ID || DEFAULT_MOLLIE_PROFILE_ID
).trim();

export const isMollieTestMode = () => {
  const key = process.env.MOLLIE_API_KEY || '';
  return key.startsWith('test_') || process.env.MOLLIE_TESTMODE === 'true';
};

/** Méthodes Mollie autorisées en checkout Greffio intégré (embedded ou hosted). */
export const MOLLIE_EMBEDDED_METHODS = Object.freeze(['creditcard']);
export const MOLLIE_HOSTED_METHODS = Object.freeze([
  'applepay',
  'banktransfer',
  'paypal',
  'ideal',
  'bancontact',
  'eps',
  'klarnapaylater',
  'klarnapaynow',
  'klarnasliceit',
]);

export const normalizeMollieMethod = (method) => {
  const raw = String(method || '').trim().toLowerCase();
  if (!raw || raw === 'card') return 'creditcard';
  return raw;
};

export const resolveMollieCheckoutMode = (method, cardToken) => {
  const normalized = normalizeMollieMethod(method);
  if (normalized === 'creditcard' && cardToken) return 'embedded_3ds';
  if (MOLLIE_EMBEDDED_METHODS.includes(normalized)) return 'embedded';
  return 'hosted';
};

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

export const isMollieRefundedStatus = (status) => String(status || '').toLowerCase() === 'refunded';

const parseMollieMoney = (money) => {
  const value = Number.parseFloat(String(money?.value ?? '0').replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
};

/** Déduit remboursement total/partiel et remboursement en cours depuis la réponse Mollie. */
export const resolveMollieRefundState = (payment) => {
  const raw = payment?.raw || payment || {};
  const status = String(raw.status || payment?.status || '').toLowerCase();
  const amount = parseMollieMoney(raw.amount);
  const refunded = parseMollieMoney(raw.amountRefunded);
  const modifiedAt = raw.modifiedAt || raw.settlementAt || null;

  if (isMollieRefundedStatus(status) || (refunded > 0 && amount > 0 && refunded >= amount)) {
    return {
      internalStatus: 'refunded',
      refundedAt: modifiedAt || new Date().toISOString(),
      refundPending: false,
    };
  }

  if (refunded > 0 && amount > 0 && refunded < amount) {
    return {
      internalStatus: 'partially_refunded',
      refundedAt: modifiedAt || new Date().toISOString(),
      refundPending: false,
    };
  }

  return {
    internalStatus: null,
    refundedAt: null,
    refundPending: false,
  };
};

const MOLLIE_PENDING_REFUND_STATUSES = new Set(['queued', 'pending', 'processing']);

export const hasMolliePendingRefund = (refunds = []) => (
  refunds.some((refund) => MOLLIE_PENDING_REFUND_STATUSES.has(String(refund?.status || '').toLowerCase()))
);

export const listMolliePaymentRefunds = async ({ providerPaymentId }) => {
  const payload = await mollieRequest('GET', `/payments/${encodeURIComponent(providerPaymentId)}/refunds`);
  return Array.isArray(payload?._embedded?.refunds) ? payload._embedded.refunds : [];
};

const formatMollieAmount = (amountTotalCents, currency = 'EUR') => ({
  currency,
  value: (amountTotalCents / 100).toFixed(2),
});

/**
 * Liste les méthodes de paiement actives (Methods API).
 */
export const listMollieMethods = async ({
  amountTotalCents,
  currency = 'EUR',
  locale = 'fr_FR',
  includeWallets = 'applepay,googlepay',
} = {}) => {
  const params = new URLSearchParams();
  if (Number.isFinite(amountTotalCents) && amountTotalCents > 0) {
    params.set('amount[currency]', currency);
    params.set('amount[value]', (amountTotalCents / 100).toFixed(2));
  }
  if (locale) params.set('locale', locale);
  if (includeWallets) params.set('includeWallets', includeWallets);

  const query = params.toString();
  const path = query ? `/methods?${query}` : '/methods';
  const payload = await mollieRequest('GET', path);
  const methods = Array.isArray(payload?._embedded?.methods) ? payload._embedded.methods : [];

  return methods.map((item) => ({
    id: item.id,
    description: item.description,
    minimumAmount: item.minimumAmount || null,
    maximumAmount: item.maximumAmount || null,
    image: item.image || null,
    pricing: item.pricing || null,
    checkoutMode: MOLLIE_EMBEDDED_METHODS.includes(item.id) ? 'embedded' : 'hosted',
  }));
};

/**
 * Crée un paiement Mollie (Components carte, hosted Apple Pay / virement, etc.).
 */
export const createMolliePayment = async ({
  amountTotalCents,
  currency = 'EUR',
  description,
  metadata = {},
  redirectUrl,
  webhookUrl,
  method = null,
  cardToken = null,
}) => {
  const body = {
    amount: formatMollieAmount(amountTotalCents, currency),
    description: description || 'Paiement Greffio',
    redirectUrl,
    webhookUrl,
    metadata,
  };
  const normalizedMethod = method ? normalizeMollieMethod(method) : null;
  if (normalizedMethod) body.method = normalizedMethod;
  if (cardToken) body.cardToken = cardToken;

  const payment = await mollieRequest('POST', '/payments', body);
  return {
    providerPaymentId: payment.id,
    status: payment.status,
    checkoutUrl: payment._links?.checkout?.href || null,
    checkoutMode: resolveMollieCheckoutMode(normalizedMethod, cardToken),
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
