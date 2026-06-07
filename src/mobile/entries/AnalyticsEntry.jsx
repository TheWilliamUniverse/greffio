import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { MobileAnalyticsPage } from '@/mobile/MobileAnalyticsPage.jsx';
import { withSuspense, LazyAnalyticsPage } from '@/routes/lazyPages.jsx';

export const AnalyticsEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileAnalyticsPage />
    : withSuspense(LazyAnalyticsPage, 'Chargement analytics…')
);
