import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { getServiceRoute } from '@/config/serviceLandingPages.js';

const staticPages = [
  { title: 'Accueil', description: 'Présentation de Greffio et parcours de création.', to: '/', keywords: ['greffio', 'accueil', 'landing'] },
  { title: 'Tarifs', description: 'Offres Starter, Formalité et cabinet partenaire.', to: '/tarifs', keywords: ['tarif', 'prix', '70', '149', 'formalité', 'jeune'] },
  { title: 'Simulateur', description: 'Démarrer une formalité ou générer des statuts.', to: '/simulateur', keywords: ['simulateur', 'création', 'sas', 'sasu', 'sarl'] },
  { title: 'Services', description: 'Catalogue des formalités greffe et RCS.', to: '/services', keywords: ['services', 'formalités', 'greffe'] },
  { title: 'Ressources', description: 'Guides, outils et estimations.', to: '/ressources', keywords: ['ressources', 'kbis', 'siren', 'documents'] },
  { title: 'Guide', description: 'Questions fréquentes et bonnes pratiques dossier.', to: '/guide', keywords: ['guide', 'faq', 'aide'] },
  { title: 'Contact', description: 'Contacter l’équipe Greffio.', to: '/contact', keywords: ['contact', 'support', 'équipe'] },
  { title: 'À propos', description: 'Greffio et WILLIAM ESTABLISHMENTS.', to: '/a-propos', keywords: ['à propos', 'about', 'éditeur', 'société'] },
  { title: 'Application mobile', description: 'Greffio sur Android et iOS.', to: '/app', keywords: ['app', 'mobile', 'android', 'play store'] },
  { title: 'Connexion', description: 'Accéder à votre espace client.', to: '/login', keywords: ['login', 'connexion', 'compte'] },
  { title: 'Inscription', description: 'Créer votre espace Greffio.', to: '/signup', keywords: ['inscription', 'signup', 'compte'] },
  { title: 'Tableau de bord', description: 'Suivre vos dossiers et actions.', to: '/dashboard', keywords: ['dashboard', 'tableau de bord'] },
  { title: 'Compléter un PDF', description: 'Assistant de complétion documentaire – disponible dans la boutique.', to: '/boutique#boutique-outils-gratuits', keywords: ['pdf', 'cerfa', 'formulaire', 'complétion', 'document'] },
  { title: 'Dossiers', description: 'Liste de vos formalités en cours.', to: '/dossiers', keywords: ['dossiers', 'dossier', 'formalité'] },
  { title: 'Documents', description: 'Coffre documentaire et pièces justificatives.', to: '/documents', keywords: ['documents', 'pièces', 'coffre', 'pdf'] },
  { title: 'Statuts', description: 'Générer et exporter vos statuts société.', to: '/statuts', keywords: ['statuts', 'sas', 'sarl', 'docx', 'odt'] },
  { title: 'Assistant Greffio', description: 'Chat d’assistance sur vos démarches.', to: '/chat', keywords: ['assistant', 'chat', 'aide'] },
  { title: 'Mon profil', description: 'Informations personnelles et sécurité.', to: '/profil', keywords: ['profil', 'compte', 'paramètres'] },
  { title: 'Mentions légales', description: 'Informations légales Greffio.', to: '/mentions-legales', keywords: ['mentions', 'légal'] },
  { title: 'Politique de confidentialité', description: 'Protection des données personnelles.', to: '/confidentialite', keywords: ['rgpd', 'confidentialité', 'données'] },
];

const serviceEntries = (LEGAL_SERVICES || []).map((service) => ({
  title: service.title || service.label,
  description: service.description || service.summary || 'Formalité Greffio',
  to: getServiceRoute(service.id) || `/services/${service.id}`,
  keywords: [service.id, service.title, service.label, ...(service.tags || [])].filter(Boolean),
}));

export const SITE_SEARCH_INDEX = [...staticPages, ...serviceEntries];

export const searchSiteIndex = (query, limit = 12) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q || q.length < 2) return [];

  return SITE_SEARCH_INDEX
    .map((item) => {
      const haystack = [
        item.title,
        item.description,
        ...(item.keywords || []),
      ].join(' ').toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const starts = item.title.toLowerCase().startsWith(q);
      const score = (starts ? 4 : 0) + (titleMatch ? 2 : 0) + (haystack.includes(q) ? 1 : 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
