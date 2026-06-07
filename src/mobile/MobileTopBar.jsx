import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { fetchMobileNotifications } from '@/api/mobile.js';
import { useAuth } from '@/hooks/useAuth.js';

export const MobileTopBar = ({ onMenuClick, notificationsOpen, onNotificationsOpenChange }) => {
  const { isAuthenticated } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = notificationsOpen ?? internalOpen;
  const setOpen = onNotificationsOpenChange ?? setInternalOpen;
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.length;

  useEffect(() => {
    if (!isAuthenticated) return undefined;
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
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-white/90 px-4 py-3 backdrop-blur-md pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <GreffioLogo variant="mark" className="h-7 w-auto" />
            <span className="truncate text-sm font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Greffio</span>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative rounded-full border border-border/70 bg-white p-2.5 shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-primary" />
          {unread ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
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
                  <Link to={item.path} onClick={() => setOpen(false)} className="mt-2 inline-block text-xs font-semibold text-primary">
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
    </>
  );
};
