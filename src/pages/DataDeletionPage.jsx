import React from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, DatabaseZap } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { runtimeConfig } from '@/config/runtime.js';

export const DataDeletionPage = () => (
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" to="/" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Suppression des donnees</p>
        <h1 className="mt-2 text-3xl font-extrabold">Demander la suppression de vos donnees</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
          Vous pouvez demander la suppression d'une partie ou de la totalite de vos donnees sans suppression complete
          du compte, selon faisabilite technique et obligations legales.
        </p>
      </section>

      <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
        <div className="mb-4 flex items-center gap-2">
          <DatabaseZap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Comment faire la demande</h2>
        </div>
        <p className="text-sm leading-7 text-muted-foreground">
          Envoyez votre demande detaillee a{' '}
          <a
            className="font-semibold text-primary hover:underline"
            href={`mailto:${runtimeConfig.supportEmail}?subject=Suppression%20de%20donnees%20Greffio`}
          >
            {runtimeConfig.supportEmail}
          </a>
          {' '}en precisant les categories de donnees a supprimer.
        </p>
      </section>

      <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
        <h2 className="text-lg font-extrabold">Traitement de la demande</h2>
        <div className="mt-4 space-y-3">
          {[
            "Verification d'identite du demandeur.",
            'Suppression ou anonymisation des donnees demandees lorsque possible.',
            'Conservation des donnees strictement necessaires pour obligations legales/fiscales et prevention de fraude.',
            'Confirmation de traitement envoyee par email.',
          ].map((line) => (
            <div key={line} className="flex items-start gap-3 rounded-md bg-muted p-3">
              <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">{line}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </main>
);
