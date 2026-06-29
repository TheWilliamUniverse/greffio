import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { PRIMARY_FORMALITY_CATEGORIES } from '@/lib/questionnaireFlow.js';
import { getCategoryVisual } from '@/config/demarcheVisuals.js';
import { MobileChoiceStep, MobileChoiceTile, MOBILE_CHOICE_TWO_COL_GRID } from '@/components/questionnaire/MobileChoiceStep.jsx';

export const FormalityCategoryPicker = ({
  value,
  onChange,
  onContinue,
  onAdvance,
  mobilePresentation = false,
  progressPercent,
  stepCurrent,
  stepTotal,
}) => {
  if (mobilePresentation) {
    return (
      <MobileChoiceStep
        kicker="Votre démarche"
        title="Choisissez une famille de formalité"
        subtitle="Greffio adapte ensuite le questionnaire, les pièces et les documents à votre situation."
        hint="Touchez une famille pour continuer."
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
        gridClassName={MOBILE_CHOICE_TWO_COL_GRID}
      >
        {PRIMARY_FORMALITY_CATEGORIES.map((category) => {
          const selected = value === category.id;
          const visual = getCategoryVisual(category.id);
          return (
            <MobileChoiceTile
              key={category.id}
              kicker={category.kicker}
              title={category.label}
              description={category.description}
              imageSrc={visual.icon}
              selected={selected}
              compact
              onSelect={() => {
                onChange(category.id);
                onContinue?.(category.id);
                if (category.id === 'creation') {
                  onAdvance?.();
                }
              }}
              className="overflow-hidden"
            />
          );
        })}
      </MobileChoiceStep>
    );
  }

  return (
  <div className="space-y-5">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Votre démarche</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
        Choisissez une famille de formalité
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Greffio adapte ensuite le questionnaire, les pièces et les documents à votre situation.
      </p>
    </div>

    <ul className="grid grid-cols-2 gap-3 sm:gap-4">
      {PRIMARY_FORMALITY_CATEGORIES.map((category) => {
        const selected = value === category.id;
        const visual = getCategoryVisual(category.id);
        return (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onChange(category.id)}
              className={`flex h-full w-full flex-col rounded-2xl border bg-white p-4 text-left transition sm:p-5 ${
                selected
                  ? 'border-primary/40 shadow-[0_8px_28px_rgba(15,39,80,0.12)] ring-2 ring-primary/15'
                  : 'border-border/80 shadow-[0_2px_14px_rgba(15,39,80,0.06)] hover:border-primary/25'
              }`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl sm:h-16 sm:w-16">
                <img
                  src={visual.icon}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">
                {category.kicker}
              </p>
              <h3 className="mt-1 text-sm font-extrabold leading-snug text-[hsl(var(--greffio-blue-900))] sm:text-base">
                {category.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {category.description}
              </p>
              {selected ? (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Sélectionnée
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>

    {value ? (
      <button
        type="button"
        onClick={() => onContinue?.(value)}
        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm"
      >
        Continuer
      </button>
    ) : null}
  </div>
  );
};

export const FormalityCategoryBackButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
  >
    <ArrowLeft className="h-4 w-4" />
    Changer de famille
  </button>
);
