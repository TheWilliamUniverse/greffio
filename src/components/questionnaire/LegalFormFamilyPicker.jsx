import React from 'react';
import { MobileChoiceStep, MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { QUESTIONNAIRE_FORM_FAMILY_GROUPS } from '@/lib/questionnaireFormFamilies.js';
import { cn } from '@/lib/utils.js';

export const LegalFormFamilyPicker = ({
  value = '',
  onSelect,
  mobilePresentation = false,
  progressPercent,
  stepCurrent,
  stepTotal,
  className,
}) => {
  if (mobilePresentation) {
    return (
      <MobileChoiceStep
        kicker="Structure"
        title="Quelle catégorie correspond à votre projet ?"
        subtitle="Choisissez la famille juridique la plus proche de votre activité."
        hint="Touchez une catégorie pour continuer."
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
        gridClassName="grid grid-cols-1 gap-2.5"
        className={className}
      >
        {QUESTIONNAIRE_FORM_FAMILY_GROUPS.map((group) => (
          <MobileChoiceTile
            key={group.category}
            title={group.category}
            description={`${group.forms.length} forme${group.forms.length > 1 ? 's' : ''} disponibles`}
            selected={value === group.category}
            onSelect={() => onSelect(group.category)}
          />
        ))}
      </MobileChoiceStep>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {QUESTIONNAIRE_FORM_FAMILY_GROUPS.map((group) => (
        <button
          key={group.category}
          type="button"
          onClick={() => onSelect(group.category)}
          className={cn(
            'rounded-2xl border p-4 text-left transition',
            value === group.category
              ? 'border-primary bg-secondary shadow-elevation-md'
              : 'border-border bg-white hover:border-primary/40 hover:shadow-elevation-sm',
          )}
        >
          <span className="block text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{group.category}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {group.forms.length} formes disponibles
          </span>
        </button>
      ))}
    </div>
  );
};
