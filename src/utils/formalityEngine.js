import { strToU8, zipSync } from 'fflate';
import { downloadStatutesOfficeExport } from '@/utils/statutesOfficeExport.js';
import { downloadStatutesPreviewDraftPdf } from '@/api/statutes.js';

export const QUESTION_MODES = [
  { id: 'simple', label: 'Simple', text: 'Essentiel pour générer un dossier propre.' },
  { id: 'avance', label: 'Avancé', text: 'Ajoute les clauses et contrôles courants.' },
  { id: 'expert', label: 'Expert', text: 'Ajoute gouvernance fine, titres et opérations complexes.' },
];

const modeLevel = { simple: 1, avance: 2, expert: 3 };

const normalize = (value = '') => value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const getFormProfile = (label = '') => {
  const value = normalize(label);
  if (value.includes('AUTO') || value.includes('MICRO') || value.includes('ENTREPRISE INDIVIDUELLE') || value === 'EI') return 'INDIVIDUAL';
  if (value.includes('SASU')) return 'SASU';
  if (value === 'SAS') return 'SAS';
  if (value.includes('EURL')) return 'EURL';
  if (value.includes('SARL')) return 'SARL';
  if (value.includes('SA_DIRECTOIRE') || value.includes('DIRECTOIRE')) return 'SA_DIRECTOIRE';
  if (value.includes('SA_CA') || value.includes('CONSEIL DADMINISTRATION')) return 'SA_CA';
  if (value === 'SA' || value.includes('SOCIETE ANONYME')) return 'SA';
  if (value.includes('COMMANDITE PAR ACTIONS') || value.includes('SCA')) return 'SCA';
  if (value.includes('COMMANDITE SIMPLE') || value.includes('SCS')) return 'SCS';
  if (value.includes('SNC') || value.includes('NOM COLLECTIF')) return 'SNC';
  if (value.includes('SCPI')) return 'SCPI';
  if (value.includes('SCP')) return 'SCP';
  if (value.includes('SCM')) return 'SCM';
  if (value.includes('SCI')) return 'SCI';
  if (value.includes('SOCIETE CIVILE') || value.includes('SOCIETE_CIVILE')) return 'CIVIL';
  if (value.includes('SEL') || value.includes('EXERCICE LIBERAL')) return 'SEL';
  if (value.includes('FONDATION') || value.includes('FONDS DE DOTATION')) return 'FOUNDATION';
  if (value.includes('ASSOCIATION')) return 'ASSOCIATION';
  if (value.includes('SCOP') || value.includes('SCIC') || value.includes('COOPERATIVE') || value.includes('MUTUELLE')) return 'COOPERATIVE';
  if (value.includes('GAEC') || value.includes('EARL') || value.includes('SCEA') || value.includes('AGRICOLE')) return 'AGRICULTURAL';
  if (value.includes('GIE') || value.includes('GEIE')) return 'GIE';
  return 'DEFAULT';
};

/** Alignement questionnaire Greffio → profil simulateur / statuts. */
export const resolveFormProfileFromQuestionnaire = (questionnaire = {}) => {
  const forme = String(questionnaire.formeJuridique || questionnaire.legalForm || '').trim();
  return getFormProfile(forme);
};

const allSections = {
  identity: {
    title: 'Identité',
    note: 'La dénomination sociale est le nom officiel. Le sigle et le nom commercial sont facultatifs.',
    fields: [
      { key: 'denomination', label: 'Dénomination sociale', required: true, mode: 'simple' },
      { key: 'sigle', label: 'Sigle', mode: 'avance' },
      { key: 'nomCommercial', label: 'Nom commercial', mode: 'avance' },
      { key: 'objetSocial', label: 'Objet social (choix guidé)', required: true, type: 'select', mode: 'simple', options: ['Conseil', 'Commerce', 'Prestations numériques', 'Immobilier', 'Restauration', 'Autre activité réglementée'] },
      { key: 'duree', label: 'Durée', mode: 'simple', placeholder: '99 ans' },
      { key: 'dateCloture', label: 'Date de clôture', mode: 'simple', placeholder: '31 décembre' },
      { key: 'codeApe', label: 'Code APE prévisionnel', mode: 'expert' },
    ],
  },
  seat: {
    title: 'Siège social',
    note: 'Le siège social détermine le greffe compétent et l’adresse officielle de la structure.',
    fields: [
      { key: 'adresseSiege', label: 'Adresse du siège', required: true, mode: 'simple' },
      { key: 'codePostal', label: 'Code postal', required: true, mode: 'simple' },
      { key: 'villeSiege', label: 'Ville', required: true, mode: 'simple' },
      { key: 'domiciliation', label: 'Type de domiciliation', type: 'select', mode: 'avance', options: ['Domicile du dirigeant', 'Société de domiciliation', 'Bail commercial', 'Autre'] },
      { key: 'justificatifSiege', label: 'Justificatif disponible', type: 'select', mode: 'avance', options: ['Oui', 'Non', 'En attente'] },
    ],
  },
  capital: {
    title: 'Capital et apports',
    note: 'Le capital variable facilite certaines entrées et sorties d’associés, dans une fourchette prévue.',
    fields: [
      { key: 'capitalType', label: 'Capital fixe ou variable', type: 'select', mode: 'simple', options: ['Fixe', 'Variable'] },
      { key: 'capitalMontant', label: 'Montant du capital social', required: true, mode: 'simple' },
      { key: 'capitalPlancher', label: 'Capital plancher', mode: 'avance', condition: (answers) => answers.capitalType === 'Variable' },
      { key: 'capitalPlafond', label: 'Capital plafond', mode: 'avance', condition: (answers) => answers.capitalType === 'Variable' },
      { key: 'apportsNumeraire', label: 'Apports en numéraire', type: 'select', mode: 'simple', options: ['Oui', 'Non'] },
      { key: 'apportsNature', label: 'Apports en nature', type: 'select', mode: 'avance', options: ['Non', 'Oui'] },
      { key: 'detailApportsNature', label: 'Description et valeur des apports en nature', type: 'textarea', mode: 'avance', condition: (answers) => answers.apportsNature === 'Oui' },
      { key: 'apportsIndustrie', label: 'Apports en industrie', type: 'select', mode: 'expert', options: ['Non', 'Oui'] },
      { key: 'liberationCapital', label: 'Libération du capital', type: 'select', mode: 'avance', options: ['100%', '50%', '20%', 'Autre'] },
    ],
  },
  partners: {
    title: 'Associés et titres',
    note: 'La répartition des actions ou parts détermine les droits financiers et politiques.',
    fields: [
      { key: 'repartition', label: 'Répartition des actions ou parts', type: 'select', mode: 'simple', options: ['100% fondateur unique', '50/50', '60/40', 'Répartition personnalisée'] },
      { key: 'beneficiaireEffectif', label: 'Bénéficiaire effectif principal', mode: 'simple' },
      { key: 'actionsPreference', label: 'Actions de préférence', type: 'select', mode: 'expert', options: ['Non', 'Oui', 'À étudier'] },
      { key: 'droitsVote', label: 'Droits de vote particuliers', type: 'textarea', mode: 'expert' },
      { key: 'indivisionUsufruit', label: 'Indivision, usufruit ou nantissement', type: 'textarea', mode: 'expert' },
    ],
  },
  governance: {
    title: 'Gouvernance',
    note: 'Les pouvoirs du dirigeant peuvent être larges vis-à-vis des tiers, mais encadrés en interne.',
    fields: [
      { key: 'dirigeantPrincipal', label: 'Président, gérant ou dirigeant principal', required: true, mode: 'simple' },
      { key: 'dirigeantPersonneMorale', label: 'Dirigeant personne morale', type: 'select', mode: 'avance', options: ['Non', 'Oui'] },
      { key: 'directeursGeneraux', label: 'Organes complémentaires', type: 'select', mode: 'avance', options: ['Aucun', 'Directeur général', 'Cogérance', 'Conseil de surveillance'] },
      { key: 'limitationPouvoirs', label: 'Limitation interne des pouvoirs', type: 'select', mode: 'expert', options: ['Pouvoirs larges', 'Validation associés au-delà d’un seuil', 'Validation systématique associés'] },
      { key: 'quorumMajorite', label: 'Quorum et majorité', type: 'select', mode: 'expert', options: ['Règles légales', 'Majorité simple renforcée', 'Unanimité sur actes clés'] },
      { key: 'consultationsEcrites', label: 'Consultations écrites', type: 'select', mode: 'avance', options: ['Autorisées', 'Non prévues', 'À définir'] },
    ],
  },
  clauses: {
    title: 'Clauses sensibles',
    note: 'Une clause d’agrément permet de contrôler l’entrée de nouveaux associés. La préemption donne une priorité d’achat.',
    fields: [
      { key: 'clauseAgrement', label: 'Clause d’agrément', type: 'select', mode: 'simple', options: ['Oui', 'Non', 'À décider'] },
      { key: 'clausePreemption', label: 'Clause de préemption', type: 'select', mode: 'avance', options: ['Oui', 'Non', 'À décider'] },
      { key: 'clauseInalienabilite', label: 'Clause d’inaliénabilité', type: 'select', mode: 'expert', options: ['Non', '2 ans', '5 ans', 'Autre'] },
      { key: 'clauseExclusion', label: 'Exclusion d’associé', type: 'select', mode: 'expert', options: ['Prévue', 'Non prévue', 'À arbitrer'] },
      { key: 'confidentialite', label: 'Confidentialité', type: 'select', mode: 'avance', options: ['Oui', 'Non'] },
      { key: 'nonConcurrence', label: 'Non-concurrence', type: 'select', mode: 'expert', options: ['Non', 'Oui, encadrée', 'À valider'] },
      { key: 'mediationArbitrage', label: 'Médiation / arbitrage', type: 'select', mode: 'avance', options: ['Médiation seule', 'Médiation et arbitrage', 'Non prévu'] },
    ],
  },
  finance: {
    title: 'Finances et fin de vie',
    note: 'Ces réponses alimentent les clauses sur les comptes, dividendes, réserves et liquidation.',
    fields: [
      { key: 'affectationResultat', label: 'Affectation du résultat', type: 'select', mode: 'simple', options: ['Décision annuelle', 'Réserves puis dividendes', 'Report à nouveau'] },
      { key: 'commissaireComptes', label: 'Commissaire aux comptes', type: 'select', mode: 'avance', options: ['Non prévu', 'Obligatoire', 'Volontaire'] },
      { key: 'conventionsReglementees', label: 'Conventions réglementées', type: 'select', mode: 'avance', options: ['Régime standard', 'Contrôle renforcé'] },
      { key: 'transformationFusion', label: 'Transformation, fusion, scission ou apport partiel d’actif', type: 'textarea', mode: 'expert' },
      { key: 'dissolutionLiquidation', label: 'Dissolution, liquidation et liquidateur', type: 'textarea', mode: 'avance' },
    ],
  },
  association: {
    title: 'Vie associative',
    note: 'Pour une association, on précise les membres, les organes, les ressources et la dévolution des biens.',
    fields: [
      { key: 'membresFondateurs', label: 'Membres fondateurs', type: 'textarea', mode: 'simple' },
      { key: 'bureau', label: 'Bureau : président, trésorier, secrétaire', type: 'textarea', mode: 'simple' },
      { key: 'cotisations', label: 'Cotisations', type: 'select', mode: 'avance', options: ['Oui', 'Non', 'Décision annuelle'] },
      { key: 'devolutionBiens', label: 'Dévolution des biens', type: 'textarea', mode: 'expert' },
    ],
  },
  commandite: {
    title: 'Commandite',
    note: 'Les sociétés en commandite distinguent les commandités, responsables et dirigeants, des commanditaires, investisseurs à responsabilité limitée.',
    fields: [
      { key: 'commandites', label: 'Nombre d’associés commandités', type: 'select', required: true, mode: 'simple', options: ['1', '2', '3 ou plus'] },
      { key: 'commanditaires', label: 'Nombre d’associés commanditaires', type: 'select', required: true, mode: 'simple', options: ['1', '2', '3 ou plus'] },
      { key: 'gerantCommandite', label: 'Gérant commandité', mode: 'simple' },
      { key: 'conseilSurveillance', label: 'Conseil de surveillance', type: 'select', mode: 'avance', options: ['Oui', 'Non'] },
      { key: 'responsabiliteCommandite', label: 'Responsabilité des commandités', type: 'select', mode: 'avance', options: ['Indéfinie et solidaire', 'Rappel légal standard'] },
    ],
  },
  individual: {
    title: 'Entreprise individuelle',
    note: 'L’entreprise individuelle n’a pas de statuts sociaux : le dossier porte sur l’identité, l’activité, les options fiscales et les déclarations.',
    fields: [
      { key: 'nomEntrepreneur', label: 'Nom de l’entrepreneur', required: true, mode: 'simple' },
      { key: 'nomUsage', label: 'Nom commercial ou enseigne', mode: 'avance' },
      { key: 'optionFiscale', label: 'Option fiscale souhaitée', type: 'select', mode: 'avance', options: ['Micro', 'Réel simplifié', 'Réel normal', 'À confirmer'] },
      { key: 'regimeSocial', label: 'Régime social', type: 'select', mode: 'avance', options: ['Travailleur indépendant', 'Micro-social', 'À confirmer'] },
    ],
  },
  professional: {
    title: 'Exercice professionnel',
    note: 'Les structures libérales ou réglementées peuvent nécessiter une inscription ordinale, un agrément ou des mentions professionnelles.',
    fields: [
      { key: 'professionReglementee', label: 'Profession réglementée', required: true, mode: 'simple' },
      { key: 'ordreProfessionnel', label: 'Ordre ou autorité compétente', type: 'select', mode: 'avance', options: ['Ordre des avocats', 'Ordre des médecins', 'Ordre des experts-comptables', 'Autre autorité', 'Non concerné'] },
      { key: 'associesProfessionnels', label: 'Associés professionnels exerçants', type: 'select', mode: 'avance', options: ['1', '2', '3 ou plus'] },
      { key: 'responsabiliteProfessionnelle', label: 'Responsabilité professionnelle', type: 'textarea', mode: 'expert' },
    ],
  },
  cooperative: {
    title: 'Coopérative et intérêt collectif',
    note: 'Les coopératives reposent sur une gouvernance démocratique, des collèges éventuels et des réserves impartageables.',
    fields: [
      { key: 'collegeVote', label: 'Collèges de vote', type: 'textarea', mode: 'avance' },
      { key: 'salariesAssocies', label: 'Salariés ou sociétaires associés', type: 'textarea', mode: 'simple' },
      { key: 'reservImpartageables', label: 'Réserves impartageables', type: 'select', mode: 'avance', options: ['Régime légal', 'Clause renforcée'] },
      { key: 'utiliteSociale', label: 'Utilité sociale ou intérêt collectif', type: 'textarea', mode: 'avance' },
    ],
  },
  agricultural: {
    title: 'Activité agricole',
    note: 'Les formes agricoles doivent préciser l’exploitation, le foncier, les associés exploitants et les règles propres au secteur.',
    fields: [
      { key: 'exploitationAgricole', label: 'Description de l’exploitation', type: 'textarea', required: true, mode: 'simple' },
      { key: 'associesExploitants', label: 'Associés exploitants', type: 'textarea', mode: 'avance' },
      { key: 'foncierAgricole', label: 'Foncier, baux ruraux ou mise à disposition', type: 'textarea', mode: 'expert' },
      { key: 'autorisationAgricole', label: 'Autorisations ou déclarations agricoles', type: 'textarea', mode: 'expert' },
    ],
  },
};

const profileSections = {
  SAS: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SASU: ['identity', 'seat', 'capital', 'governance', 'finance'],
  SARL: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  EURL: ['identity', 'seat', 'capital', 'governance', 'finance'],
  SA: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SA_CA: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SA_DIRECTOIRE: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SNC: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SCS: ['identity', 'seat', 'capital', 'commandite', 'clauses', 'finance'],
  SCA: ['identity', 'seat', 'capital', 'commandite', 'governance', 'clauses', 'finance'],
  SCI: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SCPI: ['identity', 'seat', 'capital', 'partners', 'governance', 'professional', 'finance'],
  SCP: ['identity', 'seat', 'capital', 'partners', 'professional', 'governance', 'clauses', 'finance'],
  SCM: ['identity', 'seat', 'capital', 'partners', 'professional', 'governance', 'clauses', 'finance'],
  CIVIL: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  SEL: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
  FOUNDATION: ['identity', 'seat', 'association', 'governance', 'finance'],
  ASSOCIATION: ['identity', 'seat', 'association', 'governance', 'finance'],
  COOPERATIVE: ['identity', 'seat', 'capital', 'partners', 'cooperative', 'governance', 'finance'],
  AGRICULTURAL: ['identity', 'seat', 'capital', 'partners', 'agricultural', 'governance', 'finance'],
  GIE: ['identity', 'seat', 'partners', 'governance', 'clauses', 'finance'],
  INDIVIDUAL: ['individual', 'seat', 'finance'],
  DEFAULT: ['identity', 'seat', 'capital', 'partners', 'governance', 'clauses', 'finance'],
};

export const getQuestionnaire = (formLabel, mode = 'avance') => {
  const profile = getFormProfile(formLabel);
  const maxLevel = modeLevel[mode] || modeLevel.avance;
  return (profileSections[profile] || profileSections.DEFAULT)
    .map((key) => ({
      ...allSections[key],
      key,
      fields: allSections[key].fields.filter((field) => (modeLevel[field.mode] || 1) <= maxLevel),
    }))
    .filter((section) => section.fields.length > 0);
};

const aliases = {
  denomination: 'companyName',
  objetSocial: 'activity',
  villeSiege: 'city',
  capitalMontant: 'capital',
  dirigeantPrincipal: 'president',
};

const isIndividualProfile = (profile) => profile === 'INDIVIDUAL';

export const valueFor = (data, answers, key, fallback = 'À compléter') => {
  const value = answers[key] ?? data[key] ?? data[aliases[key]];
  return value === undefined || value === null || value === '' ? fallback : value;
};

export const getCompletion = (data, answers, sections) => {
  const profile = getFormProfile(data.legalForm || data.formeJuridique || '');
  const required = sections.flatMap((section) => section.fields.filter((field) => field.required).map((field) => field.key));
  const base = isIndividualProfile(profile)
    ? ['companyName', 'activity', 'city', 'email', 'nomEntrepreneur']
    : ['companyName', 'activity', 'city', 'capital', 'president', 'email'];
  const keys = [...new Set([...base, ...required])];
  const done = keys.filter((key) => valueFor(data, answers, key, '') !== '').length;
  return Math.round((done / Math.max(keys.length, 1)) * 100);
};

export const getWarnings = (data, answers) => {
  const profile = getFormProfile(data.legalForm || data.formeJuridique || '');
  if (isIndividualProfile(profile)) {
    return ['Parcours EI/micro: pas de statuts, pas de capital social, pas d’associés à renseigner.'];
  }
  const warnings = [];
  if (answers.capitalType === 'Variable' && (!answers.capitalPlancher || !answers.capitalPlafond)) {
    warnings.push('Capital variable : ajoutez un plancher et un plafond.');
  }
  if (answers.apportsNature === 'Oui' && !answers.detailApportsNature) {
    warnings.push('Apports en nature : décrivez les biens et leur valorisation.');
  }
  if (Number(data.shareholders || 1) > 1 && !answers.clauseAgrement) {
    warnings.push('Plusieurs associés : une clause d’agrément est fortement recommandée.');
  }
  if (!warnings.length) warnings.push('Aucune incohérence majeure détectée à ce stade.');
  return warnings;
};

const draftingProfiles = {
  DEFAULT: {
    socialForm: 'Société',
    holderPlural: 'Associé(s)',
    holderDefinition: 'personnes physiques ou morales titulaires de titres dans la structure.',
    directorPlural: 'Dirigeant(s)',
    directorDefinition: 'organes de direction désignés par les statuts ou les décisions collectives.',
    securities: 'titres',
    capitalTitle: 'Capital, apports et titres',
    governance: 'Direction organisée selon les statuts et les décisions collectives.',
    decisions: 'Décisions prises conformément aux règles légales et statutaires applicables.',
  },
  SAS: {
    socialForm: 'Société par Actions Simplifiée',
    holderPlural: 'Associé(s)',
    holderDefinition: 'personnes physiques ou morales titulaires d’au moins une action.',
    directorPlural: 'Président et directeurs généraux',
    directorDefinition: 'dirigeants investis des pouvoirs de représentation dans les limites de la loi et des statuts.',
    securities: 'actions',
    governance: 'Président obligatoire, directeurs généraux optionnels, pouvoirs internes modulables.',
    decisions: 'Décisions collectives, consultations écrites et assemblées selon les règles de quorum et majorité retenues.',
  },
  SASU: {
    socialForm: 'Société par Actions Simplifiée Unipersonnelle',
    holderPlural: 'Associé unique',
    holderDefinition: 'personne physique ou morale détenant l’intégralité des actions.',
    directorPlural: 'Président',
    directorDefinition: 'dirigeant représentant la société à l’égard des tiers.',
    securities: 'actions',
    governance: 'Président désigné par l’associé unique, décisions consignées dans un registre.',
    decisions: 'Décisions de l’associé unique avec conservation des procès-verbaux.',
  },
  SARL: {
    socialForm: 'Société à Responsabilité Limitée',
    holderPlural: 'Associé(s)',
    holderDefinition: 'personnes titulaires de parts sociales, responsables dans la limite de leurs apports sauf exceptions légales.',
    directorPlural: 'Gérant(s)',
    directorDefinition: 'personnes physiques chargées de représenter et administrer la société.',
    securities: 'parts sociales',
    governance: 'Gérance unique ou cogérance, pouvoirs encadrés par le Code de commerce et les statuts.',
    decisions: 'Assemblées ordinaires et extraordinaires avec règles propres aux parts sociales.',
  },
  EURL: {
    socialForm: 'Entreprise Unipersonnelle à Responsabilité Limitée',
    holderPlural: 'Associé unique',
    holderDefinition: 'personne physique ou morale titulaire de l’intégralité des parts sociales.',
    directorPlural: 'Gérant',
    directorDefinition: 'personne physique chargée de représenter la société.',
    securities: 'parts sociales',
    governance: 'Gérant associé unique ou tiers, décisions consignées par l’associé unique.',
    decisions: 'Décisions de l’associé unique tenant lieu d’assemblée.',
  },
  SA: {
    socialForm: 'Société Anonyme',
    holderPlural: 'Actionnaire(s)',
    holderDefinition: 'personnes physiques ou morales titulaires d’actions de la société.',
    directorPlural: 'Conseil d’administration, direction générale ou directoire',
    directorDefinition: 'organes de gouvernance collégiale et de direction prévus par la loi.',
    securities: 'actions',
    governance: 'Gouvernance structurée avec conseil d’administration ou directoire et conseil de surveillance.',
    decisions: 'Assemblées générales ordinaires et extraordinaires, commissariat aux comptes et règles renforcées.',
  },
  SA_CA: {
    socialForm: 'Société Anonyme à conseil d’administration',
    holderPlural: 'Actionnaire(s)',
    holderDefinition: 'personnes physiques ou morales titulaires d’actions.',
    directorPlural: 'Conseil d’administration, président, directeur général ou PDG',
    directorDefinition: 'organes chargés de déterminer les orientations et de représenter la société.',
    securities: 'actions',
    governance: 'Conseil d’administration, président du conseil, directeur général ou président-directeur général.',
    decisions: 'Assemblées générales avec rapports du conseil et contrôle légal lorsque requis.',
  },
  SA_DIRECTOIRE: {
    socialForm: 'Société Anonyme à directoire',
    holderPlural: 'Actionnaire(s)',
    holderDefinition: 'personnes physiques ou morales titulaires d’actions.',
    directorPlural: 'Directoire et conseil de surveillance',
    directorDefinition: 'organes séparant direction opérationnelle et contrôle.',
    securities: 'actions',
    governance: 'Directoire pour la gestion, conseil de surveillance pour le contrôle.',
    decisions: 'Assemblées générales et décisions encadrées par les rapports des organes sociaux.',
  },
  SNC: {
    socialForm: 'Société en Nom Collectif',
    holderPlural: 'Associé(s) commerçant(s)',
    holderDefinition: 'associés ayant la qualité de commerçant et responsables indéfiniment et solidairement des dettes sociales.',
    directorPlural: 'Gérant(s)',
    directorDefinition: 'dirigeants désignés par les statuts ou décision des associés.',
    securities: 'parts sociales',
    governance: 'Gérance avec contrôle étroit des associés, cession de parts en principe soumise à unanimité.',
    decisions: 'Décisions prises selon les statuts, avec agrément renforcé et responsabilité solidaire.',
  },
  SCS: {
    socialForm: 'Société en Commandite Simple',
    holderPlural: 'Commandité(s) et commanditaire(s)',
    holderDefinition: 'commandités responsables indéfiniment et solidairement, commanditaires responsables dans la limite de leurs apports.',
    directorPlural: 'Gérant commandité',
    directorDefinition: 'commandité ou tiers autorisé chargé de la gestion.',
    securities: 'parts sociales',
    governance: 'Gestion assurée par les commandités, commanditaires exclus des actes de gestion externe.',
    decisions: 'Décisions distinguant les droits des commandités et commanditaires.',
  },
  SCA: {
    socialForm: 'Société en Commandite par Actions',
    holderPlural: 'Commandité(s) et actionnaire(s) commanditaire(s)',
    holderDefinition: 'commandités responsables indéfiniment, actionnaires commanditaires responsables dans la limite de leurs apports.',
    directorPlural: 'Gérant et conseil de surveillance',
    directorDefinition: 'gérance par les commandités, contrôle par le conseil de surveillance.',
    securities: 'actions',
    governance: 'Gérant commandité, conseil de surveillance et assemblées d’actionnaires.',
    decisions: 'Décisions collectives avec règles spécifiques aux commandités et commanditaires.',
  },
  SCI: {
    socialForm: 'Société Civile Immobilière',
    holderPlural: 'Associé(s)',
    holderDefinition: 'personnes titulaires de parts sociales dans une société à objet civil immobilier.',
    directorPlural: 'Gérant(s)',
    directorDefinition: 'personnes chargées de gérer le patrimoine immobilier et représenter la société.',
    securities: 'parts sociales',
    governance: 'Gérance civile, agrément des cessions et règles patrimoniales adaptées.',
    decisions: 'Décisions collectives civiles avec clauses de transmission, indivision et usufruit.',
  },
  CIVIL: {
    socialForm: 'Société Civile',
    holderPlural: 'Associé(s)',
    holderDefinition: 'personnes titulaires de parts sociales dans une société à objet civil.',
    directorPlural: 'Gérant(s)',
    directorDefinition: 'personnes chargées de l’administration civile de la société.',
    securities: 'parts sociales',
    governance: 'Gérance civile et décisions des associés selon les statuts.',
    decisions: 'Décisions collectives adaptées à l’objet civil et aux règles de responsabilité.',
  },
  SEL: {
    socialForm: 'Société d’Exercice Libéral',
    holderPlural: 'Associé(s) professionnel(s)',
    holderDefinition: 'professionnels exerçants ou investisseurs autorisés par les textes de la profession.',
    directorPlural: 'Dirigeant(s) professionnel(s)',
    directorDefinition: 'dirigeants soumis aux règles professionnelles et ordinales applicables.',
    securities: 'titres professionnels',
    governance: 'Gouvernance compatible avec l’exercice réglementé et les agréments requis.',
    decisions: 'Décisions collectives sous réserve des règles ordinales et professionnelles.',
  },
  ASSOCIATION: {
    socialForm: 'Association loi 1901',
    holderPlural: 'Membre(s)',
    holderDefinition: 'personnes admises selon les statuts et participant à la vie associative.',
    directorPlural: 'Bureau et organes associatifs',
    directorDefinition: 'président, trésorier, secrétaire ou tout organe prévu par les statuts.',
    securities: 'adhésions',
    capitalTitle: 'Membres, ressources et fonctionnement',
    governance: 'Bureau, conseil d’administration éventuel et assemblées des membres.',
    decisions: 'Assemblées générales ordinaires et extraordinaires selon les statuts associatifs.',
  },
  FOUNDATION: {
    socialForm: 'Fondation ou fonds de dotation',
    holderPlural: 'Fondateur(s)',
    holderDefinition: 'personnes affectant des biens, droits ou ressources à une œuvre d’intérêt général.',
    directorPlural: 'Organe de gouvernance',
    directorDefinition: 'conseil d’administration, bureau ou organe de contrôle prévu par les statuts.',
    securities: 'dotation',
    capitalTitle: 'Dotation, ressources et affectation',
    governance: 'Gouvernance d’intérêt général avec contrôle administratif éventuel.',
    decisions: 'Décisions prises selon les statuts et les règles propres à l’intérêt général.',
  },
  COOPERATIVE: {
    socialForm: 'Société coopérative',
    holderPlural: 'Sociétaire(s)',
    holderDefinition: 'membres associés participant au capital et à la gouvernance démocratique.',
    directorPlural: 'Organe de direction coopératif',
    directorDefinition: 'gérance, présidence, conseil ou organe prévu par la forme coopérative.',
    securities: 'parts sociales',
    governance: 'Gouvernance démocratique, collèges éventuels et réserves impartageables.',
    decisions: 'Décisions selon le principe coopératif et les collèges de vote retenus.',
  },
  AGRICULTURAL: {
    socialForm: 'Société agricole',
    holderPlural: 'Associé(s) exploitant(s)',
    holderDefinition: 'personnes participant à l’exploitation agricole ou au capital selon la forme retenue.',
    directorPlural: 'Gérant(s) ou exploitant(s)',
    directorDefinition: 'personnes chargées de diriger l’exploitation et de représenter la structure.',
    securities: 'parts sociales',
    governance: 'Gérance agricole, règles d’exploitation, foncier et autorisations sectorielles.',
    decisions: 'Décisions collectives adaptées à l’exploitation et aux obligations agricoles.',
  },
  GIE: {
    socialForm: 'Groupement d’Intérêt Économique',
    holderPlural: 'Membre(s)',
    holderDefinition: 'personnes physiques ou morales regroupées pour faciliter ou développer leur activité économique.',
    directorPlural: 'Administrateur(s)',
    directorDefinition: 'personnes chargées d’administrer le groupement.',
    securities: 'droits de membre',
    capitalTitle: 'Membres, contributions et moyens communs',
    governance: 'Administration du groupement, contributions des membres et responsabilité selon le contrat.',
    decisions: 'Décisions des membres conformément au contrat constitutif.',
  },
  INDIVIDUAL: {
    socialForm: 'Entreprise individuelle',
    holderPlural: 'Entrepreneur individuel',
    holderDefinition: 'personne physique exerçant en nom propre, sans personnalité morale distincte.',
    directorPlural: 'Entrepreneur',
    directorDefinition: 'personne déclarant et exploitant l’activité.',
    securities: 'sans titres sociaux',
    capitalTitle: 'Déclaration, options et activité',
    governance: 'Pas d’organe social : l’entrepreneur prend seul les décisions.',
    decisions: 'Dossier déclaratif, options fiscales et sociales, sans statuts sociaux.',
  },
};

const getDraftingProfile = (profile) => ({
  ...draftingProfiles.DEFAULT,
  ...(draftingProfiles[profile] || {}),
});

const buildLongArticles = ({ mandataire, formalite, forme, denomination }) => ([
  { title: 'Objet du mandat', lines: [`Le client confie a ${mandataire} une mission de preparation, depot, suivi et regularisation administrative de sa formalite.`, `Formalite concernee : ${formalite}.`, `Forme juridique visee : ${forme}.`, `Denomination : ${denomination}.`] },
  { title: 'Etendue des pouvoirs', lines: ['Collecte des informations et pieces justificatives utiles au dossier.', 'Preparation et saisie des formulaires requis.', 'Depot et suivi administratif aupres des organismes competents.', 'Gestion des demandes de complement dans la limite des informations validees par le client.'] },
  { title: 'Responsabilite du client', lines: ['Le client reste responsable de l’exactitude, la sincerite et la completude des informations transmises.', 'Toute information inexacte, incomplete, obsolete ou contradictoire peut entrainer un rejet ou un complement.', 'Le client valide les points substantiels avant depot.'] },
  { title: 'Règles documents et transmission', lines: ['Chaque piece justificative est transmise dans un fichier unique.', 'Les fichiers sont lisibles, complets, nommes selon leur contenu et de preference en PDF.', 'La limite indicative de 10 Mo par fichier est appliquee dans le parcours.'] },
  { title: 'Correction et regularisation', lines: ['Le mandataire peut corriger les erreurs materielles sans changer la volonte du client.', 'Les modifications substantielles (forme, siege, activite, dirigeance, capital) necessitent validation client.', 'Les regularisations sont tracees dans l’historique dossier.'] },
  { title: 'Signature electronique', lines: ['Le mandat et les validations peuvent etre signes electroniquement.', 'La signature electronique vaut consentement libre, eclaire et non equivque.', 'La version signee peut etre produite comme justificatif.'] },
  { title: 'Limites de mission', lines: ['Le mandataire n’effectue pas de conseil juridique personnalise relevant d’une profession reglementee.', 'Le mandataire ne garantit pas l’acceptation finale par les organismes competents.', 'Les actes de gestion hors formalite ne sont pas inclus sans mandat specifique.'] },
  { title: 'Delais et frais', lines: ['Les delais dependent de la completude du dossier et des organismes tiers.', 'Les frais administratifs (greffe, annonce legale, depot, etc.) restent a la charge du client sauf convention contraire.', 'Le traitement peut etre suspendu en cas de non-paiement des frais requis.'] },
  { title: 'Confidentialite et donnees', lines: ['Les donnees sont traitees pour constituer, deposer, suivre et archiver le dossier.', 'Des transmissions aux organismes competents et prestataires techniques peuvent etre necessaires.', 'Le client peut exercer ses droits conformement a la reglementation applicable.'] },
  { title: 'Conservation des documents', lines: ['Les documents sont conserves pendant la duree necessaire au traitement, au suivi et a la preuve de mission.', 'A l’issue, ils peuvent etre archives, anonymises ou supprimes selon les obligations applicables.'] },
  { title: 'Absence de garantie d’acceptation', lines: ['Le mandataire met en oeuvre des diligences raisonnables de preparation et de suivi.', 'L’acceptation finale releve exclusivement des organismes competents.'] },
  { title: 'Duree et revocation', lines: ['Le mandat prend effet a la signature et prend fin a la cloture de la formalite confiee.', 'Le client peut revoquer le mandat sous reserve des actes deja accomplis.', 'Le mandataire peut renoncer en cas de fraude, illegalite ou impossibilite technique ou juridique.'] },
  { title: 'Communication et tracabilite', lines: ['Les echanges peuvent se faire par email, espace client, messagerie et signature electronique.', 'Le client s’engage a repondre rapidement aux demandes pour eviter retards et rejets.', 'Les actions importantes sont historisees dans le dossier.'] },
  { title: 'Acceptation expresse', lines: ['Le client confirme avoir lu, compris et accepte les conditions de mission.', 'Le client confirme les informations avant depot.', 'Mentions recommandees en manuscrit : "Bon pour mandat" et "Bon pour acceptation du mandat".'] },
  { title: 'Declarations du mandant', lines: ['Le mandant declare etre juridiquement capable de signer.', 'Le mandant certifie lauthenticite des documents transmis.', 'Le mandant confirme ne pas utiliser le service a des fins frauduleuses.'] },
  { title: 'Absence de transfert de responsabilite', lines: ['Le choix de la forme juridique, de l activite et des options reste sous la responsabilite du client.', 'Le mandataire ne se substitue pas a un professionnel reglemente pour un conseil personnalise.'] },
  { title: 'Limites operationnelles de mission', lines: ['Le mandat n inclut pas l ouverture de compte bancaire, la signature de bail ou la gestion comptable sans contrat distinct.', 'Les actes hors formalite necessitent une autorisation expresse ecrite.'] },
  { title: 'Frais et debours', lines: ['Les frais de greffe, annonces legales, depots et debours administratifs restent en principe a la charge du client.', 'Le traitement peut etre conditionne au paiement prealable des frais requis.'] },
  { title: 'Reglement des demandes de complement', lines: ['En cas de demande de complement, le mandataire informe le client sans delai.', 'Les reponses sont preparees sur la base des informations confirmees par le client.'] },
  { title: 'Conservation et preuve', lines: ['Les documents et traces de validation peuvent etre conserves pour la preuve de mission.', 'Les durees de conservation suivent les obligations legales applicables.'] },
  { title: 'Dispositions finales', lines: ['Le mandat prend effet a la signature et cesse a la cloture de la formalite confiee.', 'Toute revocation intervient sous reserve des actes deja engages.'] },
]);

export const buildDocumentPreview = (data, answers, selectedForm) => {
  const label = selectedForm.label || data.legalForm || 'SAS';
  const profile = getFormProfile(`${selectedForm.templateKey || ''} ${label}`);
  const draft = getDraftingProfile(profile);
  const denomination = valueFor(data, answers, 'denomination', data.companyName);
  const sigle = valueFor(data, answers, 'sigle', 'Non prévu');
  const hasStatutes = selectedForm.hasStatutes !== false && profile !== 'INDIVIDUAL';
  const capital = valueFor(data, answers, 'capitalMontant', data.capital);
  const city = valueFor(data, answers, 'villeSiege', data.city);
  const seat = `${valueFor(data, answers, 'adresseSiege', 'Adresse à compléter')}, ${valueFor(data, answers, 'codePostal', 'Code postal')} ${city}`;
  const greffe = valueFor(data, answers, 'rcsCompetent', city !== 'À compléter' ? city : 'greffe compétent');
  const applicantType = data.initiatorType === 'personne_morale' ? data.initiatorLegalForm : 'personne physique';
  const isAssociationLike = ['ASSOCIATION', 'FOUNDATION'].includes(profile);
  const isCommandite = ['SCS', 'SCA'].includes(profile);
  const longArticles = buildLongArticles({
    mandataire: 'WILLIAM ESTABLISHMENTS',
    formalite: data.journey || 'creation',
    forme: label,
    denomination,
  });
  const resolveNormalized = (key, fallback = '') => {
    const raw = valueFor(data, answers, key, fallback);
    if (raw === 'Répartition personnalisée') return 'Répartition détaillée validée dans la documentation associée.';
    if (raw === 'Autre activité réglementée') return valueFor(data, answers, 'activity', 'Activité réglementée à préciser');
    return raw;
  };

  const capitalLines = profile === 'INDIVIDUAL'
    ? [
      `Entrepreneur : ${valueFor(data, answers, 'nomEntrepreneur', data.initiatorName)}`,
      `Nom commercial ou enseigne : ${valueFor(data, answers, 'nomUsage', valueFor(data, answers, 'nomCommercial', 'Non prévu'))}`,
      `Option fiscale : ${valueFor(data, answers, 'optionFiscale', 'À confirmer')}`,
      `Régime social : ${valueFor(data, answers, 'regimeSocial', 'À confirmer')}`,
    ]
    : isAssociationLike
      ? [
        `Membres ou fondateurs : ${valueFor(data, answers, 'membresFondateurs', 'À compléter')}`,
        `Ressources : cotisations, subventions, dons, mécénat et toutes ressources autorisées par la loi.`,
        `Cotisations : ${valueFor(data, answers, 'cotisations', 'Décision annuelle')}`,
        `Dévolution des biens : ${valueFor(data, answers, 'devolutionBiens', 'À compléter selon l’objet d’intérêt général ou associatif')}`,
      ]
      : profile === 'GIE'
        ? [
          `Membres du groupement : ${valueFor(data, answers, 'repartition', 'À compléter')}`,
          `Contributions et moyens communs : ${valueFor(data, answers, 'apportsNumeraire', 'À définir')}`,
          `Capital éventuel : ${capital} euros lorsque les membres choisissent d’en prévoir un.`,
          `Responsabilité et obligations des membres : définies par le contrat constitutif et les textes applicables.`,
        ]
        : [
          `Capital social : ${capital} euros, ${valueFor(data, answers, 'capitalType', 'Fixe').toLowerCase()}.`,
          `${draft.securities.charAt(0).toUpperCase() + draft.securities.slice(1)} : valeur nominale, répartition et droits attachés à préciser dans le registre.`,
          `Libération du capital : ${valueFor(data, answers, 'liberationCapital', 'À compléter')}`,
          `Apports en numéraire : ${valueFor(data, answers, 'apportsNumeraire', 'Oui')}`,
          `Apports en nature : ${valueFor(data, answers, 'detailApportsNature', valueFor(data, answers, 'apportsNature', 'Non'))}`,
          `Répartition : ${resolveNormalized('repartition', `À compléter par ${draft.holderPlural.toLowerCase()}`)}`,
        ];

  const governanceLines = [
    `Gouvernance retenue : ${draft.governance}`,
    `Dirigeant principal : ${valueFor(data, answers, 'dirigeantPrincipal', data.president)}`,
    `Organes complémentaires : ${valueFor(data, answers, 'directeursGeneraux', isCommandite ? valueFor(data, answers, 'conseilSurveillance', 'Conseil de surveillance à compléter') : 'Non prévus à ce stade')}`,
    `Limitations internes des pouvoirs : ${valueFor(data, answers, 'limitationPouvoirs', 'Pouvoirs exercés dans la limite de l’objet social et de la loi')}`,
    `Consultations écrites : ${valueFor(data, answers, 'consultationsEcrites', profile === 'INDIVIDUAL' ? 'Non applicable' : 'Autorisées')}`,
  ];

  if (isCommandite) {
    governanceLines.push(`Commandités : ${valueFor(data, answers, 'commandites', 'À compléter')}`);
    governanceLines.push(`Commanditaires : ${valueFor(data, answers, 'commanditaires', 'À compléter')}`);
    governanceLines.push(`Gérant commandité : ${valueFor(data, answers, 'gerantCommandite', valueFor(data, answers, 'dirigeantPrincipal', data.president))}`);
  }

  return {
    title: hasStatutes ? `Statuts - ${label}` : `Dossier déclaratif - ${label}`,
    subtitle: `${denomination} · Document préparé par Greffio`,
    sections: [
      {
        title: 'Page de garde',
        lines: [
          `${hasStatutes ? 'STATUTS' : 'DOSSIER ADMINISTRATIF'} - ${draft.socialForm} (${label})`,
          `${isAssociationLike ? 'Structure' : 'Société'} : ${denomination}${sigle !== 'Non prévu' ? ` (${sigle})` : ''}`,
          hasStatutes && !isAssociationLike ? `Capital social : ${capital} euros` : `Référence financière : ${draft.securities}`,
          `Siège ou adresse déclarée : ${seat}`,
          `Registre ou autorité compétente : ${profile === 'ASSOCIATION' ? 'Préfecture / JOAFE' : profile === 'INDIVIDUAL' ? 'Guichet unique / registre compétent' : `RCS ${greffe}`}`,
        ],
      },
      {
        title: 'Soussignés et définitions',
        lines: [
          `Demandeur : ${valueFor(data, answers, 'demandeur', data.initiatorName)} (${applicantType})`,
          `${draft.holderPlural} : ${draft.holderDefinition}`,
          `${draft.directorPlural} : ${draft.directorDefinition}`,
          `${isAssociationLike ? 'Structure' : 'Société'} : entité régie par le présent acte et les textes français applicables.`,
        ],
      },
      {
        title: 'Formation, objet et siège',
        lines: [
          hasStatutes ? `Il est établi les présents statuts d’une ${draft.socialForm} dénommée ${denomination}.` : `La formalité concerne une ${draft.socialForm} exploitée sous le nom ${denomination}.`,
          `Objet ou activité : ${resolveNormalized('objetSocial', data.activity)}`,
          `Durée : ${profile === 'INDIVIDUAL' ? 'durée liée à l’exercice de l’activité déclarée' : `${valueFor(data, answers, 'duree', '99 ans')} à compter de l’immatriculation ou publication`}.`,
          `Siège ou adresse : ${seat}`,
        ],
      },
      {
        title: draft.capitalTitle,
        lines: capitalLines,
      },
      {
        title: 'Administration et gouvernance',
        lines: governanceLines,
      },
      {
        title: 'Décisions collectives et clauses sensibles',
        lines: [
          `Règle de décision : ${draft.decisions}`,
          `Quorum et majorité : ${valueFor(data, answers, 'quorumMajorite', profile === 'INDIVIDUAL' ? 'Non applicable' : 'Règles légales et statutaires adaptées à la forme choisie')}`,
          `Agrément : ${valueFor(data, answers, 'clauseAgrement', ['SNC', 'SCS', 'SCA', 'SCI', 'CIVIL'].includes(profile) ? 'Renforcé' : 'Oui')}`,
          `Préemption : ${valueFor(data, answers, 'clausePreemption', profile === 'INDIVIDUAL' ? 'Non applicable' : 'À décider')}`,
          `Inaliénabilité : ${valueFor(data, answers, 'clauseInalienabilite', 'Non prévue')}`,
          `Exclusion : ${valueFor(data, answers, 'clauseExclusion', profile === 'INDIVIDUAL' ? 'Non applicable' : 'À arbitrer')}`,
        ],
      },
      {
        title: 'Résultats, litiges et dispositions diverses',
        lines: [
          `Exercice social : clôture au ${valueFor(data, answers, 'dateCloture', '31 décembre')}`,
          `Affectation du résultat : ${valueFor(data, answers, 'affectationResultat', isAssociationLike ? 'Conforme à l’objet non lucratif' : 'Décision annuelle')}`,
          `Commissaire aux comptes ou contrôle : ${valueFor(data, answers, 'commissaireComptes', ['SA', 'SA_CA', 'SA_DIRECTOIRE', 'SCA'].includes(profile) ? 'À prévoir selon les seuils et obligations' : 'Non prévu')}`,
          `Confidentialité : ${valueFor(data, answers, 'confidentialite', 'Oui')}`,
          `Règlement des litiges : ${valueFor(data, answers, 'mediationArbitrage', 'Médiation préalable obligatoire')}`,
          'Signature électronique admise pour les documents, convocations, consultations et procès-verbaux lorsque la loi le permet.',
        ],
      },
      {
        title: 'Formalités, signature et annexes',
        lines: [
          `Publicité légale : ${profile === 'INDIVIDUAL' ? 'non applicable hors annonces spécifiques' : 'à réaliser avant ou concomitamment au dépôt lorsque la formalité l’exige.'}`,
          `Dépôt au registre : ${profile === 'ASSOCIATION' ? 'déclaration en préfecture et publication JOAFE lorsque nécessaire.' : profile === 'INDIVIDUAL' ? 'déclaration via le guichet unique et organismes compétents.' : `dépôt auprès du RCS ${greffe} avec les pièces requises.`}`,
          'Les frais, droits, débours et honoraires engagés pour la formalité sont suivis dans le dossier Greffio.',
          'Les signataires déclarent avoir pris connaissance du présent acte, de ses annexes et des informations transmises à Greffio.',
          'Fait électroniquement ou sur support papier, en autant d’exemplaires que nécessaire pour les parties et les administrations concernées.',
        ],
      },
      ...longArticles,
      {
        title: 'Annexe 1 - Pieces indicatives',
        lines: [
          'Piece d’identite en cours de validite.',
          'Justificatif de domicile recent.',
          'Procuration signee si mandataire.',
          profile === 'INDIVIDUAL'
            ? 'Selon EI/micro: declaration d activite, justificatifs d identite/domicile et pieces sectorielles eventuelles.'
            : 'Statuts signes, attestation de depot de capital, annonce legale, justificatif de siege, declaration des beneficiaires effectifs selon le cas.',
        ],
      },
      {
        title: 'Annexe 2 - Nommage des fichiers',
        lines: [
          'Piece_identite_NOM_PRENOM.pdf',
          'Justificatif_domicile_NOM_PRENOM.pdf',
          'Procuration_Greffio_NOM_PRENOM.pdf',
          ...(profile === 'INDIVIDUAL' ? [] : ['Statuts_signes_DENOMINATION.pdf', 'Attestation_depot_capital_DENOMINATION.pdf']),
        ],
      },
      {
        title: 'Annexe 3 - Validation electronique',
        lines: [
          'La signature electronique, la validation explicite ou le televersement d’un document signe vaut acceptation du mandat.',
          'Formule recommandee : "Je reconnais avoir lu la procuration et autorise le mandataire a deposer, suivre et regulariser ma formalite."',
        ],
      },
    ],
    watermarkText: 'Greffio',
  };
};

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const documentFilename = (documentPreview) => (
  documentPreview.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document-greffio'
);

const previewLines = (documentPreview) => [
  documentPreview.title,
  documentPreview.subtitle,
  '',
  ...documentPreview.sections.flatMap((section, index) => [
    `Article ${index + 1} - ${section.title}`,
    ...section.lines.map((line) => line),
    '',
  ]),
  'Signatures',
  'Chaque signataire fait précéder sa signature de la mention "Lu et approuvé" lorsque cette mention est requise ou utile.',
  '',
  'Filigrane final : Greffio (derniere page uniquement).',
].filter(Boolean);

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const buildDocxBlob = (documentPreview) => {
  const paragraphs = previewLines(documentPreview).map((line) => (
    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
  )).join('');
  const createdAt = new Date().toISOString();

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1134" w:bottom="1440" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`),
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(documentPreview.title)}</dc:title>
  <dc:creator>Greffio</dc:creator>
  <cp:lastModifiedBy>Greffio</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
</cp:coreProperties>`),
    'docProps/app.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Greffio</Application></Properties>'),
  };

  return new Blob([zipSync(files)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
};

const buildOdtBlob = (documentPreview) => {
  const paragraphs = previewLines(documentPreview).map((line) => (
    `<text:p>${escapeXml(line)}</text:p>`
  )).join('');
  const files = {
    mimetype: strToU8('application/vnd.oasis.opendocument.text'),
    'META-INF/manifest.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`),
    'content.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body><office:text>${paragraphs}</office:text></office:body>
</office:document-content>`),
    'styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2"/>'),
  };

  return new Blob([zipSync(files, { level: 0 })], {
    type: 'application/vnd.oasis.opendocument.text',
  });
};

const downloadPdf = async (documentPreview) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  const addPageIfNeeded = (height = 20) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  const drawWrapped = (text, options = {}) => {
    const { size = 11, style = 'normal', gap = 7, color = [20, 33, 61] } = options;
    pdf.setFont('times', style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text), contentWidth);
    const lineHeight = size * 1.45;
    addPageIfNeeded(lines.length * lineHeight + gap);
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + gap;
  };

  pdf.setProperties({
    title: documentPreview.title,
    subject: documentPreview.subtitle,
    creator: 'Greffio',
    author: 'Greffio',
  });

  const coverLines = documentPreview.sections?.[0]?.lines || [];
  const coverCompanyLine = coverLines.find((line) => line.startsWith('Société :') || line.startsWith('Structure :')) || '';
  const coverSeatLine = coverLines.find((line) => line.startsWith('Siège')) || '';
  const coverCapitalLine = coverLines.find((line) => line.startsWith('Capital social')) || '';
  const coverRcsLine = coverLines.find((line) => line.includes('RCS ')) || '';
  const coverCompanyName = coverCompanyLine.split(':').slice(1).join(':').trim() || documentPreview.subtitle.split('·')[0].trim();

  pdf.setFillColor(254, 249, 235);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setDrawColor(38, 72, 122);
  pdf.rect(margin, margin, contentWidth, pageHeight - (margin * 2));
  pdf.setFont('times', 'bold');
  pdf.setFontSize(34);
  pdf.setTextColor(16, 33, 61);
  pdf.text(pdf.splitTextToSize(coverCompanyName, contentWidth - 80), pageWidth / 2, pageHeight / 2 - 36, { align: 'center' });
  pdf.setFont('times', 'bold');
  pdf.setFontSize(20);
  pdf.text(pdf.splitTextToSize(documentPreview.title, contentWidth - 80), pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12.5);
  pdf.setTextColor(76, 91, 115);
  const coverMeta = [coverSeatLine, coverCapitalLine, coverRcsLine].filter(Boolean).join('\n');
  pdf.text(pdf.splitTextToSize(coverMeta || documentPreview.subtitle, contentWidth - 110), pageWidth / 2, pageHeight / 2 + 62, { align: 'center' });

  pdf.addPage();
  y = margin;
  documentPreview.sections.forEach((section) => {
    addPageIfNeeded(80);
    pdf.setDrawColor(201, 211, 227);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 22;
    drawWrapped(section.title, { size: 14, style: 'bold', gap: 10, color: [38, 72, 122] });
    section.lines.forEach((line) => drawWrapped(line, { size: 11, gap: 8 }));
    y += 8;
  });

  addPageIfNeeded(100);
  drawWrapped('Signatures', { size: 14, style: 'bold', color: [38, 72, 122] });
  drawWrapped('Chaque signataire fait précéder sa signature de la mention "Lu et approuvé" lorsque cette mention est requise ou utile.', { size: 11 });
  y += 34;
  const colWidth = (contentWidth - 34) / 3;
  ['Associé / actionnaire / membre', 'Dirigeant désigné', 'Représentant légal'].forEach((label, index) => {
    const x = margin + index * (colWidth + 17);
    pdf.line(x, y, x + colWidth, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(label, x, y + 14);
  });

  if (!documentPreview.isFullStatutes) {
    while (pdf.internal.getNumberOfPages() < 10) {
      pdf.addPage();
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(76, 91, 115);
      pdf.text('Page de continuation - contenu juridique detaille annexe au projet principal.', margin, margin + 10);
      const filler = [
        'Ce document doit etre relu et valide avant signature definitive.',
        'Les mentions variables sont completees a partir des informations confirmees dans le dossier client.',
        'Les clauses sensibles peuvent faire l objet d un ajustement avant depot.',
        'Le depot est realise sous reserve des exigences des organismes competents.',
      ];
      let fy = margin + 34;
      filler.forEach((line) => {
        pdf.text(line, margin, fy);
        fy += 20;
      });
    }
  }

  pdf.addPage();
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setTextColor(225, 230, 239);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(68);
  pdf.text(documentPreview.watermarkText || 'Greffio', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 30,
  });

  pdf.save(`${documentFilename(documentPreview)}.pdf`);
};

export const downloadPreview = async (documentPreview, format, context = {}) => {
  if (typeof window === 'undefined') return;
  const filename = documentFilename(documentPreview);

  if (documentPreview?.isFullStatutes && documentPreview?.williamPreview) {
    if (format === 'pdf') {
      const blob = await downloadStatutesPreviewDraftPdf({
        data: context.data || {},
        answers: context.answers || {},
      });
      downloadBlob(blob, `${filename}.pdf`);
      return;
    }
    await downloadStatutesOfficeExport(documentPreview.williamPreview, format);
    return;
  }

  if (format === 'pdf') {
    await downloadPdf(documentPreview);
    return;
  }

  if (format === 'odt') {
    downloadBlob(buildOdtBlob(documentPreview), `${filename}.odt`);
    return;
  }

  downloadBlob(buildDocxBlob(documentPreview), `${filename}.docx`);
};
