import React from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'border-border bg-muted/60 text-foreground',
  blue: 'border-primary/25 bg-secondary/70 text-primary',
  mint: 'border-[hsl(var(--greffio-mint)/0.4)] bg-[hsl(var(--greffio-mint)/0.12)] text-[hsl(var(--greffio-blue-900))]',
  citron: 'border-[hsl(var(--greffio-citron)/0.5)] bg-[hsl(var(--greffio-citron)/0.18)] text-[hsl(var(--greffio-blue-900))]',
  coral: 'border-[hsl(var(--greffio-coral)/0.3)] bg-[hsl(var(--greffio-coral)/0.08)] text-[hsl(var(--greffio-blue-900))]',
  outline: 'border-[hsl(var(--we-border))] bg-white text-muted-foreground',
};

export const LegalFormBadge = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-5',
      TONES[tone] || TONES.neutral,
      className,
    )}
  >
    {children}
  </span>
);

export const AvailabilityBadge = ({ availability, className }) => {
  if (availability === 'AVAILABLE_NOW' || availability === 'available_now') {
    return <LegalFormBadge tone="mint" className={className}>Disponible maintenant</LegalFormBadge>;
  }
  if (availability === 'COMING_SOON' || availability === 'coming_soon') {
    return <LegalFormBadge tone="citron" className={className}>Bientôt</LegalFormBadge>;
  }
  return <LegalFormBadge tone="outline" className={className}>Sur devis</LegalFormBadge>;
};

export const FitBadge = ({ fitLevel, label, className }) => {
  const tone = fitLevel === 'strong'
    ? 'mint'
    : fitLevel === 'good'
      ? 'blue'
      : fitLevel === 'avoid'
        ? 'coral'
        : 'neutral';
  return <LegalFormBadge tone={tone} className={className}>{label}</LegalFormBadge>;
};
