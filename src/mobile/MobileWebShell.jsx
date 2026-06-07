import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileWebHeader } from '@/mobile/MobileWebHeader.jsx';
import { MobilePublicBottomNav } from '@/mobile/MobilePublicBottomNav.jsx';
import { WebMobileBottomNav } from '@/components/WebMobileBottomNav.jsx';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer.jsx';
import { MobileConnectedStrip } from '@/mobile/ui/MobileConnectedStrip.jsx';
import { MobileShellScrollProvider } from '@/mobile/context/MobileShellScrollContext.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { shouldUseMobileWebShell } from '@/utils/platform.js';

const PAGE_TITLES = {
  '/dashboard': 'Accueil',
  '/dossiers': 'Dossiers',
  '/documents': 'Documents',
  '/tarifs': 'Tarifs',
  '/guide': 'Guide',
  '/login': 'Connexion',
  '/signup': 'Inscription',
  '/analytics': 'Pilotage',
  '/interfaces': 'Interfaces',
  '/simulateur': 'Simulation',
  '/contact': 'Contact',
  '/app': 'Application',
  '/mentions-legales': 'Mentions légales',
  '/confidentialite': 'Confidentialité',
  '/cookies': 'Cookies',
  '/ressources': 'Ressources',
  '/paiement': 'Paiement',
  '/profil': 'Profil',
  '/settings': 'Paramètres',
  '/team': 'Messages',
  '/chat': 'Assistant',
  '/statuts': 'Statuts',
  '/questionnaire': 'Questionnaire',
  '/password-reset': 'Mot de passe',
  '/services': 'Services',
};

const resolveTitle = (pathname) => {
  if (pathname.startsWith('/dossier/')) return 'Dossier';
  if (pathname.startsWith('/mobile/account') || pathname.startsWith('/profil')) return 'Compte';
  if (pathname.startsWith('/mobile/search') || pathname.startsWith('/chat')) return 'Assistant';
  if (pathname.startsWith('/ressources/guides/')) return 'Guide';
  if (pathname.startsWith('/service/')) return 'Service';
  if (pathname.startsWith('/paiement/')) return 'Paiement';
  return PAGE_TITLES[pathname] || 'Greffio';
};

export const MobileWebShell = ({ children }) => {
  const location = useLocation();
  const scrollRef = useRef(null);
  const { currentUser } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const isLanding = location.pathname === '/';
  const title = isLanding ? '' : resolveTitle(location.pathname);
  const showAuthenticatedNav = Boolean(currentUser) && !isLanding;

  if (!shouldUseMobileWebShell(location.pathname)) {
    return children;
  }

  return (
    <MobileShellScrollProvider scrollRef={scrollRef}>
      <div className="flex min-h-[100dvh] flex-col bg-background md:contents">
        {showAuthenticatedNav ? (
          <MobileSidebarDrawer open={navOpen} onClose={() => setNavOpen(false)} />
        ) : null}
        {!isLanding ? (
          <>
            <MobileWebHeader
              title={title}
              onMenuClick={showAuthenticatedNav ? () => setNavOpen(true) : undefined}
            />
            {showAuthenticatedNav ? <MobileConnectedStrip /> : null}
          </>
        ) : null}
        <main
          ref={scrollRef}
          className={`flex-1 md:contents ${
            isLanding
              ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]'
              : 'overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))]'
          }`}
        >
          {children}
        </main>
        {currentUser ? <WebMobileBottomNav /> : <MobilePublicBottomNav />}
      </div>
    </MobileShellScrollProvider>
  );
};
