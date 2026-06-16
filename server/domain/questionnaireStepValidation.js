/** Validation étapes questionnaire – champs greffe bloquants vs compléments différables. */

export const GREFFE_BLOCKING_FIELD_KEYS = new Set([
  'initiatorType',
  'firstName',
  'lastName',
  'email',
  'phone',
  'nationality',
  'companyName',
  'companyCountry',
  'companyRepresentative',
  'typeFormalite',
  'formeJuridique',
  'formeJuridiqueFamillePrimary',
  'formeJuridiqueFamilleSecondary',
  'formeJuridiqueFamille',
  'connaissezFormeJuridique',
  'denomination',
  'capital',
  'dirigeant',
  'associates',
  'activite',
  'adresseSiege',
  'codePostal',
  'villeSiege',
  'adressePersonnelle',
  'dateDebutActivite',
  'regimeEi',
  'validationConfirmed',
  'recapAcknowledged',
]);

const isPresent = (value) => {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
};

export const isGreffeBlockingFieldKey = (fieldKey) => (
  GREFFE_BLOCKING_FIELD_KEYS.has(String(fieldKey || ''))
);

/**
 * Analyse les champs manquants d'une étape (côté serveur, snapshot dataJson).
 * @param {{ stepId: string, data: object, missingFieldKeys?: string[] }} input
 */
export const analyzeQuestionnaireStepFields = ({
  stepId,
  data = {},
  missingFieldKeys = [],
} = {}) => {
  const keys = Array.isArray(missingFieldKeys) ? missingFieldKeys : [];
  const blockingMissing = keys.filter((key) => isGreffeBlockingFieldKey(key));
  const softMissing = keys
    .filter((key) => !isGreffeBlockingFieldKey(key))
    .map((key) => ({ key, label: key }));

  const continueAllowed = blockingMissing.length === 0;
  const missingButContinueAllowed = continueAllowed && softMissing.length > 0;

  return {
    stepId: stepId || null,
    blockingMissing,
    softMissing,
    continueAllowed,
    missingButContinueAllowed,
    warnings: softMissing.map((item) => item.label || item.key),
  };
};

/**
 * Persiste les avertissements questionnaire dans dataJson.
 */
export const mergeQuestionnaireWarnings = (data = {}, stepId, analysis = {}) => {
  const previous = typeof data.questionnaireWarnings === 'object' && data.questionnaireWarnings !== null
    ? data.questionnaireWarnings
    : {};
  const stepWarnings = {
    softMissing: analysis.softMissing || [],
    blockingMissing: analysis.blockingMissing || [],
    missingButContinueAllowed: Boolean(analysis.missingButContinueAllowed),
    updatedAt: new Date().toISOString(),
  };
  return {
    ...data,
    questionnaireWarnings: {
      ...previous,
      [stepId]: stepWarnings,
    },
    questionnaireSoftMissing: analysis.softMissing?.map((item) => item.key || item) || [],
    questionnaireContinueAllowed: analysis.continueAllowed !== false,
  };
};

export const validateQuestionnaireStepCompletion = ({
  stepId,
  data = {},
  missingFieldKeys = [],
  continueWithWarnings = false,
} = {}) => {
  const analysis = analyzeQuestionnaireStepFields({ stepId, data, missingFieldKeys });

  if (!analysis.continueAllowed) {
    return {
      ok: false,
      error: 'QUESTIONNAIRE_BLOCKING_FIELDS',
      ...analysis,
    };
  }

  if (analysis.missingButContinueAllowed && !continueWithWarnings) {
    return {
      ok: false,
      error: 'QUESTIONNAIRE_SOFT_MISSING',
      requiresWarningAck: true,
      ...analysis,
    };
  }

  const mergedData = analysis.missingButContinueAllowed
    ? mergeQuestionnaireWarnings(data, stepId, analysis)
    : data;

  return {
    ok: true,
    ...analysis,
    data: mergedData,
  };
};
