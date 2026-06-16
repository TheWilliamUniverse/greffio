import {
  LazyMobilePaymentPage,
  LazyPaymentPage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const PaymentEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? withSuspense(LazyMobilePaymentPage, 'Chargement du paiement…')
    : withSuspense(LazyPaymentPage, 'Chargement du paiement…')
);
