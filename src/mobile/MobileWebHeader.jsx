import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';

export const MobileWebHeader = ({ title, onMenuClick }) => (
  <header className="sticky top-0 z-40 border-b border-border/70 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
    <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
      {onMenuClick ? <MobileMenuButton onClick={onMenuClick} className="shrink-0" /> : null}

      {onMenuClick ? (
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">
          {title || 'Greffio'}
        </p>
      ) : (
        <>
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Accueil Greffio">
            <GreffioLogo className="text-2xl md:text-3xl" />
          </Link>
          {title ? (
            <p className="truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">{title}</p>
          ) : (
            <Link to="/login" className="shrink-0 text-sm font-semibold text-primary">
              Connexion
            </Link>
          )}
        </>
      )}
    </div>
  </header>
);
