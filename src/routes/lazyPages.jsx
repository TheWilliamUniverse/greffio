import React, { lazy } from 'react';
import { RouteSuspenseFallback } from '@/components/system/RouteSuspenseFallback.jsx';

export const LazyAnalyticsPage = lazy(() => import('@/pages/AnalyticsPage.jsx').then((m) => ({ default: m.AnalyticsPage })));
export const LazyStatutesPage = lazy(() => import('@/pages/StatutesPage.jsx').then((m) => ({ default: m.StatutesPage })));
export const LazyOpsShell = lazy(() => import('@/components/ops/OpsShell.jsx').then((m) => ({ default: m.OpsShell })));
export const LazyOpsCockpitHome = lazy(() => import('@/pages/ops/OpsCockpitHome.jsx').then((m) => ({ default: m.OpsCockpitHome })));
export const LazyOpsCockpitPage = lazy(() => import('@/pages/ops/OpsCockpitPage.jsx').then((m) => ({ default: m.OpsCockpitPage })));
export const LazySesameGateway = lazy(() => import('@/components/auth/SesameGateway.jsx').then((m) => ({ default: m.SesameGateway })));
export const LazyOpsDossiersPage = lazy(() => import('@/pages/ops/OpsDossiersPage.jsx').then((m) => ({ default: m.OpsDossiersPage })));
export const LazyOpsDossierDetailPage = lazy(() => import('@/pages/ops/OpsDossierDetailPage.jsx').then((m) => ({ default: m.OpsDossierDetailPage })));
export const LazyOpsEquipePage = lazy(() => import('@/pages/ops/OpsEquipePage.jsx').then((m) => ({ default: m.OpsEquipePage })));
export const LazyOpsDocumentsPage = lazy(() => import('@/pages/ops/OpsDocumentsPage.jsx').then((m) => ({ default: m.OpsDocumentsPage })));
export const LazyOpsRelancesPage = lazy(() => import('@/pages/ops/OpsRelancesPage.jsx').then((m) => ({ default: m.OpsRelancesPage })));
export const LazyOpsDepotPage = lazy(() => import('@/pages/ops/OpsDepotPage.jsx').then((m) => ({ default: m.OpsDepotPage })));
export const LazyOpsQualitePage = lazy(() => import('@/pages/ops/OpsQualitePage.jsx').then((m) => ({ default: m.OpsQualitePage })));
export const LazyOpsAuditPage = lazy(() => import('@/pages/ops/OpsAuditPage.jsx').then((m) => ({ default: m.OpsAuditPage })));
export const LazyOpsInvoicesPage = lazy(() => import('@/pages/ops/OpsInvoicesPage.jsx').then((m) => ({ default: m.OpsInvoicesPage })));
export const LazyOpsIntegrationsPage = lazy(() => import('@/pages/ops/OpsIntegrationsPage.jsx').then((m) => ({ default: m.OpsIntegrationsPage })));
export const LazyOpsSettingsPage = lazy(() => import('@/pages/ops/OpsSettingsPage.jsx').then((m) => ({ default: m.OpsSettingsPage })));
export const LazyOpsDashboardPage = lazy(() => import('@/pages/OpsDashboardPage.jsx').then((m) => ({ default: m.OpsDashboardPage })));
export const LazyOpsLookupObservabilityPage = lazy(() => import('@/pages/OpsLookupObservabilityPage.jsx').then((m) => ({ default: m.OpsLookupObservabilityPage })));
export const LazyChatIAPage = lazy(() => import('@/pages/ChatIAPage.jsx').then((m) => ({ default: m.ChatIAPage })));
export const LazyNonConvictionDeclarationPage = lazy(() => import('@/pages/NonConvictionDeclarationPage.jsx').then((m) => ({ default: m.NonConvictionDeclarationPage })));
export const LazyDashboardPage = lazy(() => import('@/pages/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })));
export const LazyQuestionnairePage = lazy(() => import('@/pages/QuestionnairePage.jsx').then((m) => ({ default: m.QuestionnairePage })));
export const LazyPaymentPage = lazy(() => import('@/pages/PaymentPage.jsx').then((m) => ({ default: m.PaymentPage })));
export const LazyDocumentsPage = lazy(() => import('@/pages/DocumentsPage.jsx').then((m) => ({ default: m.DocumentsPage })));
export const LazyDossiersPage = lazy(() => import('@/pages/DossiersPage.jsx').then((m) => ({ default: m.DossiersPage })));
export const LazyFormalityPowersPage = lazy(() => import('@/pages/FormalityPowersPage.jsx').then((m) => ({ default: m.FormalityPowersPage })));
export const LazyDocumentWorkspaceEditPage = lazy(() => import('@/pages/DocumentWorkspaceEditPage.jsx').then((m) => ({ default: m.DocumentWorkspaceEditPage })));
export const LazyDocumentViewerTab = lazy(() => import('@/pages/DocumentViewerTab.jsx').then((m) => ({ default: m.DocumentViewerTab })));
export const LazySubscribersListPage = lazy(() => import('@/pages/SubscribersListPage.jsx').then((m) => ({ default: m.SubscribersListPage })));
export const LazyMobileHomePage = lazy(() => import('@/mobile/MobileHomePage.jsx').then((m) => ({ default: m.MobileHomePage })));
export const LazyMobileDossiersPage = lazy(() => import('@/mobile/MobileDossiersPage.jsx').then((m) => ({ default: m.MobileDossiersPage })));
export const LazyMobileDocumentsPage = lazy(() => import('@/mobile/MobileDocumentsPage.jsx').then((m) => ({ default: m.MobileDocumentsPage })));
export const LazyMobilePaymentPage = lazy(() => import('@/mobile/MobilePaymentPage.jsx').then((m) => ({ default: m.MobilePaymentPage })));
export const LazyDossierDetailPage = lazy(() => import('@/pages/DossierDetailPage.jsx').then((m) => ({ default: m.DossierDetailPage })));
export const LazyMobileDossierDetailPage = lazy(() => import('@/mobile/MobileDossierDetailPage.jsx').then((m) => ({ default: m.MobileDossierDetailPage })));
export const LazyClientShopPage = lazy(() => import('@/pages/ClientShopPage.jsx').then((m) => ({ default: m.ClientShopPage })));
export const LazyShopCheckoutPage = lazy(() => import('@/pages/ShopCheckoutPage.jsx').then((m) => ({ default: m.ShopCheckoutPage })));
export const LazyClientOrdersPage = lazy(() => import('@/pages/ClientOrdersPage.jsx').then((m) => ({ default: m.ClientOrdersPage })));
export const LazyResourcesPage = lazy(() => import('@/pages/ResourcesPage.jsx').then((m) => ({ default: m.ResourcesPage })));
export const LazyLegalFormComparatorPage = lazy(() => import('@/pages/LegalFormComparatorPage.jsx').then((m) => ({ default: m.LegalFormComparatorPage })));

export const withSuspense = (Component, label) => (
  <React.Suspense fallback={<RouteSuspenseFallback label={label} />}>
    <Component />
  </React.Suspense>
);
