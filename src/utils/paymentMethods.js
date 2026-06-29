import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

/** Méthodes qui imposent une connexion à l'espace bancaire web (hors 3-D Secure carte). */
const B2C_BANK_LOGIN_METHODS = new Set([
  'banktransfer',
  'directdebit',
  'belfius',
  'kbc',
]);

/** Méthodes étrangères peu pertinentes pour la boutique FR B2C. */
const B2C_REGIONAL_EXCLUDED = new Set([
  'ideal',
  'bancontact',
  'eps',
  'giropay',
]);

export const isIosBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isAndroidBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const filterConsumerCheckoutMethods = (methods = []) => (
  (Array.isArray(methods) ? methods : []).filter((method) => {
    const id = String(method?.id || '').toLowerCase();
    if (!id) return false;
    if (B2C_BANK_LOGIN_METHODS.has(id)) return false;
    if (B2C_REGIONAL_EXCLUDED.has(id)) return false;
    return true;
  })
);

const methodPriority = (method, { mobile, ios, android }) => {
  const id = String(method?.id || '').toLowerCase();
  if (mobile && ios && id === 'applepay') return 0;
  if (mobile && android && id === 'googlepay') return 1;
  if (id === 'applepay') return 2;
  if (id === 'googlepay') return 3;
  if (id === 'creditcard') return 4;
  return 10;
};

export const sortConsumerCheckoutMethods = (methods = []) => {
  const mobile = isCapacitorNative() || isMobileBrowserViewport();
  const ios = isIosBrowser();
  const android = isAndroidBrowser();
  return [...filterConsumerCheckoutMethods(methods)].sort(
    (a, b) => methodPriority(a, { mobile, ios, android }) - methodPriority(b, { mobile, ios, android }),
  );
};

export const pickDefaultConsumerPaymentMethod = (methods = []) => {
  const sorted = sortConsumerCheckoutMethods(methods);
  return sorted[0]?.id || 'creditcard';
};

export const resolvePaymentMethodHint = (methodId) => {
  const id = String(methodId || '').toLowerCase();
  if (id === 'applepay' || id === 'googlepay') {
    return 'Paiement rapide et sécurisé.';
  }
  if (id === 'creditcard') {
    return 'Carte Visa, Mastercard ou CB.';
  }
  if (id === 'paypal') {
    return 'Paiement via PayPal.';
  }
  if (id === 'banktransfer') {
    return 'Virement bancaire.';
  }
  return 'Paiement sécurisé.';
};

export const shouldRecommendWalletOnMobile = (methods = []) => {
  const ids = new Set(methods.map((item) => String(item?.id || '').toLowerCase()));
  const mobile = isCapacitorNative() || isMobileBrowserViewport();
  if (!mobile) return null;
  if (isIosBrowser() && ids.has('applepay')) return 'applepay';
  if (isAndroidBrowser() && ids.has('googlepay')) return 'googlepay';
  if (ids.has('applepay')) return 'applepay';
  return null;
};
