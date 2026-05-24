import React from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Mail, Trash2 } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const steps = [
  'Envoyez une demande depuis l email de votre compte a l adresse support.',
  'Indiquez l email du compte Greffio concerne et, si possible, la societe associee.',
  'Nous accusons reception puis verifions votre identite avant suppression.',
  'Le compte est desactive puis supprime avec les donnees associees hors obligations legales.',
];

export const AccountDeletionPage = () => (
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" to="/" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Suppression de compte</p>
        <h1 className="mt-2 text-3xl font-extrabold">Demander la suppression de votre compte Greffio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
          Cette page est destinee aux utilisateurs qui souhaitent supprimer leur compte et les donnees
          associees.
        </p>
      </section>

      <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Procedure</h2>
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step} className="flex items-start gap-3 rounded-md bg-muted p-3">
              <CircleCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Adresse de demande</h2>
        </div>
        <a
          href={`mailto:${runtimeConfig.supportEmail}?subject=Suppression%20de%20compte%20Greffio`}
          className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:underline"
        >
          {runtimeConfig.supportEmail}
        </a>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Donnees supprimees: profil utilisateur, donnees de session, contenus operationnels et pieces associees
          au compte, sauf conservation necessaire pour obligations legales, fiscales, preuve contractuelle ou
          prevention de fraude.
        </p>
      </section>
    </div>
  </main>
);
