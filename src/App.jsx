import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { ProtectedRoute } from '@/components/ProtectedRoute.jsx';
import { Header } from '@/components/Header.jsx';
import { LandingPage } from '@/pages/LandingPage.jsx';
import { PricingEntry } from '@/mobile/entries/PricingEntry.jsx';
import { FormalityWizardEntry } from '@/mobile/entries/FormalityWizardEntry.jsx';
import { DossiersEntry } from '@/mobile/entries/DossiersEntry.jsx';
import { DossierDetailEntry } from '@/mobile/entries/DossierDetailEntry.jsx';
import { PaymentEntry } from '@/mobile/entries/PaymentEntry.jsx';
import { useRouteQueryInvalidation } from '@/hooks/useRouteQueryInvalidation.js';
import {
  LazyNonConvictionDeclarationPage,
  LazyOpsCockpitPage,
  LazyOpsDashboardPage,
  LazyOpsDossierDetailPage,
  LazyOpsDossiersPage,
  LazyOpsEquipePage,
  LazyOpsDocumentsPage,
  LazyOpsRelancesPage,
  LazyOpsDepotPage,
  LazyOpsQualitePage,
  LazyOpsAuditPage,
  LazyOpsSettingsPage,
  LazyOpsLookupObservabilityPage,
  LazyOpsShell,
  withSuspense,
} from '@/routes/lazyPages.jsx';
import { SignupPage } from '@/pages/SignupPage.jsx';
import { LoginPage } from '@/pages/LoginPage.jsx';
import { AppAuthBridgePage } from '@/pages/AppAuthBridgePage.jsx';
import { PasswordResetPage } from '@/pages/PasswordResetPage.jsx';
import { CredentialsUnlockPage } from '@/pages/CredentialsUnlockPage.jsx';
import { DocumentsEntry } from '@/mobile/entries/DocumentsEntry.jsx';
import { TeamEntry } from '@/mobile/entries/TeamEntry.jsx';
import { ProfileEntry } from '@/mobile/entries/ProfileEntry.jsx';
import { SettingsEntry } from '@/mobile/entries/SettingsEntry.jsx';
import { ChatEntry } from '@/mobile/entries/ChatEntry.jsx';
import { AnalyticsEntry } from '@/mobile/entries/AnalyticsEntry.jsx';
import { StatutsEntry } from '@/mobile/entries/StatutsEntry.jsx';
import { QuestionnaireEntry } from '@/mobile/entries/QuestionnaireEntry.jsx';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage.jsx';
import { LegalMentionsPage } from '@/pages/LegalMentionsPage.jsx';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage.jsx';
import { CookiesPage } from '@/pages/CookiesPage.jsx';
import { AccountDeletionPage } from '@/pages/AccountDeletionPage.jsx';
import { DataDeletionPage } from '@/pages/DataDeletionPage.jsx';
import { ResourcesPage } from '@/pages/ResourcesPage.jsx';
import { ClientShopPage } from '@/pages/ClientShopPage.jsx';
import { ResourceGuidePage } from '@/pages/ResourceGuidePage.jsx';
import { LegalFormComparatorPage } from '@/pages/LegalFormComparatorPage.jsx';
import { AppInstallPage } from '@/pages/AppInstallPage.jsx';
import { ContactPage } from '@/pages/ContactPage.jsx';
import { AboutPage } from '@/pages/AboutPage.jsx';
import { GuidePage } from '@/pages/GuidePage.jsx';
import { MandatePage } from '@/pages/MandatePage.jsx';
import { PaymentVerificationPage } from '@/pages/PaymentVerificationPage.jsx';
import { SubscribersListPage } from '@/pages/SubscribersListPage.jsx';
import { FormalityPowersPage } from '@/pages/FormalityPowersPage.jsx';
import { DocumentCompletionPage } from '@/pages/DocumentCompletionPage.jsx';
import { SignaturePublicPage } from '@/pages/SignaturePublicPage.jsx';
import { SignWellCallbackPage } from '@/pages/SignWellCallbackPage.jsx';
import { InterfacesPage } from '@/pages/InterfacesPage.jsx';
import { ServiceLandingPage } from '@/pages/ServiceLandingPage.jsx';
import { ServicesEntry } from '@/mobile/entries/ServicesEntry.jsx';
import { NotFoundPage } from '@/pages/NotFoundPage.jsx';
import { HomePage } from '@/pages/HomePage.jsx';
import { SERVICE_PAGE_SLUGS } from '@/config/serviceLandingPages.js';
import { CookieConsentBanner } from '@/components/CookieConsentBanner.jsx';
import { MobileAppShell } from '@/mobile/MobileAppShell.jsx';
import { MobileWebShell } from '@/mobile/MobileWebShell.jsx';
import { MobileSearchPage } from '@/mobile/MobileSearchPage.jsx';
import { MobileAccountPage } from '@/mobile/MobileAccountPage.jsx';
import { DashboardEntry } from '@/mobile/DashboardEntry.jsx';
import { NativeAppBootstrap } from '@/mobile/NativeAppBootstrap.jsx';
import { NativeAppWelcomePage } from '@/mobile/NativeAppWelcomePage.jsx';
import { NativeAppHomePage } from '@/mobile/NativeAppHomePage.jsx';
import { BiometricSessionProvider } from '@/context/BiometricSessionContext.jsx';
import { shouldUseMobileShell, shouldUseMobileWebShell, isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { AppUpdateGate } from '@/components/AppUpdateGate.jsx';
import { IdleSessionGuard } from '@/components/IdleSessionGuard.jsx';
import { GlobalErrorBoundary } from '@/components/system/GlobalErrorBoundary.jsx';
import { RouteErrorBoundary } from '@/components/system/RouteErrorBoundary.jsx';
import {
  SEO_FAQ_ITEMS,
  SEO_GLOSSARY_PAGES,
  SEO_GUIDE_PAGES,
  SEO_HUBS,
  SEO_PILLAR_PAGES,
} from '@/config/seoContent.js';
import {
  SeoFaqPage,
  SeoGlossaryPage,
  SeoGuidePage,
  SeoHubPage,
  SeoPillarPage,
} from '@/pages/SeoPages.jsx';

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
  const hideHeaderRoutes = ['/', '/signup', '/simulateur', '/statuts-gratuits', '/service', '/services', '/paiement', '/ressources', '/app', '/app/welcome', '/app/home', '/guide', '/procuration', '/contact', '/a-propos', '/credentials-unlock', '/login', '/password-reset', '/auth/app-bridge', '/tarifs', '/creation-entreprise', '/modification-entreprise', '/annonce-legale', '/guichet-unique-inpi', '/kbis', '/guides', '/glossaire', '/faq'];
  const mobileWebShellActive = isMobileBrowserViewport()
    && shouldUseMobileWebShell(location.pathname);
  const shouldHideHeader = hideHeaderRoutes.some((route) => location.pathname === route || location.pathname.startsWith('/service/'))
    || location.pathname.startsWith('/paiement/')
    || location.pathname.startsWith('/ressources/guides/')
    || location.pathname.startsWith('/ressources/comparateur')
    || location.pathname.startsWith('/guides/')
    || location.pathname.startsWith('/glossaire/')
    || location.pathname.startsWith('/ops')
    || (isCapacitorNative() && shouldUseMobileShell(location.pathname))
    || mobileWebShellActive;

  const useNativeShell = isCapacitorNative() && shouldUseMobileShell(location.pathname);
  const content = useNativeShell ? (
    <MobileAppShell>{children}</MobileAppShell>
  ) : mobileWebShellActive ? (
    <MobileWebShell>{children}</MobileWebShell>
  ) : (
    children
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
      <NativeAppBootstrap />
      <Layout>
        <RouteErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/tarifs" element={<PricingEntry />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/services" element={<ServicesEntry />} />
            <Route path="/simulateur" element={<FormalityWizardEntry />} />
            <Route path="/questionnaire" element={<ProtectedRoute><QuestionnaireEntry /></ProtectedRoute>} />
            <Route path="/statuts-gratuits" element={<ProtectedRoute><QuestionnaireEntry /></ProtectedRoute>} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/app-bridge" element={<AppAuthBridgePage />} />
            <Route path="/password-reset" element={<PasswordResetPage />} />
            <Route path="/credentials-unlock" element={<CredentialsUnlockPage />} />
            <Route path="/service/:id" element={<ServiceDetailPage />} />
            {SERVICE_PAGE_SLUGS.map((slug) => (
              <Route key={slug} path={`/${slug}`} element={<ServiceLandingPage />} />
            ))}
            {Object.values(SEO_PILLAR_PAGES).map((page) => (
              <Route key={page.path} path={page.path} element={<SeoPillarPage page={page} />} />
            ))}
            <Route path="/guides" element={<SeoHubPage hub={SEO_HUBS.guides} />} />
            {Object.values(SEO_GUIDE_PAGES).map((page) => (
              <Route key={page.path} path={page.path} element={<SeoGuidePage page={page} />} />
            ))}
            <Route path="/glossaire" element={<SeoHubPage hub={SEO_HUBS.glossaire} />} />
            {Object.values(SEO_GLOSSARY_PAGES).map((page) => (
              <Route key={page.path} path={page.path} element={<SeoGlossaryPage page={page} />} />
            ))}
            <Route path="/faq" element={<SeoFaqPage hub={SEO_HUBS.faq} items={SEO_FAQ_ITEMS} />} />
            <Route path="/mentions-legales" element={<LegalMentionsPage />} />
            <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/suppression-compte" element={<AccountDeletionPage />} />
            <Route path="/suppression-donnees" element={<DataDeletionPage />} />
            <Route path="/paiement" element={<PaymentEntry />} />
            <Route path="/ressources" element={<ResourcesPage />} />
            <Route path="/ressources/comparateur-forme-juridique" element={<LegalFormComparatorPage />} />
            <Route path="/ressources/guides/:slug" element={<ResourceGuidePage />} />
            <Route path="/app" element={<AppInstallPage />} />
            <Route path="/app/welcome" element={<NativeAppWelcomePage />} />
            <Route path="/app/home" element={<NativeAppHomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/procuration" element={<MandatePage />} />
            <Route path="/ops" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}>{withSuspense(LazyOpsShell, 'Chargement ops…')}</ProtectedRoute>}>
              <Route index element={<Navigate to="cockpit" replace />} />
              <Route path="cockpit" element={withSuspense(LazyOpsCockpitPage, 'Chargement cockpit…')} />
              <Route path="dossiers" element={withSuspense(LazyOpsDossiersPage, 'Chargement dossiers ops…')} />
              <Route path="dossiers/:dossierId" element={withSuspense(LazyOpsDossierDetailPage, 'Chargement dossier ops…')} />
              <Route path="documents" element={withSuspense(LazyOpsDocumentsPage, 'Chargement documents ops…')} />
              <Route path="relances" element={withSuspense(LazyOpsRelancesPage, 'Chargement relances…')} />
              <Route path="depot" element={withSuspense(LazyOpsDepotPage, 'Chargement dépôt…')} />
              <Route path="qualite" element={withSuspense(LazyOpsQualitePage, 'Chargement qualité…')} />
              <Route path="equipe" element={withSuspense(LazyOpsEquipePage, 'Chargement équipe…')} />
              <Route path="audit" element={withSuspense(LazyOpsAuditPage, 'Chargement audit…')} />
              <Route path="settings" element={withSuspense(LazyOpsSettingsPage, 'Chargement paramètres ops…')} />
            </Route>
            <Route path="/ops-legacy" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}><Navigate to="/ops/cockpit" replace /></ProtectedRoute>} />
            <Route path="/ops-observability" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}>{withSuspense(LazyOpsLookupObservabilityPage, 'Chargement observabilité…')}</ProtectedRoute>} />
            <Route path="/paiement/verification" element={<PaymentVerificationPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardEntry /></ProtectedRoute>} />
            <Route path="/mobile/search" element={<ProtectedRoute><MobileSearchPage /></ProtectedRoute>} />
            <Route path="/mobile/account" element={<ProtectedRoute><MobileAccountPage /></ProtectedRoute>} />
            <Route path="/dossiers" element={<ProtectedRoute><DossiersEntry /></ProtectedRoute>} />
            <Route path="/dossier/:id" element={<ProtectedRoute><DossierDetailEntry /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><DocumentsEntry /></ProtectedRoute>} />
            <Route path="/assistant-documents" element={<ProtectedRoute><DocumentCompletionPage /></ProtectedRoute>} />
            <Route path="/boutique" element={<ProtectedRoute><ClientShopPage /></ProtectedRoute>} />
            <Route path="/dossier/:dossierId/declaration-non-condamnation" element={<ProtectedRoute>{withSuspense(LazyNonConvictionDeclarationPage, 'Chargement déclaration…')}</ProtectedRoute>} />
            <Route path="/dossier/:dossierId/liste-souscripteurs" element={<ProtectedRoute><SubscribersListPage /></ProtectedRoute>} />
            <Route path="/dossier/:dossierId/pouvoirs-formalites" element={<ProtectedRoute><FormalityPowersPage /></ProtectedRoute>} />
            <Route path="/statuts" element={<ProtectedRoute><StatutsEntry /></ProtectedRoute>} />
            <Route path="/signature/:token" element={<SignaturePublicPage />} />
            <Route path="/callback" element={<SignWellCallbackPage />} />
            <Route path="/chat" element={<ProtectedRoute><ChatEntry /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsEntry /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamEntry /></ProtectedRoute>} />
            <Route path="/interfaces" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}><InterfacesPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfileEntry /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsEntry /></ProtectedRoute>} />

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
