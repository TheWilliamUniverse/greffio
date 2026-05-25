export const SERVICE_LANDING_PAGES = {
  'creation-sasu': {
    title: 'Création SASU',
    price: 'À partir de 149 € HT',
    delay: 'Dossier préparé sous 24 à 72h selon complétude',
    legalFees: 'Frais légaux en sus (greffe, annonce légale, RBE)',
  },
  'creation-sas': {
    title: 'Création SAS',
    price: 'À partir de 149 € HT',
    delay: 'Dossier préparé sous 24 à 72h selon complétude',
    legalFees: 'Frais légaux en sus (greffe, annonce légale, RBE)',
  },
  'creation-sarl': {
    title: 'Création SARL',
    price: 'À partir de 149 € HT',
    delay: 'Dossier préparé sous 24 à 72h selon complétude',
    legalFees: 'Frais légaux en sus (greffe, annonce légale, RBE)',
  },
  'creation-eurl': {
    title: 'Création EURL',
    price: 'À partir de 149 € HT',
    delay: 'Dossier préparé sous 24 à 72h selon complétude',
    legalFees: 'Frais légaux en sus (greffe, annonce légale, RBE)',
  },
  'creation-sci': {
    title: 'Création SCI',
    price: 'À partir de 199 € HT',
    delay: 'Dossier préparé sous 48 à 96h selon complétude',
    legalFees: 'Frais légaux en sus (greffe, annonce légale, RBE)',
  },
  'micro-entreprise': {
    title: 'Création micro-entreprise',
    price: 'Parcours de démarrage dès 0 €',
    delay: 'Préparation rapide selon les informations déclarées',
    legalFees: 'Selon formalités annexes éventuelles',
    contextNote:
      'La micro-entreprise est une entreprise individuelle au régime simplifié : création légère, comptabilité allégée et cotisations sur le chiffre d’affaires (avec plafonds). L’EI classique suit les règles standards, sans plafond de CA ni ce régime simplifié.',
  },
  'transfert-siege': {
    title: 'Transfert de siège social',
    price: 'À partir de 99 € HT',
    delay: 'Traitement sous 24 à 72h selon dossier',
    legalFees: 'Frais légaux en sus selon département et forme',
  },
  'changement-dirigeant': {
    title: 'Changement de dirigeant',
    price: 'À partir de 99 € HT',
    delay: 'Traitement sous 24 à 72h selon dossier',
    legalFees: 'Frais légaux en sus selon formalité',
  },
  'dissolution-liquidation': {
    title: 'Dissolution et liquidation',
    price: 'À partir de 249 € HT',
    delay: 'Calendrier variable selon situation et validations',
    legalFees: 'Frais légaux en sus (annonce, greffe, radiation)',
  },
  'fermeture-entreprise': {
    title: "Fermeture d'entreprise",
    price: 'À partir de 249 € HT',
    delay: 'Calendrier variable selon situation et validations',
    legalFees: 'Frais légaux en sus (annonce, greffe, radiation)',
  },
};

export const SERVICE_PAGE_SLUGS = Object.keys(SERVICE_LANDING_PAGES);

export const SERVICE_LANDING_ROUTES = SERVICE_PAGE_SLUGS.reduce((acc, slug) => {
  acc[`/${slug}`] = slug;
  return acc;
}, {});

export const getServiceRoute = (serviceId) => {
  if (serviceId === 'fermeture') return '/fermeture-entreprise';
  if (serviceId === 'modification') return '/simulateur?type=modification';
  if (SERVICE_LANDING_PAGES[serviceId]) return `/${serviceId}`;
  return '/simulateur?type=creation';
};
