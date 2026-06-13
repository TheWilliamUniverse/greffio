import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, LogIn, Receipt, Sparkles, UserPlus } from 'lucide-react';
import { COMPARATOR_PAGE_PATH } from '@/components/comparator/LegalFormComparatorPromoCard.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { getServiceRoute } from '@/config/serviceLandingPages.js';
import { getServiceCatalogIcon } from '@/config/demarcheVisuals.js';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';

const quickLinks = [
  { to: '/services', label: 'Services', icon: LayoutGrid, hint: 'Catalogue formalités' },
  { to: '/tarifs', label: 'Tarifs', icon: Receipt, hint: 'Offres & FAQ' },
  { to: '/simulateur', label: 'Simuler', icon: Sparkles, hint: 'Estimation rapide' },
];

const featured = LEGAL_SERVICES.filter((s) => s.badge === 'Populaire' || s.price === '0€').slice(0, 4);

export const NativeAppHomePage = () => (
  <MobilePageContainer className="pb-6">
    <MobileAnimatedSection delay={0}>
      <div className="overflow-hidden rounded-3xl bg-[hsl(var(--greffio-blue))] text-white shadow-elevation-md">
        <div className="px-5 pb-6 pt-5">
          <GreffioLogo variant="inverse" className="text-xl" />
          <h1 className="mt-6 text-[1.65rem] font-extrabold leading-tight tracking-tight">
            Vos formalités, simplifiées.
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/85">
            Reprenez un dossier ou démarrez une création – questionnaire, signatures et suivi greffe au même endroit.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10">
          {['Dossier', 'Signature', 'Kbis'].map((label) => (
            <div key={label} className="bg-white/5 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-white/90">
              {label}
            </div>
          ))}
        </div>
      </div>
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.04} className="mt-5 grid grid-cols-3 gap-2">
      {quickLinks.map(({ to, label, icon: Icon, hint }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white px-2 py-4 text-center shadow-elevation-sm active:bg-secondary/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-extrabold">{label}</span>
          <span className="text-[10px] leading-4 text-muted-foreground">{hint}</span>
        </Link>
      ))}
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.06} className="mt-6 space-y-3">
      <Button asChild size="lg" className="h-12 w-full justify-between rounded-2xl text-base font-bold">
        <Link to="/login">
          Me connecter
          <LogIn className="h-5 w-5" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-12 w-full justify-between rounded-2xl bg-white text-base font-bold">
        <Link to="/signup">
          Créer mon espace
          <UserPlus className="h-5 w-5" />
        </Link>
      </Button>
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.08} className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Formalités populaires</h2>
        <Link to="/services" className="text-xs font-bold text-primary">Tout voir</Link>
      </div>
      <div className="space-y-2">
        {featured.map((service) => (
          <Link
            key={service.id}
            to={getServiceRoute(service.id)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 shadow-elevation-sm"
          >
            <img
              src={getServiceCatalogIcon(service.id)}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{service.title}</p>
              <p className="text-xs font-bold text-primary">{service.price}{service.time ? ` · ${service.time}` : ''}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </MobileAnimatedSection>

    <MobileAnimatedSection delay={0.1} className="mt-6">
      <Link
        to={COMPARATOR_PAGE_PATH}
        className="group flex flex-col gap-3 rounded-2xl bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-[0_12px_32px_rgba(30,77,140,0.18)] active:scale-[0.99]"
      >
        <div>
          <p className="text-base font-extrabold leading-snug">Comparer les formes juridiques</p>
          <p className="mt-1 text-sm font-medium leading-6 text-white/90">
            SAS, SARL, EI, SCI… simulez et choisissez la forme adaptée à votre projet.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[hsl(var(--greffio-citron))]">
          Lancer le comparateur
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </MobileAnimatedSection>
  </MobilePageContainer>
);
