import { StatutesPage } from '@/pages/StatutesPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { withSuspense, LazyStatutesPage } from '@/routes/lazyPages.jsx';

export const StatutsEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <StatutesPage presentation="mobile" />
    : withSuspense(LazyStatutesPage, 'Chargement statuts…')
);
