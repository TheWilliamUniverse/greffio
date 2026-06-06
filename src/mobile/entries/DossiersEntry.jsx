import { DossiersPage } from '@/pages/DossiersPage.jsx';
import { MobileDossiersPage } from '@/mobile/MobileDossiersPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DossiersEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileDossiersPage />
    : <DossiersPage />
);
