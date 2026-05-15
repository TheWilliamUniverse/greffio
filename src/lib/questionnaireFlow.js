export const DEMARCHE_CATALOG = [
  { key: 'creation_societe', label: 'Créer une société' },
  { key: 'creation_sasu', label: 'Créer une SASU' },
  { key: 'creation_sas', label: 'Créer une SAS' },
  { key: 'creation_sarl', label: 'Créer une SARL' },
  { key: 'creation_eurl', label: 'Créer une EURL' },
  { key: 'creation_sci', label: 'Créer une SCI' },
  { key: 'micro_entreprise', label: 'Créer une micro-entreprise' },
  { key: 'entreprise_individuelle', label: 'Créer une entreprise individuelle' },
  { key: 'etablissement_secondaire_creation', label: 'Créer un établissement secondaire' },
  { key: 'etablissement_creation', label: 'Ajouter un établissement' },
  { key: 'etablissement_fermeture', label: 'Fermer un établissement' },
  { key: 'etablissement_transfert', label: 'Transférer un établissement' },
  { key: 'transfert_siege', label: 'Transférer le siège social' },
  { key: 'changement_dirigeant', label: 'Changer de dirigeant' },
  { key: 'changement_denomination', label: 'Changer la dénomination sociale' },
  { key: 'modification_activite', label: 'Modifier l’activité' },
  { key: 'modification_objet_social', label: 'Modifier l’objet social' },
  { key: 'augmentation_capital', label: 'Augmenter le capital social' },
  { key: 'reduction_capital', label: 'Réduire le capital social' },
  { key: 'beneficiaires_effectifs_modification', label: 'Modifier les bénéficiaires effectifs' },
  { key: 'depot_comptes_annuels', label: 'Déposer les comptes annuels' },
  { key: 'mise_en_sommeil', label: 'Mettre une société en sommeil' },
  { key: 'reprise_activite', label: 'Reprendre une activité' },
  { key: 'dissolution_liquidation_radiation', label: 'Dissoudre / liquider / radier une société' },
  { key: 'correction_regularisation', label: 'Régulariser une formalité rejetée ou incomplète' },
  { key: 'obtention_kbis_documents', label: 'Obtenir Kbis / documents officiels' },
  { key: 'societe_etrangere_france', label: 'Immatriculer une société étrangère en France' },
];

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
        options: ['personne_physique', 'personne_morale'],
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
        key: 'companyCountry',
        label: "Pays d'immatriculation",
        type: 'text',
        required: true,
        placeholder: 'France',
        condition: (data) => data.initiatorType === 'personne_morale',
      },
      {
        key: 'companySiren',
        label: 'SIREN',
        type: 'text',
        required: true,
        placeholder: '123456789',
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
        options: ['SASU', 'SAS', 'EURL', 'SARL', 'SCI', 'AUTRE'],
      },
    ],
  },
  {
    id: 'entreprise',
    title: 'Informations entreprise',
    description: 'Nom de l’entreprise, siège, activité et capital.',
    fields: [
      { key: 'denomination', label: 'Dénomination', type: 'text', required: true, placeholder: 'Nom de la société' },
      { key: 'adresseSiege', label: 'Siège social', type: 'text', required: true, placeholder: 'Adresse complète du siège' },
      { key: 'activite', label: 'Activité', type: 'text', required: true, placeholder: 'Description de l’activité principale' },
      { key: 'capital', label: 'Capital social (EUR)', type: 'number', required: true, placeholder: '1000' },
    ],
  },
  {
    id: 'gouvernance',
    title: 'Associés, dirigeant et bénéficiaires effectifs',
    description: 'Complétez les personnes clés pour vos documents juridiques.',
    fields: [
      { key: 'associesSummary', label: 'Associés / actionnaires', type: 'text', required: false, placeholder: 'Noms et répartition' },
      { key: 'dirigeant', label: 'Dirigeant', type: 'text', required: true, placeholder: 'Nom et prénom du dirigeant' },
      { key: 'beneficiairesEffectifs', label: 'Bénéficiaires effectifs', type: 'text', required: false, placeholder: 'Noms des bénéficiaires effectifs' },
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

export const isFieldValueValid = (field, value) => {
  if (!field.required) return true;
  if (field.type === 'checkbox') return Boolean(value);
  if (value == null) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (field.type === 'email') return normalized.includes('@');
  return true;
};

export const isStepComplete = (step, formData) => step.fields
  .filter((field) => !field.condition || field.condition(formData))
  .every((field) => isFieldValueValid(field, formData[field.key]));
