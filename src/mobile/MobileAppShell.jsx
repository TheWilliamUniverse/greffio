import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Files, FolderKanban, Home, Plus, UserRound } from 'lucide-react';
import { MOBILE_BOTTOM_TABS } from '@/config/mobileStore.js';
import { MobileTopBar } from '@/mobile/MobileTopBar.jsx';
import { MobilePushRegistration } from '@/mobile/MobilePushRegistration.jsx';
import { MobileSidebarDrawer } from '@/components/MobileSidebarDrawer.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';

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

export const MobileAppShell = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
      if (navOpen) {
        setNavOpen(false);
        return;
      }
      if (notificationsOpen) {
        setNotificationsOpen(false);
        return;
      }
      if (canGoBack) {
        navigate(-1);
        return;
      }
      CapApp.minimizeApp?.();
    }).then((h) => {
      handle = h;
    });

    return () => {
      void handle?.remove?.();
    };
  }, [navOpen, notificationsOpen, navigate]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
      <MobilePushRegistration />
      {isAuthenticated ? (
        <MobileSidebarDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      ) : null}
      <MobileTopBar
        onMenuClick={isAuthenticated ? () => setNavOpen(true) : undefined}
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
      />
      <main className="flex-1 overflow-y-auto pb-[calc(5.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tabIcons[tab.icon] || Home;
            const active = isTabActive(location.pathname, tab.path);
            const isPrimary = tab.icon === 'plus';
            return (
              <li key={tab.id}>
                <Link
                  to={tab.path}
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
    </div>
  );
};
