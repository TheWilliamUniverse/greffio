import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Search, Settings, User, UserRound } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { MobileCockpitSearchDialog } from '@/mobile/ui/MobileCockpitSearchDialog.jsx';
import { fetchMobileNotifications } from '@/api/mobile.js';
import { useAuth } from '@/hooks/useAuth.js';
import { cn } from '@/lib/utils.js';

export const mobileHeaderIconButtonClass = cn(
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-white',
  'text-[#0a1220] transition hover:bg-muted active:scale-[0.97]',
);

export const mobileHeaderLogoutButtonClass = cn(
  mobileHeaderIconButtonClass,
  'text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600',
);

export const MobileCockpitHeaderActions = ({
  className,
  showNotifications = false,
  notificationsOpen,
  onNotificationsOpenChange,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [internalNotifOpen, setInternalNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const notifOpen = notificationsOpen ?? internalNotifOpen;
  const setNotifOpen = onNotificationsOpenChange ?? setInternalNotifOpen;
  const unread = notifications.length;

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return undefined;
    let mounted = true;
    const load = async () => {
      try {
        const payload = await fetchMobileNotifications();
        if (mounted) setNotifications(payload?.notifications || []);
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

  return (
    <>
      <div className={cn('flex shrink-0 items-center gap-1.5', className)}>
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
            className={mobileHeaderIconButtonClass}
          >
            <User className="h-4 w-4" />
          </button>
        ) : (
          <Link to="/login" aria-label="Connexion" className={mobileHeaderIconButtonClass}>
            <User className="h-4 w-4" />
          </Link>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            aria-label="Se déconnecter"
            className={mobileHeaderLogoutButtonClass}
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : null}

        {showNotifications ? (
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label="Notifications"
            className={cn(mobileHeaderIconButtonClass, 'relative')}
          >
            <Bell className="h-4 w-4 text-primary" />
            {unread ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      <MobileCockpitSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="right" className="w-[min(100vw,24rem)]">
          <SheetHeader>
            <SheetTitle>Mon compte</SheetTitle>
          </SheetHeader>
          <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
            <p className="text-sm font-bold">{currentUser?.firstName} {currentUser?.lastName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currentUser?.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">{currentUser?.company?.name || 'Projet à créer'}</p>
          </div>
          <ul className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-white">
            {[
              { to: '/mobile/account', icon: UserRound, label: 'Centre compte', hint: 'Profil et préférences' },
              { to: '/settings', icon: Settings, label: 'Paramètres', hint: 'Sécurité et alertes' },
            ].map((row) => (
              <li key={row.to} className="border-b border-border/60 last:border-b-0">
                <Link
                  to={row.to}
                  onClick={() => setAccountOpen(false)}
                  className="flex min-h-[64px] items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <row.icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{row.label}</span>
                    <span className="block text-xs text-muted-foreground">{row.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setLogoutOpen(true);
            }}
            className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-white text-sm font-semibold text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-[min(100vw-2rem,24rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous quitterez votre espace client Greffio. Vos dossiers restent enregistrés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogCancel className="mt-0 h-11 w-full rounded-2xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="h-11 w-full rounded-2xl bg-red-600 hover:bg-red-700"
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
