const toBool = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const environment = import.meta.env.VITE_GOOGLE_PAY_ENVIRONMENT === 'PRODUCTION' ? 'PRODUCTION' : 'TEST';

export const googlePayConfig = {
  // En attendant CAWL : le mode TEST Google Pay fonctionne sans compte marchand
  // (gateway "example"), donc on l'active par défaut hors PRODUCTION.
  enabled: toBool(import.meta.env.VITE_GOOGLE_PAY_ENABLED)
    || Boolean(import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID)
    || environment === 'TEST',
  environment,
  merchantId: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || '',
  merchantName: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_NAME || 'Greffio',
  countryCode: 'FR',
  currencyCode: 'EUR',
};

export const isGooglePayEnabled = () => googlePayConfig.enabled;

/** Exposé aux clients uniquement si Google Pay est réellement en production. */
export const isGooglePayLiveForUsers = (config) => (
  config?.environment === 'PRODUCTION'
  && Boolean(config?.readyForPayment ?? config?.enabled)
);
