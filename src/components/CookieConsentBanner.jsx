import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { COOKIE_CONSENT_KEY } from '@/config/cookieCatalog.js';

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const reject = () => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(920px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-white p-4 shadow-elevation-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Greffio utilise des cookies essentiels pour sécuriser votre session et améliorer votre parcours. Vous pouvez accepter ou refuser les cookies non essentiels.
          <Link
            to="/cookies"
            className="ml-4 inline whitespace-nowrap text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
          >
            Détail des cookies
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
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
