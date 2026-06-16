import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { buildDossierTimelineSteps } from '@/utils/dossierClientStatus.js';
import { cn } from '@/lib/utils.js';
import { greffioTimelinePulse } from '@/motion/greffioMotion.js';

const stateLabels = {
  done: 'Validé',
  active: 'En cours',
  upcoming: 'À venir',
};

export const MobileDossierTimeline = ({ dossier, className }) => {
  const reduceMotion = useReducedMotion();
  const steps = buildDossierTimelineSteps(dossier);
  const activeId = steps.find((step) => step.state === 'active')?.id;
  const [pulseKey, setPulseKey] = useState(activeId);

  useEffect(() => {
    if (activeId && activeId !== pulseKey) {
      setPulseKey(activeId);
    }
  }, [activeId, pulseKey]);

  return (
    <section className={cn('rounded-3xl border border-border/70 bg-white p-4 shadow-sm', className)}>
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Progression</h2>
      <ol className="mt-4 space-y-0">
        {steps.map((step, index) => {
          const isActive = step.state === 'active';
          const isDone = step.state === 'done';
          return (
            <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    'absolute left-[11px] top-6 h-[calc(100%-8px)] w-0.5',
                    isDone ? 'bg-primary/40' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <motion.span
                key={isActive ? `${step.id}-${pulseKey}` : step.id}
                className={cn(
                  'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-extrabold',
                  isDone && 'border-primary bg-primary text-white',
                  isActive && 'border-primary bg-white text-primary',
                  step.state === 'upcoming' && 'border-border bg-muted text-muted-foreground',
                )}
                animate={isActive && !reduceMotion ? greffioTimelinePulse.animate : undefined}
                transition={greffioTimelinePulse.transition}
                aria-hidden="true"
              >
                {isDone ? '●' : isActive ? '◐' : '○'}
              </motion.span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={cn('text-sm font-bold', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{stateLabels[step.state]}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
