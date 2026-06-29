import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';
import { isCapacitorNative } from '@/utils/platform.js';
import { GREFFIO_MARKETING_HOME, GREFFIO_BRAND_HOME_LABEL } from '@/utils/greffioBrandNavigation.js';

const headerRowClass = 'mx-auto flex min-h-[3.75rem] max-w-lg items-center gap-2 px-4 py-2';

export const MobileWebHeader = ({ title, onMenuClick }) => {
  const isAuthenticatedCockpit = Boolean(onMenuClick);
  const homePath = isCapacitorNative() ? '/dashboard' : '/';

  return (
    <header className="border-b border-border/70 pt-[env(safe-area-inset-top)]">
      <div className={headerRowClass}>
        {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}

        {isAuthenticatedCockpit ? (
          <>
            <Link
              to={GREFFIO_MARKETING_HOME}
              className="shrink-0 overflow-hidden"
              aria-label={GREFFIO_BRAND_HOME_LABEL}
            >
              <GreffioLogo variant="full" className="origin-left scale-[0.72]" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">
                {title || 'Accueil'}
              </p>
            </div>
            <MobileCockpitHeaderActions />
          </>
        ) : (
          <>
            <Link to={homePath} className="flex min-w-0 flex-1 items-center" aria-label="Accueil Greffio">
              <GreffioLogo variant="full" className="text-xl" />
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
