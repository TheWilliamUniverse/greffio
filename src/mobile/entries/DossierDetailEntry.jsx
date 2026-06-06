import { DossierDetailPage } from '@/pages/DossierDetailPage.jsx';
import { MobileDossierDetailPage } from '@/mobile/MobileDossierDetailPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DossierDetailEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileDossierDetailPage />
    : <DossierDetailPage />
);
