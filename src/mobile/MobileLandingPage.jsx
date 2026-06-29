import React, { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FileSignature,
  FileText,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { GreffioLogo, GreffioWordmark } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { getServiceRoute } from '@/config/serviceLandingPages.js';
import { lookupPublicCompanyBySiren } from '@/api/company.js';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobileMenuButton } from '@/mobile/MobileAuthenticatedNav.jsx';
import { MobilePublicDrawer } from '@/mobile/MobilePublicDrawer.jsx';
import { MobileCockpitHeaderActions } from '@/mobile/ui/MobileCockpitHeaderActions.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { useAuth } from '@/hooks/useAuth.js';
import { GREFFIO_MARKETING_HOME, GREFFIO_BRAND_HOME_LABEL } from '@/utils/greffioBrandNavigation.js';

const MobileLandingDeferredSections = lazy(() => import('@/mobile/MobileLandingDeferredSections.jsx').then((module) => ({
  default: module.MobileLandingDeferredSections,
})));

const steps = [
  'Choisissez votre formalité',
  'Complétez le questionnaire',
  'Échangez avec l’équipe Greffio',
  'Signez les documents',
  'Suivez l’envoi au greffe',
];

const howItWorks = [
  {
    title: '1. Cadrage du dossier',
    text: 'Vous choisissez la formalité et renseignez les informations essentielles. Greffio crée immédiatement votre dossier de travail.',
  },
  {
    title: '2. Pièces et vérifications',
    text: 'Vous déposez vos justificatifs, l’équipe contrôle la complétude et vous indique clairement la prochaine action.',
  },
  {
    title: '3. Signature et paiement',
    text: 'Les documents sont finalisés, vous signez le mandat et validez le paiement sécurisé.',
  },
  {
    title: '4. Dépôt et suivi',
    text: 'Le dossier est préparé pour le dépôt, puis suivi avec des statuts lisibles jusqu’au retour administratif.',
  },
];

const platformFeatures = [
  { icon: FileCheck2, title: 'Dossiers guidés', text: 'Création, modification, dépôt de capital et envoi au greffe dans un parcours unique.' },
  { icon: MessageSquareText, title: 'Relation équipe-client', text: 'Messages, demandes de pièces et validations partagés entre clients et équipe Greffio.' },
  { icon: CalendarDays, title: 'Conformité active', text: 'Échéances, relances et registre documentaire après l’immatriculation.' },
  { icon: CreditCard, title: 'Facturation prête', text: 'Offres, paiements et frais légaux rattachés à chaque formalité.' },
];

const heroHighlights = ['0€ pour démarrer', 'Équipe Greffio assignée', 'Dossier centralisé'];
const heroTrustChips = ['Service privé indépendant', 'Documents guidés', 'Dossier centralisé'];
const featuredServices = LEGAL_SERVICES.slice(0, 6);

const SERVICE_GROUP_LABELS = {
  Création: 'Création',
  Modification: 'Modification',
  Patrimoine: 'Documents & patrimoine',
  'Vie sociale': 'Vie sociale',
};

const SERVICE_GROUP_HINTS = {
  Création: 'Immatriculez une nouvelle société avec un parcours guidé.',
  Modification: 'Mettez à jour votre entreprise existante en toute clarté.',
  Patrimoine: 'Formalités patrimoniales et documents associés.',
  'Vie sociale': 'Assemblées, cessions et évolutions de gouvernance.',
};

const MobileLandingHeroMockup = ({ revealMount }) => (
  <motion.div
    {...revealMount(0.24)}
    className="relative mx-auto mt-8 max-w-[300px]"
    aria-hidden="true"
  >
    <div className="rounded-[2rem] border-[6px] border-[hsl(var(--greffio-blue-900))] bg-[hsl(var(--greffio-blue-900))] p-2 shadow-elevation-lg">
      <div className="overflow-hidden rounded-[1.4rem] bg-[#f6f8fc]">
        <div className="border-b border-border/70 bg-white px-3 py-2.5">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          <p className="mt-2 text-center text-[10px] font-bold text-[hsl(var(--greffio-blue-900))]">Aperçu dossier Greffio</p>
        </div>
        <div className="space-y-2 p-3">
          <div className="rounded-xl border border-primary/20 bg-white p-2.5">
            <p className="text-[10px] font-bold text-primary">SASU en création</p>
            <p className="mt-1 text-[9px] text-muted-foreground">Étape actuelle : Documents à signer</p>
            <div className="mt-2 flex items-center justify-between text-[9px] font-semibold">
              <span className="text-muted-foreground">Progression</span>
              <span className="text-primary">60 %</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[60%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-white p-2.5">
            <p className="text-[10px] font-bold uppercase text-primary">Documents</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">3 documents à signer</p>
            <div className="mt-2 space-y-1">
              {['Statuts.pdf', 'Non-condamnation', 'Pouvoir formalités'].map((label) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background p-1.5">
                  <FileText className="h-3 w-3 text-primary" />
                  <span className="text-[8px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export const MobileLandingPage = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { revealMount, staggerItem } = useMobileMotion();
  const [lookupIdentifier, setLookupIdentifier] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupCompany, setLookupCompany] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  const dashboardTarget = currentUser ? '/dashboard' : '/login';

  const performLookup = async () => {
    const digits = String(lookupIdentifier || '').replace(/\D/g, '');
    if (digits.length !== 9 && digits.length !== 14) {
      setLookupError('Saisissez un SIREN (9) ou SIRET (14).');
      return;
    }
    try {
      setLookupLoading(true);
      setLookupError('');
      const payload = await lookupPublicCompanyBySiren(digits);
      setLookupCompany(payload?.company || null);
    } catch (error) {
      setLookupCompany(null);
      if (error?.message === 'INVALID_SIREN_OR_SIRET') {
        setLookupError('Saisissez un identifiant valide (SIREN 9 chiffres ou SIRET 14 chiffres).');
      } else {
        setLookupError('Entreprise introuvable actuellement. Réessayez ou saisissez un autre identifiant.');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="overflow-x-hidden bg-background text-foreground">
      <MobilePublicDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <motion.header
        {...revealMount(0)}
        className="sticky top-0 z-30 border-b border-border/70 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex min-h-[4.75rem] max-w-lg items-center justify-between gap-2 px-4 py-2.5 pt-[env(safe-area-inset-top)]">
          <Link to={GREFFIO_MARKETING_HOME} className="shrink-0" aria-label={GREFFIO_BRAND_HOME_LABEL}>
            <GreffioLogo variant="full" className="h-8" />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <MobileCockpitHeaderActions />
            <MobileMenuButton onClick={() => setNavOpen(true)} />
          </div>
        </div>
      </motion.header>

      <section className="relative overflow-hidden px-4 pb-8 pt-6">
        <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <motion.div {...revealMount(0.04)} className="relative">
          <motion.div
            {...revealMount(0.08)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary/60 px-3 py-1.5 text-xs font-bold text-primary shadow-elevation-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Formalités d’entreprise
          </motion.div>
          <h1 className="text-3xl font-extrabold leading-tight text-[hsl(var(--greffio-blue-900))]">
            Créer et suivre vos formalités simplement.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Un parcours guidé, des documents centralisés et un suivi clair avec l’équipe{' '}
            <GreffioWordmark className="text-[0.95em] align-baseline" />.
          </p>
          <motion.div {...revealMount(0.14)} className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg" className="h-12 w-full rounded-2xl text-base shadow-elevation-sm">
              <Link to="/simulateur?type=statuts">
                <FileSignature className="h-4 w-4" />
                Générer mes statuts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-2xl bg-white text-base">
              <Link to={dashboardTarget}>
                {isAuthenticated ? 'Retour au dashboard' : 'Accéder au dashboard'}
              </Link>
            </Button>
          </motion.div>
          <motion.p
            {...revealMount(0.17)}
            className="mt-3 text-center text-sm leading-6 text-muted-foreground"
          >
            Simulation guidée, sans engagement. Documents générés selon vos réponses.
          </motion.p>
          <motion.div {...revealMount(0.19)} className="mt-4 flex flex-wrap gap-2">
            {heroTrustChips.map((item, index) => (
              <motion.span
                key={item}
                {...staggerItem(index)}
                className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-semibold text-[hsl(var(--greffio-blue-900))] shadow-sm"
              >
                {item}
              </motion.span>
            ))}
          </motion.div>
          <motion.ul {...revealMount(0.2)} className="mt-6 grid gap-2">
            {heroHighlights.map((item, index) => (
              <motion.li
                key={item}
                {...staggerItem(index)}
                className="rounded-2xl bg-secondary/60 px-3 py-2.5 text-sm font-semibold text-[hsl(var(--greffio-blue-900))]"
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
          <MobileLandingHeroMockup revealMount={revealMount} />
        </motion.div>
      </section>

      <MobileAnimatedSection id="services" className="border-y border-border bg-white px-4 py-10" delay={0.02}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Formalités</p>
            <h2 className="mt-1 text-2xl font-extrabold">Catalogue relié au dashboard</h2>
          </div>
          <Link to="/services" className="text-sm font-semibold text-primary">Tout voir</Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">6 formalités phares – 27 démarches disponibles.</p>
        <div className="mt-5 space-y-5">
          {Object.entries(
            featuredServices.reduce((groups, service) => {
              const key = SERVICE_GROUP_LABELS[service.category] ? service.category : 'Création';
              if (!groups[key]) groups[key] = [];
              groups[key].push(service);
              return groups;
            }, {}),
          ).map(([groupKey, services]) => (
            <div key={groupKey}>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {SERVICE_GROUP_LABELS[groupKey] || groupKey}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {SERVICE_GROUP_HINTS[groupKey] || 'Formalité accompagnée par Greffio.'}
              </p>
              <div className="mt-3 space-y-3">
                {services.map((service, index) => (
                  <motion.div key={service.id} {...staggerItem(index)}>
                    <Link
                      to={getServiceRoute(service.id)}
                      className="block rounded-3xl border border-border bg-background p-4 shadow-elevation-sm transition active:scale-[0.99]"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${service.accent}`}>
                          <Building2 className="h-5 w-5 text-[hsl(var(--greffio-blue-900))]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold">{service.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{service.description}</p>
                          <p className="mt-2 text-sm font-bold text-primary">Dès {service.price}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-5 h-11 w-full rounded-2xl bg-white">
          <Link to="/services">Voir toutes les formalités</Link>
        </Button>
      </MobileAnimatedSection>

      <MobileAnimatedSection id="platform" className="px-4 py-10" delay={0.04}>
        <p className="text-sm font-bold uppercase text-primary">Plateforme</p>
        <h2 className="mt-1 text-2xl font-extrabold">Pensé pour clients et professionnels</h2>
        <div className="mt-5 grid gap-3">
          {platformFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              {...staggerItem(index)}
              className="rounded-3xl border border-border bg-white p-4 shadow-sm"
            >
              <feature.icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection id="comment-ca-marche" className="border-y border-border bg-white px-4 py-10" delay={0.02}>
        <p className="text-sm font-bold uppercase text-primary">Comment ça marche</p>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <motion.li
              key={step}
              {...staggerItem(index)}
              className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--greffio-blue))] text-xs font-extrabold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-semibold leading-6">{step}</span>
            </motion.li>
          ))}
        </ol>
        <div className="mt-6 space-y-3">
          {howItWorks.map((step, index) => (
            <motion.article
              key={step.title}
              {...staggerItem(index)}
              className="rounded-3xl border border-border bg-background p-4"
            >
              <h3 className="font-extrabold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </motion.article>
          ))}
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection id="inpi-like-lookup" className="px-4 py-10" delay={0.04}>
        <p className="text-sm font-bold uppercase text-primary">Informations entreprise</p>
        <h2 className="mt-1 text-2xl font-extrabold">Recherche SIREN / SIRET</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Retrouvez une société existante ou vérifiez vos informations avant une modification ou une cessation.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder="SIREN (9) ou SIRET (14)"
            className="h-12 rounded-2xl text-base"
            value={lookupIdentifier}
            onChange={(event) => {
              setLookupIdentifier(event.target.value);
              setLookupError('');
              setLookupCompany(null);
            }}
          />
          <Button type="button" className="h-12 rounded-2xl" onClick={() => void performLookup()} disabled={lookupLoading}>
            {lookupLoading ? 'Recherche…' : 'Rechercher'}
          </Button>
        </div>
        {lookupError ? <p className="mt-2 text-xs text-red-600">{lookupError}</p> : null}
        {lookupCompany ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 max-w-full overflow-hidden">
            <CompanyLookupCard
              company={lookupCompany}
              onUse={() => {
                window.location.href = `/simulateur?type=modification&siren=${lookupCompany.siren || ''}`;
              }}
            />
          </motion.div>
        ) : null}
      </MobileAnimatedSection>

      <MobileAnimatedSection className="mx-4 rounded-3xl border border-primary/20 bg-secondary/40 px-4 py-8" delay={0.02}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-extrabold text-[hsl(var(--greffio-blue-900))]">Greffio, service privé indépendant</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Greffio n’est pas un service officiel de l’État ni des greffes. Nous organisons vos démarches avec rigueur et traçabilité.
            </p>
          </div>
        </div>
      </MobileAnimatedSection>

      <Suspense fallback={<div className="px-4 py-10 text-sm text-muted-foreground">Chargement tarifs et FAQ…</div>}>
        <MobileLandingDeferredSections />
      </Suspense>
    </div>
  );
};
