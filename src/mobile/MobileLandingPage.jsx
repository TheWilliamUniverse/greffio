import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LandingPricingSection } from '@/components/pricing/LandingPricingSection.jsx';
import { GooglePlayStoreLink } from '@/components/store/GooglePlayStoreLink.jsx';

const steps = [
  'Choisissez votre formalité',
  'Complétez le questionnaire',
  'Échangez avec l’équipe Greffio',
  'Signez les documents',
  'Suivez l’envoi au greffe',
];

const faq = [
  {
    q: 'Greffio remplace-t-il mon expert-comptable ?',
    a: 'Non. Greffio organise le flux, les documents et les relances. Les validations réglementées restent du ressort des professionnels habilités.',
  },
  {
    q: 'Les clients ont-ils leur dashboard ?',
    a: 'Oui. Chaque utilisateur connecté accède à son tableau de bord, ses pièces, ses messages et ses échéances.',
  },
];

export const MobileLandingPage = () => (
  <div className="bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-white/95 px-4 py-3 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <GreffioLogo variant="full" className="h-8" />
        <Link to="/login" className="text-sm font-semibold text-primary">Connexion</Link>
      </div>
    </header>

    <section className="px-4 pb-8 pt-6">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Formalités d’entreprise</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[hsl(var(--greffio-blue-900))]">
        Créer et suivre vos formalités simplement.
      </h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        Un parcours guidé, des documents centralisés et un suivi clair avec l’équipe Greffio.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild size="lg" className="h-12 w-full text-base">
          <Link to="/simulateur">
            Commencer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 w-full bg-white text-base">
          <Link to="/simulateur?type=statuts">Faire une simulation</Link>
        </Button>
      </div>
      <ul className="mt-6 grid gap-2 text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
        {['0€ pour démarrer', 'Équipe Greffio assignée', 'Dossier centralisé'].map((item) => (
          <li key={item} className="rounded-md bg-secondary/60 px-3 py-2">{item}</li>
        ))}
      </ul>
    </section>

    <section className="border-y border-border bg-white px-4 py-10">
      <p className="text-sm font-bold uppercase text-primary">Comment ça marche</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--greffio-blue))] text-xs font-extrabold text-white">
              {index + 1}
            </span>
            <span className="text-sm font-semibold leading-6">{step}</span>
          </li>
        ))}
      </ol>
    </section>

    <section id="pricing" className="px-4 py-10">
      <LandingPricingSection />
    </section>

    <section className="px-4 py-10">
      <p className="text-sm font-bold uppercase text-primary">Application mobile</p>
      <h2 className="mt-2 text-2xl font-extrabold">Greffio sur Android</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Suivez votre dossier, vos documents et vos notifications depuis l’application Greffio.
      </p>
      <div className="mt-5">
        <GooglePlayStoreLink size="md" />
      </div>
    </section>

    <section className="px-4 pb-10">
      <p className="text-sm font-bold uppercase text-primary">Questions clés</p>
      <div className="mt-4 space-y-3">
        {faq.map((item) => (
          <article key={item.q} className="rounded-md border border-border bg-white p-4">
            <h3 className="font-bold">{item.q}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Tarifs et conformité détaillés sur{' '}
        <Link to="/tarifs" className="font-semibold text-primary">la page Tarifs</Link>.
      </p>
    </section>

    <footer className="border-t border-border bg-[hsl(var(--greffio-blue-900))] px-4 py-8 text-white">
      <GreffioLogo variant="inverse" />
      <p className="mt-4 text-sm leading-6 text-white/70">
        Service privé d’assistance aux formalités d’entreprise — non affilié aux greffes ou à l’État.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
        <Link to="/mentions-legales" className="hover:text-white">Mentions légales</Link>
        <Link to="/confidentialite" className="hover:text-white">Confidentialité</Link>
        <Link to="/contact" className="hover:text-white">Contact</Link>
      </div>
    </footer>
  </div>
);
