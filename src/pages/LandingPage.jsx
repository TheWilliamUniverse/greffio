import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  MessageSquareText,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { GreffioLogo, GreffioWordmark } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CompanyLookupCard } from '@/components/CompanyLookupCard.jsx';
import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { getServiceRoute } from '@/config/serviceLandingPages.js';
import { lookupPublicCompanyBySiren } from '@/api/company.js';
import { GooglePlayStoreLink } from '@/components/store/GooglePlayStoreLink.jsx';
import { LandingPricingSection } from '@/components/pricing/LandingPricingSection.jsx';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';
import { LegalFormComparatorPromoCard } from '@/components/comparator/LegalFormComparatorPromoCard.jsx';
import { MobileLandingPage } from '@/mobile/MobileLandingPage.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { SeoHead, HOME_JSON_LD } from '@/components/seo/SeoHead.jsx';
import { SEO_HOME } from '@/config/seoContent.js';

const EASE_OUT = [0.22, 1, 0.36, 1];

const platformFeatures = [
  { icon: FileCheck2, title: 'Dossiers guidés', text: 'Création, modification, dépôt de capital, annonce légale et envoi au greffe dans un parcours unique.' },
  { icon: MessageSquareText, title: 'Relation équipe-client', text: 'Commentaires, demandes de pièces, validations et notifications partagés entre clients, équipe Greffio et partenaires.' },
  { icon: CalendarDays, title: 'Conformité active', text: 'Échéances, relances, tâches et registre documentaire pour ne rien perdre après l’immatriculation.' },
  { icon: CreditCard, title: 'Facturation prête', text: 'Suivi des offres, paiements, justificatifs et frais légaux rattachés à chaque formalité.' },
];

const process = [
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
    text: 'Les documents sont finalisés, vous signez le mandat et validez le paiement sécurisé via Mollie.',
  },
  {
    title: '4. Dépôt et suivi',
    text: 'Le dossier est préparé pour le dépôt, puis suivi avec des statuts lisibles jusqu’au retour administratif.',
  },
];

const landingFaq = [
  {
    q: 'Greffio remplace-t-il mon expert-comptable ?',
    a: 'Non. Greffio organise le flux, les documents, les relances et la relation. L’équipe Greffio et les professionnels autorisés gardent la main sur les validations.',
  },
  {
    q: 'Les clients ont-ils leur dashboard ?',
    a: 'Oui. Chaque utilisateur connecté accède à son tableau de bord, ses pièces, ses messages et ses échéances.',
  },
  {
    q: 'Peut-on traiter plusieurs clients ?',
    a: 'Oui. Le module équipe permet de suivre plusieurs dossiers, assigner l’équipe Greffio ou un intervenant autorisé et prioriser les actions.',
  },
];

const heroHighlights = ['0€ pour démarrer', 'Équipe Greffio assignée', 'Dossier centralisé'];

const heroChecklist = ['Statuts signés', 'Annonce publiée', 'Capital à compléter', 'Bénéficiaire à valider'];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();
  const [lookupIdentifier, setLookupIdentifier] = React.useState('');
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState('');
  const [lookupCompany, setLookupCompany] = React.useState(null);

  const viewport = { once: true, amount: 0.16 };
  const reveal = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 26 },
      whileInView: { opacity: 1, y: 0 },
      viewport,
      transition: { duration: 0.55, delay, ease: EASE_OUT },
    });
  const revealMount = (delay = 0) => (reduceMotion
    ? {}
    : {
      initial: { opacity: 0, y: 22 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay, ease: EASE_OUT },
    });

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
        setLookupError("Entreprise introuvable actuellement. Réessayez ou saisissez un autre identifiant.");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title={SEO_HOME.title}
        description={SEO_HOME.description}
        path="/"
        jsonLd={HOME_JSON_LD}
        jsonLdId="home"
      />
      <div className="md:hidden">
        <MobileLandingPage />
      </div>

      <div className="hidden min-h-screen bg-background text-foreground md:block">
      <NavbarDropdown />

      <section className="surface-grid overflow-hidden px-4 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 pb-14 lg:min-h-[720px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:pb-16">
          <motion.div {...revealMount(0)} className="max-w-2xl">
            <motion.div
              {...revealMount(0.05)}
              className="we-hero-eyebrow mb-7 inline-flex items-center gap-2 shadow-elevation-sm"
            >
              <Sparkles className="h-4 w-4" />
              SaaS de formalités greffe pour clients, pros et équipes
            </motion.div>
            <motion.h1
              {...revealMount(0.12)}
              className="text-4xl font-extrabold leading-[1.04] tracking-normal text-[hsl(var(--greffio-blue-900))] sm:text-5xl lg:text-7xl"
            >
              Greffio pilote vos formalités d’entreprise.
            </motion.h1>
            <motion.p
              {...revealMount(0.2)}
              className="mt-7 max-w-xl text-xl font-medium leading-8 text-[hsl(var(--greffio-blue-900))]"
            >
              Création, modifications, documents, signature, échanges avec l’équipe{' '}
              <GreffioWordmark className="text-[0.92em] align-baseline" />
              {' '}et suivi de votre dossier : une approche moderne et humaine.
            </motion.p>
            <motion.div {...revealMount(0.28)} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="relative h-12 w-full justify-center px-12 text-center text-base sm:w-auto sm:justify-between sm:px-6">
                <Link to="/simulateur?type=statuts">
                  <span className="block w-full text-center sm:w-auto">Générer mes statuts</span>
                  <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 sm:static sm:translate-y-0" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 w-full justify-center bg-white px-6 text-center text-base sm:w-auto">
                <Link to={isAuthenticated ? '/dashboard' : '/login'}>
                  {isAuthenticated ? 'Retour au dashboard' : 'Accéder au dashboard'}
                </Link>
              </Button>
            </motion.div>
            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm font-semibold text-[hsl(var(--greffio-blue-900))] sm:grid-cols-3">
              {heroHighlights.map((item, index) => (
                <motion.div
                  key={item}
                  {...revealMount(0.34 + index * 0.07)}
                  whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
                  className="rounded-md bg-white/72 p-3"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...revealMount(0.1)}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative"
          >
            <div className="rounded-md border border-white/80 bg-white p-4 shadow-elevation-lg">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <GreffioLogo variant="tile" className="scale-75 origin-left" />
                <motion.span
                  animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                >
                  Vue produit
                </motion.span>
              </div>
              <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_260px]">
                <div className="space-y-4">
                  <motion.div
                    {...revealMount(0.45)}
                    className="rounded-md border border-border bg-muted/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">Création de société</p>
                        <p className="mt-1 text-xs text-muted-foreground">Étapes visibles après ouverture du dossier</p>
                      </div>
                      <BadgeCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <motion.div
                        className="h-2 rounded-full bg-[hsl(var(--greffio-blue))]"
                        initial={reduceMotion ? false : { width: 0 }}
                        animate={{ width: '42%' }}
                        transition={{ duration: 1.15, delay: 0.55, ease: EASE_OUT }}
                      />
                    </div>
                  </motion.div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {heroChecklist.map((item, index) => (
                      <motion.div
                        key={item}
                        {...revealMount(0.5 + index * 0.06)}
                        whileHover={reduceMotion ? undefined : { y: -2 }}
                        className="rounded-md border border-border bg-white p-3"
                      >
                        <CheckCircle2 className={`mb-3 h-5 w-5 ${index < 2 ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <p className="text-sm font-semibold">{item}</p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div {...revealMount(0.78)} className="rounded-md border border-border bg-white p-4">
                    <p className="mb-3 text-sm font-bold">Conversation équipe-client</p>
                    <div className="space-y-3">
                      <motion.div
                        {...revealMount(0.84)}
                        className="rounded-md bg-secondary p-3 text-sm"
                      >
                        Équipe Greffio : “Nous venons de valider l’annonce légale.”
                      </motion.div>
                      <motion.div
                        {...revealMount(0.92)}
                        className="ml-10 rounded-md bg-[hsl(var(--greffio-blue))] p-3 text-sm text-white"
                      >
                        Client : “J’ajoute l’attestation bancaire aujourd’hui.”
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <motion.div
                    {...revealMount(0.58)}
                    className="rounded-md bg-[hsl(var(--greffio-blue))] p-4 text-white"
                  >
                    <p className="text-sm font-bold">Assistant interne</p>
                    <p className="mt-2 text-sm text-white/92">Détecte les pièces manquantes, prépare les relances et résume le dossier.</p>
                    <div className="relative mt-4 h-20 overflow-hidden rounded-md bg-white/10">
                      <div className="animate-scan absolute left-0 right-0 h-8 bg-white/20" />
                    </div>
                  </motion.div>
                  <motion.div {...revealMount(0.66)} className="rounded-md border border-border p-4">
                    <p className="text-sm font-bold">Indicateurs</p>
                    <div className="mt-3 space-y-3 text-sm">
                      {[
                        ['Dossiers actifs', 'Selon espace'],
                        ['Temps moyen', 'Selon formalité'],
                        ['Pièces validées', 'En temps réel'],
                      ].map(([label, value], index) => (
                        <motion.div
                          key={label}
                          {...revealMount(0.72 + index * 0.05)}
                          className="flex justify-between gap-4"
                        >
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="services" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal()} className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Formalités</p>
              <h2 className="mt-2 text-4xl font-extrabold text-foreground">Un catalogue complet, relié au dashboard.</h2>
            </div>
            <Button asChild variant="outline" className="w-fit rounded-full bg-white">
              <Link to="/services">Voir tous les services</Link>
            </Button>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LEGAL_SERVICES.map((service, index) => (
              <motion.div
                key={service.id}
                {...reveal(index * 0.05)}
                whileHover={reduceMotion ? undefined : { y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              >
                <Link to={getServiceRoute(service.id)} className="group block rounded-2xl border border-border bg-white p-5 shadow-elevation-sm transition hover:border-primary/40 hover:shadow-elevation-md">
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-md ${service.accent}`}>
                    <Building2 className="h-6 w-6 text-[hsl(var(--greffio-blue-900))]" />
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">{service.category}</p>
                      <h3 className="mt-1 text-xl font-extrabold">{service.title}</h3>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-primary">{service.badge}</span>
                  </div>
                  <p className="mt-4 min-h-[72px] text-sm leading-6 text-muted-foreground">{service.description}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-bold">
                    <span>Dès {service.price}</span>
                    <span>{service.time}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div {...reveal()}>
            <p className="text-sm font-bold uppercase text-primary">Plateforme</p>
            <h2 className="mt-2 text-4xl font-extrabold">Pensé pour les clients et les professionnels qui traitent les formalités.</h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Greffio rapproche les entrepreneurs, l’équipe Greffio, les cabinets partenaires et les équipes administratives dans un même flux de travail.
            </p>
            <LegalFormComparatorPromoCard
              className="mt-8"
              layout="stacked"
              revealDelay={0.12}
            />
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                {...reveal(index * 0.07)}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className="rounded-md border border-border bg-background p-5"
              >
                <feature.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal()} className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Parcours client</p>
              <h2 className="mt-2 text-4xl font-extrabold text-foreground">Comment ça marche ?</h2>
            </div>
            <Button asChild variant="outline" className="w-fit bg-white">
              <Link to="/simulateur">Commencer ma formalité</Link>
            </Button>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                {...reveal(index * 0.08)}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                className="rounded-md border border-border bg-white p-5 shadow-elevation-sm"
              >
                <h3 className="text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="inpi-like-lookup" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <motion.div {...reveal()} className="mx-auto max-w-7xl rounded-md border border-border p-6 shadow-elevation-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Informations de l’entreprise</p>
              <h2 className="mt-1 text-3xl font-extrabold">Recherche SIREN / SIRET (style guichet unique)</h2>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              Signature qualifiée nécessaire (modification/dépôt)
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              type="search"
              inputMode="numeric"
              autoComplete="off"
              className="h-11 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--greffio-blue))]/30"
              placeholder="SIREN (9) ou SIRET (14)"
              value={lookupIdentifier}
              onChange={(event) => {
                setLookupIdentifier(event.target.value);
                setLookupError('');
                setLookupCompany(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !lookupLoading) {
                  event.preventDefault();
                  void performLookup();
                }
              }}
            />
            <Button className="h-11" onClick={() => void performLookup()} disabled={lookupLoading}>
              {lookupLoading ? 'Recherche…' : 'Rechercher une entreprise'}
            </Button>
          </div>
          {lookupError ? <p className="mt-2 text-sm text-red-600">{lookupError}</p> : null}

          {lookupCompany ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="mt-5"
            >
              <CompanyLookupCard
                company={lookupCompany}
                onUse={() => {
                  navigate(`/questionnaire?new=1&prefillSiren=${encodeURIComponent(lookupCompany.siren || '')}`);
                }}
              />
            </motion.div>
          ) : null}
        </motion.div>
      </section>

      <section id="app-mobile" className="px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          {...reveal()}
          whileHover={reduceMotion ? undefined : { y: -3 }}
          className="mx-auto max-w-7xl rounded-md border border-border bg-white p-6 shadow-elevation-md md:p-10"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
            <MonitorSmartphone className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-bold uppercase text-primary">Web, mobile, tablette</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold sm:text-4xl">
            Greffio sur ordinateur, Android et bientôt iOS.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Installez Greffio comme une application depuis Chrome, Edge ou Safari (PWA : icône Greffio, mode plein écran).
            L’application Android est disponible sur Google Play. Application iOS à venir prochainement.
          </p>
          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10">
            <GooglePlayStoreLink size="lg" className="shrink-0" />
            <Button asChild variant="outline" className="h-auto shrink-0 bg-white px-6 py-3 text-base">
              <Link to="/app">
                Options PWA et mobile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div {...reveal()} className="mx-auto max-w-7xl rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-lg md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <ShieldCheck className="mb-5 h-8 w-8 text-[hsl(var(--greffio-citron))]" />
              <h2 className="text-3xl font-extrabold">Un parcours opérationnel, pas une simple vitrine.</h2>
              <p className="mt-4 text-white/92">Chaque demande crée un dossier, des tâches, des documents attendus et un fil d’échange exploitable par l’équipe.</p>
            </div>
            <div className="grid gap-3">
              {process.map((step, index) => (
                <motion.div
                  key={step}
                  {...reveal(index * 0.07)}
                  whileHover={reduceMotion ? undefined : { x: 4 }}
                  className="flex items-center gap-4 rounded-md bg-white/10 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-primary">{index + 1}</span>
                  <span className="font-semibold">{step}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="pricing" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <LandingPricingSection />
        </div>
      </section>

      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div {...reveal()}>
            <p className="text-sm font-bold uppercase text-primary">Questions clés</p>
            <h2 className="mt-2 text-4xl font-extrabold">Ce que l’app prend en charge.</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Les réponses détaillées sur les tarifs et la conformité sont sur{' '}
              <Link to="/tarifs" className="font-semibold text-primary hover:underline">la page Tarifs</Link>.
            </p>
          </motion.div>
          <div className="grid gap-4">
            {landingFaq.map((item, index) => (
              <motion.div
                key={item.q}
                {...reveal(index * 0.1)}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className="rounded-md border border-border bg-white p-5"
              >
                <h3 className="font-bold">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <GreffioUltraFooter />
      </div>
    </>
  );
};
