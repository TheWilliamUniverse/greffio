import React from 'react';
import { COMPARATOR_DISCLAIMER_SHORT } from '@/config/legalFormComparator.js';
import { cn } from '@/lib/utils';

export const LegalFormDisclaimer = ({ className, compact = false }) => (
  <p
    className={cn(
      'rounded-xl border border-[hsl(var(--we-border))] bg-[hsl(var(--we-bg))] text-muted-foreground',
      compact ? 'p-3 text-xs leading-5' : 'p-4 text-sm leading-6',
      className,
    )}
  >
    {COMPARATOR_DISCLAIMER_SHORT}
  </p>
);
