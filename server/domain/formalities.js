const normalize = (value = '') => String(value)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export const FORMALITY_RULES = Object.freeze({
  EI_CREATION: {
    requiresStatutes: false,
    requiresCapital: false,
    requiresAssociates: false,
    requiresMandate: true,
    requiredSections: ['identity', 'activity', 'address', 'tax_social_options', 'documents', 'payment'],
    excludedSections: ['statutes', 'capital', 'associates', 'share_distribution', 'corporate_officers'],
    excludedDocumentKeys: ['signed_statutes', 'capital_certificate', 'ubo_declaration'],
  },
  SASU_CREATION: {
    requiresStatutes: true,
    requiresCapital: true,
    requiresAssociates: false,
  },
  SAS_CREATION: {
    requiresStatutes: true,
    requiresCapital: true,
    requiresAssociates: true,
  },
});

export const isEiLikeLabel = (value = '') => {
  const normalized = normalize(value);
  return normalized.includes('MICRO')
    || normalized.includes('AUTO-ENTREPRENEUR')
    || normalized.includes('AUTO ENTREPRENEUR')
    || normalized.includes('ENTREPRISE INDIVIDUELLE')
    || normalized === 'EI';
};

export const getFormalityRule = ({ dossier, questionnaire = {} } = {}) => {
  const candidates = [
    questionnaire.formeJuridique,
    questionnaire.legalForm,
    questionnaire.typeFormalite,
    dossier?.legalForm,
    dossier?.formeJuridique,
    dossier?.service,
  ];
  if (candidates.some((value) => isEiLikeLabel(value))) {
    return FORMALITY_RULES.EI_CREATION;
  }
  if (candidates.some((value) => normalize(value).includes('SAS') && !normalize(value).includes('SASU'))) {
    return FORMALITY_RULES.SAS_CREATION;
  }
  return FORMALITY_RULES.SASU_CREATION;
};
