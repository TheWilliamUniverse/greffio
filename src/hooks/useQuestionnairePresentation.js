import { isMobileQuestionnaireViewport } from '@/utils/platform.js';

export const resolveQuestionMode = (field) => {
  if (!field) return 'unknown';
  if (field.type === 'recap_summary') return 'recap';
  if (field.type === 'beneficial_owners_picker') return 'composite';
  if (field.type === 'associates_minor_panel') return 'associate-wizard';
  if (field.type === 'form_family_picker' || field.type === 'form_family_secondary_picker') return 'form_family';
  if (field.type === 'comparateur_cta') return 'comparateur';
  if (field.key === 'typeFormalite') return 'composite';
  if (field.type === 'select' || field.type === 'checkbox') return 'choice';
  if (field.type === 'textarea') return 'textarea';
  if (field.key === 'validationConfirmed') return 'legal-confirmation';
  if (field.type === 'date' || field.type === 'number' || field.type === 'text' || field.type === 'email' || field.type === 'tel') {
    return 'input';
  }
  return 'input';
};

export const shouldHideStickyContinueForMode = (mode) => (
  ['choice', 'input', 'textarea', 'legal-confirmation', 'form_family', 'comparateur', 'associate-wizard'].includes(mode)
);

export const resolveFieldInputMode = (field) => {
  if (!field) return 'text';
  if (field.key === 'companySiren' || field.key === 'existingBusinessSiren' || field.key === 'codePostal') {
    return 'numeric';
  }
  if (field.type === 'email') return 'email';
  if (field.type === 'tel') return 'tel';
  if (field.type === 'number') return 'decimal';
  return 'text';
};

export const shouldAutoAdvanceMobileField = (field, value, validation) => {
  if (!validation?.isValid) return false;
  // Champs rendus par un composite (DemarchePicker, familles juridiques…) : une seule avancée via le picker.
  if (field?.key === 'typeFormalite' || field?.type === 'form_family_picker' || field?.type === 'form_family_secondary_picker') {
    return false;
  }
  if (['select', 'checkbox'].includes(field?.type)) return true;
  if ((field?.key === 'companySiren' || field?.key === 'existingBusinessSiren')
    && [9, 14].includes(String(value || '').replace(/\D/g, '').length)) {
    return true;
  }
  return false;
};

export const useQuestionnairePresentation = ({
  activeGroup = [],
  step = null,
  formData: _formData = {},
  progressPercent = 0,
  safeGroupIndex = 0,
  fieldGroups = [],
}) => {
  const isMobile = isMobileQuestionnaireViewport();
  const field = activeGroup.length === 1 ? activeGroup[0] : null;
  const mode = activeGroup.length === 1 ? resolveQuestionMode(field) : 'group';
  const stepCurrent = fieldGroups.length > 1 ? safeGroupIndex + 1 : undefined;
  const stepTotal = fieldGroups.length > 1 ? fieldGroups.length : undefined;

  return {
    isMobile,
    field,
    fields: activeGroup,
    mode,
    progressPercent,
    stepCurrent,
    stepTotal,
    kicker: step?.title || '',
    shouldHideStickyContinue: isMobile && activeGroup.length === 1 && shouldHideStickyContinueForMode(mode),
    canAutoAdvance: isMobile && mode === 'choice',
    enterKeyHint: mode === 'textarea' ? 'done' : 'next',
    inputMode: resolveFieldInputMode(field),
  };
};
