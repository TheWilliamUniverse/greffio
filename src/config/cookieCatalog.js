export const COOKIE_CONSENT_KEY = 'greffio_cookie_consent_v1';

export const COOKIE_CATEGORIES = [
  {
    id: 'essential',
    label: 'Essentiels',
    required: true,
    summary: 'Indispensables à la sécurité, à la connexion et au mémorisation de votre choix cookies.',
    items: [
      {
        name: 'greffio_cookie_consent_v1',
        purpose: 'Mémorise votre choix concernant les cookies non essentiels.',
        storage: 'Navigateur (localStorage)',
        duration: '13 mois',
        provider: 'Greffio',
      },
      {
        name: 'greffio_token / greffio_refresh_token',
        purpose: 'Maintient votre session connectée de façon sécurisée.',
        storage: 'Navigateur (localStorage)',
        duration: 'Session / renouvellement automatique',
        provider: 'Greffio',
      },
      {
        name: 'greffio_user',
        purpose: 'Conserve les informations minimales de votre compte pour l’interface.',
        storage: 'Navigateur (localStorage)',
        duration: 'Tant que la session est active',
        provider: 'Greffio',
      },
    ],
  },
  {
    id: 'functional',
    label: 'Fonctionnels',
    required: true,
    summary: 'Permettent de reprendre un parcours ou un dossier en cours sans perte de saisie.',
    items: [
      {
        name: 'greffio_project_draft',
        purpose: 'Sauvegarde temporaire de votre simulation ou questionnaire en cours.',
        storage: 'Navigateur (localStorage)',
        duration: 'Jusqu’à finalisation ou suppression',
        provider: 'Greffio',
      },
      {
        name: 'greffio_current_dossier',
        purpose: 'Retient le dossier ouvert pour reprendre votre parcours.',
        storage: 'Navigateur (localStorage)',
        duration: 'Session',
        provider: 'Greffio',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Mesure d’audience',
    required: false,
    summary: 'Cookies statistiques optionnels, activés uniquement si vous acceptez les cookies non essentiels.',
    items: [
      {
        name: 'Aucun cookie analytics actif',
        purpose: 'Greffio ne dépose pas de cookie statistique tant que vous n’avez pas accepté les cookies non essentiels.',
        storage: '–',
        duration: '–',
        provider: '–',
      },
    ],
  },
];
