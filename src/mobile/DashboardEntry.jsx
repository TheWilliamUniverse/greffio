import { DashboardPage } from '@/pages/DashboardPage.jsx';
import { MobileHomePage } from '@/mobile/MobileHomePage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DashboardEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileHomePage />
    : <DashboardPage />
);
