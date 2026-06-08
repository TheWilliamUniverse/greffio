import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export const SimulatorJourneyCard = ({
  title,
  description,
  icon: Icon,
  iconTone = 'bg-secondary',
  selected = false,
  onSelect,
  compact = false,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={cn(
      'group relative flex w-full flex-col text-left transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
      compact ? 'min-h-[8.5rem] rounded-2xl p-3.5' : 'min-h-[10rem] rounded-[22px] p-5 sm:p-6',
      selected
        ? 'border-2 border-primary bg-secondary/70 shadow-[0_8px_22px_rgba(30,77,140,0.1)]'
        : 'border border-[#d4e2f5] bg-white shadow-[0_2px_10px_rgba(15,31,61,0.04)] active:scale-[0.98]',
    )}
  >
    {selected ? (
      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    ) : null}
    <span
      className={cn(
        'mb-3 flex shrink-0 items-center justify-center rounded-xl text-primary',
        iconTone,
        compact ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11',
      )}
    >
      <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} aria-hidden />
    </span>
    <span className={cn('block font-extrabold leading-snug text-[hsl(var(--greffio-blue-900))]', compact ? 'text-sm' : 'text-base sm:text-lg')}>
      {title}
    </span>
    <span className={cn('mt-1.5 block leading-snug text-muted-foreground', compact ? 'line-clamp-3 text-xs' : 'text-sm leading-5')}>
      {description}
    </span>
  </button>
);
