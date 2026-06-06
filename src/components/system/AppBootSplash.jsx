import React from 'react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';

export const AppBootSplash = ({ label = 'Chargement de votre espace…' }) => (
  <div
    className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <GreffioLogo variant="tile" className="mb-6 scale-90" />
    <div className="h-1.5 w-36 overflow-hidden rounded-full bg-primary/15">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
    </div>
    <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
  </div>
);
