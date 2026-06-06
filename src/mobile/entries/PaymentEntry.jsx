import { PaymentPage } from '@/pages/PaymentPage.jsx';
import { MobilePaymentPage } from '@/mobile/MobilePaymentPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const PaymentEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobilePaymentPage />
    : <PaymentPage />
);
