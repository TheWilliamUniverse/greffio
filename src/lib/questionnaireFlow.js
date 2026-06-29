import { isLegallyMinor, validateDirectorEligibility } from '@/config/minorAssociateRules.js';
import { ASSOCIATE_TYPES, isAssociateEntryComplete } from '@/utils/associateEntry.js';
import { resolveDemarchePreset } from '@/utils/formalityMapping.js';
import {
  isCommercialFormFamily,
  isQuestionnaireAutresPrimary,
  needsFormeWizard,
  shouldShowComparateurCta,
  shouldShowFormeJuridiqueField,
} from '@/lib/questionnaireFormFamilies.js';
import { isGreffeBlockingField } from '@/lib/questionnaireFieldPolicy.js';

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
      {
        key: 'firstName',
        label: 'Prénom',
        type: 'text',
        required: true,
        placeholder: 'Votre prénom',
        condition: (data) => (data.initiatorType || 'personne_physique') === 'personne_physique',
      },
      {
        key: 'lastName',
        label: 'Nom',
        type: 'text',
        required: true,
        placeholder: 'Votre nom',
        condition: (data) => (data.initiatorType || 'personne_physique') === 'personne_physique',
      },
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
        label: 'SIREN / SIRET (facultatif)',
        type: 'text',
        required: false,
        placeholder: '123456789 ou 12345678900013',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      {
        key: 'companyName',
        label: 'Dénomination / raison sociale',
        type: 'text',
        required: true,
        placeholder: 'Ex. WILLIAM ESTABLISHMENTS',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      {
        key: 'companyRepresentative',
        label: 'Représentant légal',
        type: 'text',
        required: true,
        placeholder: 'Nom et prénom du représentant',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'vous@entreprise.fr' },
      { key: 'phone', label: 'Téléphone', type: 'tel', required: true, placeholder: '04 11 81 86 70' },
      {
        key: 'typeFormalite',
        label: 'Formalité',
        type: 'select',
        required: true,
        options: DEMARCHE_CATALOG,
      },
    ],
  },
  {
    id: 'demarche',
    title: 'Entreprise concernée',
    description: 'Identifiez la société existante pour la formalité choisie.',
    condition: (data) => EXISTING_BUSINESS_FORMALITIES.has(String(data.typeFormalite || '')),
    fields: [
      {
        key: 'existingBusinessSiren',
        label: 'SIREN / SIRET de l’entreprise existante',
        type: 'text',
        required: true,
        missingButContinueAllowed: true,
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
        key: 'formeJuridiqueFamillePrimary',
        label: 'Quelle catégorie correspond à votre projet ?',
        type: 'form_family_picker',
        required: true,
        condition: (data) => needsFormeWizard(data),
      },
      {
        key: 'formeJuridiqueFamilleSecondary',
        label: 'Précisez votre catégorie',
        type: 'form_family_secondary_picker',
        required: true,
        condition: (data) => (
          needsFormeWizard(data)
          && isQuestionnaireAutresPrimary(data.formeJuridiqueFamillePrimary)
          && !String(data.formeJuridiqueFamille || '').trim()
        ),
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
        key: 'liberationCapital',
        label: 'Libération du capital',
        type: 'capital_liberation_picker',
        required: true,
        condition: (data) => !isEiLikeFormality(data),
      },
      {
        key: 'apportsNature',
        label: 'Y a-t-il des apports en nature ?',
        type: 'select',
        required: true,
        options: [
          { key: 'Non', label: 'Non, uniquement du numéraire' },
          { key: 'Oui', label: 'Oui, des biens ou droits' },
        ],
        condition: (data) => !isEiLikeFormality(data),
      },
      {
        key: 'detailApportsNature',
        label: 'Description des apports en nature',
        type: 'textarea',
        required: true,
        placeholder: 'Ex. matériel informatique, véhicule, brevet, clientèle…',
        condition: (data) => !isEiLikeFormality(data) && String(data.apportsNature || '').trim() === 'Oui',
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

export const getFlowStepIndexById = (stepId = '') => {
  const index = QUESTIONNAIRE_FLOW.findIndex((entry) => entry.id === stepId);
  return Math.max(index, 0);
};

const resolveFieldGroupIndex = (step, formData, fieldKey, mobilePresentation = false) => {
  if (!fieldKey) return 0;
  const groups = mobilePresentation
    ? resolveMobileFieldGroups(step, formData)
    : getVisibleFieldsForStep(step, formData).map((field) => [field]);
  return groupIndexFromFieldKey(groups, fieldKey);
};

/** Premier champ bloquant manquant avant la position courante (ordre du questionnaire). */
export const findPriorMissingBlockingField = (
  formData = {},
  currentStepId = '',
  currentFieldKey = '',
  options = {},
) => {
  const { mobilePresentation = false } = options;
  const applicable = getApplicableFlowSteps(formData);
  const currentApplicableIndex = applicable.findIndex((entry) => entry.id === currentStepId);
  if (currentApplicableIndex < 0) return null;

  const currentStep = applicable[currentApplicableIndex];
  const currentGroupIndex = resolveFieldGroupIndex(
    currentStep,
    formData,
    currentFieldKey,
    mobilePresentation,
  );

  for (let stepIdx = 0; stepIdx <= currentApplicableIndex; stepIdx += 1) {
    const flowStep = applicable[stepIdx];
    const visibleFields = getVisibleFieldsForStep(flowStep, formData);
    const groups = mobilePresentation
      ? resolveMobileFieldGroups(flowStep, formData)
      : visibleFields.map((field) => [field]);

    for (const field of visibleFields) {
      if (stepIdx === currentApplicableIndex) {
        const fieldGroupIndex = groupIndexFromFieldKey(groups, field.key);
        if (fieldGroupIndex >= currentGroupIndex) break;
      }
      if (!isGreffeBlockingField(field)) continue;
      if (isFieldValueValid(field, formData[field.key], formData)) continue;
      return { stepId: flowStep.id, fieldKey: field.key, field };
    }
  }

  if (currentStep?.id === 'gouvernance') {
    const directorCheck = validateDirectorEligibility(formData);
    if (!directorCheck.ok) {
      return { stepId: 'gouvernance', fieldKey: 'dirigeant', field: { key: 'dirigeant', label: 'Dirigeant' } };
    }
  }

  return null;
};

export const resolveMissingFieldCtaLabel = (field) => {
  const key = field?.key || '';
  const labels = {
    adresseSiege: "Compléter l'adresse du siège",
    codePostal: 'Indiquer le code postal',
    villeSiege: 'Indiquer la ville du siège',
    denomination: 'Indiquer la dénomination',
    activite: "Décrire l'activité",
    capital: 'Indiquer le capital social',
    liberationCapital: 'Préciser la libération du capital',
    formeJuridique: 'Choisir la forme juridique',
    typeFormalite: 'Choisir la formalité',
    dirigeant: 'Identifier le dirigeant',
    associates: 'Renseigner les associés',
  };
  if (labels[key]) return labels[key];
  const label = String(field?.label || '').trim();
  return label ? `Compléter « ${label} »` : 'Compléter l’étape manquante';
};

export const resolvePriorFieldBlockNotice = (missingEntry) => {
  const label = missingEntry?.field?.label || 'une information précédente';
  return `Pour poursuivre, il nous manque encore ${label.toLowerCase()}. Nous vous guidons vers la question à compléter – vous reviendrez ensuite ici.`;
};

/** Prochaine position lors d’un retour guidé après correction d’un champ antérieur. */
export const resolveNextGroupWithPendingReturn = (
  formData = {},
  step,
  currentGroupIndex = 0,
  pendingReturn = null,
  options = {},
) => {
  const { mobilePresentation = false } = options;
  if (!pendingReturn || pendingReturn.stepId !== step?.id) {
    return { type: 'normal', groupIndex: currentGroupIndex + 1 };
  }

  const groups = mobilePresentation
    ? resolveMobileFieldGroups(step, formData)
    : getVisibleFieldsForStep(step, formData).map((field) => [field]);
  const returnGroupIndex = groupIndexFromFieldKey(groups, pendingReturn.fieldKey);
  if (returnGroupIndex < 0 || currentGroupIndex >= returnGroupIndex) {
    return { type: 'normal', groupIndex: currentGroupIndex + 1 };
  }

  const visibleFields = getVisibleFieldsForStep(step, formData);
  const currentFieldKeys = new Set((groups[currentGroupIndex] || []).map((field) => field.key));
  let passedCurrent = false;

  for (const field of visibleFields) {
    if (currentFieldKeys.has(field.key)) {
      passedCurrent = true;
      continue;
    }
    if (!passedCurrent) continue;
    const fieldGroupIndex = groupIndexFromFieldKey(groups, field.key);
    if (fieldGroupIndex >= returnGroupIndex) break;
    if (!isFieldValueValid(field, formData[field.key], formData)) {
      return { type: 'skip-to', groupIndex: fieldGroupIndex };
    }
  }

  return { type: 'return', groupIndex: returnGroupIndex };
};

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
    ['companyRepresentative'],
    ['email'],
    ['phone'],
    ['typeFormalite'],
  ],
  demarche: [
    ['existingBusinessSiren'],
    ['existingBusinessName'],
  ],
  forme: [
    ['formeJuridiqueFamillePrimary'],
    ['formeJuridiqueFamilleSecondary'],
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
    ['liberationCapital'],
    ['apportsNature'],
    ['detailApportsNature'],
    ['adressePersonnelle'],
    ['adresseActivite'],
    ['nomEnseigne'],
    ['dateDebutActivite'],
    ['regimeEi'],
    ['optionFiscaleSociale'],
  ],
  /** Mobile : wizard associés question par question, puis dirigeant seul. */
  gouvernance: [
    ['associates'],
    ['dirigeant'],
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
export const getQuestionnaireProgressPercent = (formData = {}, stepIndex = 0, fieldIndex = 0, options = {}) => {
  const { mobilePresentation = false } = options;
  let total = 0;
  let answered = 0;
  QUESTIONNAIRE_FLOW.forEach((flowStep, stepIdx) => {
    if (flowStep.condition && !flowStep.condition(formData)) return;
    const visibleFields = getVisibleFieldsForStep(flowStep, formData);
    const units = mobilePresentation
      ? Math.max(resolveMobileFieldGroups(flowStep, formData).length, visibleFields.length ? 1 : 0)
      : visibleFields.length;
    total += units;
    if (stepIdx < stepIndex) {
      answered += units;
    } else if (stepIdx === stepIndex) {
      answered += Math.min(fieldIndex, units);
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
  if (field.type === 'capital_liberation_picker') {
    const raw = String(value ?? formData.liberationCapital ?? '').trim();
    if (!field.required && !raw) return true;
    const normalized = raw.replace('%', '').replace(',', '.').trim();
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 50 || parsed > 100) return false;
    return true;
  }
  if (field.key === 'detailApportsNature') {
    if (String(formData.apportsNature || '').trim() !== 'Oui') return true;
    const description = String(value ?? formData.detailApportsNature ?? '').trim();
    if (!field.required) return description.length >= 8;
    return description.length >= 8;
  }
  if (field.type === 'form_family_picker') {
    const primary = String(formData.formeJuridiqueFamillePrimary ?? value ?? '').trim();
    if (!field.required) return Boolean(primary);
    return Boolean(primary);
  }
  if (field.type === 'form_family_secondary_picker') {
    if (!field.required) return true;
    return Boolean(String(formData.formeJuridiqueFamille || '').trim());
  }
  if (field.key === 'formeJuridique' && formData.comparateurIgnore) return true;
  if (!field.required) return true;
  if (field.type === 'checkbox') return Boolean(value);
  if (value == null) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (field.type === 'email') return normalized.includes('@');
  if (field.type === 'textarea' && field.key === 'activite') {
    return normalized.length >= 12;
  }
  if (field.type === 'number' || field.key === 'capital') {
    const amount = Number(normalized.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const legalForm = String(formData.formeJuridique || '').trim().toUpperCase();
    if (field.key === 'capital' && ['SA', 'SA_CA', 'SA_DIRECTOIRE'].includes(legalForm)) {
      return amount >= 37000;
    }
    return true;
  }
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

/** Anciens dossiers : typeFormalite vivait sur l’étape demarche — ramener au flux contact unifié. */
const normalizeResumeMeta = (formData = {}, resume = {}) => {
  const next = { ...resume };
  if (next.stepId === 'demarche' && next.fieldKey === 'typeFormalite') {
    return { ...next, stepId: 'contact', fieldKey: 'typeFormalite' };
  }
  if (next.stepId === 'demarche' && !String(formData.typeFormalite || '').trim()) {
    return { ...next, stepId: 'contact', fieldKey: 'typeFormalite' };
  }
  return next;
};

export const resolveResumePosition = (formData = {}, resume = {}) => {
  const normalizedResume = normalizeResumeMeta(formData, resume);
  const applicable = getApplicableFlowSteps(formData);
  const sharedMeta = {
    demarcheCategory: normalizedResume?.demarcheCategory || inferDemarcheCategory(formData.typeFormalite),
    categoryConfirmed: normalizedResume?.categoryConfirmed ?? Boolean(formData.typeFormalite),
  };

  if (formData.validationConfirmed === true) {
    const lastApplicableStep = applicable[applicable.length - 1];
    return {
      stepIndex: getFlowStepIndexById(lastApplicableStep?.id),
      fieldIndex: 0,
      ...sharedMeta,
      questionnaireAlreadyValidated: true,
    };
  }

  if (normalizedResume?.stepId) {
    const savedApplicableIndex = applicable.findIndex((entry) => entry.id === normalizedResume.stepId);
    if (savedApplicableIndex >= 0) {
      const savedStep = applicable[savedApplicableIndex];
      const savedFlowIndex = getFlowStepIndexById(savedStep.id);
      const fields = getVisibleFieldsForStep(savedStep, formData);
      if (normalizedResume?.fieldKey && fields.length) {
        const savedFieldIndex = fields.findIndex((field) => field.key === normalizedResume.fieldKey);
        if (savedFieldIndex >= 0) {
          return {
            stepIndex: savedFlowIndex,
            fieldIndex: savedFieldIndex,
            ...sharedMeta,
          };
        }
      }
      if (fields.length) {
        const firstInvalid = fields.findIndex(
          (field) => !isFieldValueValid(field, formData[field.key], formData),
        );
        return {
          stepIndex: savedFlowIndex,
          fieldIndex: firstInvalid >= 0 ? firstInvalid : Math.max(fields.length - 1, 0),
          ...sharedMeta,
        };
      }
      return { stepIndex: savedFlowIndex, fieldIndex: 0, ...sharedMeta };
    }
  }

  let applicableStepIndex = 0;
  let fieldIndex = 0;

  for (let index = 0; index < applicable.length; index += 1) {
    if (!isStepComplete(applicable[index], formData)) {
      applicableStepIndex = index;
      break;
    }
    if (index === applicable.length - 1) applicableStepIndex = index;
  }

  const step = applicable[applicableStepIndex] || applicable[0];
  const fields = getVisibleFieldsForStep(step, formData);
  if (fields.length) {
    for (let index = 0; index < fields.length; index += 1) {
      if (!isFieldValueValid(fields[index], formData[fields[index].key], formData)) {
        fieldIndex = index;
        break;
      }
    }
  }

  return {
    stepIndex: getFlowStepIndexById(step?.id),
    fieldIndex,
    ...sharedMeta,
  };
};

export const resolveContinueBlockMessage = (step, formData, activeField, visibleFields = []) => {
  if (activeField) {
    const fieldMessage = getFieldValidationMessage(
      activeField,
      formData[activeField.key],
      formData,
    );
    if (fieldMessage) return fieldMessage;
  }
  const invalidField = visibleFields.find(
    (field) => !isFieldValueValid(field, formData[field.key], formData),
  );
  if (invalidField) {
    return getFieldValidationMessage(invalidField, formData[invalidField.key], formData)
      || `Complétez « ${invalidField.label} » avant de continuer.`;
  }
  if (step?.id === 'gouvernance') {
    const directorCheck = validateDirectorEligibility(formData);
    if (!directorCheck.ok && directorCheck.message) return directorCheck.message;
  }
  return 'Complétez les informations demandées avant de continuer.';
};

export const analyzeStepFieldStates = (step, formData = {}) => {
  if (!step) {
    return {
      blockingMissing: [],
      softMissing: [],
      continueAllowed: true,
      missingButContinueAllowed: false,
    };
  }

  if (step.id === 'recap') {
    const recapOk = formData.recapAcknowledged === true || formData.validationConfirmed === true;
    return {
      blockingMissing: recapOk ? [] : [{ key: 'recapAcknowledged', label: 'Confirmation du récapitulatif' }],
      softMissing: [],
      continueAllowed: recapOk,
      missingButContinueAllowed: false,
    };
  }

  const visibleFields = getVisibleFieldsForStep(step, formData);
  const blockingMissing = [];
  const softMissing = [];

  visibleFields.forEach((field) => {
    if (isFieldValueValid(field, formData[field.key], formData)) return;
    const entry = { key: field.key, label: field.label || field.key };
    if (isGreffeBlockingField(field)) {
      blockingMissing.push(entry);
    } else if (field.required) {
      softMissing.push(entry);
    }
  });

  if (step.id === 'gouvernance') {
    const directorCheck = validateDirectorEligibility(formData);
    if (!directorCheck.ok) {
      blockingMissing.push({
        key: 'dirigeant',
        label: directorCheck.message || 'Dirigeant',
      });
    }
  }

  return {
    blockingMissing,
    softMissing,
    continueAllowed: blockingMissing.length === 0,
    missingButContinueAllowed: blockingMissing.length === 0 && softMissing.length > 0,
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
  if (field.key === 'formeJuridiqueFamillePrimary') return 'Choisissez la catégorie juridique la plus proche de votre projet.';
  if (field.key === 'formeJuridiqueFamilleSecondary') return 'Choisissez la catégorie la plus proche dans « Autres ».';
  if (field.key === 'connaissezFormeJuridique') return 'Indiquez si vous connaissez déjà la forme juridique visée.';
  if (field.key === 'typeFormalite') return 'Choisissez la formalité correspondant à votre projet.';
  if (field.key === 'formeJuridique') return 'Indiquez la forme juridique de votre structure.';
  if (field.key === 'capital' && ['SA', 'SA_CA', 'SA_DIRECTOIRE'].includes(String(formData.formeJuridique || '').trim().toUpperCase())) {
    return 'Pour une SA, le capital social minimum légal est de 37 000 €. Indiquez au moins ce montant pour continuer.';
  }
  if (field.key === 'activite') return 'Décrivez l’activité en au moins 12 caractères.';
  if (field.key === 'capital') return 'Indiquez un capital social en euros (nombre positif).';
  if (field.type === 'capital_liberation_picker' || field.key === 'liberationCapital') {
    return 'Indiquez si le capital est intégralement libéré (100 %) ou partiellement libéré (entre 50 % et 95 %).';
  }
  if (field.key === 'apportsNature') return 'Précisez s’il existe des apports en nature.';
  if (field.key === 'detailApportsNature') {
    return 'Décrivez les apports en nature en au moins 8 caractères (nature des biens ou droits apportés).';
  }
  if (field.key === 'dirigeant') return 'Le dirigeant doit être identifié conformément à la réglementation.';
  if (field.type === 'associates_minor_panel') return 'Renseignez au moins un associé complet (identité et parts).';
  return `${field.label || 'Ce champ'} est requis pour constituer votre dossier.`;
};
