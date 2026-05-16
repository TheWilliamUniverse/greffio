import React from 'react';

export const ProgressiveStepChips = ({
  steps,
  activeIndex,
}) => (
  <div className="mb-4 flex flex-wrap gap-2">
    {steps.map((step, index) => (
      <span
        key={step.id || step.label || String(index)}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          index < activeIndex
            ? 'bg-emerald-100 text-emerald-700'
            : index === activeIndex
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {index + 1}. {step.label}
      </span>
    ))}
  </div>
);
