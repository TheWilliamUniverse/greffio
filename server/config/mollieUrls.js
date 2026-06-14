const trimSlash = (value) => String(value || '').replace(/\/$/, '');

const resolveApiPublicUrl = () => trimSlash(
  process.env.API_PUBLIC_URL
  || process.env.API_BASE_URL
  || 'http://localhost:8787',
);

const resolveAppUrl = () => trimSlash(
  process.env.APP_URL || 'https://greffio.willentreprises.com',
);

/** URL webhook Mollie (serveur-à-serveur). Préférer le domaine API en production. */
export const resolveMollieWebhookUrl = () => {
  if (process.env.MOLLIE_WEBHOOK_URL) return process.env.MOLLIE_WEBHOOK_URL;
  return `${resolveApiPublicUrl()}/api/webhooks/mollie`;
};

/**
 * URL de retour utilisateur après checkout Mollie.
 * Le dashboard Mollie peut pointer vers le frontend ; un proxy nginx /api → API est requis.
 */
export const resolveMollieCallbackUrl = (searchParams = '') => {
  const base = process.env.MOLLIE_CALLBACK_URL
    || `${resolveApiPublicUrl()}/api/mollie/callback`;
  if (!searchParams) return base;
  const query = String(searchParams).replace(/^\?/, '');
  return `${base}?${query}`;
};

export const resolveMolliePaymentRedirectUrl = ({
  dossierId = null,
  resourceOrderId = null,
  invoiceId = null,
} = {}) => {
  const params = new URLSearchParams();
  if (dossierId) params.set('dossierId', dossierId);
  if (resourceOrderId) params.set('resourceOrderId', resourceOrderId);
  if (invoiceId) params.set('invoiceId', invoiceId);
  const qs = params.toString();
  return resolveMollieCallbackUrl(qs);
};

export const resolveMollieUrls = () => ({
  apiPublicUrl: resolveApiPublicUrl(),
  appUrl: resolveAppUrl(),
  webhookUrl: resolveMollieWebhookUrl(),
  callbackUrl: resolveMollieCallbackUrl(),
});
