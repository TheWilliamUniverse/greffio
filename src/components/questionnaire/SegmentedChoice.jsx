import React from 'react';
import { Check } from 'lucide-react';

export const SegmentedChoice = ({
  options,
  value,
  onChange,
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {options.map((option) => {
      const optionValue = typeof option === 'string' ? option : option.key;
      const optionLabel = typeof option === 'string' ? option : option.label;
      const selected = String(value || '') === String(optionValue);
      return (
        <button
          type="button"
          key={optionValue}
          onClick={() => onChange(optionValue)}
          className={`relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
            selected
              ? 'border-primary bg-secondary shadow-sm'
              : 'border-border bg-white hover:border-primary/30 hover:bg-muted/30'
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              selected ? 'border-primary bg-primary text-white' : 'border-border bg-white'
            }`}
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          <span className={`text-sm ${selected ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
            {optionLabel}
          </span>
        </button>
      );
    })}
  </div>
);
