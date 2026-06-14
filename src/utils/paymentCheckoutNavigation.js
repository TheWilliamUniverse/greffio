import { App as CapApp } from '@capacitor/app';
import { isCapacitorNative } from '@/utils/platform.js';

export const PAYMENT_RETURN_STORAGE_KEY = 'greffio_payment_return';

/** Mémorise la route courante avant redirection Mollie (retour WebView si besoin). */
export const storePaymentReturnPath = () => {
  try {
    window.sessionStorage.setItem(
      PAYMENT_RETURN_STORAGE_KEY,
      window.location.pathname + window.location.search,
    );
  } catch (_error) {
    // ignore quota / private mode
  }
};

/**
 * Ouvre l’URL checkout Mollie.
 * Sur app native Capacitor : navigateur système (Custom Tabs) pour éviter les blocages WebView.
 * Le retour utilisateur passe par /api/mollie/callback → /paiement/verification (app link HTTPS).
 */
export const openPaymentCheckoutUrl = async (checkoutUrl) => {
  const url = String(checkoutUrl || '').trim();
  if (!url) throw new Error('CHECKOUT_URL_MISSING');

  storePaymentReturnPath();

  if (isCapacitorNative() && CapApp?.openUrl) {
    try {
      await CapApp.openUrl({ url });
      return 'external';
    } catch (_error) {
      // fallback WebView ci-dessous
    }
  }

  window.location.assign(url);
  return 'navigate';
};
