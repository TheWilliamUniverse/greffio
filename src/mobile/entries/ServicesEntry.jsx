import { ServicesPage } from '@/pages/ServicesPage.jsx';
import { MobileServicesPage } from '@/mobile/MobileServicesPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const ServicesEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileServicesPage />
    : <ServicesPage />
);
