import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  FileCheck2,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';
import { Button } from '@/components/ui/button.jsx';
import { LegalFormComparatorPromoCard } from '@/components/comparator/LegalFormComparatorPromoCard.jsx';
import { LEGAL_SERVICES } from '@/config/businessCatalog.js';
import { SERVICE_LANDING_PAGES, getServiceRoute } from '@/config/serviceLandingPages.js';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

const pillars = [
  {
    icon: FileCheck2,
    title: 'Dossier guidé',
    text: 'Questionnaire intelligent, pièces listées et contrôles automatiques avant dépôt.',
  },
  {
    icon: BadgeCheck,
    title: 'Équipe Greffio',
    text: 'Relances, validations et échanges centralisés dans votre espace client.',
  },
  {
    icon: Clock3,
    title: 'Suivi opérationnel',
    text: 'Statuts lisibles, échéances et retours administratifs suivis jusqu’au Kbis.',
  },
];

const categories = [...new Set(LEGAL_SERVICES.map((service) => service.category))];

export const ServicesPage = () => {
  const meta = SEO_PAGE_META.services;

  return (
  <>
    <SeoHead title={meta.title} description={meta.description} path={meta.path} jsonLdId="services" />
  <PublicPageLayout footer="minimal">
  <div className="min-h-screen bg-background text-foreground">
    <NavbarDropdown />

    <section className="surface-grid overflow-hidden px-4 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl pb-16 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-3xl"
        >
          <div className="we-hero-eyebrow mb-6 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Catalogue Greffio
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-[hsl(var(--greffio-blue-900))] sm:text-5xl lg:text-6xl">
            Toutes vos formalités, présentées clairement.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[hsl(var(--greffio-blue-900))]">
            Création, modification, fermeture et outils de cadrage : chaque service est relié au simulateur,
            au dashboard et à l’équipe Greffio pour un parcours opérationnel de bout en bout.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base">
              <Link to="/simulateur?type=statuts">
                Démarrer une formalité
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-white px-7 text-base">
              <Link to="/contact">Parler à l’équipe</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>

    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {pillars.map((pillar, index) => (
          <motion.article
            key={pillar.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            className="we-card rounded-[22px] p-6"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
              <pillar.icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-extrabold">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.text}</p>
          </motion.article>
        ))}
      </div>
    </section>

    {categories.map((category) => {
      const items = LEGAL_SERVICES.filter((service) => service.category === category);
      return (
        <section key={category} className="px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-primary">{category}</p>
                <h2 className="mt-2 text-3xl font-extrabold">Services {category.toLowerCase()}</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Prix indicatifs hors frais légaux. Le simulateur affiche le périmètre exact selon votre forme.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((service, index) => {
                const landing = SERVICE_LANDING_PAGES[service.id];
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.32, delay: index * 0.05 }}
                  >
                    <Link
                      to={getServiceRoute(service.id)}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-elevation-sm transition duration-200 hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-elevation-md"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${service.accent}`}>
                          <Building2 className="h-6 w-6 text-[hsl(var(--greffio-blue-900))]" />
                        </div>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase text-primary">
                          {service.badge}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold">{service.title}</h3>
                      <p className="mt-3 min-h-[72px] flex-1 text-sm leading-6 text-muted-foreground">
                        {service.description}
                      </p>
                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                        <div className="flex items-center gap-2 font-bold">
                          <Wallet className="h-4 w-4 text-primary" />
                          Dès {service.price}
                        </div>
                        <div className="flex items-center gap-2 font-bold text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          {service.time}
                        </div>
                      </div>
                      {landing ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Délai indicatif : {landing.delay}
                        </p>
                      ) : null}
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                        Voir le service
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      );
    })}

    <LegalFormComparatorPromoCard variant="section" />
  </div>
  </PublicPageLayout>
  </>
  );
};
