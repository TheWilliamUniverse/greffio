import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Files, FolderKanban, Home, Plus, UserRound } from 'lucide-react';
import { MOBILE_AUTH_TABS_NATIVE } from '@/config/mobileNavigation.js';
import { MobileTopBar } from '@/mobile/MobileTopBar.jsx';
import { MobileWebHeader } from '@/mobile/MobileWebHeader.jsx';
import { MobilePublicBottomNav } from '@/mobile/MobilePublicBottomNav.jsx';
import { resolveMobileShellTitle } from '@/mobile/MobileWebShell.jsx';
import { MobilePushRegistration } from '@/mobile/MobilePushRegistration.jsx';
import { MobileNativeOfflineBanner } from '@/mobile/MobileNativeOfflineBanner.jsx';
import { MobileNavCoachmarks } from '@/mobile/ui/MobileNavCoachmarks.jsx';
import { NativePermissionOrchestrator } from '@/mobile/ui/NativePermissionOrchestrator.jsx';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer.jsx';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';
import { MobileStickyHeaderGroup } from '@/mobile/ui/MobileStickyHeaderGroup.jsx';
import { MobileShellScrollProvider } from '@/mobile/context/MobileShellScrollContext.jsx';
import { MobileShellOverlayProvider, useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative, logMobileShellRoute, isNativeAuthRoute } from '@/utils/platform.js';
import { mobileDevLog } from '@/utils/mobileDevLog.js';

const AUTH_BOTTOM_NAV_HIDE_PREFIXES = [
  '/paiement',
  '/signature/',
];

const tabIcons = {
  home: Home,
  folders: FolderKanban,
  plus: Plus,
  files: Files,
  user: UserRound,
};

const isTabActive = (pathname, tabPath) => {
  if (tabPath === '/dashboard') return pathname === '/dashboard';
  if (tabPath === '/questionnaire') {
    return pathname.startsWith('/questionnaire') || pathname.startsWith('/simulateur');
  }
  if (tabPath === '/mobile/account') {
    return pathname.startsWith('/mobile/account') || pathname.startsWith('/profil') || pathname.startsWith('/settings');
  }
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
};

const shouldHideAuthBottomNav = (pathname) => AUTH_BOTTOM_NAV_HIDE_PREFIXES.some(
  (prefix) => pathname === prefix || pathname.startsWith(prefix),
);

const MobileAppShellInner = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const isLanding = location.pathname === '/';
  const isAuthScreen = isNativeAuthRoute(location.pathname);
  const showAuthenticatedNav = isAuthenticated && !isLanding && !isAuthScreen;
  const showBottomNav = !isAuthScreen && (showAuthenticatedNav
    ? !shouldHideAuthBottomNav(location.pathname)
    : true);
  const showPublicHeader = !isLanding && !isAuthScreen;
  const title = isLanding ? '' : resolveMobileShellTitle(location.pathname);
  const {
    drawerOpen,
    setDrawerOpen,
    notificationsOpen,
    setNotificationsOpen,
    closeTopOverlay,
    getTopOverlayName,
  } = useMobileShellOverlay();

  useEffect(() => {
    setDrawerOpen(false);
    logMobileShellRoute(location.pathname);
  }, [location.pathname, setDrawerOpen]);

  useEffect(() => {
    if (!CapApp?.addListener) return undefined;
    const sub = CapApp.addListener('appUrlOpen', (event) => {
      const raw = String(event?.url || '');
      if (!raw) return;
      try {
        const url = new URL(raw);
        const path = `${url.pathname}${url.search}${url.hash}`;
        if (path && path !== location.pathname) {
          navigate(path);
        }
      } catch (_error) {
        // ignore malformed deep links
      }
    });
    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isCapacitorNative() || !CapApp?.addListener) return undefined;

    let handle;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const topOverlay = getTopOverlayName();
      if (closeTopOverlay()) {
        mobileDevLog('backPressed', {
          route: location.pathname,
          topOverlay,
          action: 'closeOverlay',
        });
        return;
      }
      if (canGoBack) {
        mobileDevLog('backPressed', {
          route: location.pathname,
          topOverlay: null,
          action: 'navigateBack',
        });
        navigate(-1);
        return;
      }
      mobileDevLog('backPressed', {
        route: location.pathname,
        topOverlay: null,
        action: 'minimizeApp',
      });
      CapApp.minimizeApp?.();
    }).then((h) => {
      handle = h;
    });

    return () => {
      void handle?.remove?.();
    };
  }, [closeTopOverlay, getTopOverlayName, location.pathname, navigate]);

  const mainPaddingClass = showBottomNav
    ? isLanding
      ? 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]'
      : 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+var(--mobile-page-bottom-extra))]'
    : 'pb-[env(safe-area-inset-bottom)]';

  return (
    <MobileShellScrollProvider scrollRef={scrollRef}>
      <div className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
        <MobilePushRegistration />
        <MobileNativeOfflineBanner />
        <NativePermissionOrchestrator />
        <MobileNavCoachmarks />
        {showAuthenticatedNav ? (
          <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        ) : null}
        {showPublicHeader ? (
          <MobileStickyHeaderGroup showConnectedStrip={showAuthenticatedNav}>
            {showAuthenticatedNav ? (
              <MobileTopBar
                onMenuClick={() => setDrawerOpen(true)}
                notificationsOpen={notificationsOpen}
                onNotificationsOpenChange={setNotificationsOpen}
              />
            ) : (
              <MobileWebHeader title={title} />
            )}
          </MobileStickyHeaderGroup>
        ) : null}
        <main
          ref={scrollRef}
          className={`flex-1 overflow-y-auto ${mainPaddingClass}`}
        >
          {children}
        </main>
        {showBottomNav ? (
          showAuthenticatedNav ? (
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
              <ul className="mx-auto grid max-w-lg grid-cols-5">
                {MOBILE_AUTH_TABS_NATIVE.map((tab) => {
                  const Icon = tabIcons[tab.icon] || Home;
                  const active = isTabActive(location.pathname, tab.path);
                  const isPrimary = tab.icon === 'plus';
                  return (
                    <li key={tab.id}>
                      <Link
                        to={tab.path}
                        onClick={() => {
                          if (isPrimary) void triggerMobileHaptic('medium');
                        }}
                        className={`flex min-h-[48px] flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition ${
                          active ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {isPrimary ? (
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-elevation-sm ${
                            active ? 'bg-[hsl(var(--greffio-blue))]' : 'bg-[hsl(var(--greffio-blue))]/90'
                          }`}>
                            <Icon className="h-5 w-5" strokeWidth={2.4} />
                          </span>
                        ) : (
                          <span className={`rounded-xl p-1.5 transition ${active ? 'bg-secondary text-primary' : ''}`}>
                            <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.4 : 2} />
                          </span>
                        )}
                        {tab.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : (
            <MobilePublicBottomNav />
          )
        ) : null}
      </div>
    </MobileShellScrollProvider>
  );
};

export const MobileAppShell = ({ children }) => (
  <MobileShellOverlayProvider>
    <MobileAppShellInner>{children}</MobileAppShellInner>
  </MobileShellOverlayProvider>
);
