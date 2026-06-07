import { lazy, Suspense } from 'react';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { RouteSuspenseFallback } from '@/components/system/RouteSuspenseFallback.jsx';
import { withSuspense, LazyStatutesPage } from '@/routes/lazyPages.jsx';

const MobileStatutesPage = lazy(() => import('@/pages/StatutesPage.jsx').then((module) => ({
  default: module.StatutesPage,
})));

export const StatutsEntry = () => {
  if (isCapacitorNative() || isMobileBrowserViewport()) {
    return (
      <Suspense fallback={<RouteSuspenseFallback label="Chargement statuts…" />}>
        <MobileStatutesPage presentation="mobile" />
      </Suspense>
    );
  }
  return withSuspense(LazyStatutesPage, 'Chargement statuts…');
};
