import React from 'react';
import { MobileChoiceStep, MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import {
  QUESTIONNAIRE_FORM_FAMILY_AUTRES,
  QUESTIONNAIRE_PRIMARY_FORM_FAMILIES,
  QUESTIONNAIRE_SECONDARY_FORM_FAMILIES,
  getFormCountForFamily,
} from '@/lib/questionnaireFormFamilies.js';
import { cn } from '@/lib/utils.js';

const AUTRES_TILE_LABEL = 'Autres';

const formatFamilyCountLabel = (count) => (
  `${count} forme${count > 1 ? 's' : ''} disponibles`
);

const resolveFamiliesForTier = (tier) => (
  tier === 'secondary' ? QUESTIONNAIRE_SECONDARY_FORM_FAMILIES : QUESTIONNAIRE_PRIMARY_FORM_FAMILIES
);

export const LegalFormFamilyPicker = ({
  value = '',
  onSelect,
  tier = 'primary',
  mobilePresentation = false,
  progressPercent,
  stepCurrent,
  stepTotal,
  className,
}) => {
  const isSecondary = tier === 'secondary';
  const families = resolveFamiliesForTier(tier);
  const autresFormCount = getFormCountForFamily(QUESTIONNAIRE_FORM_FAMILY_AUTRES);

  const mobileTitle = isSecondary
    ? 'Précisez votre catégorie'
    : 'Quelle catégorie correspond à votre projet ?';
  const mobileSubtitle = isSecondary
    ? 'Choisissez la famille juridique la plus proche de votre activité.'
    : 'Choisissez la famille juridique la plus proche de votre activité.';
  const mobileKicker = isSecondary ? 'Autres' : 'Structure';

  if (mobilePresentation) {
    return (
      <MobileChoiceStep
        kicker={mobileKicker}
        title={mobileTitle}
        subtitle={mobileSubtitle}
        hint="Touchez une catégorie pour continuer."
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
        gridClassName="grid grid-cols-1 gap-2.5"
        className={className}
      >
        {families.map((category) => {
          const count = getFormCountForFamily(category);
          return (
            <MobileChoiceTile
              key={category}
              title={category}
              description={formatFamilyCountLabel(count)}
              selected={value === category}
              onSelect={() => onSelect(category)}
            />
          );
        })}
        {!isSecondary ? (
          <MobileChoiceTile
            key={QUESTIONNAIRE_FORM_FAMILY_AUTRES}
            title={AUTRES_TILE_LABEL}
            description={`Coopératives, agricole, montages… · ${formatFamilyCountLabel(autresFormCount)}`}
            selected={value === QUESTIONNAIRE_FORM_FAMILY_AUTRES}
            onSelect={() => onSelect(QUESTIONNAIRE_FORM_FAMILY_AUTRES)}
          />
        ) : null}
      </MobileChoiceStep>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {families.map((category) => {
        const count = getFormCountForFamily(category);
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              value === category
                ? 'border-primary bg-secondary shadow-elevation-md'
                : 'border-border bg-white hover:border-primary/40 hover:shadow-elevation-sm',
            )}
          >
            <span className="block text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{category}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatFamilyCountLabel(count)}
            </span>
          </button>
        );
      })}
      {!isSecondary ? (
        <button
          type="button"
          onClick={() => onSelect(QUESTIONNAIRE_FORM_FAMILY_AUTRES)}
          className={cn(
            'rounded-2xl border p-4 text-left transition',
            value === QUESTIONNAIRE_FORM_FAMILY_AUTRES
              ? 'border-primary bg-secondary shadow-elevation-md'
              : 'border-border bg-white hover:border-primary/40 hover:shadow-elevation-sm',
          )}
        >
          <span className="block text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">{AUTRES_TILE_LABEL}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Coopératives, agricole, montages… · {formatFamilyCountLabel(autresFormCount)}
          </span>
        </button>
      ) : null}
    </div>
  );
};
