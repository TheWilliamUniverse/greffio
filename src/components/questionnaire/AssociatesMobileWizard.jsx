import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { BirthDateMinorEncouragement } from '@/components/BirthDateMinorEncouragement.jsx';
import { MobileChoiceStep, MobileChoiceTile } from '@/components/questionnaire/MobileChoiceStep.jsx';
import { MobileInputStep } from '@/components/questionnaire/MobileInputStep.jsx';
import { isLegallyMinor } from '@/config/minorAssociateRules.js';
import {
  ASSOCIATE_TYPES,
  buildAssociatesSummary,
  createEmptyAssociate,
  isAssociateEntryComplete,
} from '@/utils/associateEntry.js';
import {
  ASSOCIATE_ROLE_OPTIONS,
  LEGAL_ENTITY_SIGNATORY_QUALITIES,
} from '@/utils/officerFromAssociates.js';

const LEGAL_FORMS = ['SAS', 'SASU', 'SARL', 'EURL', 'SCI'];

const mergeAssociateUpdate = (item, patch) => {
  const merged = { ...item, ...patch };
  if (merged.associateType === ASSOCIATE_TYPES.COMPANY) {
    merged.isMinorEmancipated = false;
    merged.legalRepresentatives = '';
    merged.birthDate = '';
    merged.firstName = '';
    merged.lastName = '';
  } else {
    const minor = isLegallyMinor(merged.birthDate);
    if (!minor) {
      merged.isMinorEmancipated = false;
      merged.legalRepresentatives = '';
    }
    if (minor && !merged.isMinorEmancipated && ['Président désigné', 'Directeur Général'].includes(merged.roleLabel)) {
      merged.roleLabel = 'Associé';
    }
  }
  return merged;
};

const buildWizardSteps = (associate, associateIndex) => {
  const isCompany = associate.associateType === ASSOCIATE_TYPES.COMPANY;
  const minor = !isCompany && isLegallyMinor(associate.birthDate);
  const steps = [];

  steps.push({
    id: 'associateType',
    kind: 'choice',
    field: 'associateType',
    title: associateIndex === 0 ? 'Quel type d\'associé ?' : `Associé ${associateIndex + 1} – type`,
    subtitle: 'Personne physique ou personne morale.',
    options: [
      { value: ASSOCIATE_TYPES.PERSON, label: 'Personne physique' },
      { value: ASSOCIATE_TYPES.COMPANY, label: 'Personne morale' },
    ],
  });

  if (isCompany) {
    steps.push(
      { id: 'companyName', kind: 'input', field: 'companyName', title: 'Dénomination sociale', required: true, placeholder: 'Ex. William Establishments SAS' },
      { id: 'siren', kind: 'input', field: 'siren', title: 'SIREN', required: true, placeholder: '9 chiffres', inputMode: 'numeric' },
      {
        id: 'legalForm',
        kind: 'choice',
        field: 'legalForm',
        title: 'Forme juridique',
        options: LEGAL_FORMS.map((form) => ({ value: form, label: form })),
      },
      { id: 'representativeName', kind: 'input', field: 'representativeName', title: 'Représentant légal', required: true, placeholder: 'Nom et prénom du signataire' },
      {
        id: 'representativeQuality',
        kind: 'choice',
        field: 'representativeQuality',
        title: 'Qualité du signataire',
        options: LEGAL_ENTITY_SIGNATORY_QUALITIES.map((quality) => ({ value: quality, label: quality })),
      },
      { id: 'rcsCity', kind: 'input', field: 'rcsCity', title: 'Ville RCS (optionnel)', required: false, placeholder: 'Ex. Nice' },
      { id: 'address', kind: 'input', field: 'address', title: 'Siège social / adresse', required: true, placeholder: 'Adresse complète' },
      { id: 'share', kind: 'input', field: 'share', title: 'Quote-part (%)', required: false, placeholder: 'Ex. 50', inputMode: 'decimal' },
      {
        id: 'roleLabel',
        kind: 'choice',
        field: 'roleLabel',
        title: 'Rôle dans la société',
        options: ASSOCIATE_ROLE_OPTIONS.COMPANY.map((role) => ({ value: role, label: role })),
      },
    );
  } else {
    steps.push(
      { id: 'firstName', kind: 'input', field: 'firstName', title: 'Prénom', required: true, placeholder: 'Prénom' },
      { id: 'lastName', kind: 'input', field: 'lastName', title: 'Nom', required: true, placeholder: 'Nom' },
      { id: 'birthDate', kind: 'input', field: 'birthDate', title: 'Date de naissance', required: false, inputType: 'date' },
    );
    if (minor) {
      steps.push({
        id: 'isMinorEmancipated',
        kind: 'choice',
        field: 'isMinorEmancipated',
        title: 'Associé mineur – émancipation ?',
        subtitle: 'Indiquez si une ordonnance d\'émancipation sera jointe.',
        options: [
          { value: 'true', label: 'Oui – ordonnance d\'émancipation à joindre' },
          { value: 'false', label: 'Non – représenté(e) par ses représentants légaux' },
        ],
      });
      if (associate.isMinorEmancipated !== true) {
        steps.push({
          id: 'legalRepresentatives',
          kind: 'input',
          field: 'legalRepresentatives',
          title: 'Représentants légaux',
          required: true,
          placeholder: 'Ex. Mme X et M. Y',
        });
      }
    }
    const roleOptions = minor && !associate.isMinorEmancipated
      ? ['Associé', 'Associée']
      : ASSOCIATE_ROLE_OPTIONS.PERSON;
    steps.push(
      { id: 'share', kind: 'input', field: 'share', title: 'Quote-part (%)', required: false, placeholder: 'Ex. 50', inputMode: 'decimal' },
      { id: 'address', kind: 'input', field: 'address', title: 'Adresse', required: false, placeholder: 'Adresse complète' },
      {
        id: 'roleLabel',
        kind: 'choice',
        field: 'roleLabel',
        title: 'Rôle dans la société',
        options: roleOptions.map((role) => ({ value: role, label: role })),
      },
    );
  }

  if (isAssociateEntryComplete(associate)) {
    steps.push({
      id: 'addAnother',
      kind: 'choice',
      field: '_addAnother',
      title: 'Ajouter un autre associé ?',
      subtitle: 'Vous pourrez compléter les bénéficiaires effectifs plus tard si besoin.',
      options: [
        { value: 'yes', label: 'Oui, un autre associé' },
        { value: 'no', label: 'Non, c\'est complet' },
      ],
    });
  }

  return steps;
};

const readStepValue = (associate, step) => {
  if (step.field === 'isMinorEmancipated') {
    if (associate.isMinorEmancipated === true) return 'true';
    if (associate.isMinorEmancipated === false) return 'false';
    return '';
  }
  return associate[step.field] ?? '';
};

const canAdvanceInputStep = (step, associate) => {
  if (!step.required) return true;
  const value = readStepValue(associate, step);
  if (step.field === 'siren') {
    return String(value || '').replace(/\D/g, '').length === 9;
  }
  return Boolean(String(value || '').trim());
};

const isWizardStepComplete = (step, associate) => {
  if (step.id === 'addAnother') return true;
  if (step.kind === 'choice') return Boolean(String(readStepValue(associate, step) || '').trim());
  if (step.kind === 'input') return canAdvanceInputStep(step, associate);
  return true;
};

export const resolveAssociatesWizardResume = (associates = [], resume = {}) => {
  const list = Array.isArray(associates) && associates.length ? associates : [createEmptyAssociate()];
  const savedAssociateIndex = Number(resume?.associatesAssociateIndex);
  const savedLocalStepIndex = Number(resume?.associatesLocalStepIndex);
  if (
    Number.isInteger(savedAssociateIndex)
    && savedAssociateIndex >= 0
    && savedAssociateIndex < list.length
    && Number.isInteger(savedLocalStepIndex)
    && savedLocalStepIndex >= 0
  ) {
    const steps = buildWizardSteps(list[savedAssociateIndex], savedAssociateIndex);
    return {
      associateIndex: savedAssociateIndex,
      localStepIndex: Math.min(savedLocalStepIndex, Math.max(steps.length - 1, 0)),
    };
  }

  for (let associateIndex = 0; associateIndex < list.length; associateIndex += 1) {
    const steps = buildWizardSteps(list[associateIndex], associateIndex);
    for (let localStepIndex = 0; localStepIndex < steps.length; localStepIndex += 1) {
      const step = steps[localStepIndex];
      if (step.id === 'addAnother') continue;
      if (!isWizardStepComplete(step, list[associateIndex])) {
        return { associateIndex, localStepIndex };
      }
    }
  }

  const lastAssociateIndex = Math.max(list.length - 1, 0);
  const lastSteps = buildWizardSteps(list[lastAssociateIndex], lastAssociateIndex);
  return {
    associateIndex: lastAssociateIndex,
    localStepIndex: Math.max(lastSteps.length - 1, 0),
  };
};

export const AssociatesMobileWizard = forwardRef(({
  value = [],
  onChange,
  progressPercent,
  stepCurrent,
  stepTotal,
  onComplete,
  resumePosition,
  onResumePositionChange,
}, ref) => {
  const associates = Array.isArray(value) && value.length ? value : [createEmptyAssociate()];
  const initialResume = useMemo(
    () => resolveAssociatesWizardResume(associates, resumePosition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [associateIndex, setAssociateIndex] = useState(initialResume.associateIndex);
  const [localStepIndex, setLocalStepIndex] = useState(initialResume.localStepIndex);

  const safeAssociateIndex = Math.min(associateIndex, Math.max(associates.length - 1, 0));
  const currentAssociate = associates[safeAssociateIndex] || createEmptyAssociate();
  const steps = useMemo(
    () => buildWizardSteps(currentAssociate, safeAssociateIndex),
    [currentAssociate, safeAssociateIndex],
  );
  const safeLocalStepIndex = Math.min(localStepIndex, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeLocalStepIndex];

  useEffect(() => {
    if (localStepIndex !== safeLocalStepIndex) {
      setLocalStepIndex(safeLocalStepIndex);
    }
  }, [localStepIndex, safeLocalStepIndex]);

  useEffect(() => {
    onResumePositionChange?.({
      associatesAssociateIndex: safeAssociateIndex,
      associatesLocalStepIndex: safeLocalStepIndex,
    });
  }, [safeAssociateIndex, safeLocalStepIndex, onResumePositionChange]);

  const patchAssociate = (patch) => {
    const next = associates.map((item, index) => (
      index === safeAssociateIndex ? mergeAssociateUpdate(item, patch) : item
    ));
    onChange({ associates: next, associesSummary: buildAssociatesSummary(next) });
  };

  const advanceLocal = () => {
    if (safeLocalStepIndex >= steps.length - 1) return;
    setLocalStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBackLocal = () => {
    if (safeLocalStepIndex > 0) {
      setLocalStepIndex((current) => Math.max(current - 1, 0));
      return true;
    }
    if (safeAssociateIndex > 0) {
      const previousAssociate = safeAssociateIndex - 1;
      setAssociateIndex(previousAssociate);
      const previousSteps = buildWizardSteps(associates[previousAssociate] || createEmptyAssociate(), previousAssociate);
      setLocalStepIndex(Math.max(previousSteps.length - 1, 0));
      return true;
    }
    return false;
  };

  useImperativeHandle(ref, () => ({
    canGoBackLocally: () => safeLocalStepIndex > 0 || safeAssociateIndex > 0,
    goBackLocally: () => goBackLocal(),
  }), [safeLocalStepIndex, safeAssociateIndex, associates]);

  const handleChoiceSelect = (step, rawValue) => {
    if (step.id === 'addAnother') {
      if (rawValue === 'yes') {
        const entry = createEmptyAssociate();
        const next = [...associates, entry];
        onChange({ associates: next, associesSummary: buildAssociatesSummary(next) });
        setAssociateIndex(next.length - 1);
        setLocalStepIndex(0);
        return;
      }
      onComplete?.();
      return;
    }

    let patch = { [step.field]: rawValue };
    if (step.field === 'isMinorEmancipated') {
      patch = { isMinorEmancipated: rawValue === 'true' };
    }
    if (step.field === 'siren') {
      patch = { siren: String(rawValue || '').replace(/\D/g, '').slice(0, 9) };
    }
    patchAssociate(patch);
    window.setTimeout(advanceLocal, 180);
  };

  if (!currentStep) return null;

  const localMeta = steps.length > 1
    ? { localStepCurrent: safeLocalStepIndex + 1, localStepTotal: steps.length }
    : {};

  if (currentStep.kind === 'choice') {
    const selectedValue = readStepValue(currentAssociate, currentStep);
    return (
      <div className="space-y-3">
        <MobileChoiceStep
          kicker={`Associé ${safeAssociateIndex + 1}`}
          title={currentStep.title}
          subtitle={currentStep.subtitle}
          hint="Touchez votre réponse pour continuer."
          progressPercent={progressPercent}
          stepCurrent={stepCurrent}
          stepTotal={stepTotal}
          gridClassName="grid grid-cols-1 gap-2.5"
        >
          {currentStep.options.map((option) => (
            <MobileChoiceTile
              key={option.value}
              title={option.label}
              selected={String(selectedValue) === String(option.value)}
              compact
              onSelect={() => handleChoiceSelect(currentStep, option.value)}
            />
          ))}
        </MobileChoiceStep>
        {localMeta.localStepCurrent ? (
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Étape {localMeta.localStepCurrent}/{localMeta.localStepTotal}
          </p>
        ) : null}
      </div>
    );
  }

  const inputValue = readStepValue(currentAssociate, currentStep);
  const canAdvance = canAdvanceInputStep(currentStep, currentAssociate);

  return (
    <div className="space-y-3">
      <MobileInputStep
        kicker={`Associé ${safeAssociateIndex + 1}`}
        title={currentStep.title}
        subtitle={currentStep.subtitle}
        hint="Touchez la flèche pour continuer."
        progressPercent={progressPercent}
        stepCurrent={stepCurrent}
        stepTotal={stepTotal}
        fieldId={`associate-${safeAssociateIndex}-${currentStep.id}`}
        value={inputValue}
        placeholder={currentStep.placeholder || ''}
        inputMode={currentStep.inputMode || 'text'}
        inputType={currentStep.inputType || 'text'}
        canAdvance={canAdvance}
        onChange={(nextValue) => {
          if (currentStep.field === 'siren') {
            patchAssociate({ siren: String(nextValue || '').replace(/\D/g, '').slice(0, 9) });
            return;
          }
          patchAssociate({ [currentStep.field]: nextValue });
        }}
        onAdvance={advanceLocal}
      >
        {currentStep.field === 'birthDate' ? (
          <BirthDateMinorEncouragement birthDate={inputValue} showLegalHint />
        ) : null}
      </MobileInputStep>
      {localMeta.localStepCurrent ? (
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Étape {localMeta.localStepCurrent}/{localMeta.localStepTotal}
        </p>
      ) : null}
    </div>
  );
});

AssociatesMobileWizard.displayName = 'AssociatesMobileWizard';
