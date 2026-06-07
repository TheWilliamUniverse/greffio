import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';

const headerRowClass = 'mx-auto flex min-h-[4.75rem] max-w-lg items-center gap-2 px-4 py-2.5';

export const MobileWebHeader = ({ title, onMenuClick }) => {
  const isAuthenticatedCockpit = Boolean(onMenuClick);

  return (
    <header className="border-b border-border/70 pt-[env(safe-area-inset-top)]">
      <div className={headerRowClass}>
        {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}

        {isAuthenticatedCockpit ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">
                {title || 'Greffio'}
              </p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">Espace client</p>
            </div>
            <MobileCockpitHeaderActions />
          </>
        ) : (
          <>
            <Link to="/" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Accueil Greffio">
              <GreffioLogo className="text-2xl md:text-3xl" />
            </Link>
            {title ? (
              <p className="truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">{title}</p>
            ) : (
              <MobileCockpitHeaderActions />
            )}
          </>
        )}
      </div>
    </header>
  );
};
