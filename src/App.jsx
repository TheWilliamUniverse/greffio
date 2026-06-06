import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { ProtectedRoute } from '@/components/ProtectedRoute.jsx';
import { Header } from '@/components/Header.jsx';
import { LandingPage } from '@/pages/LandingPage.jsx';
import { PricingPage } from '@/pages/PricingPage.jsx';
import { FormalityWizardEntry } from '@/mobile/entries/FormalityWizardEntry.jsx';
import { DossiersEntry } from '@/mobile/entries/DossiersEntry.jsx';
import { DossierDetailEntry } from '@/mobile/entries/DossierDetailEntry.jsx';
import { PaymentEntry } from '@/mobile/entries/PaymentEntry.jsx';
import { useRouteQueryInvalidation } from '@/hooks/useRouteQueryInvalidation.js';
import {
  LazyAnalyticsPage,
  LazyChatIAPage,
  LazyNonConvictionDeclarationPage,
  LazyOpsCockpitPage,
  LazyOpsDashboardPage,
  LazyOpsDossierDetailPage,
  LazyOpsDossiersPage,
  LazyOpsEquipePage,
  LazyOpsLookupObservabilityPage,
  LazyOpsShell,
  LazyStatutesPage,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { SignupPage } from '@/pages/SignupPage.jsx';
import { LoginPage } from '@/pages/LoginPage.jsx';
import { PasswordResetPage } from '@/pages/PasswordResetPage.jsx';
import { CredentialsUnlockPage } from '@/pages/CredentialsUnlockPage.jsx';
import { DocumentsPage } from '@/pages/DocumentsPage.jsx';
import { TeamPage } from '@/pages/TeamPage.jsx';
import { ProfilePage } from '@/pages/ProfilePage.jsx';
import { SettingsPage } from '@/pages/SettingsPage.jsx';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage.jsx';
import { LegalMentionsPage } from '@/pages/LegalMentionsPage.jsx';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage.jsx';
import { CookiesPage } from '@/pages/CookiesPage.jsx';
import { AccountDeletionPage } from '@/pages/AccountDeletionPage.jsx';
import { DataDeletionPage } from '@/pages/DataDeletionPage.jsx';
import { ResourcesPage } from '@/pages/ResourcesPage.jsx';
import { ResourceGuidePage } from '@/pages/ResourceGuidePage.jsx';
import { AppInstallPage } from '@/pages/AppInstallPage.jsx';
import { ContactPage } from '@/pages/ContactPage.jsx';
import { GuidePage } from '@/pages/GuidePage.jsx';
import { MandatePage } from '@/pages/MandatePage.jsx';
import { OpsPlaceholderPage } from '@/pages/ops/OpsPlaceholderPage.jsx';
import { PaymentVerificationPage } from '@/pages/PaymentVerificationPage.jsx';
import { QuestionnairePage } from '@/pages/QuestionnairePage.jsx';
import { SubscribersListPage } from '@/pages/SubscribersListPage.jsx';
import { FormalityPowersPage } from '@/pages/FormalityPowersPage.jsx';
import { SignaturePublicPage } from '@/pages/SignaturePublicPage.jsx';
import { InterfacesPage } from '@/pages/InterfacesPage.jsx';
import { ServiceLandingPage } from '@/pages/ServiceLandingPage.jsx';
import { ServicesPage } from '@/pages/ServicesPage.jsx';
import { NotFoundPage } from '@/pages/NotFoundPage.jsx';
import { HomePage } from '@/pages/HomePage.jsx';
import { SERVICE_PAGE_SLUGS } from '@/config/serviceLandingPages.js';
import { CookieConsentBanner } from '@/components/CookieConsentBanner.jsx';
import { MobileAppShell } from '@/mobile/MobileAppShell.jsx';
import { MobileWebShell } from '@/mobile/MobileWebShell.jsx';
import { MobileSearchPage } from '@/mobile/MobileSearchPage.jsx';
import { MobileAccountPage } from '@/mobile/MobileAccountPage.jsx';
import { DashboardEntry } from '@/mobile/DashboardEntry.jsx';
import { BiometricSessionProvider } from '@/context/BiometricSessionContext.jsx';
import { shouldUseMobileShell, shouldUseMobileWebShell, isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { AppUpdateGate } from '@/components/AppUpdateGate.jsx';
import { IdleSessionGuard } from '@/components/IdleSessionGuard.jsx';
import { GlobalErrorBoundary } from '@/components/system/GlobalErrorBoundary.jsx';
import { RouteErrorBoundary } from '@/components/system/RouteErrorBoundary.jsx';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const NotFound = () => <NotFoundPage />;

const Layout = ({ children }) => {
  const location = useLocation();
  const hideHeaderRoutes = ['/', '/signup', '/simulateur', '/statuts-gratuits', '/service', '/services', '/paiement', '/ressources', '/app', '/guide', '/procuration', '/contact', '/credentials-unlock', '/login', '/password-reset', '/tarifs'];
  const mobileWebShellActive = isMobileBrowserViewport()
    && shouldUseMobileWebShell(location.pathname);
  const shouldHideHeader = hideHeaderRoutes.some((route) => location.pathname === route || location.pathname.startsWith('/service/'))
    || location.pathname.startsWith('/ressources/guides/')
    || location.pathname.startsWith('/ops')
    || (isCapacitorNative() && shouldUseMobileShell(location.pathname))
    || mobileWebShellActive;

  const content = shouldUseMobileShell(location.pathname) ? (
    <MobileAppShell>{children}</MobileAppShell>
  ) : (
    <MobileWebShell>{children}</MobileWebShell>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col font-['Inter'] md:min-h-screen">
      {!shouldHideHeader && <Header />}
      {content}
    </div>
  );
};

function AppRoutes() {
  const location = useLocation();
  useRouteQueryInvalidation();
  return (
    <>
      <ScrollToTop />
      <Layout>
        <RouteErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/simulateur" element={<FormalityWizardEntry />} />
            <Route path="/questionnaire" element={<ProtectedRoute><QuestionnairePage /></ProtectedRoute>} />
            <Route path="/statuts-gratuits" element={<ProtectedRoute><QuestionnairePage /></ProtectedRoute>} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/password-reset" element={<PasswordResetPage />} />
            <Route path="/credentials-unlock" element={<CredentialsUnlockPage />} />
            <Route path="/service/:id" element={<ServiceDetailPage />} />
            {SERVICE_PAGE_SLUGS.map((slug) => (
              <Route key={slug} path={`/${slug}`} element={<ServiceLandingPage />} />
            ))}
            <Route path="/mentions-legales" element={<LegalMentionsPage />} />
            <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/suppression-compte" element={<AccountDeletionPage />} />
            <Route path="/suppression-donnees" element={<DataDeletionPage />} />
            <Route path="/paiement" element={<PaymentEntry />} />
            <Route path="/ressources" element={<ResourcesPage />} />
            <Route path="/ressources/guides/:slug" element={<ResourceGuidePage />} />
            <Route path="/app" element={<AppInstallPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/procuration" element={<MandatePage />} />
            <Route path="/ops" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}>{withSuspense(LazyOpsShell, 'Chargement ops…')}</ProtectedRoute>}>
              <Route index element={<Navigate to="cockpit" replace />} />
              <Route path="cockpit" element={withSuspense(LazyOpsCockpitPage, 'Chargement cockpit…')} />
              <Route path="dossiers" element={withSuspense(LazyOpsDossiersPage, 'Chargement dossiers ops…')} />
              <Route path="dossiers/:dossierId" element={withSuspense(LazyOpsDossierDetailPage, 'Chargement dossier ops…')} />
              <Route path="documents" element={<OpsPlaceholderPage title="Documents" description="Revue side-by-side, validation groupée et annotations — prévu Lot 2." ctaTo="/ops/dossiers" ctaLabel="Aller aux dossiers" />} />
              <Route path="relances" element={<OpsPlaceholderPage title="Relances" description="Suggestions de relance client, modèles d’email et suivi des retours — prévu Lot 2." />} />
              <Route path="depot" element={<OpsPlaceholderPage title="Dépôt guichet unique" description="File des dossiers prêts au dépôt et checklist GU — prévu Lot 2." ctaTo="/ops/dossiers?filter=ready:deposit" ctaLabel="Dossiers prêts" />} />
              <Route path="qualite" element={<OpsPlaceholderPage title="Qualité & anti-rejet" description="Contrôles qualité, scoring et revue des rejets — prévu Lot 2." ctaTo="/ops/cockpit" />} />
              <Route path="equipe" element={withSuspense(LazyOpsEquipePage, 'Chargement équipe…')} />
              <Route path="audit" element={<OpsPlaceholderPage title="Audit ops" description="Journal complet des actions formalistes — prévu Lot 3." />} />
              <Route path="settings" element={<OpsPlaceholderPage title="Paramètres ops" description="Préférences cockpit, notifications et sandbox — prévu Lot 3." />} />
            </Route>
            <Route path="/ops-legacy" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}>{withSuspense(LazyOpsDashboardPage, 'Chargement ops…')}</ProtectedRoute>} />
            <Route path="/ops-observability" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}>{withSuspense(LazyOpsLookupObservabilityPage, 'Chargement observabilité…')}</ProtectedRoute>} />
            <Route path="/paiement/verification" element={<PaymentVerificationPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardEntry /></ProtectedRoute>} />
            <Route path="/mobile/search" element={<ProtectedRoute><MobileSearchPage /></ProtectedRoute>} />
            <Route path="/mobile/account" element={<ProtectedRoute><MobileAccountPage /></ProtectedRoute>} />
            <Route path="/dossiers" element={<ProtectedRoute><DossiersEntry /></ProtectedRoute>} />
            <Route path="/dossier/:id" element={<ProtectedRoute><DossierDetailEntry /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
            <Route path="/dossier/:dossierId/declaration-non-condamnation" element={<ProtectedRoute>{withSuspense(LazyNonConvictionDeclarationPage, 'Chargement déclaration…')}</ProtectedRoute>} />
            <Route path="/dossier/:dossierId/liste-souscripteurs" element={<ProtectedRoute><SubscribersListPage /></ProtectedRoute>} />
            <Route path="/dossier/:dossierId/pouvoirs-formalites" element={<ProtectedRoute><FormalityPowersPage /></ProtectedRoute>} />
            <Route path="/statuts" element={<ProtectedRoute>{withSuspense(LazyStatutesPage, 'Chargement statuts…')}</ProtectedRoute>} />
            <Route path="/signature/:token" element={<SignaturePublicPage />} />
            <Route path="/chat" element={<ProtectedRoute>{withSuspense(LazyChatIAPage, 'Chargement assistant…')}</ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute>{withSuspense(LazyAnalyticsPage, 'Chargement analytics…')}</ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/interfaces" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}><InterfacesPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteErrorBoundary>
      </Layout>
      <CookieConsentBanner />
      <AppUpdateGate />
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <Router>
          <BiometricSessionProvider>
            <IdleSessionGuard>
              <AppRoutes />
            </IdleSessionGuard>
          </BiometricSessionProvider>
        </Router>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
