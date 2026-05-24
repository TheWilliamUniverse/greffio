import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';

const CONSENT_KEY = 'greffio_cookie_consent_v1';

const COOKIE_DETAILS = [
  {
    category: 'Essentiels',
    required: true,
    items: [
      {
        name: 'greffio_cookie_consent_v1',
        purpose: 'Mémorise votre choix concernant les cookies.',
        storage: 'Navigateur (local)',
        duration: '13 mois',
      },
      {
        name: 'greffio_token / greffio_refresh_token',
        purpose: 'Maintient votre session connectée de façon sécurisée.',
        storage: 'Navigateur (local)',
        duration: 'Session / renouvellement automatique',
      },
      {
        name: 'greffio_user',
        purpose: 'Conserve les informations minimales de votre compte pour l’interface.',
        storage: 'Navigateur (local)',
        duration: 'Tant que la session est active',
      },
    ],
  },
  {
    category: 'Fonctionnels',
    required: true,
    items: [
      {
        name: 'greffio_project_draft',
        purpose: 'Sauvegarde temporaire de votre simulation ou questionnaire en cours.',
        storage: 'Navigateur (local)',
        duration: 'Jusqu’à finalisation ou suppression',
      },
      {
        name: 'greffio_current_dossier',
        purpose: 'Retient le dossier ouvert pour reprendre votre parcours.',
        storage: 'Navigateur (local)',
        duration: 'Session',
      },
    ],
  },
  {
    category: 'Mesure d’audience',
    required: false,
    items: [
      {
        name: 'Aucun cookie analytics actif',
        purpose: 'Greffio ne dépose pas de cookie statistique tant que vous n’avez pas accepté les cookies non essentiels.',
        storage: '—',
        duration: '—',
      },
    ],
  },
];

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const reject = () => {
    window.localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(920px,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-border bg-white p-4 shadow-elevation-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Greffio utilise des cookies essentiels pour sécuriser votre session et améliorer votre parcours. Vous pouvez accepter ou refuser les cookies non essentiels.
          </p>
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="text-xs text-primary/75 underline underline-offset-2 transition-colors hover:text-primary"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Masquer le détail des cookies' : 'Détail des cookies'}
          </button>
          {showDetails ? (
            <div className="max-h-52 space-y-3 overflow-y-auto rounded-md border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
              {COOKIE_DETAILS.map((group) => (
                <div key={group.category}>
                  <p className="font-semibold text-foreground">
                    {group.category}
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({group.required ? 'toujours actifs' : 'optionnels'})
                    </span>
                  </p>
                  <ul className="mt-1.5 space-y-2">
                    {group.items.map((item) => (
                      <li key={item.name} className="leading-5">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {' — '}
                        {item.purpose}
                        <span className="block text-[11px] text-muted-foreground/90">
                          Support : {item.storage} · Durée : {item.duration}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p>
                En savoir plus dans notre{' '}
                <Link to="/confidentialite" className="font-medium text-primary hover:underline">
                  politique de confidentialité
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2 md:pt-0.5">
          <Button type="button" variant="outline" className="bg-white" onClick={reject}>
            Refuser
          </Button>
          <Button type="button" onClick={accept}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
};
