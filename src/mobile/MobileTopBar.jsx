import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';
import { useMobileShellScroll } from '@/mobile/context/MobileShellScrollContext.jsx';
import { cn } from '@/lib/utils.js';

export const MobileTopBar = ({
  onMenuClick,
  notificationsOpen,
  onNotificationsOpenChange,
}) => {
  const scrolled = useMobileShellScroll();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/60 bg-white/90 backdrop-blur-md pt-[env(safe-area-inset-top)] transition-shadow duration-200',
        scrolled ? 'shadow-[0_8px_24px_rgba(10,18,32,0.08)]' : 'shadow-none',
      )}
    >
      <div className="flex min-h-[4.75rem] items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <GreffioLogo variant="mark" className="h-8 w-auto" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
                Greffio
              </span>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">Espace client</span>
            </div>
          </Link>
        </div>
        <MobileCockpitHeaderActions
          showNotifications
          notificationsOpen={notificationsOpen}
          onNotificationsOpenChange={onNotificationsOpenChange}
        />
      </div>
    </header>
  );
};
