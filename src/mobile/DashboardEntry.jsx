import {
  LazyDashboardPage,
  LazyMobileHomePage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DashboardEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? withSuspense(LazyMobileHomePage, 'Chargement de l’accueil…')
    : withSuspense(LazyDashboardPage, 'Chargement du cockpit…')
);
