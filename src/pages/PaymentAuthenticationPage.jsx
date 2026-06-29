import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { openExternalCheckoutUrl, clearExternalCheckoutFlag } from '@/utils/paymentCheckoutNavigation.js';

export const PaymentAuthenticationPage = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const targetUrl = useMemo(() => {
    const raw = searchParams.get('target') || '';
    try {
      return decodeURIComponent(raw);
    } catch (_err) {
      return '';
    }
  }, [searchParams]);

  useEffect(() => {
    clearExternalCheckoutFlag();
  }, []);

  useEffect(() => {
    if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
      setError('Lien de validation sécurisée invalide.');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void openExternalCheckoutUrl(targetUrl);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [targetUrl]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--we-bg)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-elevation-md">
        <div className="mb-6 flex justify-center">
          <GreffioLogo variant="full" className="text-xl" />
        </div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--greffio-blue))]/10 text-[hsl(var(--greffio-blue))]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-center text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          Validation sécurisée
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">
          Votre banque va vous demander de confirmer le paiement.
          En général, il suffit d&apos;ouvrir l&apos;application bancaire sur votre téléphone
          ou de valider la notification reçue – sans vous connecter sur le site web de la banque.
        </p>
        <p className="mt-3 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Après validation, vous serez renvoyé automatiquement sur Greffio.</span>
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--greffio-blue))]" />
            <Button
              type="button"
              className="w-full"
              disabled={!targetUrl}
              onClick={() => void openExternalCheckoutUrl(targetUrl)}
            >
              Continuer vers la validation
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/boutique" className="font-semibold text-primary hover:underline">
            Retour à la boutique
          </Link>
        </p>
      </div>
    </div>
  );
};
