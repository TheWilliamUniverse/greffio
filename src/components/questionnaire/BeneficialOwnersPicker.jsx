import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Label } from '@/components/ui/label.jsx';
import { ChoiceCard } from '@/components/questionnaire/ChoiceCard.jsx';
import { Input } from '@/components/ui/input.jsx';
import { MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { MobileCompositeStep } from '@/components/questionnaire/MobileCompositeStep.jsx';
import { lightQuestionnaireHaptic } from '@/utils/questionnaireHaptics.js';
import {
  buildBeneficialOwnerCandidates,
  defaultBeneficialOwnersSelection,
  formatBeneficialOwnersSummary,
  parseBeneficialOwnersSelection,
} from '@/utils/beneficialOwnerCandidates.js';

const MOBILE_SUB_STEPS = Object.freeze([
  { id: 'candidates', title: 'Qui sont les bénéficiaires effectifs ?' },
  { id: 'other', title: 'Autre bénéficiaire (optionnel)' },
  { id: 'confirm', title: 'Confirmer ou compléter plus tard' },
]);

export const BeneficialOwnersPicker = ({
  formData,
  selectedIds = [],
  summaryText = '',
  otherName = '',
  onChange,
  onAdvance,
  mobilePresentation = false,
  compositeStepProps = null,
  fieldClass = '',
}) => {
  const candidates = useMemo(() => buildBeneficialOwnerCandidates(formData), [formData]);
  const initialized = useRef(false);
  const [mobileSubStep, setMobileSubStep] = useState(0);
  const useSubWizard = mobilePresentation && compositeStepProps;

  useEffect(() => {
    if (initialized.current || !candidates.length || selectedIds.length) {
      if (selectedIds.length) initialized.current = true;
      return;
    }
    const fromSummary = parseBeneficialOwnersSelection(summaryText, candidates);
    const nextIds = fromSummary.length
      ? fromSummary
      : (mobilePresentation ? [] : defaultBeneficialOwnersSelection(candidates));
    if (!nextIds.length) {
      initialized.current = true;
      return;
    }
    initialized.current = true;
    onChange({
      beneficiairesEffectifsSelected: nextIds,
      beneficiairesEffectifs: formatBeneficialOwnersSummary(nextIds, candidates),
    });
  }, [candidates, selectedIds.length, summaryText, onChange, mobilePresentation]);

  const toggle = (id) => {
    void lightQuestionnaireHaptic();
    const set = new Set(selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const nextIds = [...set];
    onChange({
      beneficiairesEffectifsSelected: nextIds,
      beneficiairesEffectifs: formatBeneficialOwnersSummary(nextIds, candidates),
      beneficiairesEffectifsAutre: otherName,
    });
  };

  const selectAll = () => {
    void lightQuestionnaireHaptic();
    const nextIds = candidates.map((c) => c.id);
    onChange({
      beneficiairesEffectifsSelected: nextIds,
      beneficiairesEffectifs: formatBeneficialOwnersSummary(nextIds, candidates),
      beneficiairesEffectifsAutre: otherName,
    });
  };

  const clearAll = () => {
    void lightQuestionnaireHaptic();
    onChange({
      beneficiairesEffectifsSelected: [],
      beneficiairesEffectifs: otherName.trim() || '',
      beneficiairesEffectifsAutre: otherName,
    });
    if (useSubWizard) {
      setMobileSubStep(MOBILE_SUB_STEPS.length - 1);
      return;
    }
    if (mobilePresentation && typeof onAdvance === 'function') {
      onAdvance();
    }
  };

  const updateOther = (value) => {
    const trimmed = String(value || '').trim();
    const base = formatBeneficialOwnersSummary(selectedIds, candidates);
    const combined = [base, trimmed].filter(Boolean).join(base && trimmed ? ' et ' : '');
    onChange({
      beneficiairesEffectifsAutre: value,
      beneficiairesEffectifs: combined,
      beneficiairesEffectifsSelected: selectedIds,
    });
  };

  const advanceSubStep = () => {
    setMobileSubStep((current) => Math.min(current + 1, MOBILE_SUB_STEPS.length - 1));
  };

  const finishSubWizard = () => {
    void lightQuestionnaireHaptic();
    onAdvance?.();
  };

  if (!candidates.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Complétez d&apos;abord l&apos;étape « Associés et dirigeant » pour sélectionner les bénéficiaires effectifs.
      </p>
    );
  }

  const selectionSummary = formatBeneficialOwnersSummary(selectedIds, candidates);
  const combinedSummary = [selectionSummary, String(otherName || '').trim()]
    .filter(Boolean)
    .join(selectionSummary && otherName.trim() ? ' et ' : '');

  const candidatesPanel = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sélectionnez uniquement les personnes qui contrôlent réellement la société.
        </p>
        <div className="flex gap-2">
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={selectAll}>
            Tout sélectionner
          </button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={clearAll}>
            Compléter plus tard
          </button>
        </div>
      </div>

      {mobilePresentation ? (
        <div className="grid grid-cols-1 gap-2.5">
          {candidates.map((candidate) => (
            <MobileChoiceTile
              key={candidate.id}
              title={candidate.label}
              description={candidate.subtitle}
              selected={selectedIds.includes(candidate.id)}
              compact
              onSelect={() => toggle(candidate.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {candidates.map((candidate) => (
            <ChoiceCard
              key={candidate.id}
              compact
              selected={selectedIds.includes(candidate.id)}
              title={candidate.label}
              description={candidate.subtitle}
              onClick={() => toggle(candidate.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  const otherPanel = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        Autre bénéficiaire effectif (optionnel)
      </Label>
      <Input
        value={otherName}
        onChange={(event) => updateOther(event.target.value)}
        placeholder="Personne non listée ci-dessus"
        className={fieldClass}
      />
    </div>
  );

  const confirmPanel = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {combinedSummary
          ? `Sélection retenue : ${combinedSummary}.`
          : 'Aucun bénéficiaire sélectionné pour le moment. Vous pourrez compléter plus tard.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={finishSubWizard}
        >
          {combinedSummary ? 'Confirmer et continuer' : 'Continuer sans sélection'}
        </button>
        {!combinedSummary ? (
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
            onClick={() => setMobileSubStep(0)}
          >
            Revenir à la sélection
          </button>
        ) : null}
      </div>
    </div>
  );

  const desktopContent = (
    <div className="space-y-4">
      {candidatesPanel}
      <div className="space-y-2 border-t border-border pt-4">
        {otherPanel}
      </div>
      {mobilePresentation ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-primary/85">
            {selectedIds.length || otherName.trim()
              ? 'Touchez la flèche pour continuer.'
              : 'Sélectionnez au moins un bénéficiaire ou « Compléter plus tard ».'}
          </p>
          {selectedIds.length || otherName.trim() ? (
            <button
              type="button"
              aria-label="Continuer"
              onClick={() => {
                void lightQuestionnaireHaptic();
                onAdvance?.();
              }}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!useSubWizard) {
    return desktopContent;
  }

  const subStep = MOBILE_SUB_STEPS[mobileSubStep] || MOBILE_SUB_STEPS[0];
  const subStepBody = mobileSubStep === 0
    ? (
      <div className="space-y-4">
        {candidatesPanel}
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
            onClick={advanceSubStep}
          >
            Continuer
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
    : mobileSubStep === 1
      ? (
        <div className="space-y-4">
          {otherPanel}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
              onClick={advanceSubStep}
            >
              Continuer
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
              onClick={advanceSubStep}
            >
              Passer
            </button>
          </div>
        </div>
      )
      : confirmPanel;

  return (
    <MobileCompositeStep
      {...compositeStepProps}
      title={subStep.title}
      localStepCurrent={mobileSubStep + 1}
      localStepTotal={MOBILE_SUB_STEPS.length}
      hint="Parcourez les étapes pour valider ou reporter la déclaration."
    >
      {subStepBody}
    </MobileCompositeStep>
  );
};
