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

export const isEiLikeFormality = (payload = {}) => {
  const values = [
    payload.formeJuridique,
    payload.legalForm,
    payload.typeFormalite,
    payload.service,
    payload.label,
  ];
  return values.some((value) => isEiLikeLabel(value));
};

export const getFormalityRule = (payload = {}) => (
  isEiLikeFormality(payload) ? FORMALITY_RULES.EI_CREATION : FORMALITY_RULES.SASU_CREATION
);
