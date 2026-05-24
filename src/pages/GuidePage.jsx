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
      'Attribution d\'une référence dossier unique.',
      'Sauvegarde continue du parcours pour reprise à tout moment.',
    ],
  },
  {
    title: '2. Pièces justificatives',
    icon: FolderUp,
    points: [
      'Une pièce = un fichier lisible, complet et à jour.',
      `Format recommandé : ${INPI_UPLOAD_RULES.acceptedFormats.join(', ')} - ${INPI_UPLOAD_RULES.maxFileSizeMb} Mo max par fichier.`,
      'Contrôle de cohérence apparente avant dépôt.',
    ],
  },
  {
    title: '3. Procuration et signature',
    icon: Signature,
    points: [
      'Lecture du mandat complet dans l\'espace client.',
      'Signature électronique et traçabilité de la validation.',
      'Dépôt du mandat signé dans le dossier formalité.',
    ],
  },
  {
    title: '4. Dépôt et suivi',
    icon: Gavel,
    points: [
      'Préparation puis dépôt sur le guichet unique / organisme compétent.',
      'Suivi des demandes de complément et régularisation.',
      'Transmission des retours et documents officiels.',
    ],
  },
];

const faqSections = [
  {
    title: 'Comment éviter les rejets INPI / greffe ?',
    points: [
      'Transmettre une pièce par fichier, en PDF, lisible et complet.',
      `Respecter la limite de ${INPI_UPLOAD_RULES.maxFileSizeMb} Mo par fichier.`,
      'Nommer chaque fichier en lien direct avec son contenu.',
      'Vérifier cohérence identité, adresse, forme juridique et activité.',
    ],
  },
  {
    title: 'Quelles pièces minimales pour un dépôt ?',
    points: DEFAULT_REQUIRED_DOCUMENTS,
  },
  {
    title: 'Pièces fréquentes en création de société',
    points: CREATION_COMPANY_REQUIRED_DOCUMENTS,
  },
  {
    title: "Pièces fréquentes en modification d'entreprise",
    points: MODIFICATION_REQUIRED_DOCUMENTS,
  },
  {
    title: 'Mandataire et procuration : que faut-il retenir ?',
    points: [
      'Le mandat autorise Greffio à préparer, déposer, suivre et régulariser la formalité confiée.',
      'Le client reste responsable de l\'exactitude des informations et documents transmis.',
      'La procuration signée peut être contrôlée par les organismes compétents.',
      'Le mandat ne couvre pas les actes hors mission administrative sans autorisation expresse.',
    ],
  },
  {
    title: 'Quelles bonnes pratiques de transmission des documents ?',
    points: [
      INPI_UPLOAD_RULES.namingRule,
      'Nommer les fichiers clairement et en lien direct avec la pièce.',
      'Vérifier lisibilité recto/verso pour les pièces d\'identité.',
      'Éviter les fichiers mélangeant plusieurs pièces sans rapport.',
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
            <Link to="/simulateur">Démarrer</Link>
          </Button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl space-y-7 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-md bg-[hsl(var(--greffio-citron))] p-7 md:p-10">
        <p className="text-sm font-bold uppercase text-primary">Guide complet Greffio</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">FAQ complète — création et modification d&apos;entreprise</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">
          Ce guide rassemble les questions essentielles, les exigences documentaires et les points de vigilance pratiques pour préparer un dossier propre, déposé sans incohérence et suivi jusqu&apos;à l&apos;issue.
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
            <h2 className="text-lg font-extrabold">Exemples de noms de fichiers recommandés</h2>
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
          <p className="mb-3 text-sm text-muted-foreground">Chaque statut peut déclencher un e-mail type cohérent dans le parcours client.</p>
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
          <h2 className="text-lg font-extrabold">FAQ opérationnelle (réponses rapides)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Faut-il encore des ZIP maintenant que le backend est sur VPS ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Non pour le déploiement applicatif normal. Le VPS sert en continu. Les ZIP restent utiles seulement pour archivage, transfert manuel exceptionnel ou livraison hors pipeline.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Quand demander la procuration ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Avant tout dépôt en tant que mandataire, idéalement après collecte des informations de base et avant la phase de validation finale client.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Quels documents minimaux pour démarrer ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pièce d&apos;identité, justificatif de domicile, et selon le cas statuts signés, justificatif de siège, attestation de capital, annonce légale, DBE.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="font-bold">Qui valide le dossier final ?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Le client valide la version finale avant dépôt. L&apos;acceptation reste de la compétence des organismes officiels.
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
