import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';

export const MobileTopBar = ({
  onMenuClick,
  notificationsOpen,
  onNotificationsOpenChange,
}) => (
  <header className="border-b border-border/60 pt-[env(safe-area-inset-top)]">
    <div className="flex min-h-[4.75rem] items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}
        <Link to="/dashboard" className="flex min-w-0 items-center">
          <div className="min-w-0">
            <GreffioLogo variant="full" className="text-lg leading-none" />
            <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">Espace client</span>
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
