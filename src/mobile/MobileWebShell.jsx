import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileWebHeader } from '@/mobile/MobileWebHeader.jsx';
import { MobilePublicBottomNav } from '@/mobile/MobilePublicBottomNav.jsx';
import { WebMobileBottomNav } from '@/components/WebMobileBottomNav.jsx';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer.jsx';
import { MobileStickyHeaderGroup } from '@/mobile/ui/MobileStickyHeaderGroup.jsx';
import { MobileShellScrollProvider } from '@/mobile/context/MobileShellScrollContext.jsx';
import { MobileShellOverlayProvider, useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';
import { MobileShellPageTransition } from '@/mobile/ui/MobileShellPageTransition.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { shouldUseMobileWebShell } from '@/utils/platform.js';

const PAGE_TITLES = {
  '/dashboard': 'Accueil',
  '/dossiers': 'Dossiers',
  '/documents': 'Documents',
  '/assistant-documents': 'Compléter un PDF',
  '/boutique': 'Boutique',
  '/tarifs': 'Tarifs',
  '/guide': 'Guide',
  '/login': 'Connexion',
  '/signup': 'Inscription',
  '/analytics': 'Pilotage',
  '/interfaces': 'Interfaces',
  '/simulateur': 'Simulation',
  '/contact': 'Contact',
  '/a-propos': 'À propos',
  '/app': 'Application',
  '/app/welcome': 'Bienvenue',
  '/app/home': 'Accueil',
  '/mentions-legales': 'Mentions légales',
  '/confidentialite': 'Confidentialité',
  '/cookies': 'Cookies',
  '/ressources': 'Ressources',
  '/ressources/comparateur-forme-juridique': 'Forme juridique',
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

export const resolveMobileShellTitle = (pathname) => {
  if (pathname.startsWith('/dossier/')) return 'Dossier';
  if (pathname.startsWith('/mobile/account')) return 'Compte';
  if (pathname.startsWith('/profil')) return 'Mon profil';
  if (pathname.startsWith('/settings')) return 'Paramètres';
  if (pathname.startsWith('/mobile/search') || pathname.startsWith('/chat')) return 'Assistant';
  if (pathname.startsWith('/ressources/comparateur')) return 'Forme juridique';
  if (pathname.startsWith('/ressources/guides/')) return 'Guide';
  if (pathname.startsWith('/service/')) return 'Service';
  if (pathname.startsWith('/paiement/')) return 'Paiement';
  return PAGE_TITLES[pathname] || 'Greffio';
};

export const MobileWebShell = ({ children }) => {
  const location = useLocation();
  const scrollRef = useRef(null);
  const { currentUser } = useAuth();
  const isLanding = location.pathname === '/';
  const title = isLanding ? '' : resolveMobileShellTitle(location.pathname);
  const showAuthenticatedNav = Boolean(currentUser) && !isLanding;

  if (!shouldUseMobileWebShell(location.pathname)) {
    return children;
  }

  return (
    <MobileShellScrollProvider scrollRef={scrollRef}>
      <MobileShellOverlayProvider>
        <MobileWebShellInner
          scrollRef={scrollRef}
          isLanding={isLanding}
          title={title}
          showAuthenticatedNav={showAuthenticatedNav}
        >
          {children}
        </MobileWebShellInner>
      </MobileShellOverlayProvider>
    </MobileShellScrollProvider>
  );
};

const MobileWebShellInner = ({
  children,
  scrollRef,
  isLanding,
  title,
  showAuthenticatedNav,
}) => {
  const { drawerOpen, setDrawerOpen } = useMobileShellOverlay();

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-background md:contents">
      {showAuthenticatedNav ? (
        <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      ) : null}
      {!isLanding ? (
        <MobileStickyHeaderGroup showConnectedStrip={showAuthenticatedNav}>
          <MobileWebHeader
            title={title}
            onMenuClick={showAuthenticatedNav ? () => setDrawerOpen(true) : undefined}
          />
        </MobileStickyHeaderGroup>
      ) : null}
      <main
        ref={scrollRef}
        className={`flex-1 min-w-0 max-w-full overflow-x-hidden md:contents ${
          isLanding
            ? 'pb-[calc(var(--bottom-nav-height-web)+env(safe-area-inset-bottom))]'
            : 'overflow-y-auto pb-[calc(var(--bottom-nav-height-web)+env(safe-area-inset-bottom)+var(--mobile-page-bottom-extra))]'
        }`}
      >
        {showAuthenticatedNav ? (
          <MobileShellPageTransition>{children}</MobileShellPageTransition>
        ) : (
          children
        )}
      </main>
      {showAuthenticatedNav ? <WebMobileBottomNav /> : <MobilePublicBottomNav />}
    </div>
  );
};
