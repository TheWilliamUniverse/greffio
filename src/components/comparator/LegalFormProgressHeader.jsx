import React from 'react';
import { ProgressiveStepChips } from '@/components/ProgressiveStepChips.jsx';
import { ProgressCircle } from '@/components/questionnaire/ProgressCircle.jsx';

export const LegalFormProgressHeader = ({
  currentStep,
  totalSteps,
  stepLabels,
  isMobile,
}) => {
  const progress = totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  return (
    <div className="mb-4 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Question {currentStep + 1} sur {totalSteps}
        </p>
        {!isMobile ? <ProgressCircle value={progress} size={44} /> : null}
      </div>
      {isMobile ? (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        <ProgressiveStepChips
          steps={stepLabels}
          currentStep={currentStep}
          variant="compact"
        />
      )}
    </div>
  );
};
