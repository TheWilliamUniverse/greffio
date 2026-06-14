import React from 'react';
import { cn } from '@/lib/utils.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';

/** Coquille publique minimaliste – sans header global ni footer marketing. */
export const StandalonePublicShell = ({
  children,
  className = '',
  contentClassName = '',
}) => (
  <div className={cn('min-h-[100dvh] bg-[#f6f8fc]', className)}>
    <header className="border-b border-border/60 bg-white/90 px-4 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-center">
        <GreffioLogo variant="wordmark" className="text-2xl md:text-3xl" />
      </div>
    </header>
    <main className={cn('mx-auto w-full max-w-3xl px-4 py-10 md:py-14', contentClassName)}>
      {children}
    </main>
    <footer className="px-4 pb-8 pt-2 text-center text-[11px] leading-5 text-muted-foreground">
      Greffio – service privé d&apos;assistance aux formalités d&apos;entreprise.
    </footer>
  </div>
);
