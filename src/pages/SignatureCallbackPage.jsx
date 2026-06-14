import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { StandalonePublicShell } from '@/components/layout/StandalonePublicShell.jsx';
import { Button } from '@/components/ui/button.jsx';

/** Retour après signature (legacy redirects inclus). */
export const SignatureCallbackPage = () => {
  const [params] = useSearchParams();
  const status = params.get('status') || 'signed';
  const isComplete = status === 'signed' || status === 'completed';

  return (
    <StandalonePublicShell contentClassName="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-white p-8 text-center shadow-elevation-sm">
        {isComplete ? (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Clock3 className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <h1 className="mt-5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          {isComplete ? 'Signature enregistrée' : 'Retour de signature'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {isComplete
            ? 'Merci. Votre signature a bien été prise en compte. Greffio mettra à jour votre dossier dans quelques instants.'
            : 'Votre session de signature a été interrompue. Revenez à votre dossier Greffio pour continuer.'}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="h-11 rounded-xl">
            <Link to="/documents">Voir mes documents</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
            <Link to="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </div>
    </StandalonePublicShell>
  );
};
