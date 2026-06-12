import React from 'react';
import { Check } from 'lucide-react';

export const ProgressiveStepChips = ({
  steps,
  activeIndex,
  /** N’affiche que les étapes déjà atteintes (progression séquentielle). */
  revealThroughIndex = null,
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';

  return (
  <nav
    aria-label="Étapes du questionnaire"
    className={isCompact ? 'simulator-stepper-mask max-w-full overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'overflow-x-auto pb-1 md:overflow-visible'}
  >
    <ol className={isCompact ? 'flex max-w-full items-center gap-1 px-0.5' : 'flex min-w-0 flex-wrap items-center gap-1 sm:min-w-max sm:flex-nowrap'}>
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
              className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${
                isCompact ? 'px-2.5 py-1 text-[10px]' : 'gap-1.5 px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs'
              } ${
                done
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
                  : active
                    ? 'bg-primary text-white shadow-sm'
                    : isCompact
                      ? 'bg-white text-muted-foreground ring-1 ring-[#d4e2f5]'
                      : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {done ? <Check className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.5} /> : (
                <span className={`flex items-center justify-center rounded-full ${
                  isCompact ? 'h-3.5 w-3.5 text-[9px]' : 'h-4 w-4 text-[10px]'
                } ${active ? 'bg-white/20' : 'bg-white ring-1 ring-border'}`}
                >
                  {index + 1}
                </span>
              )}
              <span>{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  </nav>
  );
};
