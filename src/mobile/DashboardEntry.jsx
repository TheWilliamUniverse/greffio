import { DashboardPage } from '@/pages/DashboardPage.jsx';
import { MobileHomePage } from '@/mobile/MobileHomePage.jsx';
import { isCapacitorNative } from '@/utils/platform.js';

export const DashboardEntry = () => (isCapacitorNative() ? <MobileHomePage /> : <DashboardPage />);
