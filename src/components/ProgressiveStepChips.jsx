import React from 'react';
import { Check } from 'lucide-react';

export const ProgressiveStepChips = ({
  steps,
  activeIndex,
  /** N’affiche que les étapes déjà atteintes (progression séquentielle). */
  revealThroughIndex = null,
}) => (
  <nav aria-label="Étapes du questionnaire" className="overflow-x-auto pb-1">
    <ol className="flex min-w-max items-center gap-1">
      {steps.map((step, index) => {
        if (revealThroughIndex != null && index > revealThroughIndex) return null;
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={step.id || step.label || String(index)} className="flex items-center">
            {index > 0 ? (
              <span className={`mx-1 hidden h-px w-4 sm:block ${done ? 'bg-emerald-300' : 'bg-border'}`} aria-hidden />
            ) : null}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${
                done
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : (
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  active ? 'bg-white/20' : 'bg-white ring-1 ring-border'
                }`}
                >
                  {index + 1}
                </span>
              )}
              <span className="whitespace-nowrap">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  </nav>
);
