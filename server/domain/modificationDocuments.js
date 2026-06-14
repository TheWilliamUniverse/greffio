import { isEiLikeLabel } from './formalities.js';

export const MODIFICATION_TYPES = Object.freeze({
  TRANSFER_REGISTERED_OFFICE: 'transfer_registered_office',
  CHANGE_COMPANY_NAME: 'change_company_name',
  CHANGE_MANAGER: 'change_manager',
  CHANGE_CORPORATE_PURPOSE: 'change_corporate_purpose',
  CHANGE_ACTIVITY: 'change_activity',
  CAPITAL_INCREASE: 'capital_increase',
  CAPITAL_REDUCTION: 'capital_reduction',
  CHANGE_SHARE_CAPITAL: 'change_share_capital',
  CHANGE_BENEFICIAL_OWNERS: 'change_beneficial_owners',
  OPEN_SECONDARY_ESTABLISHMENT: 'open_secondary_establishment',
  CLOSE_ESTABLISHMENT: 'close_establishment',
  TRANSFER_ESTABLISHMENT: 'transfer_establishment',
  DISSOLUTION: 'dissolution',
  OTHER_STATUTORY_MODIFICATION: 'other_statutory_modification',
});

export const DOCUMENT_CATEGORIES = Object.freeze({
  IDENTITY: 'identity',
  DECISION: 'decision',
  STATUTORY: 'statutory',
  ADDRESS: 'address',
  LEGAL_NOTICE: 'legal_notice',
  ACTIVITY: 'activity',
  BENEFICIAL_OWNER: 'beneficial_owner',
  REPRESENTATIVE: 'representative',
  ESTABLISHMENT: 'establishment',
  CAPITAL: 'capital',
  POWER_OF_ATTORNEY: 'power_of_attorney',
  OTHER: 'other',
});

const TYPE_FORMALITE_MAP = Object.freeze({
  transfert_siege: MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE,
  changement_dirigeant: MODIFICATION_TYPES.CHANGE_MANAGER,
  changement_denomination: MODIFICATION_TYPES.CHANGE_COMPANY_NAME,
  modification_activite: MODIFICATION_TYPES.CHANGE_ACTIVITY,
  modification_objet_social: MODIFICATION_TYPES.CHANGE_CORPORATE_PURPOSE,
  augmentation_capital: MODIFICATION_TYPES.CAPITAL_INCREASE,
  reduction_capital: MODIFICATION_TYPES.CAPITAL_REDUCTION,
  beneficiaires_effectifs_modification: MODIFICATION_TYPES.CHANGE_BENEFICIAL_OWNERS,
  etablissement_creation: MODIFICATION_TYPES.OPEN_SECONDARY_ESTABLISHMENT,
  etablissement_fermeture: MODIFICATION_TYPES.CLOSE_ESTABLISHMENT,
  etablissement_transfert: MODIFICATION_TYPES.TRANSFER_ESTABLISHMENT,
  dissolution_liquidation_radiation: MODIFICATION_TYPES.DISSOLUTION,
  modification_entreprise: MODIFICATION_TYPES.OTHER_STATUTORY_MODIFICATION,
});

const SERVICE_MAP = Object.freeze({
  'transfert-siege': MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE,
  'changement-dirigeant': MODIFICATION_TYPES.CHANGE_MANAGER,
  modification: MODIFICATION_TYPES.OTHER_STATUTORY_MODIFICATION,
});

const checklistItem = (item) => item;

const COMMON_MODIFICATION_CHECKLIST = [
  checklistItem({
    id: 'declarant_identity_document',
    label: "Pièce d'identité du déclarant",
    description: 'Document d’identité du représentant légal ou du mandataire, selon le contexte.',
    required: false,
    docKey: 'identity_proof',
    category: DOCUMENT_CATEGORIES.IDENTITY,
  }),
  checklistItem({
    id: 'power_of_attorney',
    label: 'Pouvoir du représentant légal',
    description: 'Si la formalité est réalisée par un mandataire.',
    required: false,
    docKey: 'proxy_mandate',
    category: DOCUMENT_CATEGORIES.POWER_OF_ATTORNEY,
  }),
  checklistItem({
    id: 'formality_powers',
    label: 'Pouvoirs pour formalités',
    required: false,
    docKey: 'formality_powers',
    category: DOCUMENT_CATEGORIES.POWER_OF_ATTORNEY,
  }),
];

const DECISION_ITEM = checklistItem({
  id: 'decision_minutes',
  label: 'Procès-verbal ou décision de modification',
  description: 'Décision de l’organe compétent constatant la modification.',
  required: true,
  category: DOCUMENT_CATEGORIES.DECISION,
  userHelp: 'La décision doit être cohérente avec la forme juridique et les statuts.',
});

const UPDATED_ARTICLES_ITEM = checklistItem({
  id: 'updated_articles',
  label: 'Statuts mis à jour',
  description: 'Version actualisée des statuts intégrant la modification.',
  required: true,
  docKey: 'signed_statutes',
  category: DOCUMENT_CATEGORIES.STATUTORY,
});

const LEGAL_NOTICE_ITEM = checklistItem({
  id: 'legal_notice_certificate',
  label: 'Attestation de parution de l’annonce légale',
  description: 'Lorsque la modification doit faire l’objet d’une publicité légale.',
  required: false,
  docKey: 'legal_notice_certificate',
  category: DOCUMENT_CATEGORIES.LEGAL_NOTICE,
});

const MODIFICATION_RULES = Object.freeze({
  [MODIFICATION_TYPES.TRANSFER_REGISTERED_OFFICE]: {
    label: 'Transfert de siège social',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
    extra: [
      checklistItem({
        id: 'new_registered_office_proof',
        label: 'Justificatif de jouissance des nouveaux locaux',
        required: true,
        docKey: 'registered_office_proof',
        category: DOCUMENT_CATEGORIES.ADDRESS,
      }),
    ],
    warnings: ['Un transfert hors ressort peut nécessiter des publications complémentaires.'],
  },
  [MODIFICATION_TYPES.CHANGE_COMPANY_NAME]: {
    label: 'Changement de dénomination sociale',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
  },
  [MODIFICATION_TYPES.CHANGE_MANAGER]: {
    label: 'Changement de dirigeant',
    requiresUpdatedArticles: 'conditional',
    requiresLegalNotice: true,
    requiresDecision: true,
    extra: [
      checklistItem({
        id: 'non_conviction_statement',
        label: 'Déclaration de non-condamnation et filiation',
        required: true,
        docKey: 'manager_non_conviction',
        category: DOCUMENT_CATEGORIES.REPRESENTATIVE,
      }),
    ],
    warnings: ['Si le dirigeant est nommé dans les statuts, une mise à jour peut être nécessaire.'],
  },
  [MODIFICATION_TYPES.CHANGE_CORPORATE_PURPOSE]: {
    label: 'Modification de l’objet social',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
    extra: [
      checklistItem({
        id: 'regulated_activity_proof',
        label: 'Justificatif d’activité réglementée',
        required: false,
        docKey: 'regulated_activity_proof',
        category: DOCUMENT_CATEGORIES.ACTIVITY,
      }),
    ],
  },
  [MODIFICATION_TYPES.CHANGE_ACTIVITY]: {
    label: 'Modification d’activité',
    requiresUpdatedArticles: 'conditional',
    requiresLegalNotice: 'conditional',
    requiresDecision: 'conditional',
    warnings: ['Distinguer modification d’activité déclarée et modification de l’objet social.'],
  },
  [MODIFICATION_TYPES.CAPITAL_INCREASE]: {
    label: 'Augmentation de capital',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
    extra: [
      checklistItem({
        id: 'depositary_certificate',
        label: 'Certificat du dépositaire des fonds',
        required: false,
        docKey: 'capital_certificate',
        category: DOCUMENT_CATEGORIES.CAPITAL,
      }),
    ],
  },
  [MODIFICATION_TYPES.CAPITAL_REDUCTION]: {
    label: 'Réduction de capital',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
  },
  [MODIFICATION_TYPES.CHANGE_SHARE_CAPITAL]: {
    label: 'Modification du capital social',
    requiresUpdatedArticles: true,
    requiresLegalNotice: true,
    requiresDecision: true,
  },
  [MODIFICATION_TYPES.CHANGE_BENEFICIAL_OWNERS]: {
    label: 'Modification des bénéficiaires effectifs',
    requiresUpdatedArticles: false,
    requiresLegalNotice: false,
    requiresDecision: false,
    extra: [
      checklistItem({
        id: 'beneficial_owners_declaration',
        label: 'Déclaration des bénéficiaires effectifs',
        required: true,
        docKey: 'ubo_declaration',
        category: DOCUMENT_CATEGORIES.BENEFICIAL_OWNER,
      }),
    ],
  },
  [MODIFICATION_TYPES.OPEN_SECONDARY_ESTABLISHMENT]: {
    label: 'Ouverture d’un établissement secondaire',
    requiresUpdatedArticles: false,
    requiresLegalNotice: 'conditional',
    requiresDecision: false,
    extra: [
      checklistItem({
        id: 'secondary_establishment_address_proof',
        label: 'Justificatif de jouissance des locaux',
        required: true,
        docKey: 'registered_office_proof',
        category: DOCUMENT_CATEGORIES.ADDRESS,
      }),
    ],
  },
  [MODIFICATION_TYPES.CLOSE_ESTABLISHMENT]: {
    label: 'Fermeture d’un établissement',
    requiresUpdatedArticles: false,
    requiresLegalNotice: false,
    requiresDecision: 'conditional',
  },
  [MODIFICATION_TYPES.TRANSFER_ESTABLISHMENT]: {
    label: 'Transfert d’établissement',
    requiresUpdatedArticles: false,
    requiresLegalNotice: 'conditional',
    requiresDecision: false,
    extra: [
      checklistItem({
        id: 'new_establishment_address_proof',
        label: 'Justificatif de la nouvelle adresse',
        required: true,
        docKey: 'registered_office_proof',
        category: DOCUMENT_CATEGORIES.ADDRESS,
      }),
    ],
  },
  [MODIFICATION_TYPES.DISSOLUTION]: {
    label: 'Dissolution',
    requiresUpdatedArticles: false,
    requiresLegalNotice: true,
    requiresDecision: true,
  },
});

const normalizeKey = (value = '') => String(value || '').trim().toLowerCase();

export const resolveModificationType = ({ dossier, questionnaire = {} } = {}) => {
  const candidates = [
    questionnaire.modificationType,
    questionnaire.typeModification,
    questionnaire.typeFormalite,
    dossier?.typeFormalite,
    dossier?.service,
  ].map(normalizeKey).filter(Boolean);

  for (const candidate of candidates) {
    if (TYPE_FORMALITE_MAP[candidate]) return TYPE_FORMALITE_MAP[candidate];
    if (SERVICE_MAP[candidate]) return SERVICE_MAP[candidate];
    if (Object.values(MODIFICATION_TYPES).includes(candidate)) return candidate;
  }
  return MODIFICATION_TYPES.OTHER_STATUTORY_MODIFICATION;
};

const buildChecklistForRule = (rule, { legalForm } = {}) => {
  if (isEiLikeLabel(legalForm)) {
    return [
      checklistItem({
        id: 'ei_modification_proof',
        label: 'Justificatif lié à la modification',
        description: 'Document adapté à votre situation (adresse, activité, identité).',
        required: true,
        docKey: 'address_proof',
        category: DOCUMENT_CATEGORIES.OTHER,
      }),
    ];
  }

  const items = [...COMMON_MODIFICATION_CHECKLIST];
  if (rule.requiresDecision) items.push(DECISION_ITEM);
  if (rule.requiresUpdatedArticles === true) items.push(UPDATED_ARTICLES_ITEM);
  else if (rule.requiresUpdatedArticles === 'conditional') {
    items.push({ ...UPDATED_ARTICLES_ITEM, required: false });
  }
  if (rule.requiresLegalNotice === true) items.push({ ...LEGAL_NOTICE_ITEM, required: true });
  else if (rule.requiresLegalNotice === 'conditional') items.push(LEGAL_NOTICE_ITEM);
  if (rule.extra?.length) items.push(...rule.extra);
  return items;
};

const dedupeChecklist = (items = []) => {
  const byId = new Map();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return Array.from(byId.values());
};

export const getModificationFormalityRule = ({
  legalForm = 'SAS',
  modificationType,
  context = {},
} = {}) => {
  const rule = MODIFICATION_RULES[modificationType] || null;
  const checklist = rule
    ? dedupeChecklist(buildChecklistForRule(rule, { legalForm }))
    : [
      DECISION_ITEM,
      { ...UPDATED_ARTICLES_ITEM, required: false },
      LEGAL_NOTICE_ITEM,
    ];

  const requiredDocKeys = checklist
    .filter((item) => item.required && item.docKey)
    .map((item) => item.docKey);

  return {
    formalityType: 'modification',
    legalForm,
    modificationType,
    label: rule?.label || 'Modification d’entreprise',
    checklist,
    requiredDocKeys,
    warnings: rule?.warnings || [
      'Greffio affiche une checklist prudente. Certains documents peuvent varier selon votre situation.',
    ],
    context,
  };
};

export const isModificationDossier = ({ dossier, questionnaire = {} } = {}) => {
  const service = normalizeKey(dossier?.service || questionnaire?.service);
  const typeFormalite = normalizeKey(questionnaire?.typeFormalite || dossier?.typeFormalite);
  if (service === 'modification' || service.includes('modification')) return true;
  if (typeFormalite.includes('modification')) return true;
  return Boolean(TYPE_FORMALITE_MAP[typeFormalite] || SERVICE_MAP[service]);
};
