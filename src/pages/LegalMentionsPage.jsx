import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeEuro, CreditCard, FileCheck2, Scale, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { runtimeConfig } from '@/config/runtime.js';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';

const Section = ({ title, children }) => (
  <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>
);

export const LegalMentionsPage = () => (
  <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <GreffioLogo variant="full" />
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Accueil</Link>
        </Button>
      </div>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
        <p className="text-sm font-bold uppercase text-white/70">Informations légales</p>
        <h1 className="mt-2 text-3xl font-extrabold">Mentions légales, CGU et CGV Greffio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78">
          Greffio organise les formalités administratives, les documents, les paiements et la relation entre clients, équipe Greffio et partenaires intervenants.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { icon: Scale, title: 'Éditeur', text: 'William Establishments · RCS Nice 102 230 414' },
          { icon: ShieldCheck, title: 'Marque', text: 'Greffio est une marque déposée détenue par William Establishments.' },
          { icon: CreditCard, title: 'Paiements', text: 'Mollie Checkout, CB, wallets, Link, virement SEPA et prélèvement SEPA.' },
        ].map((item) => (
          <div key={item.title} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <item.icon className="mb-4 h-6 w-6 text-primary" />
            <h2 className="font-extrabold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>

      <Section title="Éditeur du service">
        <p><strong className="text-foreground">William Establishments</strong>, immatriculée au RCS de Nice sous le numéro 102 230 414.</p>
        <p>SIRET : 10223041400017 · TVA intracommunautaire : FR49102230414.</p>
        <p>Greffio est une marque déposée et détenue par William Establishments. Toute reproduction non autorisée du nom, du logo, de l’identité visuelle ou des contenus Greffio est interdite.</p>
      </Section>

      <Section title="Objet du service Greffio">
        <p><strong className="text-foreground">Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.</strong></p>
        <p>Greffio est une application SaaS destinée à organiser les formalités administratives, greffe et vie juridique des entreprises : questionnaires, génération documentaire, coffre documentaire, suivi de dossier, fil partagé équipe-client, paiements et pilotage opérationnel.</p>
        <p>Les documents générés constituent une aide à la préparation. Ils doivent être relus et validés par le client, l’équipe Greffio ou tout professionnel compétent lorsque la situation le requiert.</p>
        <p>Selon la nature de la demande, Greffio peut réaliser les formalités via le Guichet unique (INPI) ou recourir à des partenaires et sous-traitants spécialisés pour l’obtention de certains documents et services.</p>
      </Section>

      <Section title="Conditions générales d’utilisation">
        <p>L’utilisateur s’engage à fournir des informations exactes, complètes et à jour. Les pièces déposées dans le coffre documentaire doivent être lisibles, authentiques et pertinentes pour la démarche concernée.</p>
        <p>L’accès à l’espace client, à l’espace professionnel et à l’espace équipe est personnel. L’activation de l’authentification multifacteur est recommandée pour les comptes traitant des dossiers ou documents sensibles.</p>
        <p>Le fil partagé permet de tracer les messages, demandes de pièces, validations et commentaires entre le client, l’équipe Greffio et les partenaires autorisés.</p>
      </Section>

      <Section title="Conditions générales de vente">
        <p>Les prix affichés dans l’application correspondent aux prestations Greffio et peuvent être indiqués hors taxes. Les frais légaux, frais d’annonce légale, frais de greffe, frais bancaires ou coûts de tiers restent distincts lorsqu’ils ne sont pas expressément inclus.</p>
        <p>La commande est confirmée après validation de l’offre et, le cas échéant, paiement. Lorsque le client demande l’exécution immédiate d’une prestation numérique ou personnalisée, il reconnaît que certaines prestations peuvent commencer avant l’expiration du délai légal de rétractation.</p>
        <p>Greffio ne garantit pas les délais dépendant d’administrations, greffes, banques, journaux d’annonces légales ou plateformes tierces, mais fournit un suivi et des relances lorsque cela est prévu dans l’offre choisie.</p>
      </Section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <BadgeEuro className="mb-4 h-6 w-6 text-primary" />
          <h2 className="text-lg font-extrabold">Moyens de paiement</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">La solution retenue est Mollie Checkout, avec activation prioritaire de CB/Cartes Bancaires, Visa, Mastercard, Apple Pay, Google Pay, Link, virement SEPA et prélèvement SEPA. PayPal, Klarna et Alma restent activables selon éligibilité et stratégie de conversion.</p>
          <div className="mt-4 grid gap-2">
            {PAYMENT_METHODS.map((method) => (
              <div key={method.id} className="rounded-md bg-muted p-3 text-sm">
                <span className="font-bold text-foreground">{method.name}</span>
                <span className="text-muted-foreground"> · {method.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <FileCheck2 className="mb-4 h-6 w-6 text-primary" />
          <h2 className="text-lg font-extrabold">Données et documents</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Les données sont utilisées pour créer le compte, traiter les dossiers, générer les documents, envoyer les emails utiles et assurer le suivi opérationnel. Les documents peuvent être partagés aux intervenants strictement nécessaires à la formalité. Les données sont hébergées en Europe, avec une cible d’hébergement France/UE selon l’infrastructure active.</p>
        </div>
      </section>

      <Section title="Conformite Google Play et RGPD">
        <p>
          Politique de confidentialite:{' '}
          <a href={`${runtimeConfig.appUrl}/confidentialite`} className="font-semibold text-primary hover:underline">
            {runtimeConfig.appUrl}/confidentialite
          </a>
        </p>
        <p>
          Suppression de compte:{' '}
          <a href={`${runtimeConfig.appUrl}/suppression-compte`} className="font-semibold text-primary hover:underline">
            {runtimeConfig.appUrl}/suppression-compte
          </a>
        </p>
        <p>
          Suppression de donnees:{' '}
          <a href={`${runtimeConfig.appUrl}/suppression-donnees`} className="font-semibold text-primary hover:underline">
            {runtimeConfig.appUrl}/suppression-donnees
          </a>
        </p>
      </Section>
    </div>
  </main>
);
