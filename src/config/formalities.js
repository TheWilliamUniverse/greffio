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
    excludedDocumentKeys: ['signed_statutes', 'capital_certificate', 'ubo_declaration', 'subscribers_list', 'formality_powers'],
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

export const STATUTES_SUPPORTED_FORMS = Object.freeze(['SAS', 'SASU', 'SARL', 'EURL', 'SCI']);

export const isStatutesSupportedForm = (legalForm) => (
  STATUTES_SUPPORTED_FORMS.includes(String(legalForm || '').toUpperCase())
);

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

const matchLegalForm = (payload = {}) => {
  const values = [
    payload.formeJuridique,
    payload.legalForm,
    payload.typeFormalite,
    payload.service,
    payload.label,
  ].map(normalize).filter(Boolean);

  if (values.some(isEiLikeLabel)) return 'EI';
  if (values.some((v) => v === 'SCI' || v.includes('SOCIETE CIVILE IMMOBILIERE'))) return 'SCI';
  if (values.some((v) => v === 'EURL')) return 'EURL';
  if (values.some((v) => v === 'SARL')) return 'SARL';
  if (values.some((v) => v.includes('SAS') && !v.includes('SASU'))) return 'SAS';
  if (values.some((v) => v.includes('SASU'))) return 'SASU';
  return 'SASU';
};

export const getFormalityRule = (payload = {}) => {
  const form = matchLegalForm(payload);
  switch (form) {
    case 'EI': return FORMALITY_RULES.EI_CREATION;
    case 'SAS': return FORMALITY_RULES.SAS_CREATION;
    default: return FORMALITY_RULES.SASU_CREATION;
  }
};
