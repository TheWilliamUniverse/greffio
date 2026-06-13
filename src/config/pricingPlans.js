export const PRICING_DISCLAIMER = 'Les tarifs affichés concernent la prestation Greffio. Les frais légaux (greffe, annonce légale, RCS, etc.) sont indiqués avant validation et restent à la charge du client selon la formalité.';

export const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '0€',
    subtitle: 'Diagnostic et checklist',
    text: 'Questionnaire guidé, checklist des pièces et espace documentaire pour cadrer votre dossier.',
    cta: 'Démarrer',
    ctaLink: '/simulateur?type=statuts',
    highlight: false,
    includes: ['Questionnaire adapté à la forme', 'Checklist des pièces', 'Résumé par email', 'Espace documentaire'],
    excludes: ['Dépôt au greffe inclus', 'Relecture humaine systématique'],
  },
  {
    id: 'formalite',
    name: 'Formalité',
    price: '149€',
    compareAt: null,
    youngPrice: '70€',
    badge: 'Jeune -26 ans',
    subtitle: 'Dossier accompagné',
    text: 'Préparation, contrôle documentaire, suivi et dépôt selon le périmètre validé avec l’équipe Greffio.',
    cta: 'Créer mon dossier',
    ctaLink: '/simulateur',
    highlight: true,
    includes: ['Documents générés ou structurés', 'Contrôle de cohérence', 'Suivi dossier', 'Support email'],
    excludes: ['Frais légaux (greffe, annonce)', 'Conseil juridique personnalisé'],
  },
  {
    id: 'cabinet',
    name: 'Cabinet partenaire',
    price: 'Sur devis',
    subtitle: 'Multi-clients',
    text: 'Gestion multi-dossiers, équipe, reporting et marque blanche – ouverture progressive sur candidature.',
    cta: 'Nous contacter',
    ctaLink: '/contact?sujet=cabinet-partenaire',
    highlight: false,
    includes: ['Accès équipe', 'Pilotage multi-clients', 'Reporting', 'Accompagnement déploiement'],
    excludes: ['Tarif public unique', 'Activation automatique en ligne'],
  },
];

export const PRICING_FAQ = [
  {
    q: 'Greffio est-il un service officiel ?',
    a: 'Non. Greffio est un service privé d’assistance administrative. Les démarches officielles restent réalisées auprès des organismes compétents (greffe, guichet unique, etc.).',
  },
  {
    q: 'Les frais Greffio incluent-ils le greffe et l’annonce légale ?',
    a: 'Non, sauf mention explicite dans votre devis ou offre validée. Les frais légaux sont distingués et affichés avant paiement.',
  },
  {
    q: 'Quelle est la différence entre 0€ et une formalité payante ?',
    a: 'Le parcours à 0€ permet de diagnostiquer, structurer le dossier et préparer les pièces. L’offre Formalité ajoute l’accompagnement Greffio, les contrôles et le dépôt selon le périmètre convenu.',
  },
  {
    q: 'L’offre jeune entrepreneur à 70€ concerne qui ?',
    a: 'Les créateurs et porteurs de projet de moins de 26 ans, sur les formalités éligibles indiquées au moment du parcours. Le tarif standard Formalité est de 149€ HT.',
  },
  {
    q: 'Greffio remplace-t-il un avocat, un expert-comptable ou un notaire ?',
    a: 'Non. Greffio organise le flux documentaire et administratif. Un conseil juridique ou fiscal personnalisé relève de professionnels habilités.',
  },
  {
    q: 'Que se passe-t-il si le greffe rejette mon dossier ?',
    a: 'L’équipe Greffio vous indique la cause probable, les pièces à corriger et la marche à suivre. Les frais légaux déjà engagés auprès des tiers ne sont en général pas remboursables.',
  },
];

export const LANDING_FAQ = [
  ...PRICING_FAQ,
  {
    q: 'Greffio remplace-t-il mon expert-comptable ou mon avocat ?',
    a: 'Non. Greffio organise le flux, les documents, les relances et la relation avec l’équipe. Les validations réglementées restent du ressort des professionnels habilités lorsque nécessaire.',
  },
  {
    q: 'Les clients ont-ils leur propre espace ?',
    a: 'Oui. Chaque utilisateur connecté accède à son tableau de bord, ses pièces, ses messages et ses échéances.',
  },
  {
    q: 'Peut-on traiter plusieurs dossiers ou clients ?',
    a: 'Oui. Le module équipe permet de suivre plusieurs dossiers, assigner l’équipe Greffio et prioriser les actions.',
  },
  {
    q: 'Mes documents sont-ils sécurisés ?',
    a: 'Les pièces sont stockées sur une infrastructure cloud privée (AWS S3 en production), avec accès contrôlé et URLs de téléchargement à durée limitée.',
  },
  {
    q: 'Quelle valeur a la signature dans Greffio ?',
    a: 'Greffio enregistre un consentement simple dans l’application. Certaines formalités peuvent exiger une signature électronique avancée ou qualifiée via un prestataire tiers ou une étape officielle.',
  },
];
