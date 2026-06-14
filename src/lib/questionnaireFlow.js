import { isLegallyMinor } from '@/config/minorAssociateRules.js';
import { ASSOCIATE_TYPES, isAssociateEntryComplete } from '@/utils/associateEntry.js';
import { resolveDemarchePreset } from '@/utils/formalityMapping.js';
import {
  isCommercialFormFamily,
  needsFormeWizard,
  shouldShowComparateurCta,
  shouldShowFormeJuridiqueField,
} from '@/lib/questionnaireFormFamilies.js';

export const DEMARCHE_CATEGORIES = [
  { id: 'creation', label: 'Création', description: 'Immatriculer une nouvelle structure' },
  { id: 'etablissements', label: 'Établissements & siège', description: 'Ouvrir, fermer ou déplacer un site' },
  { id: 'modifications', label: 'Modifications', description: 'Capital, gouvernance, activité' },
  { id: 'gestion', label: 'Vie de la société', description: 'Comptes, sommeil, dissolution' },
  { id: 'autres', label: 'Documents & régularisation', description: 'Kbis, corrections, étranger' },
];

/** 4 familles proposées en entrée du questionnaire client connecté. */
export const PRIMARY_FORMALITY_CATEGORIES = Object.freeze([
  {
    id: 'creation',
    kicker: 'Création',
    label: 'Immatriculer une nouvelle structure',
    description: 'SAS, SARL, SCI, micro-entreprise, EI…',
    categories: ['creation'],
  },
  {
    id: 'etablissements',
    kicker: 'Établissements & siège',
    label: 'Ouvrir, fermer ou déplacer un site',
    description: 'Siège, établissement secondaire, transfert.',
    categories: ['etablissements'],
  },
  {
    id: 'modifications',
    kicker: 'Modifications',
    label: 'Capital, gouvernance, activité',
    description: 'Dirigeant, dénomination, objet social, capital.',
    categories: ['modifications', 'gestion'],
  },
  {
    id: 'autres',
    kicker: 'Documents & régularisation',
    label: 'Kbis, corrections, étranger',
    description: 'Régularisation, documents officiels, société étrangère.',
    categories: ['autres'],
  },
]);

export const DEMARCHE_CATALOG = [
  { key: 'creation_societe', label: 'Créer une société', category: 'creation', hint: 'Forme juridique choisie à l’étape suivante' },
  { key: 'creation_sasu', label: 'Créer une SASU', category: 'creation' },
  { key: 'creation_sas', label: 'Créer une SAS', category: 'creation' },
  { key: 'creation_sarl', label: 'Créer une SARL', category: 'creation' },
  { key: 'creation_eurl', label: 'Créer une EURL', category: 'creation' },
  { key: 'creation_sci', label: 'Créer une SCI', category: 'creation' },
  { key: 'micro_entreprise', label: 'Créer une micro-entreprise', category: 'creation' },
  { key: 'entreprise_individuelle', label: 'Créer une entreprise individuelle', category: 'creation' },
  { key: 'societe_etrangere_france', label: 'Immatriculer une société étrangère en France', category: 'autres' },
  { key: 'etablissement_secondaire_creation', label: 'Créer un établissement secondaire', category: 'etablissements' },
  { key: 'etablissement_creation', label: 'Ajouter un établissement', category: 'etablissements' },
  { key: 'etablissement_fermeture', label: 'Fermer un établissement', category: 'etablissements' },
  { key: 'etablissement_transfert', label: 'Transférer un établissement', category: 'etablissements' },
  { key: 'transfert_siege', label: 'Transférer le siège social', category: 'etablissements' },
  { key: 'changement_dirigeant', label: 'Changer de dirigeant', category: 'modifications' },
  { key: 'changement_denomination', label: 'Changer la dénomination sociale', category: 'modifications' },
  { key: 'modification_activite', label: 'Modifier l’activité', category: 'modifications' },
  { key: 'modification_objet_social', label: 'Modifier l’objet social', category: 'modifications' },
  { key: 'augmentation_capital', label: 'Augmenter le capital social', category: 'modifications' },
  { key: 'reduction_capital', label: 'Réduire le capital social', category: 'modifications' },
  { key: 'beneficiaires_effectifs_modification', label: 'Modifier les bénéficiaires effectifs', category: 'modifications' },
  { key: 'depot_comptes_annuels', label: 'Déposer les comptes annuels', category: 'gestion' },
  { key: 'mise_en_sommeil', label: 'Mettre une société en sommeil', category: 'gestion' },
  { key: 'reprise_activite', label: 'Reprendre une activité', category: 'gestion' },
  { key: 'dissolution_liquidation_radiation', label: 'Dissoudre / liquider / radier une société', category: 'gestion' },
  { key: 'correction_regularisation', label: 'Régulariser une formalité rejetée ou incomplète', category: 'autres' },
  { key: 'obtention_kbis_documents', label: 'Obtenir Kbis / documents officiels', category: 'autres' },
];

const isEiLikeFormality = (data) => {
  const formality = String(data.typeFormalite || '').toLowerCase();
  const legalForm = String(data.formeJuridique || '').toUpperCase();
  return formality === 'micro_entreprise'
    || formality === 'entreprise_individuelle'
    || legalForm === 'EI'
    || legalForm === 'MICRO-ENTREPRISE';
};

export const EXISTING_BUSINESS_FORMALITIES = new Set([
  'etablissement_creation',
  'etablissement_fermeture',
  'etablissement_transfert',
  'transfert_siege',
  'changement_dirigeant',
  'changement_denomination',
  'modification_activite',
  'modification_objet_social',
  'augmentation_capital',
  'reduction_capital',
  'beneficiaires_effectifs_modification',
  'depot_comptes_annuels',
  'mise_en_sommeil',
  'reprise_activite',
  'dissolution_liquidation_radiation',
  'correction_regularisation',
  'obtention_kbis_documents',
  'societe_etrangere_france',
]);

export const QUESTIONNAIRE_FLOW = [
  {
    id: 'contact',
    title: 'Qui effectue la démarche ?',
    description: 'Ces informations sont nécessaires pour vous assister et constituer le dossier.',
    fields: [
      {
        key: 'initiatorType',
        label: 'Type de déclarant',
        type: 'select',
        required: true,
        options: [
          { key: 'personne_physique', label: 'Personne physique' },
          { key: 'personne_morale', label: 'Personne morale' },
        ],
      },
      { key: 'firstName', label: 'Prénom', type: 'text', required: true, placeholder: 'Votre prénom' },
      { key: 'lastName', label: 'Nom', type: 'text', required: true, placeholder: 'Votre nom' },
      {
        key: 'nationality',
        label: 'Nationalité',
        type: 'text',
        required: true,
        placeholder: 'Française',
        condition: (data) => (data.initiatorType || 'personne_physique') === 'personne_physique',
      },
      {
        key: 'birthDate',
        label: 'Date de naissance',
        type: 'date',
        required: false,
        condition: (data) => (data.initiatorType || 'personne_physique') === 'personne_physique',
      },
      {
        key: 'companyCountry',
        label: "Pays d'immatriculation",
        type: 'text',
        required: true,
        placeholder: 'France',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      {
        key: 'companySiren',
        label: 'SIREN / SIRET',
        type: 'text',
        required: true,
        placeholder: '123456789 ou 12345678900013',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      {
        key: 'companyName',
        label: 'Raison sociale (personne morale)',
        type: 'text',
        required: false,
        placeholder: 'Nom de la société',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'vous@entreprise.fr' },
      { key: 'phone', label: 'Téléphone', type: 'tel', required: true, placeholder: '04 11 81 86 70' },
    ],
  },
  {
    id: 'demarche',
    title: 'Quelle démarche ?',
    description: 'Nous adaptons ensuite les sous-questions selon votre situation.',
    fields: [
      {
        key: 'typeFormalite',
        label: 'Type de formalité',
        type: 'select',
        required: true,
        options: DEMARCHE_CATALOG,
      },
      {
        key: 'existingBusinessSiren',
        label: 'SIREN / SIRET de l’entreprise existante',
        type: 'text',
        required: true,
        placeholder: '123456789 ou 12345678900013',
        condition: (data) => EXISTING_BUSINESS_FORMALITIES.has(String(data.typeFormalite || '')),
      },
      {
        key: 'existingBusinessName',
        label: 'Raison sociale (trouvée automatiquement)',
        type: 'text',
        required: false,
        placeholder: 'Nom entreprise',
        condition: (data) => EXISTING_BUSINESS_FORMALITIES.has(String(data.typeFormalite || '')),
      },
    ],
  },
  {
    id: 'forme',
    title: 'Forme juridique',
    description: 'Identifiez d’abord la catégorie juridique, puis la forme adaptée à votre projet.',
    condition: (data) => {
      const preset = String(data.formeJuridique || '').trim();
      if (preset && resolveDemarchePreset(data.typeFormalite).formeJuridique) return false;
      return needsFormeWizard(data);
    },
    fields: [
      {
        key: 'formeJuridiqueFamille',
        label: 'Quelle catégorie correspond à votre projet ?',
        type: 'form_family_picker',
        required: true,
        condition: (data) => needsFormeWizard(data),
      },
      {
        key: 'connaissezFormeJuridique',
        label: 'Savez-vous déjà quelle forme juridique vous intéresse ?',
        type: 'select',
        required: true,
        options: [
          { key: 'oui', label: 'Oui, je sais déjà' },
          { key: 'non', label: 'Non, j’ai besoin d’aide' },
        ],
        condition: (data) => needsFormeWizard(data) && isCommercialFormFamily(data.formeJuridiqueFamille),
      },
      {
        key: '_comparateurCta',
        label: 'Comparer les formes juridiques',
        type: 'comparateur_cta',
        required: false,
        condition: (data) => shouldShowComparateurCta(data),
      },
      {
        key: 'formeJuridique',
        label: 'Forme juridique',
        type: 'select',
        required: true,
        options: ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'SA', 'EI', 'MICRO-ENTREPRISE', 'AUTRE'],
        condition: (data) => shouldShowFormeJuridiqueField(data),
      },
    ],
  },
  {
    id: 'entreprise',
    title: 'Informations entreprise',
    description: 'Nom de l’entreprise, siège, activité et capital.',
    fields: [
      { key: 'denomination', label: 'Dénomination', type: 'text', required: true, placeholder: 'Nom de la société' },
      { key: 'adresseSiege', label: 'Adresse du siège (voie et numéro)', type: 'text', required: true, placeholder: '12 rue de la République' },
      {
        key: 'codePostal',
        label: 'Code postal du siège',
        type: 'text',
        required: true,
        placeholder: '75001',
        condition: (data) => !isEiLikeFormality(data),
      },
      {
        key: 'villeSiege',
        label: 'Ville du siège',
        type: 'text',
        required: true,
        placeholder: 'Paris',
        condition: (data) => !isEiLikeFormality(data),
      },
      { key: 'activite', label: 'Objet social / activité principale', type: 'textarea', required: true, placeholder: 'Description précise de l’activité exercée' },
      {
        key: 'capital',
        label: 'Capital social (EUR)',
        type: 'number',
        required: true,
        placeholder: '1000',
        condition: (data) => !isEiLikeFormality(data),
      },
      {
        key: 'adressePersonnelle',
        label: 'Adresse personnelle',
        type: 'text',
        required: true,
        placeholder: 'Adresse complète',
        condition: (data) => isEiLikeFormality(data),
      },
      {
        key: 'adresseActivite',
        label: "Adresse de l'activité (si différente)",
        type: 'text',
        required: false,
        placeholder: "Adresse d'exploitation",
        condition: (data) => isEiLikeFormality(data),
      },
      {
        key: 'nomEnseigne',
        label: "Nom commercial / enseigne (si applicable)",
        type: 'text',
        required: false,
        placeholder: 'Nom commercial',
        condition: (data) => isEiLikeFormality(data),
      },
      {
        key: 'dateDebutActivite',
        label: "Date souhaitée de début d'activité",
        type: 'text',
        required: true,
        placeholder: 'JJ/MM/AAAA',
        condition: (data) => isEiLikeFormality(data),
      },
      {
        key: 'regimeEi',
        label: 'Régime',
        type: 'select',
        required: true,
        options: ['Micro-entreprise', 'EI classique'],
        condition: (data) => isEiLikeFormality(data),
      },
      {
        key: 'optionFiscaleSociale',
        label: 'Option fiscale / sociale',
        type: 'text',
        required: false,
        placeholder: 'Versement libératoire, réel, micro-social...',
        condition: (data) => isEiLikeFormality(data),
      },
    ],
  },
  {
    id: 'gouvernance',
    title: 'Associés et dirigeant',
    description: 'Personnes physiques ou morales (une PM peut être Présidente ou DG). Pour un associé mineur, précisez s’il est légalement émancipé.',
    fields: [
      {
        key: 'associates',
        label: 'Associés',
        type: 'associates_minor_panel',
        required: true,
        condition: (data) => !isEiLikeFormality(data),
      },
      {
        key: 'dirigeant',
        label: 'Président / dirigeant',
        type: 'text',
        required: true,
        placeholder: 'Renseigné automatiquement si un associé est Président – sinon nom du dirigeant',
        condition: (data) => !isEiLikeFormality(data),
      },
    ],
  },
  {
    id: 'beneficiaires',
    title: 'Bénéficiaires effectifs',
    description: 'Indiquez les bénéficiaires effectifs si vous les connaissez déjà (sinon, complétion ultérieure possible).',
    condition: (data) => !isEiLikeFormality(data),
    fields: [
      {
        key: 'beneficiairesEffectifs',
        label: 'Bénéficiaires effectifs',
        type: 'beneficial_owners_picker',
        required: false,
        condition: (data) => !isEiLikeFormality(data),
      },
    ],
  },
  {
    id: 'recap',
    title: 'Récapitulatif',
    description: 'Relisez vos réponses avant de valider le dossier.',
    fields: [
      { key: '_recapSummary', label: 'Récapitulatif', type: 'recap_summary', required: false },
    ],
  },
  {
    id: 'validation',
    title: 'Validation finale',
    description: 'Vérifiez puis validez avant génération des documents.',
    fields: [
      { key: 'validationConfirmed', label: 'Je confirme l’exactitude des informations', type: 'checkbox', required: true },
    ],
  },
];

export const getProgressPercent = (stepIndex) => Math.round(((stepIndex + 1) / QUESTIONNAIRE_FLOW.length) * 100);

export const getApplicableFlowSteps = (formData = {}) => (
  QUESTIONNAIRE_FLOW.filter((step) => !step.condition || step.condition(formData))
);

export const getVisibleFieldsForStep = (step, formData = {}) => {
  if (!step) return [];
  if (step.condition && !step.condition(formData)) return [];
  return step.fields.filter((field) => !field.condition || field.condition(formData));
};

/** Regroupe les champs sur mobile pour réduire les micro-écrans (identité, coordonnées, siège…). */
const MOBILE_FIELD_GROUP_SPECS = Object.freeze({
  contact: [
    ['initiatorType'],
    ['firstName'],
    ['lastName'],
    ['nationality'],
    ['birthDate'],
    ['companyCountry'],
    ['companySiren'],
    ['companyName'],
    ['email'],
    ['phone'],
  ],
  demarche: [
    ['typeFormalite'],
    ['existingBusinessSiren'],
    ['existingBusinessName'],
  ],
  forme: [
    ['formeJuridiqueFamille'],
    ['connaissezFormeJuridique'],
    ['_comparateurCta'],
    ['formeJuridique'],
  ],
  entreprise: [
    ['denomination'],
    ['adresseSiege'],
    ['codePostal'],
    ['villeSiege'],
    ['activite'],
    ['capital'],
    ['adressePersonnelle'],
    ['adresseActivite'],
    ['nomEnseigne'],
    ['dateDebutActivite'],
    ['regimeEi'],
    ['optionFiscaleSociale'],
  ],
});

export const resolveMobileFieldGroups = (step, formData = {}) => {
  const visible = getVisibleFieldsForStep(step, formData);
  if (!visible.length) return [];
  const specs = MOBILE_FIELD_GROUP_SPECS[step?.id];
  if (!specs) return visible.map((field) => [field]);

  const used = new Set();
  const groups = [];
  specs.forEach((keys) => {
    const group = keys
      .map((key) => visible.find((field) => field.key === key))
      .filter((field) => field && !used.has(field.key));
    group.forEach((field) => used.add(field.key));
    if (group.length) groups.push(group);
  });
  visible.forEach((field) => {
    if (!used.has(field.key)) groups.push([field]);
  });
  return groups;
};

export const fieldIndexFromGroupIndex = (groups = [], groupIndex = 0) => {
  let index = 0;
  for (let i = 0; i < groupIndex && i < groups.length; i += 1) {
    index += groups[i].length;
  }
  return index;
};

export const groupIndexFromFieldKey = (groups = [], fieldKey = '') => {
  if (!fieldKey) return 0;
  for (let index = 0; index < groups.length; index += 1) {
    if (groups[index].some((field) => field.key === fieldKey)) return index;
  }
  return 0;
};

/** Progression fine : une question validée = un cran (parcours adaptatif EI / PM, etc.). */
export const getQuestionnaireProgressPercent = (formData = {}, stepIndex = 0, fieldIndex = 0) => {
  let total = 0;
  let answered = 0;
  QUESTIONNAIRE_FLOW.forEach((flowStep, stepIdx) => {
    if (flowStep.condition && !flowStep.condition(formData)) return;
    const fields = getVisibleFieldsForStep(flowStep, formData);
    total += fields.length;
    if (stepIdx < stepIndex) {
      answered += fields.length;
    } else if (stepIdx === stepIndex) {
      answered += Math.min(fieldIndex, fields.length);
    }
  });
  if (!total) return 0;
  return Math.min(100, Math.round((answered / total) * 100));
};

export const isFieldValueValid = (field, value, formData = {}) => {
  if (field.type === 'beneficial_owners_picker') {
    const selected = Array.isArray(formData.beneficiairesEffectifsSelected)
      ? formData.beneficiairesEffectifsSelected
      : [];
    const other = String(formData.beneficiairesEffectifsAutre || '').trim();
    const summary = String(formData.beneficiairesEffectifs || value || '').trim();
    if (!field.required) return selected.length > 0 || Boolean(other) || Boolean(summary);
    return selected.length > 0 || Boolean(other);
  }
  if (field.type === 'associates_minor_panel') {
    const associates = Array.isArray(formData.associates) ? formData.associates : [];
    const hasAssociate = associates.some((a) => isAssociateEntryComplete(a));
    const minorsComplete = associates
      .filter((a) => (a.associateType || ASSOCIATE_TYPES.PERSON) === ASSOCIATE_TYPES.PERSON && isLegallyMinor(a.birthDate))
      .every((a) => a.isMinorEmancipated === true || String(a.legalRepresentatives || '').trim());
    return hasAssociate && minorsComplete;
  }
  if (field.type === 'comparateur_cta') {
    return Boolean(formData.comparateurIgnore);
  }
  if (field.key === 'formeJuridique' && formData.comparateurIgnore) return true;
  if (!field.required) return true;
  if (field.type === 'checkbox') return Boolean(value);
  if (value == null) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (field.type === 'email') return normalized.includes('@');
  return true;
};

export const isStepComplete = (step, formData) => {
  if (step.condition && !step.condition(formData)) return true;
  const visibleFields = step.fields.filter((field) => !field.condition || field.condition(formData));
  if (!visibleFields.length) return true;
  if (step.id === 'recap') {
    return formData.recapAcknowledged === true || formData.validationConfirmed === true;
  }
  return visibleFields.every((field) => isFieldValueValid(field, formData[field.key], formData));
};

export const inferDemarcheCategory = (typeFormalite = '') => {
  const item = DEMARCHE_CATALOG.find((entry) => entry.key === typeFormalite);
  if (!item) return '';
  const primary = PRIMARY_FORMALITY_CATEGORIES.find((entry) => entry.categories.includes(item.category));
  return primary?.id || '';
};

export const resolveResumePosition = (formData = {}, resume = {}) => {
  const applicable = getApplicableFlowSteps(formData);
  const sharedMeta = {
    demarcheCategory: resume?.demarcheCategory || inferDemarcheCategory(formData.typeFormalite),
    categoryConfirmed: resume?.categoryConfirmed ?? Boolean(formData.typeFormalite),
  };

  if (formData.validationConfirmed === true) {
    return {
      stepIndex: Math.max(applicable.length - 1, 0),
      fieldIndex: 0,
      ...sharedMeta,
      questionnaireAlreadyValidated: true,
    };
  }

  let stepIndex = 0;
  let fieldIndex = 0;

  if (resume?.stepId) {
    const savedIndex = applicable.findIndex((entry) => entry.id === resume.stepId);
    if (savedIndex >= 0) {
      const firstIncomplete = applicable.findIndex((entry) => !isStepComplete(entry, formData));
      stepIndex = firstIncomplete >= 0 ? firstIncomplete : savedIndex;
    }
  } else {
    for (let index = 0; index < applicable.length; index += 1) {
      if (!isStepComplete(applicable[index], formData)) {
        stepIndex = index;
        break;
      }
      if (index === applicable.length - 1) stepIndex = index;
    }
  }

  const step = applicable[stepIndex] || applicable[0];
  const fields = getVisibleFieldsForStep(step, formData);
  if (resume?.fieldKey && fields.length) {
    const savedField = fields.findIndex((field) => field.key === resume.fieldKey);
    if (savedField >= 0) fieldIndex = savedField;
  } else if (fields.length) {
    for (let index = 0; index < fields.length; index += 1) {
      if (!isFieldValueValid(fields[index], formData[fields[index].key], formData)) {
        fieldIndex = index;
        break;
      }
    }
  }

  return {
    stepIndex,
    fieldIndex,
    ...sharedMeta,
  };
};

export const getFieldValidationMessage = (field, value, formData = {}) => {
  if (!field?.required) return '';
  if (isFieldValueValid(field, value, formData)) return '';
  if (field.type === 'email') return 'Indiquez une adresse email valide pour recevoir les notifications.';
  if (field.type === 'checkbox') return 'Cette confirmation est nécessaire pour poursuivre.';
  if (field.key === 'companySiren' || field.key === 'existingBusinessSiren') {
    return 'Le SIREN (9 chiffres) ou SIRET (14 chiffres) est requis pour identifier l’entreprise.';
  }
  if (field.key === 'formeJuridiqueFamille') return 'Choisissez la catégorie juridique la plus proche de votre projet.';
  if (field.key === 'connaissezFormeJuridique') return 'Indiquez si vous connaissez déjà la forme juridique visée.';
  if (field.key === 'typeFormalite') return 'Choisissez la formalité correspondant à votre projet.';
  if (field.key === 'formeJuridique') return 'Indiquez la forme juridique de votre structure.';
  if (field.key === 'dirigeant') return 'Le dirigeant doit être identifié conformément à la réglementation.';
  if (field.type === 'associates_minor_panel') return 'Renseignez au moins un associé complet (identité et parts).';
  return `${field.label || 'Ce champ'} est requis pour constituer votre dossier.`;
};
