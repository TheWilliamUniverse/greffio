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
  SASU_CREATION: { requiresStatutes: true, requiresCapital: true, requiresAssociates: false },
  SAS_CREATION: { requiresStatutes: true, requiresCapital: true, requiresAssociates: true },
  SARL_CREATION: { requiresStatutes: true, requiresCapital: true, requiresAssociates: true },
  EURL_CREATION: { requiresStatutes: true, requiresCapital: true, requiresAssociates: false },
  SCI_CREATION: { requiresStatutes: true, requiresCapital: true, requiresAssociates: true },
});

const normalize = (value = '') => String(value)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export const isEiLikeLabel = (value = '') => {
  const normalized = normalize(value);
  return normalized.includes('MICRO')
    || normalized.includes('AUTO-ENTREPRENEUR')
    || normalized.includes('AUTO ENTREPRENEUR')
    || normalized.includes('ENTREPRISE INDIVIDUELLE')
    || normalized === 'EI';
};

const matchForm = (candidates = []) => {
  const values = candidates.map(normalize).filter(Boolean);
  if (values.some(isEiLikeLabel)) return 'EI';
  if (values.some((v) => v === 'SCI' || v.includes('SOCIETE CIVILE IMMOBILIERE'))) return 'SCI';
  if (values.some((v) => v === 'EURL')) return 'EURL';
  if (values.some((v) => v === 'SARL')) return 'SARL';
  if (values.some((v) => v.includes('SAS') && !v.includes('SASU'))) return 'SAS';
  if (values.some((v) => v.includes('SASU'))) return 'SASU';
  return 'SASU';
};

export const getFormalityRule = ({ dossier, questionnaire = {} } = {}) => {
  const form = matchForm([
    questionnaire.formeJuridique,
    questionnaire.legalForm,
    questionnaire.typeFormalite,
    dossier?.legalForm,
    dossier?.formeJuridique,
    dossier?.service,
  ]);

  switch (form) {
    case 'EI': return FORMALITY_RULES.EI_CREATION;
    case 'SAS': return FORMALITY_RULES.SAS_CREATION;
    case 'SARL': return FORMALITY_RULES.SARL_CREATION;
    case 'EURL': return FORMALITY_RULES.EURL_CREATION;
    case 'SCI': return FORMALITY_RULES.SCI_CREATION;
    default: return FORMALITY_RULES.SASU_CREATION;
  }
};

export const resolveLegalForm = ({ dossier, questionnaire = {} } = {}) => matchForm([
  questionnaire.formeJuridique,
  questionnaire.legalForm,
  questionnaire.typeFormalite,
  dossier?.legalForm,
  dossier?.formeJuridique,
  dossier?.service,
]);
