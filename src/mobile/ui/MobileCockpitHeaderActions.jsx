import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Power, Search, User } from 'lucide-react';
import { showAuthFeedback } from '@/utils/authFeedback.js';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { MobileCockpitSearchDialog } from '@/mobile/ui/MobileCockpitSearchDialog.jsx';
import { MobileAccountQuickSheet } from '@/mobile/ui/MobileAccountQuickSheet.jsx';
import { MobileLogoutConfirmDialog } from '@/mobile/ui/MobileLogoutConfirmDialog.jsx';
import { useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';
import { useBiometricSession } from '@/context/BiometricSessionContext.jsx';
import { fetchNotificationsSummary } from '@/api/notifications.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isBiometricUnlockEnabled } from '@/utils/biometricAuth.js';
import { cn } from '@/lib/utils.js';
import { CountBadge, countBadgeHostClass } from '@/components/ui/count-badge.jsx';

export const mobileHeaderIconButtonClass = cn(
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white',
  'text-[#0a1220] transition hover:bg-muted active:scale-[0.97]',
);

export const mobileHeaderAvatarButtonClass = cn(
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
  'bg-primary/10 text-sm font-bold text-primary transition hover:bg-primary/20 active:scale-[0.97]',
);

export const mobileHeaderLogoutButtonClass = cn(
  mobileHeaderIconButtonClass,
  'text-[#0a1220] hover:border-[#0a1220]/30 hover:bg-muted',
);

export const MobileCockpitHeaderActions = ({
  className,
  showNotifications = false,
  notificationsOpen,
  onNotificationsOpenChange,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const biometricSession = useBiometricSession();
  const {
    accountOpen,
    setAccountOpen,
    logoutOpen,
    setLogoutOpen,
    logoutMode,
    openLogoutDialog,
    searchOpen,
    setSearchOpen,
    notificationsOpen: ctxNotificationsOpen,
    setNotificationsOpen: setCtxNotificationsOpen,
  } = useMobileShellOverlay();
  const [internalNotifOpen, setInternalNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifOpen = notificationsOpen ?? ctxNotificationsOpen ?? internalNotifOpen;
  const setNotifOpen = onNotificationsOpenChange ?? setCtxNotificationsOpen ?? setInternalNotifOpen;
  const unread = unreadCount || notifications.filter((item) => item.tone === 'action').length || notifications.length;
  const firstName = currentUser?.firstName || 'Greffio';

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return undefined;
    let mounted = true;
    const load = async () => {
      try {
        const payload = await fetchNotificationsSummary();
        if (mounted) {
          setNotifications(payload?.notifications || []);
          setUnreadCount(Number(payload?.unreadCount || 0));
        }
      } catch (_error) {
        if (mounted) setNotifications([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [showNotifications, isAuthenticated, notifOpen]);

  const confirmLogout = () => {
    setLogoutOpen(false);
    setAccountOpen(false);
    logout();
    navigate('/login');
  };

  const confirmSleep = async () => {
    setLogoutOpen(false);
    setAccountOpen(false);
    if (isCapacitorNative()) {
      try {
        const biometricEnabled = await isBiometricUnlockEnabled();
        if (biometricEnabled && biometricSession?.resetLock) {
          biometricSession.resetLock();
          return;
        }
      } catch (_error) {
        /* fallback déconnexion douce ci-dessous */
      }
    }
    logout({ silent: true });
    navigate('/login');
    showAuthFeedback('sessionSleep', 'Session mise en veille. Reconnectez-vous pour reprendre.', { level: 'info' });
  };

  const confirmDialogAction = () => {
    if (logoutMode === 'sleep') {
      void confirmSleep();
      return;
    }
    confirmLogout();
  };

  return (
    <>
      <div className={cn('flex shrink-0 items-center gap-1.5 overflow-visible pr-0.5', className)}>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Rechercher"
          className={mobileHeaderIconButtonClass}
        >
          <Search className="h-4 w-4" />
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-label="Mon compte"
            className={mobileHeaderAvatarButtonClass}
          >
            {firstName.charAt(0) || 'G'}
          </button>
        ) : (
          <Link to="/login" aria-label="Connexion" className={mobileHeaderIconButtonClass}>
            <User className="h-4 w-4" />
          </Link>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => openLogoutDialog('logout')}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className={mobileHeaderLogoutButtonClass}
          >
            <Power className="h-[18px] w-[18px] stroke-[2.5]" />
          </button>
        ) : null}

        {showNotifications && isCapacitorNative() ? (
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label="Notifications"
            className={cn(mobileHeaderIconButtonClass, countBadgeHostClass)}
          >
            <Bell className="h-4 w-4 text-primary" />
            <CountBadge count={unread} className="bg-red-500" positionClassName="-right-1 -top-1" />
          </button>
        ) : null}
      </div>

      <MobileCockpitSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <MobileAccountQuickSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onLogoutRequest={() => openLogoutDialog('logout')}
        onSleepRequest={() => openLogoutDialog('sleep')}
      />

      <MobileLogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={confirmDialogAction}
        mode={logoutMode}
      />

      {showNotifications ? (
        <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
          <SheetContent side="right" className="w-[min(100vw,24rem)]">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <ul className="mt-4 space-y-3">
              {notifications.length ? notifications.map((item) => (
                <li key={item.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  {item.path ? (
                    <Link
                      to={item.path}
                      onClick={() => setNotifOpen(false)}
                      className="mt-2 inline-block text-xs font-semibold text-primary"
                    >
                      Ouvrir
                    </Link>
                  ) : null}
                </li>
              )) : (
                <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Aucune notification pour le moment.
                </li>
              )}
            </ul>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
};
