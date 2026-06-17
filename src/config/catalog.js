export const LEGAL_STRUCTURES = [
  { category: 'Formes les plus courantes', types: ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SCI', 'Micro-entreprise', 'Entreprise individuelle (EI)', 'Association loi 1901'] },
  { category: 'Entrepreneurs individuels', types: ['EI', 'Micro-entreprise', 'Auto-entrepreneur'] },
  { category: 'Sociétés commerciales classiques', types: ['EURL', 'SARL', 'SASU', 'SAS', 'SA', 'Société anonyme à conseil d’administration', 'Société anonyme à directoire', 'SNC', 'SCS', 'SCA'] },
  { category: 'Sociétés civiles et immobilières', types: ['SCI', 'SCPI', 'SCP', 'SCM', 'Société civile', 'Société en participation'] },
  { category: 'Professions libérales et santé', types: ['Cabinet libéral', 'Profession libérale réglementée', 'SEL', 'SELARL', 'SELAS', 'SELAFA', 'SELCA'] },
  { category: 'Associations, fondations et intérêt général', types: ['Association loi 1901', 'Fondation', 'Fonds de dotation'] },
  { category: 'Coopératives et économie sociale', types: ['SCOP', 'SCIC', 'Coopérative', 'Mutuelle', 'Entreprise adaptée', 'ESUS', 'JEI', 'Société coopérative artisanale', 'Société coopérative agricole', 'Société coopérative de consommateurs'] },
  { category: 'Agricole', types: ['GAEC', 'EARL', 'SCEA', 'Exploitation agricole individuelle', 'Société agricole'] },
  { category: 'Public, mixte et réglementé', types: ['SEM', 'Société d’économie mixte', 'EPIC'] },
  { category: 'Groupes, investissements et montages', types: ['Holding', 'Filiale', 'Franchise', 'Joint-venture', 'GIE', 'GEIE', 'Société de gestion', 'Société foncière', 'SIIC', 'Société de portage salarial'] },
  { category: 'Situations atypiques', types: ['Société de fait', 'Société tacite', 'Société en commandite simple', 'Société en commandite par actions'] },
  { category: 'Changements', types: ['Transfert de siège', 'Changement de dirigeant', 'Transformation', 'Fermeture'] },
];

export const LEGAL_SERVICES = [
  {
    id: 'creation-sas',
    title: 'SAS/SASU',
    category: 'Création',
    description: 'Statuts, annonce légale, dépôt du dossier et Kbis suivi depuis votre espace.',
    price: '149€',
    time: '48h',
    badge: 'Populaire',
    accent: 'bg-[hsl(var(--greffio-citron))]',
  },
  {
    id: 'creation-sa',
    title: 'SA',
    category: 'Création',
    description: 'Constitution ou transformation en société anonyme avec gouvernance structurée.',
    price: '299€',
    time: '5j',
    badge: 'Gouvernance',
    accent: 'bg-amber-100',
  },
  {
    id: 'creation-sarl',
    title: 'SARL/EURL',
    category: 'Création',
    description: 'Un cadre solide pour associés, famille ou activité commerciale encadrée.',
    price: '149€',
    time: '72h',
    badge: 'Guidé',
    accent: 'bg-[hsl(var(--greffio-mint))]',
  },
  {
    id: 'micro-entreprise',
    title: 'Auto-entrepreneur',
    category: 'Création',
    description: 'Création rapide, choix fiscal et rappels administratifs pour démarrer proprement.',
    price: '0€',
    time: '24h',
    badge: 'Simple',
    accent: 'bg-[hsl(var(--greffio-coral))]',
  },
  {
    id: 'creation-sci',
    title: 'SCI',
    category: 'Patrimoine',
    description: 'Structuration immobilière, statuts adaptés et registre des bénéficiaires effectifs.',
    price: '199€',
    time: '72h',
    badge: 'Famille',
    accent: 'bg-blue-100',
  },
  {
    id: 'modification',
    title: 'Modification',
    category: 'Vie sociale',
    description: 'Transfert de siège, changement de dirigeant, objet social ou capital.',
    price: '99€',
    time: '48h',
    badge: 'Piloté',
    accent: 'bg-emerald-100',
  },
  {
    id: 'fermeture',
    title: 'Fermeture',
    category: 'Vie sociale',
    description: 'Dissolution, liquidation amiable et radiation avec un calendrier clair.',
    price: '249€',
    time: '5j',
    badge: 'Accompagné',
    accent: 'bg-rose-100',
  },
];

export const SERVICE_AVAILABILITY = Object.freeze({
  AVAILABLE_NOW: 'available_now',
  COMING_SOON: 'coming_soon',
  MANUAL_QUOTE: 'manual_quote',
});

export const PAYMENT_METHODS = [
  {
    id: 'mollie-card',
    name: 'Carte bancaire',
    type: 'Paiement sécurisé',
    description: 'Visa, Mastercard, CB et autres moyens via Mollie – redirection sécurisée.',
    recommended: true,
  },
];

const form = (key, label, family, templateKey, hasStatutes, description, governance, rank = 99) => ({
  key,
  label,
  family,
  templateKey,
  hasStatutes,
  description,
  governance,
  rank,
});

export const COMPANY_FORM_CATALOG = [
  form('sas', 'SAS', 'Formes les plus courantes', 'SAS', true, 'Société par actions simplifiée, flexible et adaptée aux projets évolutifs.', 'Président, DG optionnel, décisions collectives', 1),
  form('sasu', 'SASU', 'Formes les plus courantes', 'SASU', true, 'Version unipersonnelle de la SAS.', 'Président associé unique ou tiers', 2),
  form('sarl', 'SARL', 'Formes les plus courantes', 'SARL', true, 'Société commerciale encadrée, fréquente pour PME et projets familiaux.', 'Un ou plusieurs gérants', 3),
  form('eurl', 'EURL', 'Formes les plus courantes', 'EURL', true, 'SARL à associé unique.', 'Gérant associé unique ou tiers', 4),
  form('sa', 'SA', 'Formes les plus courantes', 'SA', true, 'Société anonyme pour gouvernance structurée et capital important.', 'Conseil d’administration ou directoire', 5),
  form('sci', 'SCI', 'Formes les plus courantes', 'SCI', true, 'Société civile immobilière pour détention et gestion de patrimoine.', 'Gérance civile', 6),
  form('micro', 'Micro-entreprise', 'Formes les plus courantes', 'MICRO', false, 'Régime simplifié de l’entrepreneur individuel.', 'Entrepreneur individuel', 7),
  form('ei', 'Entreprise individuelle (EI)', 'Formes les plus courantes', 'EI', false, 'Exercice en nom propre, sans statuts sociaux.', 'Entrepreneur individuel', 8),
  form('association-1901', 'Association loi 1901', 'Formes les plus courantes', 'ASSOCIATION_1901', true, 'Groupement non lucratif avec statuts associatifs.', 'Bureau, conseil ou gouvernance statutaire', 9),

  form('auto-entrepreneur', 'Auto-entrepreneur', 'Entrepreneurs individuels', 'AUTO_ENTREPRENEUR', false, 'Nom d’usage courant du régime micro-entrepreneur.', 'Entrepreneur individuel', 20),

  form('commercial-sas', 'SAS', 'Sociétés commerciales classiques', 'SAS', true, 'Société par actions simplifiée, flexible pour associés, investisseurs et gouvernance sur mesure.', 'Président, DG optionnel, décisions collectives', 24),
  form('commercial-sasu', 'SASU', 'Sociétés commerciales classiques', 'SASU', true, 'SAS à associé unique pour démarrer seul avec une structure évolutive.', 'Président associé unique ou tiers', 25),
  form('commercial-sarl', 'SARL', 'Sociétés commerciales classiques', 'SARL', true, 'Société commerciale encadrée, adaptée aux PME, commerces et projets familiaux.', 'Un ou plusieurs gérants', 26),
  form('commercial-eurl', 'EURL', 'Sociétés commerciales classiques', 'EURL', true, 'SARL à associé unique, sécurisée et classique pour un projet porté seul.', 'Gérant associé unique ou tiers', 27),
  form('commercial-sa', 'SA', 'Sociétés commerciales classiques', 'SA', true, 'Société anonyme pour projets à capital et gouvernance structurés.', 'Conseil d’administration ou directoire', 28),
  form('sa-ca', 'Société anonyme à conseil d’administration', 'Sociétés commerciales classiques', 'SA_CA', true, 'SA administrée par un conseil d’administration.', 'Conseil d’administration, président, DG ou PDG', 30),
  form('sa-directoire', 'Société anonyme à directoire', 'Sociétés commerciales classiques', 'SA_DIRECTOIRE', true, 'SA avec séparation surveillance/exécutif.', 'Directoire et conseil de surveillance', 31),
  form('snc', 'SNC', 'Sociétés commerciales classiques', 'SNC', true, 'Société en nom collectif entre associés commerçants.', 'Gérance, associés indéfiniment et solidairement responsables', 32),
  form('scs', 'SCS', 'Sociétés commerciales classiques', 'SCS', true, 'Société distinguant commandités et commanditaires.', 'Gérance par commandités', 33),
  form('sca', 'SCA', 'Sociétés commerciales classiques', 'SCA', true, 'Structure hybride entre commandite et société par actions.', 'Gérant commandité et conseil de surveillance', 34),
  form('societe-commandite-simple', 'Société en commandite simple', 'Sociétés commerciales classiques', 'SCS', true, 'Libellé complet de la SCS.', 'Gérance par commandités', 35),
  form('societe-commandite-actions', 'Société en commandite par actions', 'Sociétés commerciales classiques', 'SCA', true, 'Libellé complet de la SCA.', 'Gérant commandité et conseil de surveillance', 36),

  form('scpi', 'SCPI', 'Sociétés civiles et immobilières', 'SCPI', true, 'Société civile de placement immobilier, encadrée et gérée par une société de gestion.', 'Société de gestion, assemblées des porteurs', 40),
  form('scp', 'SCP', 'Sociétés civiles et immobilières', 'SCP', true, 'Société civile professionnelle pour exercice commun d’une profession libérale réglementée.', 'Gérance, associés professionnels', 41),
  form('scm', 'SCM', 'Sociétés civiles et immobilières', 'SCM', true, 'Société civile de moyens pour mutualiser locaux, frais et outils.', 'Gérance, associés utilisateurs', 42),
  form('societe-civile', 'Société civile', 'Sociétés civiles et immobilières', 'SOCIETE_CIVILE', true, 'Société civile générique hors objet commercial principal.', 'Gérance civile', 43),
  form('sep', 'Société en participation', 'Sociétés civiles et immobilières', 'SEP', true, 'Société contractuelle souvent non immatriculée, à encadrer par convention.', 'Gérance ou mandataire contractuel', 44),

  form('cabinet-liberal', 'Cabinet libéral', 'Professions libérales et santé', 'CABINET_LIBERAL', false, 'Dossier d’installation d’un professionnel libéral.', 'Professionnel libéral', 50),
  form('profession-liberale-reglementee', 'Profession libérale réglementée', 'Professions libérales et santé', 'PROFESSION_LIBERALE', false, 'Dossier avec ordre, agrément ou autorité professionnelle selon métier.', 'Professionnel soumis à règles ordinales', 51),
  form('sel', 'Société d’exercice libéral (SEL)', 'Professions libérales et santé', 'SEL', true, 'Famille de sociétés d’exercice libéral réservée aux professions libérales réglementées.', 'Selon forme SELARL, SELAS, SELAFA ou SELCA', 52),
  form('selarl', 'SELARL', 'Professions libérales et santé', 'SELARL', true, 'SEL calquée sur la SARL.', 'Gérant professionnel associé', 53),
  form('selas', 'SELAS', 'Professions libérales et santé', 'SELAS', true, 'SEL calquée sur la SAS.', 'Président professionnel, organes adaptés', 54),
  form('selafa', 'SELAFA', 'Professions libérales et santé', 'SELAFA', true, 'SEL calquée sur la SA.', 'Conseil ou directoire selon statuts', 55),
  form('selca', 'SELCA', 'Professions libérales et santé', 'SELCA', true, 'SEL calquée sur la commandite par actions.', 'Gérant commandité professionnel', 56),

  form('fondation', 'Fondation', 'Associations, fondations et intérêt général', 'FONDATION', true, 'Structure d’intérêt général avec dotation et gouvernance dédiée.', 'Conseil d’administration ou directoire selon régime', 60),
  form('fonds-dotation', 'Fonds de dotation', 'Associations, fondations et intérêt général', 'FONDS_DOTATION', true, 'Personne morale à but non lucratif recevant et gérant des biens au service d’une mission.', 'Conseil d’administration', 61),

  form('scop', 'SCOP', 'Coopératives et économie sociale', 'SCOP', true, 'Société coopérative et participative avec salariés associés majoritaires.', 'Gérance ou présidence coopérative', 70),
  form('scic', 'SCIC', 'Coopératives et économie sociale', 'SCIC', true, 'Société coopérative d’intérêt collectif multi-parties prenantes.', 'Gouvernance coopérative multi-collèges', 71),
  form('cooperative', 'Coopérative', 'Coopératives et économie sociale', 'COOPERATIVE', true, 'Société fondée sur les principes coopératifs.', 'Assemblée des coopérateurs, organe de direction', 72),
  form('mutuelle', 'Mutuelle', 'Coopératives et économie sociale', 'MUTUELLE', true, 'Groupement mutualiste sans capital social, régi par règles spécifiques.', 'Assemblée, conseil et dirigeants mutualistes', 73),
  form('entreprise-adaptee', 'Entreprise adaptée', 'Coopératives et économie sociale', 'ENTREPRISE_ADAPTEE', true, 'Entreprise avec agrément/mission d’emploi de personnes en situation de handicap.', 'Selon forme support choisie', 74),
  form('esus', 'ESUS', 'Coopératives et économie sociale', 'ESUS', true, 'Agrément entreprise solidaire d’utilité sociale attaché à une structure existante.', 'Selon forme juridique support', 75),
  form('jei', 'JEI', 'Coopératives et économie sociale', 'JEI', true, 'Statut fiscal/social de jeune entreprise innovante attaché à une société existante.', 'Selon forme juridique support', 76),
  form('coop-artisanale', 'Société coopérative artisanale', 'Coopératives et économie sociale', 'COOP_ARTISANALE', true, 'Coopérative d’entreprises artisanales.', 'Gouvernance coopérative artisanale', 77),
  form('coop-agricole', 'Société coopérative agricole', 'Coopératives et économie sociale', 'COOP_AGRICOLE', true, 'Coopérative au service des exploitants agricoles associés.', 'Conseil d’administration coopératif', 78),
  form('coop-consommateurs', 'Société coopérative de consommateurs', 'Coopératives et économie sociale', 'COOP_CONSOMMATEURS', true, 'Coopérative organisée autour de consommateurs associés.', 'Gouvernance des sociétaires consommateurs', 79),

  form('gie', 'GIE', 'Groupes, investissements et montages', 'GIE', true, 'Groupement d’intérêt économique pour faciliter l’activité de ses membres.', 'Administrateur(s), membres', 80),
  form('geie', 'GEIE', 'Groupes, investissements et montages', 'GEIE', true, 'Groupement européen d’intérêt économique.', 'Gérant(s), membres établis dans plusieurs États', 81),
  form('holding', 'Holding', 'Groupes, investissements et montages', 'HOLDING', true, 'Montage de détention et animation de participations.', 'Selon forme support, souvent SAS ou SARL', 82),
  form('filiale', 'Filiale', 'Groupes, investissements et montages', 'FILIALE', true, 'Société contrôlée par une société mère.', 'Selon forme support, clauses groupe', 83),
  form('franchise', 'Franchise', 'Groupes, investissements et montages', 'FRANCHISE', true, 'Société exploitant une activité sous contrat de franchise.', 'Selon forme support, clauses d’enseigne', 84),
  form('joint-venture', 'Joint-venture', 'Groupes, investissements et montages', 'JOINT_VENTURE', true, 'Société ou convention de coentreprise entre partenaires.', 'Gouvernance paritaire ou pacte dédié', 85),
  form('societe-gestion', 'Société de gestion', 'Groupes, investissements et montages', 'SOCIETE_GESTION', true, 'Société gérant actifs, fonds ou portefeuilles selon autorisations applicables.', 'Direction et conformité réglementaire', 86),
  form('societe-fonciere', 'Société foncière', 'Groupes, investissements et montages', 'SOCIETE_FONCIERE', true, 'Société de détention et gestion d’actifs immobiliers.', 'Selon forme support, stratégie patrimoniale', 87),
  form('siic', 'SIIC', 'Groupes, investissements et montages', 'SIIC', true, 'Société d’investissement immobilier cotée, régime spécifique.', 'SA/SCA cotée, gouvernance réglementée', 88),
  form('portage-salarial', 'Société de portage salarial', 'Groupes, investissements et montages', 'PORTAGE_SALARIAL', true, 'Entreprise spécialisée dans le portage salarial.', 'Direction et conformité portage', 89),

  form('gaec', 'GAEC', 'Agricole', 'GAEC', true, 'Groupement agricole d’exploitation en commun.', 'Gérance agricole, associés exploitants', 90),
  form('earl', 'EARL', 'Agricole', 'EARL', true, 'Exploitation agricole à responsabilité limitée.', 'Gérance, associés exploitants ou non', 91),
  form('scea', 'SCEA', 'Agricole', 'SCEA', true, 'Société civile d’exploitation agricole.', 'Gérance civile agricole', 92),
  form('exploitation-agricole-individuelle', 'Exploitation agricole individuelle', 'Agricole', 'EXPLOITATION_AGRICOLE_INDIVIDUELLE', false, 'Dossier individuel d’exploitation agricole.', 'Exploitant individuel', 93),
  form('societe-agricole', 'Société agricole', 'Agricole', 'SOCIETE_AGRICOLE', true, 'Structure agricole générique à adapter selon GAEC, EARL, SCEA ou société commerciale.', 'Selon forme support', 94),

  form('sem', 'SEM', 'Public, mixte et réglementé', 'SEM', true, 'Société d’économie mixte associant capitaux publics et privés.', 'Conseil, collectivités actionnaires, règles publiques', 100),
  form('societe-economie-mixte', 'Société d’économie mixte', 'Public, mixte et réglementé', 'SEM', true, 'Variante libellée de la SEM.', 'Conseil, collectivités actionnaires, règles publiques', 101),
  form('epic', 'EPIC', 'Public, mixte et réglementé', 'EPIC', true, 'Établissement public industriel et commercial.', 'Conseil d’administration et direction publique', 102),

  form('societe-de-fait', 'Société de fait', 'Situations atypiques', 'SOCIETE_DE_FAIT', false, 'Situation de fait à constater et sécuriser, sans constitution régulière classique.', 'Organisation factuelle des participants', 110),
  form('societe-tacite', 'Société tacite', 'Situations atypiques', 'SOCIETE_TACITE', false, 'Situation implicite à documenter avec prudence.', 'Organisation contractuelle ou de fait', 111),
];

const AVAILABLE_FORM_KEYS = new Set([
  'sas',
  'sasu',
  'sarl',
  'eurl',
  'sci',
  'micro',
  'auto-entrepreneur',
  'ei',
  'modification',
  'transfert-siege',
  'changement-dirigeant',
]);

const COMING_SOON_FORM_KEYS = new Set([
  'sa',
  'association-1901',
  'holding',
  'filiale',
  'franchise',
  'joint-venture',
  'gaec',
  'earl',
  'scea',
]);

export const getFormAvailability = (formKey) => {
  if (AVAILABLE_FORM_KEYS.has(formKey)) return SERVICE_AVAILABILITY.AVAILABLE_NOW;
  if (COMING_SOON_FORM_KEYS.has(formKey)) return SERVICE_AVAILABILITY.COMING_SOON;
  return SERVICE_AVAILABILITY.MANUAL_QUOTE;
};
