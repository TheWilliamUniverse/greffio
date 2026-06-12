const toBool = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

export const googlePayConfig = {
  enabled: toBool(import.meta.env.VITE_GOOGLE_PAY_ENABLED) || Boolean(import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID),
  environment: import.meta.env.VITE_GOOGLE_PAY_ENVIRONMENT === 'PRODUCTION' ? 'PRODUCTION' : 'TEST',
  merchantId: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || '',
  merchantName: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_NAME || 'Greffio',
  countryCode: 'FR',
  currencyCode: 'EUR',
};

export const isGooglePayEnabled = () => googlePayConfig.enabled;
