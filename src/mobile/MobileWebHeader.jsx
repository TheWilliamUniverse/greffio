import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';
import { useMobileShellScroll } from '@/mobile/context/MobileShellScrollContext.jsx';
import { cn } from '@/lib/utils.js';

const headerShellClass = (scrolled) => cn(
  'sticky top-0 z-40 border-b border-border/70 bg-white/95 backdrop-blur-md pt-[env(safe-area-inset-top)] transition-shadow duration-200',
  scrolled ? 'shadow-[0_8px_24px_rgba(10,18,32,0.08)]' : 'shadow-none',
);

const headerRowClass = 'mx-auto flex min-h-[4.75rem] max-w-lg items-center gap-2 px-4 py-2.5';

export const MobileWebHeader = ({ title, onMenuClick }) => {
  const scrolled = useMobileShellScroll();
  const isAuthenticatedCockpit = Boolean(onMenuClick);

  return (
    <header className={headerShellClass(scrolled)}>
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
