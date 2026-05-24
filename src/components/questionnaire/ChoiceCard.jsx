import React from 'react';
import { Check } from 'lucide-react';

export const ChoiceCard = ({
  selected,
  title,
  description,
  onClick,
  compact = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex w-full items-center gap-3 rounded-xl border text-left transition ${
      compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
    } ${
      selected
        ? 'border-primary bg-secondary shadow-sm'
        : 'border-border bg-white hover:border-primary/30 hover:bg-muted/20'
    }`}
  >
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-2 ${
        compact ? 'h-4 w-4' : 'h-5 w-5'
      } ${
        selected ? 'border-primary bg-primary text-white' : 'border-border bg-white group-hover:border-primary/40'
      }`}
    >
      {selected ? <Check className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={3} /> : null}
    </span>
    <span className="min-w-0">
      <span className={`block ${compact ? 'text-sm' : 'text-sm'} ${selected ? 'font-semibold' : 'font-medium'}`}>
        {title}
      </span>
      {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
    </span>
  </button>
);
