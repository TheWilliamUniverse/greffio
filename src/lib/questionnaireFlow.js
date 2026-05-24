import { isLegallyMinor } from '@/config/minorAssociateRules.js';
import { ASSOCIATE_TYPES, isAssociateEntryComplete } from '@/utils/associateEntry.js';

export const DEMARCHE_CATEGORIES = [
  { id: 'creation', label: 'Création', description: 'Immatriculer une nouvelle structure' },
  { id: 'etablissements', label: 'Établissements & siège', description: 'Ouvrir, fermer ou déplacer un site' },
  { id: 'modifications', label: 'Modifications', description: 'Capital, gouvernance, activité' },
  { id: 'gestion', label: 'Vie de la société', description: 'Comptes, sommeil, dissolution' },
  { id: 'autres', label: 'Documents & régularisation', description: 'Kbis, corrections, étranger' },
];

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
    description: 'Sélectionnez la structure cible de votre activité.',
    fields: [
      {
        key: 'formeJuridique',
        label: 'Forme juridique',
        type: 'select',
        required: true,
        options: ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'EI', 'MICRO-ENTREPRISE', 'AUTRE'],
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
    description: 'Personnes physiques ou morales. Pour un associé mineur, précisez s’il est légalement émancipé.',
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
        placeholder: 'Nom et prénom du dirigeant',
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
        type: 'text',
        required: false,
        placeholder: 'Noms des bénéficiaires effectifs',
        condition: (data) => !isEiLikeFormality(data),
      },
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
  if (field.type === 'associates_minor_panel') {
    const associates = Array.isArray(formData.associates) ? formData.associates : [];
    const hasAssociate = associates.some((a) => isAssociateEntryComplete(a));
    const minorsComplete = associates
      .filter((a) => (a.associateType || ASSOCIATE_TYPES.PERSON) === ASSOCIATE_TYPES.PERSON && isLegallyMinor(a.birthDate))
      .every((a) => a.isMinorEmancipated === true || String(a.legalRepresentatives || '').trim());
    return hasAssociate && minorsComplete;
  }
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
  return visibleFields.every((field) => isFieldValueValid(field, formData[field.key], formData));
};
