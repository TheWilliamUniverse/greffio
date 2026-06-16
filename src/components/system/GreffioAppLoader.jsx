import React from 'react';
import { cn } from '@/lib/utils.js';

export const GreffioAppLoader = ({
  label = 'Chargement…',
  className,
  fullScreen = false,
}) => (
  <div
    className={cn(
      'flex items-center justify-center bg-background',
      fullScreen ? 'min-h-dvh' : 'min-h-[50vh] w-full',
      className,
    )}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="relative h-10 w-10" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/70" />
    </div>
    {label ? <span className="sr-only">{label}</span> : null}
  </div>
);
