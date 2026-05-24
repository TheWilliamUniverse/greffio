import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { ProtectedRoute } from '@/components/ProtectedRoute.jsx';
import { Header } from '@/components/Header.jsx';
import { LandingPage } from '@/pages/LandingPage.jsx';
import { FormalityWizardPage } from '@/pages/FormalityWizardPage.jsx';
import { SignupPage } from '@/pages/SignupPage.jsx';
import { LoginPage } from '@/pages/LoginPage.jsx';
import { PasswordResetPage } from '@/pages/PasswordResetPage.jsx';
import { DashboardPage } from '@/pages/DashboardPage.jsx';
import { DossiersPage } from '@/pages/DossiersPage.jsx';
import { DossierDetailPage } from '@/pages/DossierDetailPage.jsx';
import { DocumentsPage } from '@/pages/DocumentsPage.jsx';
import { ChatIAPage } from '@/pages/ChatIAPage.jsx';
import { AnalyticsPage } from '@/pages/AnalyticsPage.jsx';
import { TeamPage } from '@/pages/TeamPage.jsx';
import { SettingsPage } from '@/pages/SettingsPage.jsx';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage.jsx';
import { LegalMentionsPage } from '@/pages/LegalMentionsPage.jsx';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage.jsx';
import { AccountDeletionPage } from '@/pages/AccountDeletionPage.jsx';
import { DataDeletionPage } from '@/pages/DataDeletionPage.jsx';
import { PaymentPage } from '@/pages/PaymentPage.jsx';
import { ResourcesPage } from '@/pages/ResourcesPage.jsx';
import { AppInstallPage } from '@/pages/AppInstallPage.jsx';
import { ContactPage } from '@/pages/ContactPage.jsx';
import { GuidePage } from '@/pages/GuidePage.jsx';
import { MandatePage } from '@/pages/MandatePage.jsx';
import { OpsDashboardPage } from '@/pages/OpsDashboardPage.jsx';
import { PaymentVerificationPage } from '@/pages/PaymentVerificationPage.jsx';
import { QuestionnairePage } from '@/pages/QuestionnairePage.jsx';
import { StatutesPage } from '@/pages/StatutesPage.jsx';
import { InterfacesPage } from '@/pages/InterfacesPage.jsx';
import { ServiceLandingPage } from '@/pages/ServiceLandingPage.jsx';
import { ServicesPage } from '@/pages/ServicesPage.jsx';
import { OpsLookupObservabilityPage } from '@/pages/OpsLookupObservabilityPage.jsx';
import { SERVICE_PAGE_SLUGS } from '@/config/serviceLandingPages.js';
import { CookieConsentBanner } from '@/components/CookieConsentBanner.jsx';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const NotFound = () => (
  <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background">
    <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
    <p className="mb-6 text-muted-foreground">Page introuvable</p>
    <a href="/" className="font-medium text-primary hover:underline">Retour à l'accueil</a>
  </div>
);

const Layout = ({ children }) => {
  const location = useLocation();
  const hideHeaderRoutes = ['/', '/signup', '/simulateur', '/statuts-gratuits', '/service', '/services', '/paiement', '/ressources', '/app', '/guide', '/procuration', '/contact'];
  const shouldHideHeader = hideHeaderRoutes.some((route) => location.pathname === route || location.pathname.startsWith('/service/'));

  return (
    <div className="flex min-h-screen flex-col font-['Inter']">
      {!shouldHideHeader && <Header />}
      <div className="flex-1">{children}</div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/simulateur" element={<FormalityWizardPage />} />
            <Route path="/questionnaire" element={<ProtectedRoute><QuestionnairePage /></ProtectedRoute>} />
            <Route path="/statuts-gratuits" element={<ProtectedRoute><QuestionnairePage /></ProtectedRoute>} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/password-reset" element={<PasswordResetPage />} />
            <Route path="/service/:id" element={<ServiceDetailPage />} />
            {SERVICE_PAGE_SLUGS.map((slug) => (
              <Route key={slug} path={`/${slug}`} element={<ServiceLandingPage />} />
            ))}
            <Route path="/mentions-legales" element={<LegalMentionsPage />} />
            <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
            <Route path="/suppression-compte" element={<AccountDeletionPage />} />
            <Route path="/suppression-donnees" element={<DataDeletionPage />} />
            <Route path="/paiement" element={<PaymentPage />} />
            <Route path="/ressources" element={<ResourcesPage />} />
            <Route path="/app" element={<AppInstallPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/procuration" element={<MandatePage />} />
            <Route path="/ops" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}><OpsDashboardPage /></ProtectedRoute>} />
            <Route path="/ops-observability" element={<ProtectedRoute allowedRoles={['ADMIN', 'OPS', 'FORMALISTE']}><OpsLookupObservabilityPage /></ProtectedRoute>} />
            <Route path="/paiement/verification" element={<PaymentVerificationPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dossiers" element={<ProtectedRoute><DossiersPage /></ProtectedRoute>} />
            <Route path="/dossier/:id" element={<ProtectedRoute><DossierDetailPage /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
            <Route path="/statuts" element={<ProtectedRoute><StatutesPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatIAPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/interfaces" element={<ProtectedRoute><InterfacesPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <CookieConsentBanner />
        <Toaster richColors position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;
