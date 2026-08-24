import { Capacitor } from '@capacitor/core';

const toBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const PRODUCTION_API_BASE = 'https://api.greffio.willentreprises.com';

const isNativeCapacitorShell = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (_error) {
    return false;
  }
};

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (isNativeCapacitorShell()) return PRODUCTION_API_BASE;
    if (['greffio.willentreprises.com', 'www.greffio.willentreprises.com', 'clareffio.willentreprises.com', 'www.clareffio.willentreprises.com'].includes(hostname)) {
      return PRODUCTION_API_BASE;
    }
    return origin;
  }
  return 'http://localhost:8787';
};

export const runtimeConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'Clareffio',
  appUrl: import.meta.env.VITE_APP_URL || 'https://clareffio.willentreprises.com',
  apiBaseUrl: resolveApiBaseUrl(),
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'contact@willentreprises.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '04 11 81 86 70',
  salesEmail: import.meta.env.VITE_SALES_EMAIL || 'contact@willentreprises.com',
  bookingUrl: import.meta.env.VITE_BOOKING_URL || 'https://clareffio.willentreprises.com/contact',
  legalCompanyName: import.meta.env.VITE_LEGAL_COMPANY_NAME || 'WILLIAM ESTABLISHMENTS',
  legalRcs: import.meta.env.VITE_LEGAL_RCS || 'RCS Nice 102 230 414',
  legalSiret: import.meta.env.VITE_LEGAL_SIRET || '10223041400017',
  legalVat: import.meta.env.VITE_LEGAL_VAT || 'FR49102230414',
  showDemoDisclaimer: toBool(import.meta.env.VITE_SHOW_DEMO_DISCLAIMER, false),
  playStoreUrl:
    import.meta.env.VITE_PLAY_STORE_URL
    || 'https://play.google.com/store/apps/details?id=com.greffio.app&pcampaignid=web_share',
};
