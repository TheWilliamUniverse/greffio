import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';

export const MobileErrorFallback = ({
  title = 'Une erreur est survenue',
  message = 'Vous pouvez réessayer ou revenir à l’accueil.',
  onRetry,
}) => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 py-10 text-center">
    <GreffioLogo variant="tile" className="mb-6 scale-90" />
    <h1 className="text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{title}</h1>
    <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
    <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
      {onRetry ? (
        <Button type="button" className="h-11 w-full" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
      <Button asChild variant="outline" className="h-11 w-full bg-white">
        <a href="/">Retour à l’accueil</a>
      </Button>
      <Button asChild variant="ghost" className="h-11 w-full">
        <a href="/dashboard">Espace client</a>
      </Button>
    </div>
  </div>
);
