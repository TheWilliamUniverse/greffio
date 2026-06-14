import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Clock3, FileCheck2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { getServiceRoute } from '@/config/serviceLandingPages.js';
import { getServiceCatalogIcon } from '@/config/demarcheVisuals.js';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

const pillars = [
  { icon: FileCheck2, title: 'Parcours guidé', text: 'Questionnaire, pièces et contrôles avant dépôt.' },
  { icon: BadgeCheck, title: 'Équipe Greffio', text: 'Relances et validations dans votre espace.' },
  { icon: Clock3, title: 'Suivi Kbis', text: 'Statuts lisibles jusqu\'au retour administratif.' },
];

const GROUP_LABELS = {
  Création: 'Créer mon entreprise',
  Modification: 'Modifier mon entreprise',
  Patrimoine: 'Patrimoine & documents',
  'Vie sociale': 'Vie sociale & gouvernance',
};

export const MobileServicesPage = () => {
  const categories = [...new Set(LEGAL_SERVICES.map((s) => s.category))];
  const meta = SEO_PAGE_META.services;

  return (
    <>
      <SeoHead title={meta.title} description={meta.description} path={meta.path} jsonLdId="services-mobile" />
    <MobilePageContainer className="pb-8">
      <MobileAnimatedSection delay={0}>
        <div className="rounded-2xl bg-[hsl(var(--greffio-blue))] px-5 py-6 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Catalogue Greffio
          </p>
          <h1 className="mt-4 text-2xl font-extrabold leading-tight">
            Toutes vos formalités, au même endroit.
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/85">
            Création, modification, fermeture – chaque service mène au simulateur puis à votre dossier.
          </p>
          <Button asChild className="mt-5 h-11 w-full rounded-2xl bg-white font-bold text-[hsl(var(--greffio-blue-900))] hover:bg-white/95">
            <Link to="/simulateur?type=statuts">
              Démarrer une formalité
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.04} className="mt-5 grid gap-2">
        {pillars.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-border bg-white p-4 shadow-elevation-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </MobileAnimatedSection>

      {categories.map((category, catIndex) => {
        const services = LEGAL_SERVICES.filter((s) => s.category === category);
        return (
          <MobileAnimatedSection key={category} delay={0.06 + catIndex * 0.02} className="mt-8">
            <h2 className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">
              {GROUP_LABELS[category] || category}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{services.length} formalité{services.length > 1 ? 's' : ''}</p>
            <div className="mt-3 space-y-2">
              {services.map((service) => (
                <Link
                  key={service.id}
                  to={getServiceRoute(service.id)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-elevation-sm transition-colors active:bg-secondary/30"
                >
                  <img
                    src={getServiceCatalogIcon(service.id)}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold">{service.title}</p>
                      {service.badge ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {service.badge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{service.description}</p>
                    <p className="mt-1 text-xs font-bold text-primary">
                      {service.price}
                      {service.time ? ` · ${service.time}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </MobileAnimatedSection>
        );
      })}

      <MobileAnimatedSection delay={0.14} className="mt-8">
        <Button asChild variant="outline" className="h-12 w-full rounded-2xl bg-white text-base font-bold">
          <Link to="/tarifs">Voir les tarifs</Link>
        </Button>
      </MobileAnimatedSection>
    </MobilePageContainer>
    <MobileFooter />
    </>
  );
};
