import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  buildNativeAuthCallbackUrl,
  readNativeAuthBridgeSession,
} from '@/utils/nativeWebAuth.js';

export const AppAuthBridgePage = () => {
  const [error, setError] = useState('');

  useEffect(() => {
    const session = readNativeAuthBridgeSession();
    if (!session) {
      setError('Session introuvable. Reconnectez-vous depuis l’application.');
      return;
    }
    window.location.replace(buildNativeAuthCallbackUrl(session));
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 py-12 text-center">
      <GreffioLogo variant="full" className="text-2xl" />
      {error ? (
        <div className="mt-8 max-w-md space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">{error}</p>
          <Button asChild className="h-11 rounded-2xl px-6">
            <Link to="/login?nativeApp=1">Retour à la connexion</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
            Retour vers l’application Greffio…
          </p>
          <p className="text-xs text-muted-foreground">
            Si rien ne se passe, rouvrez l’app depuis votre écran d’accueil.
          </p>
        </div>
      )}
    </div>
  );
};
