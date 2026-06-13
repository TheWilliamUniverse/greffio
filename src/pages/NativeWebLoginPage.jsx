import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { openNativeWebLoginUrl } from '@/utils/nativeWebAuth.js';

export const NativeWebLoginPage = () => {
  const [opening, setOpening] = useState(true);
  const [openError, setOpenError] = useState('');

  const openLogin = useCallback(async () => {
    setOpening(true);
    setOpenError('');
    try {
      await openNativeWebLoginUrl();
    } catch (_error) {
      setOpenError('Impossible d’ouvrir la page de connexion. Utilisez le bouton ci-dessous.');
    } finally {
      setOpening(false);
    }
  }, []);

  useEffect(() => {
    void openLogin();
  }, [openLogin]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f6f8fc]">
      <section className="bg-gradient-to-b from-[hsl(var(--greffio-blue-900))] via-[hsl(var(--greffio-blue))] to-[hsl(var(--greffio-blue))] px-5 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
        <GreffioLogo variant="wordmark-on-blue" to="/app/home" className="text-xl" />
        <h1 className="mt-5 text-[1.65rem] font-extrabold leading-tight tracking-tight">
          Connexion sécurisée
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Nous vous redirigeons vers la page de connexion Greffio, identique au site web.
        </p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-elevation-md">
          {opening ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          ) : (
            <ExternalLink className="mx-auto h-8 w-8 text-primary" />
          )}
          <p className="mt-4 text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
            {opening ? 'Ouverture de la connexion…' : 'Connexion dans le navigateur'}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Après validation, vous serez renvoyé automatiquement dans l’application.
          </p>
          {openError ? (
            <p className="mt-3 text-xs font-medium text-destructive">{openError}</p>
          ) : null}
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-secondary/60 p-3 text-left text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Même identifiants que sur greffio.willentreprises.com – MFA et récupération de mot de passe inclus.</span>
          </div>
          <Button
            type="button"
            className="mt-5 h-11 w-full rounded-2xl"
            onClick={() => void openLogin()}
          >
            Ouvrir la connexion
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" className="mt-2 h-10 w-full rounded-2xl text-muted-foreground">
            <Link to="/app/home">Retour à l’accueil</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};
