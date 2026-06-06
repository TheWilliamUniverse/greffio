import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';

export const MobileWebHeader = ({ title }) => (
  <header className="sticky top-0 z-40 border-b border-border/70 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
    <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2" aria-label="Accueil Greffio">
        <GreffioLogo variant="tile" className="scale-[0.85] origin-left" />
      </Link>
      {title ? (
        <p className="truncate text-sm font-bold text-[hsl(var(--greffio-blue-900))]">{title}</p>
      ) : (
        <Link to="/login" className="text-sm font-semibold text-primary">
          Connexion
        </Link>
      )}
    </div>
  </header>
);
