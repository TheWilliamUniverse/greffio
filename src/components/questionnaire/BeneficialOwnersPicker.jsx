import React, { useEffect, useMemo, useRef } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { ChoiceCard } from '@/components/questionnaire/ChoiceCard.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  buildBeneficialOwnerCandidates,
  defaultBeneficialOwnersSelection,
  formatBeneficialOwnersSummary,
  parseBeneficialOwnersSelection,
} from '@/utils/beneficialOwnerCandidates.js';

export const BeneficialOwnersPicker = ({
  formData,
  selectedIds = [],
  summaryText = '',
  otherName = '',
  onChange,
  fieldClass = '',
}) => {
  const candidates = useMemo(() => buildBeneficialOwnerCandidates(formData), [formData]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !candidates.length || selectedIds.length) {
      if (selectedIds.length) initialized.current = true;
      return;
    }
    const fromSummary = parseBeneficialOwnersSelection(summaryText, candidates);
    const nextIds = fromSummary.length ? fromSummary : defaultBeneficialOwnersSelection(candidates);
    initialized.current = true;
    onChange({
      beneficiairesEffectifsSelected: nextIds,
      beneficiairesEffectifs: formatBeneficialOwnersSummary(nextIds, candidates),
    });
  }, [candidates, selectedIds.length, summaryText, onChange]);

  const toggle = (id) => {
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
    const nextIds = candidates.map((c) => c.id);
    onChange({
      beneficiairesEffectifsSelected: nextIds,
      beneficiairesEffectifs: formatBeneficialOwnersSummary(nextIds, candidates),
      beneficiairesEffectifsAutre: otherName,
    });
  };

  const clearAll = () => {
    onChange({
      beneficiairesEffectifsSelected: [],
      beneficiairesEffectifs: otherName.trim() || '',
      beneficiairesEffectifsAutre: otherName,
    });
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

  if (!candidates.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Complétez d&apos;abord l&apos;étape « Associés et dirigeant » pour sélectionner les bénéficiaires effectifs.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sélectionnez une ou plusieurs personnes parmi les associés et dirigeants déjà renseignés.
        </p>
        <div className="flex gap-2">
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={selectAll}>
            Tout sélectionner
          </button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={clearAll}>
            Tout désélectionner
          </button>
        </div>
      </div>

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

      <div className="space-y-2 border-t border-border pt-4">
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
    </div>
  );
};
