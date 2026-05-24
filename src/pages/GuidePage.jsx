import React from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CircleHelp,
  FileCheck2,
  FileText,
  FolderUp,
  Gavel,
  Landmark,
  ShieldCheck,
  Signature,
} from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  CREATION_COMPANY_REQUIRED_DOCUMENTS,
  DEFAULT_REQUIRED_DOCUMENTS,
  FILE_NAMING_EXAMPLES,
  GREFFIO_CONTACT,
  INPI_UPLOAD_RULES,
  MODIFICATION_REQUIRED_DOCUMENTS,
  WORKFLOW_STATUSES,
} from '@/config/legalFlow.js';

const processTimeline = [
  {
    title: '1. Initialisation dossier',
    icon: Landmark,
    points: [
      'Collecte progressive des informations client pour limiter les erreurs.',
      'Attribution d une reference dossier unique.',
      'Sauvegarde continue du parcours pour reprise a tout moment.',
    ],
  },
  {
    title: '2. Pieces justificatives',
    icon: FolderUp,
    points: [
      'Une piece = un fichier lisible, complet et a jour.',
      `Format recommande : ${INPI_UPLOAD_RULES.acceptedFormats.join(', ')} - ${INPI_UPLOAD_RULES.maxFileSizeMb} Mo max par fichier.`,
      'Controle de coherence apparente avant depot.',
    ],
  },
  {
    title: '3. Procuration et signature',
    icon: Signature,
    points: [
      'Lecture du mandat complet dans l espace client.',
      'Signature electronique et traçabilite de la validation.',
      'Depot du mandat signe dans le dossier formalite.',
    ],
  },
  {
    title: '4. Depot et suivi',
    icon: Gavel,
    points: [
      'Preparation puis depot sur le guichet unique / organisme competent.',
      'Suivi des demandes de complement et regularisation.',
      'Transmission des retours et documents officiels.',
    ],
  },
];

const faqSections = [
  {
    title: 'Comment eviter les rejets INPI / greffe ?',
    points: [
      'Transmettre une piece par fichier, en PDF, lisible et complet.',
      `Respecter la limite de ${INPI_UPLOAD_RULES.maxFileSizeMb} Mo par fichier.`,
      'Nommer chaque fichier en lien direct avec son contenu.',
      'Verifier coherence identite, adresse, forme juridique et activite.',
    ],
  },
  {
    title: 'Quelles pieces minimales pour un depot ?',
    points: DEFAULT_REQUIRED_DOCUMENTS,
  },
  {
    title: 'Pieces frequentes en creation de societe',
    points: CREATION_COMPANY_REQUIRED_DOCUMENTS,
  },
  {
    title: "Pieces frequentes en modification d'entreprise",
    points: MODIFICATION_REQUIRED_DOCUMENTS,
  },
  {
    title: 'Mandataire et procuration : que faut-il retenir ?',
    points: [
      'Le mandat autorise Greffio a preparer, deposer, suivre et regulariser la formalite confiee.',
      'Le client reste responsable de l exactitude des informations et documents transmis.',
      'La procuration signee peut etre controlee par les organismes competents.',
      'Le mandat ne couvre pas les actes hors mission administrative sans autorisation expresse.',
    ],
  },
  {
    title: 'Quelles bonnes pratiques de transmission des documents ?',
    points: [
      INPI_UPLOAD_RULES.namingRule,
      'Nommer les fichiers clairement et en lien direct avec la piece.',
      'Verifier lisibilite recto/verso pour les pieces d identite.',
      'Eviter les fichiers melangeant plusieurs pieces sans rapport.',
    ],
  },
];

export const GuidePage = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <GreffioLogo variant="full" to="/" />
        <div className="flex gap-2">
          <Button variant="outline" asChild className="bg-white">
            <Link to="/contact">Contact</Link>
          </Button>
          <Button asChild>
            <Link to="/simulateur">Demarrer</Link>
          </Button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-7 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-md bg-[hsl(var(--greffio-citron))] p-7 md:p-10">
        <p className="text-sm font-bold uppercase text-primary">Guide complet Greffio</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">FAQ complete - creation et modification d entreprise</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">
          Ce guide rassemble les questions essentielles, les exigences documentaires et les points de vigilance pratiques pour preparer un dossier propre, depose sans incoherence et suivi jusqu a l issue.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {processTimeline.map((step) => (
          <article key={step.title} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <step.icon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold">{step.title}</h2>
            </div>
            <div className="space-y-2">
              {step.points.map((point) => (
                <p key={point} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {faqSections.map((item) => (
          <article key={item.title} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <div className="mb-4 flex items-center gap-2">
              <CircleHelp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-extrabold">{item.title}</h2>
            </div>
            <div className="space-y-2">
              {item.points.map((point) => (
                <p key={point} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">Exemples de noms de fichiers recommandes</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {FILE_NAMING_EXAMPLES.map((example) => (
              <code key={example} className="rounded bg-muted px-3 py-2 text-xs text-primary">
                {example}
              </code>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">Statuts internes du workflow dossier</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">Chaque statut peut declencher un mail type coherent dans le parcours client.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {WORKFLOW_STATUSES.map((status) => (
              <span key={status} className="rounded bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                {status}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">FAQ operationnelle (reponses rapides)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Faut-il encore des ZIP maintenant que le backend est sur VPS ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Non pour le deploiement applicatif normal. Le VPS sert en continu. Les ZIP restent utiles seulement pour archivage, transfert manuel exceptionnel ou livraison hors pipeline.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Quand demander la procuration ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Avant tout depot en tant que mandataire, idealement apres collecte des informations de base et avant la phase de validation finale client.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Quels documents minimaux pour demarrer ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Piece identite, justificatif domicile, et selon le cas statuts signes, justificatif siege, attestation capital, annonce legale, DBE.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Qui valide le dossier final ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Le client valide la version finale avant depot. L acceptation reste de la competence des organismes officiels.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-[hsl(var(--greffio-citron))]" />
          <div>
            <p className="font-extrabold">Contact Greffio</p>
            <p className="mt-2 text-sm text-white/80">
              {GREFFIO_CONTACT.brand} - un service de {GREFFIO_CONTACT.company}
            </p>
            <p className="mt-1 text-sm text-white/80">{GREFFIO_CONTACT.website}</p>
            <p className="mt-1 text-sm text-white/80">{GREFFIO_CONTACT.supportEmail}</p>
            <p className="mt-1 text-sm text-white/80">{GREFFIO_CONTACT.supportPhone}</p>
          </div>
        </div>
      </section>
    </main>
  </div>
);
