import { PricingPage } from '@/pages/PricingPage.jsx';
import { MobilePricingPage } from '@/mobile/MobilePricingPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const PricingEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobilePricingPage />
    : <PricingPage />
);
