import React from 'react';
import { Link } from 'react-router-dom';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { runtimeConfig } from '@/config/runtime.js';

const Section = ({ title, children }) => (
  <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>
);

export const PrivacyPolicyPage = () => (
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Confidentialite</p>
        <h1 className="mt-2 text-3xl font-extrabold">Politique de confidentialite Greffio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
          Cette page decrit la collecte, l'utilisation, le partage et la suppression des donnees
          dans l'application Greffio.
        </p>
      </section>

      <Section title="Donnees collectees">
        <p>Greffio collecte les donnees necessaires a la creation de compte, a la gestion des dossiers et a la communication de support.</p>
        <p>Exemples de donnees: identite (nom, prenom), contact (email, telephone), informations d'entreprise, documents administratifs et informations de suivi de dossier.</p>
      </Section>

      <Section title="Utilisation des donnees">
        <p>Les donnees sont utilisees pour fournir le service (ouverture de compte, traitement des formalites, generation documentaire, suivi et assistance client).</p>
        <p>Les donnees ne sont pas revendues. Elles sont partagees uniquement avec les prestataires et partenaires strictement necessaires a l'execution du service.</p>
      </Section>

      <Section title="Securite et chiffrement">
        <p>Les donnees sont chiffrees lors du transfert entre l'application, les APIs et les services tiers via HTTPS/TLS.</p>
        <p>Des controles d'acces et des mesures organisationnelles sont appliques pour limiter l'acces aux donnees aux personnes autorisees.</p>
      </Section>

      <Section title="Conservation et suppression">
        <p>La duree de conservation depend des obligations legales, contractuelles et operationnelles liees aux formalites traitees.</p>
        <p>Vous pouvez demander la suppression de votre compte et des donnees associees via la page dediee.</p>
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
        <p>Pour toute question relative a la confidentialite ou a vos droits, contactez:</p>
        <p>
          <a className="font-semibold text-primary hover:underline" href={`mailto:${runtimeConfig.supportEmail}`}>
            {runtimeConfig.supportEmail}
          </a>
        </p>
      </Section>
    </div>
  </main>
);
