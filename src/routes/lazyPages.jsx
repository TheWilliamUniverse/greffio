import React, { lazy } from 'react';
import { RouteSuspenseFallback } from '@/components/system/RouteSuspenseFallback.jsx';

export const LazyAnalyticsPage = lazy(() => import('@/pages/AnalyticsPage.jsx').then((m) => ({ default: m.AnalyticsPage })));
export const LazyStatutesPage = lazy(() => import('@/pages/StatutesPage.jsx').then((m) => ({ default: m.StatutesPage })));
export const LazyOpsShell = lazy(() => import('@/components/ops/OpsShell.jsx').then((m) => ({ default: m.OpsShell })));
export const LazyOpsCockpitPage = lazy(() => import('@/pages/ops/OpsCockpitPage.jsx').then((m) => ({ default: m.OpsCockpitPage })));
export const LazyOpsDossiersPage = lazy(() => import('@/pages/ops/OpsDossiersPage.jsx').then((m) => ({ default: m.OpsDossiersPage })));
export const LazyOpsDossierDetailPage = lazy(() => import('@/pages/ops/OpsDossierDetailPage.jsx').then((m) => ({ default: m.OpsDossierDetailPage })));
export const LazyOpsEquipePage = lazy(() => import('@/pages/ops/OpsEquipePage.jsx').then((m) => ({ default: m.OpsEquipePage })));
export const LazyOpsDashboardPage = lazy(() => import('@/pages/OpsDashboardPage.jsx').then((m) => ({ default: m.OpsDashboardPage })));
export const LazyOpsLookupObservabilityPage = lazy(() => import('@/pages/OpsLookupObservabilityPage.jsx').then((m) => ({ default: m.OpsLookupObservabilityPage })));
export const LazyChatIAPage = lazy(() => import('@/pages/ChatIAPage.jsx').then((m) => ({ default: m.ChatIAPage })));
export const LazyNonConvictionDeclarationPage = lazy(() => import('@/pages/NonConvictionDeclarationPage.jsx').then((m) => ({ default: m.NonConvictionDeclarationPage })));

export const withSuspense = (Component, label) => (
  <React.Suspense fallback={<RouteSuspenseFallback label={label} />}>
    <Component />
  </React.Suspense>
);
