import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { COOKIE_CONSENT_KEY } from '@/config/cookieCatalog.js';
import { isCapacitorNative } from '@/utils/platform.js';

const DEFAULT_CONSENT = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
};

const readConsent = () => {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    if (raw === 'accepted') return { ...DEFAULT_CONSENT, analytics: true, marketing: true, decidedAt: null };
    if (raw === 'rejected') return { ...DEFAULT_CONSENT, decidedAt: null };
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const persistConsent = (consent) => {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
    ...consent,
    essential: true,
    functional: true,
    decidedAt: new Date().toISOString(),
  }));
};

export const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
    const reopen = () => {
      const current = readConsent();
      setAnalytics(Boolean(current?.analytics));
      setCustomize(true);
      setVisible(true);
    };
    window.addEventListener('greffio:cookie-preferences', reopen);
    return () => window.removeEventListener('greffio:cookie-preferences', reopen);
  }, []);

  const closeWith = (consent) => {
    persistConsent(consent);
    setVisible(false);
    setCustomize(false);
  };

  if (isCapacitorNative()) return null;
  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(920px,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-border bg-white p-4 shadow-elevation-md">
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Greffio utilise des cookies essentiels pour sécuriser votre session. Les cookies de mesure d&apos;audience ne sont activés que si vous les acceptez.
          <Link
            to="/cookies"
            className="ml-2 inline whitespace-nowrap text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
          >
            Détail des cookies
          </Link>
        </p>

        {customize ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Session technique</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tokens de connexion et sécurité – indispensables au fonctionnement de Greffio. Non désactivables.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Préférences</p>
              <label className="mt-2 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-semibold">Mesure d&apos;audience</span>
                  <span className="mt-1 block text-muted-foreground">Statistiques anonymisées (Core Web Vitals) pour améliorer Greffio.</span>
                </span>
              </label>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {!customize ? (
            <Button type="button" variant="outline" className="bg-white" onClick={() => setCustomize(true)}>
              Personnaliser
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="bg-white" onClick={() => closeWith({ ...DEFAULT_CONSENT, analytics: false, marketing: false })}>
            Refuser le non essentiel
          </Button>
          <Button
            type="button"
            onClick={() => closeWith(customize
              ? { ...DEFAULT_CONSENT, analytics, marketing: false }
              : { ...DEFAULT_CONSENT, analytics: true, marketing: false })}
          >
            {customize ? 'Enregistrer mes choix' : 'Accepter tout'}
          </Button>
        </div>
      </div>
    </div>
  );
};
