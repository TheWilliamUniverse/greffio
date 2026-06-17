import { YOUNG_ENTREPRENEUR_LANDING_FOOTER } from '@/config/pricingOffers.js';

/** Cartes tarifs affichées sur la landing (copie historique, sans icônes). */
export const LANDING_PRICING_PLANS = [
  {
    name: 'Starter',
    price: '0€',
    text: 'Questionnaire, checklist et espace documentaire.',
    cta: 'Démarrer',
    ctaLink: '/simulateur?type=statuts',
  },
  {
    name: 'Formalité',
    price: '70€',
    compareAt: '149€',
    badge: 'Offre Jeune',
    text: 'Dossier complet, relecture et dépôt du dossier. Tarif jeune (-26 ans) en ce moment.',
    cta: 'Créer mon dossier',
    ctaLink: '/simulateur?offer=jeune-entrepreneur',
    highlight: true,
  },
  {
    name: 'Cabinet partenaire',
    price: 'À venir',
    text: 'Gestion multi-clients, équipe, reporting et marque blanche en déploiement progressif.',
    cta: 'Être notifié',
    ctaLink: '/contact?sujet=cabinet-partenaire',
  },
];

export { YOUNG_ENTREPRENEUR_LANDING_FOOTER };
