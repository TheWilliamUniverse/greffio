import React from 'react';
import { cn } from '@/lib/utils.js';

export const MobileCompositeStep = ({
  kicker,
  title,
  subtitle,
  hint,
  progressPercent,
  stepCurrent,
  stepTotal,
  localStepCurrent,
  localStepTotal,
  children,
  className,
}) => (
  <div className={cn('mobile-composite-step flex w-full flex-col', className)}>
    <header className="shrink-0 space-y-1.5">
      {kicker ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{kicker}</p>
      ) : null}
      <h2 className="font-display text-xl font-extrabold leading-snug tracking-tight text-[hsl(var(--greffio-blue-900))]">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
      {typeof progressPercent === 'number' ? (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#e8f0fa]">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          />
        </div>
      ) : null}
      {stepCurrent && stepTotal ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Question {stepCurrent} sur {stepTotal}
          {localStepCurrent && localStepTotal ? ` · Étape ${localStepCurrent}/${localStepTotal}` : ''}
        </p>
      ) : null}
    </header>

    <div className="mt-4 rounded-2xl border border-[#d4e2f5] bg-white p-4 shadow-sm">
      {children}
    </div>

    {hint ? (
      <p className="mt-4 text-center text-xs font-medium text-primary/85">{hint}</p>
    ) : null}
  </div>
);
