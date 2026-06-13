import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PublisherLegalBlock } from '@/components/legal/PublisherLegalBlock.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const Section = ({ title, children }) => (
  <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>
);

export const PrivacyPolicyPage = () => (
  <PublicPageLayout>
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" to="/" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Confidentialité</p>
        <h1 className="mt-2 text-3xl font-extrabold">Politique de confidentialité Greffio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
          Cette page décrit la collecte, l&apos;utilisation, le partage et la suppression des données
          dans l&apos;application Greffio.
        </p>
      </section>

      <Section title="Responsable du traitement / Éditeur">
        <PublisherLegalBlock showDisclaimer={false} showLinks />
      </Section>

      <Section title="Données collectées">
        <p>Greffio collecte les données nécessaires à la création de compte, à la gestion des dossiers et à la communication de support.</p>
        <p>Exemples de données : identité (nom, prénom), contact (e-mail, téléphone), informations d&apos;entreprise, documents administratifs et informations de suivi de dossier.</p>
      </Section>

      <Section title="Utilisation des données">
        <p>Les données sont utilisées pour fournir le service (ouverture de compte, traitement des formalités, génération documentaire, suivi et assistance client).</p>
        <p>Les données ne sont pas revendues. Elles sont partagées uniquement avec les prestataires et partenaires strictement nécessaires à l&apos;exécution du service.</p>
      </Section>

      <Section title="Sécurité et chiffrement">
        <p>Les données sont chiffrées lors du transfert entre l&apos;application, les API et les services tiers via HTTPS/TLS.</p>
        <p>Des contrôles d&apos;accès et des mesures organisationnelles sont appliqués pour limiter l&apos;accès aux données aux personnes autorisées.</p>
      </Section>

      <Section title="Conservation et suppression">
        <p>La durée de conservation dépend des obligations légales, contractuelles et opérationnelles liées aux formalités traitées.</p>
        <p>Vous pouvez demander la suppression de votre compte et des données associées via la page dédiée.</p>
        <p>
          Lien de suppression de compte:{' '}
          <a className="font-semibold text-primary hover:underline" href={`${runtimeConfig.appUrl}/suppression-compte`}>
            {runtimeConfig.appUrl}/suppression-compte
          </a>
        </p>
        <p>
          Lien de suppression des donnees:{' '}
          <a className="font-semibold text-primary hover:underline" href={`${runtimeConfig.appUrl}/suppression-donnees`}>
            {runtimeConfig.appUrl}/suppression-donnees
          </a>
        </p>
      </Section>

      <Section title="Contact RGPD">
        <p>Pour toute question relative à la confidentialité ou à vos droits, contactez :</p>
        <p>
          <a className="font-semibold text-primary hover:underline" href={`mailto:${runtimeConfig.supportEmail}`}>
            {runtimeConfig.supportEmail}
          </a>
        </p>
      </Section>
    </div>
  </main>
  </PublicPageLayout>
);
