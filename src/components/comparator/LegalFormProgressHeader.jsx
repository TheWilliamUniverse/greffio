import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const LegalFormProgressHeader = ({
  currentStep,
  totalSteps,
  isMobile,
}) => {
  const reduceMotion = useReducedMotion();
  const progress = totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  return (
    <div className="mb-5 min-w-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Étape {currentStep + 1} sur {totalSteps}
        </p>
        <p className="text-xs font-semibold tabular-nums text-muted-foreground" aria-hidden>
          {progress}%
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep + 1}
        aria-label={`Progression du questionnaire : étape ${currentStep + 1} sur ${totalSteps}`}
        className={`w-full overflow-hidden rounded-full bg-[#e3ebf7] ${isMobile ? 'h-1.5' : 'h-2'}`}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
};
