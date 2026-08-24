const ICONS = {
  creation: '/images/formalities/creation-societe.png',
  modification: '/images/formalities/modifier-societe.png',
  etablissementAdd: '/images/formalities/ajouter-etablissement.png',
  etablissementClose: '/images/formalities/fermer-etablissement.png',
  siegeTransfer: '/images/formalities/transferer-siege.png',
  dirigeant: '/images/formalities/changer-dirigeant.png',
};

const defaultsByCategory = {
  creation: {
    icon: ICONS.creation,
    badge: 'Essentiel',
    groupLabel: 'CRÉATION',
    footerLabel: 'Dossier guidé',
    eta: '48h',
  },
  etablissements: {
    icon: ICONS.etablissementAdd,
    badge: 'Déploiement',
    groupLabel: 'ÉTABLISSEMENT',
    footerLabel: 'Parcours cadré',
    eta: '72h',
  },
  modifications: {
    icon: ICONS.modification,
    badge: 'Courant',
    groupLabel: 'VIE SOCIALE',
    footerLabel: 'Suivi dossier',
    eta: '72h',
  },
  gestion: {
    icon: ICONS.modification,
    badge: 'Vie sociale',
    groupLabel: 'GESTION',
    footerLabel: 'Suivi dossier',
    eta: '5j',
  },
  autres: {
    icon: ICONS.creation,
    badge: 'Spécifique',
    groupLabel: 'AUTRES',
    footerLabel: 'Accompagnement',
    eta: '72h',
  },
};

/** @type {Record<string, object>} */
export const DEMARCHE_VISUALS = {
  creation_societe: {
    groupLabel: 'CRÉATION',
    description: 'Constitution d’une nouvelle structure, de la rédaction aux dépôts.',
    footerLabel: 'Dossier guidé',
    eta: '48h',
    badge: 'Essentiel',
    icon: ICONS.creation,
  },
  creation_sasu: {
    groupLabel: 'CRÉATION',
    description: 'Société par actions simplifiée unipersonnelle, adaptée aux projets solo.',
    icon: ICONS.creation,
  },
  creation_sas: {
    groupLabel: 'CRÉATION',
    description: 'Structure flexible pour plusieurs associés et une gouvernance agile.',
    icon: ICONS.creation,
  },
  creation_sarl: {
    groupLabel: 'CRÉATION',
    description: 'Forme classique pour entreprises familiales ou projets à plusieurs.',
    icon: ICONS.creation,
  },
  creation_eurl: {
    groupLabel: 'CRÉATION',
    description: 'SARL unipersonnelle, choix fréquent pour lancer seul avec responsabilité limitée.',
    icon: ICONS.creation,
  },
  creation_sci: {
    groupLabel: 'CRÉATION',
    description: 'Structure dédiée à la détention et la gestion de biens immobiliers.',
    icon: ICONS.creation,
  },
  micro_entreprise: {
    groupLabel: 'CRÉATION',
    description: 'Régime simplifié pour démarrer une activité avec un cadre allégé.',
    icon: ICONS.creation,
    badge: 'Rapide',
    eta: '24h',
  },
  entreprise_individuelle: {
    groupLabel: 'CRÉATION',
    description: 'Entreprise individuelle classique, hors régime micro-entreprise.',
    icon: ICONS.creation,
  },
  societe_etrangere_france: {
    groupLabel: 'IMMATRICULATION',
    description: 'Installation ou représentation d’une entité étrangère en France.',
    badge: 'International',
    footerLabel: 'Accompagnement dédié',
    eta: '10j',
  },
  etablissement_secondaire_creation: {
    groupLabel: 'ÉTABLISSEMENT',
    description: 'Ouverture d’un site secondaire rattaché à votre société existante.',
    icon: ICONS.etablissementAdd,
    badge: 'Déploiement',
  },
  etablissement_creation: {
    groupLabel: 'ÉTABLISSEMENT',
    description: 'Ouverture d’un site secondaire ou complément d’activité.',
    icon: ICONS.etablissementAdd,
    badge: 'Déploiement',
  },
  etablissement_fermeture: {
    groupLabel: 'CESSATION',
    description: 'Radiation ou fermeture d’un établissement secondaire.',
    icon: ICONS.etablissementClose,
    badge: 'Clôture',
    footerLabel: 'Suivi dossier',
    eta: '5j',
  },
  etablissement_transfert: {
    groupLabel: 'ÉTABLISSEMENT',
    description: 'Déplacement d’un établissement vers une nouvelle adresse.',
    icon: ICONS.siegeTransfer,
    badge: 'Adresse',
    footerLabel: 'Pièces guidées',
  },
  transfert_siege: {
    groupLabel: 'SIÈGE SOCIAL',
    description: 'Déplacement de l’adresse officielle de l’entreprise.',
    icon: ICONS.siegeTransfer,
    badge: 'Adresse',
    footerLabel: 'Pièces guidées',
    eta: '72h',
  },
  changement_dirigeant: {
    groupLabel: 'GOUVERNANCE',
    description: 'Nomination, remplacement ou cessation d’un mandataire.',
    icon: ICONS.dirigeant,
    badge: 'Gouvernance',
    footerLabel: 'Dossier guidé',
    eta: '96h',
  },
  changement_denomination: {
    groupLabel: 'VIE SOCIALE',
    description: 'Modification du nom officiel visible au RCS et sur vos documents.',
    icon: ICONS.modification,
    badge: 'Courant',
  },
  modification_activite: {
    groupLabel: 'VIE SOCIALE',
    description: 'Changement d’adresse, d’objet, de capital ou de statuts.',
    icon: ICONS.modification,
    badge: 'Courant',
  },
  modification_objet_social: {
    groupLabel: 'VIE SOCIALE',
    description: 'Ajustement de l’objet social pour refléter votre activité réelle.',
    icon: ICONS.modification,
  },
  augmentation_capital: {
    groupLabel: 'CAPITAL',
    description: 'Augmentation des fonds propres et mise à jour des statuts.',
    icon: ICONS.modification,
    badge: 'Capital',
    eta: '96h',
  },
  reduction_capital: {
    groupLabel: 'CAPITAL',
    description: 'Réduction de capital avec formalités de publicité et greffe.',
    icon: ICONS.modification,
    badge: 'Capital',
    eta: '96h',
  },
  beneficiaires_effectifs_modification: {
    groupLabel: 'GOUVERNANCE',
    description: 'Mise à jour de la déclaration des bénéficiaires effectifs.',
    icon: ICONS.dirigeant,
    badge: 'Registre',
    eta: '72h',
  },
  depot_comptes_annuels: {
    groupLabel: 'COMPTES',
    description: 'Dépôt annuel des comptes au greffe du tribunal de commerce.',
    icon: ICONS.modification,
    badge: 'Obligation',
    footerLabel: 'Suivi dossier',
    eta: '5j',
  },
  mise_en_sommeil: {
    groupLabel: 'VIE SOCIALE',
    description: 'Suspension temporaire de l’activité sans radiation immédiate.',
    icon: ICONS.modification,
    badge: 'Pause',
  },
  reprise_activite: {
    groupLabel: 'VIE SOCIALE',
    description: 'Redémarrage d’une société précédemment mise en sommeil.',
    icon: ICONS.creation,
    badge: 'Reprise',
  },
  dissolution_liquidation_radiation: {
    groupLabel: 'CESSATION',
    description: 'Clôture définitive de la société avec dissolution et radiation.',
    icon: ICONS.etablissementClose,
    badge: 'Clôture',
    footerLabel: 'Suivi dossier',
    eta: '15j',
  },
  correction_regularisation: {
    groupLabel: 'RÉGULARISATION',
    description: 'Correction d’une formalité rejetée, incomplète ou à reprendre.',
    icon: ICONS.modification,
    badge: 'Correction',
    footerLabel: 'Reprise dossier',
  },
  obtention_kbis_documents: {
    groupLabel: 'DOCUMENTS',
    description: 'Extrait Kbis, statuts ou pièces officielles de votre entreprise.',
    icon: ICONS.creation,
    badge: 'Kbis',
    footerLabel: 'Commande express',
    eta: '48h',
  },
};

export const getDemarcheVisual = (item) => {
  const categoryDefaults = defaultsByCategory[item.category] || defaultsByCategory.autres;
  const specific = DEMARCHE_VISUALS[item.key] || {};
  return {
    ...categoryDefaults,
    ...specific,
    groupLabel: specific.groupLabel || categoryDefaults.groupLabel,
    description: specific.description || item.hint || categoryDefaults.description || item.label,
  };
};

/** Icônes Clareffio pour les 4 familles de formalité (questionnaire mobile / desktop). */
export const getCategoryVisual = (categoryId) => (
  defaultsByCategory[categoryId] || defaultsByCategory.autres
);

const SERVICE_CATALOG_ICONS = {
  'creation-sas': ICONS.creation,
  'creation-sa': ICONS.creation,
  'creation-sarl': ICONS.creation,
  'micro-entreprise': ICONS.creation,
  'creation-sci': ICONS.creation,
  modification: ICONS.modification,
  fermeture: ICONS.etablissementClose,
  'transfert-siege': ICONS.siegeTransfer,
  'changement-dirigeant': ICONS.dirigeant,
};

/** Icône PNG catalogue services (alignée site web). */
export const getServiceCatalogIcon = (serviceId) => (
  SERVICE_CATALOG_ICONS[serviceId] || ICONS.creation
);
