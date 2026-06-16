import {
  LazyDossiersPage,
  LazyMobileDossiersPage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const DossiersEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? withSuspense(LazyMobileDossiersPage, 'Chargement des dossiers…')
    : withSuspense(LazyDossiersPage, 'Chargement des dossiers…')
);
