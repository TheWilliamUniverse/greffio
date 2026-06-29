import { App as CapApp } from '@capacitor/app';
import { isCapacitorNative } from '@/utils/platform.js';

export const PAYMENT_RETURN_STORAGE_KEY = 'greffio_payment_return';
export const EXTERNAL_CHECKOUT_ACTIVE_KEY = 'greffio_external_checkout_active';

/** Mémorise la route courante avant redirection Mollie (retour WebView si besoin). */
export const storePaymentReturnPath = () => {
  try {
    window.sessionStorage.setItem(
      PAYMENT_RETURN_STORAGE_KEY,
      window.location.pathname + window.location.search,
    );
    window.sessionStorage.setItem(EXTERNAL_CHECKOUT_ACTIVE_KEY, '1');
  } catch (_error) {
    // ignore quota / private mode
  }
};

export const clearExternalCheckoutFlag = () => {
  try {
    window.sessionStorage.removeItem(EXTERNAL_CHECKOUT_ACTIVE_KEY);
  } catch (_error) {
    // ignore
  }
};

export const isExternalCheckoutActive = () => {
  try {
    return window.sessionStorage.getItem(EXTERNAL_CHECKOUT_ACTIVE_KEY) === '1';
  } catch (_error) {
    return false;
  }
};

/**
 * Ouvre une URL checkout Mollie dans le navigateur système (Custom Tabs / Safari).
 */
export const openExternalCheckoutUrl = async (checkoutUrl) => {
  const url = String(checkoutUrl || '').trim();
  if (!url) throw new Error('CHECKOUT_URL_MISSING');

  if (isCapacitorNative() && CapApp?.openUrl) {
    try {
      await CapApp.openUrl({ url });
      return 'external';
    } catch (_error) {
      // fallback navigation ci-dessous
    }
  }

  window.location.assign(url);
  return 'navigate';
};

/**
 * Ouvre l’URL checkout Mollie.
 * - Apple Pay / Google Pay : redirection directe vers la page wallet Mollie.
 * - Carte (3-D Secure) : page intermédiaire Greffio puis validation bancaire app-to-app si possible.
 */
export const openPaymentCheckoutUrl = async (checkoutUrl, { checkoutMode } = {}) => {
  const url = String(checkoutUrl || '').trim();
  if (!url) throw new Error('CHECKOUT_URL_MISSING');

  storePaymentReturnPath();

  if (String(checkoutMode || '').toLowerCase() === 'embedded_3ds') {
    const target = encodeURIComponent(url);
    window.location.assign(`/paiement/authentification?target=${target}`);
    return 'auth_interstitial';
  }

  return openExternalCheckoutUrl(url);
};
