const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const runtimeConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'Greffio',
  appUrl: import.meta.env.VITE_APP_URL || 'https://greffio.willentreprises.com',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8787'),
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'contact@willentreprises.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '04 11 81 86 70',
  salesEmail: import.meta.env.VITE_SALES_EMAIL || 'contact@willentreprises.com',
  bookingUrl: import.meta.env.VITE_BOOKING_URL || 'https://greffio.willentreprises.com/contact',
  legalCompanyName: import.meta.env.VITE_LEGAL_COMPANY_NAME || 'WILLIAM ESTABLISHMENTS',
  legalRcs: import.meta.env.VITE_LEGAL_RCS || 'RCS Nice 102 230 414',
  legalSiret: import.meta.env.VITE_LEGAL_SIRET || '10223041400017',
  legalVat: import.meta.env.VITE_LEGAL_VAT || 'FR49102230414',
  showDemoDisclaimer: toBool(import.meta.env.VITE_SHOW_DEMO_DISCLAIMER, false),
  playStoreUrl:
    import.meta.env.VITE_PLAY_STORE_URL
    || 'https://play.google.com/store/apps/details?id=com.greffio.app&pcampaignid=web_share',
};
