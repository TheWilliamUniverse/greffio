import {
  LazyDossierDetailPage,
  LazyMobileDossierDetailPage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DossierDetailEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? withSuspense(LazyMobileDossierDetailPage, 'Chargement du dossier…')
    : withSuspense(LazyDossierDetailPage, 'Chargement du dossier…')
);
