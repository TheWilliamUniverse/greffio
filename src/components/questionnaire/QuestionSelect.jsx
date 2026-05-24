import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuestionSelect = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'À compléter',
  options = [],
  className,
  id,
}) => (
  <div className={cn('relative mt-2', className)}>
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={onChange}
      className={cn(
        'h-14 w-full cursor-pointer appearance-none rounded-2xl border-2 border-[#d4e2f5] bg-white',
        'pl-4 pr-12 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
        'transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12',
        'disabled:cursor-not-allowed disabled:opacity-55',
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary"
      strokeWidth={2.25}
      aria-hidden
    />
  </div>
);
