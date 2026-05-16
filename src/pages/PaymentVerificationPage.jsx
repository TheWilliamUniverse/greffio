import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheckBig, Clock3 } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';

export const PaymentVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const dossierId = searchParams.get('dossierId');

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <GreffioLogo variant="full" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/">Accueil</Link>
          </Button>
        </div>

        <section className="rounded-md border border-border bg-white p-7 shadow-elevation-md">
          <div className="mb-4 inline-flex rounded-full bg-emerald-100 p-3 text-emerald-700">
            <CircleCheckBig className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Retour paiement effectué</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Votre paiement a été initié. Greffio attend la confirmation serveur de Mollie
            avant de marquer le dossier comme payé et de lancer la suite.
          </p>
          {dossierId && (
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
              Dossier: {dossierId}
            </p>
          )}
          <div className="mt-5 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Vérification en cours
            </p>
            <p className="mt-2">
              Actualisez votre tableau de bord dans quelques secondes pour voir le nouveau statut.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/dashboard">Ouvrir le dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="bg-white">
              <Link to="/dossiers">Voir mes dossiers</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};
