import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileCheck2, ShieldCheck, Users } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';
import { PublisherLegalBlock } from '@/components/legal/PublisherLegalBlock.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PUBLISHER_BRAND, PUBLISHER_LEGAL_NAME } from '@/config/publisher.js';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

const Section = ({ title, children }) => (
  <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
    <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
  </section>
);

export const AboutPage = () => {
  const meta = SEO_PAGE_META['a-propos'];

  return (
  <>
    <SeoHead title={meta.title} description={meta.description} path={meta.path} jsonLdId="a-propos" />
  <PublicPageLayout footer="minimal">
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/contact">Contact</Link>
          </Button>
        </div>

        <section className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
          <p className="text-sm font-bold uppercase text-white/70">À propos</p>
          <h1 className="mt-2 text-3xl font-extrabold">À propos de {PUBLISHER_BRAND}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
            {PUBLISHER_BRAND} est une application SaaS éditée par {PUBLISHER_LEGAL_NAME} pour organiser
            les formalités administratives, la génération documentaire et le suivi des dossiers d&apos;entreprise.
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { icon: Building2, title: 'Éditeur', text: `${PUBLISHER_LEGAL_NAME} édite la marque ${PUBLISHER_BRAND}.` },
            { icon: FileCheck2, title: 'Mission', text: 'Structurer créations, modifications et documents greffe avec traçabilité client-équipe.' },
            { icon: Users, title: 'Public', text: 'Entrepreneurs, dirigeants, cabinets et équipes ops formalités.' },
          ].map((item) => (
            <div key={item.title} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
              <item.icon className="mb-4 h-6 w-6 text-primary" />
              <h2 className="font-extrabold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        <Section title="Qui sommes-nous ?">
          <p>
            <strong className="text-foreground">{PUBLISHER_LEGAL_NAME}</strong> développe et exploite{' '}
            <strong className="text-foreground">{PUBLISHER_BRAND}</strong>, une plateforme privée d&apos;assistance
            aux démarches administratives des entreprises : questionnaires, statuts, coffre documentaire,
            signatures, paiements et suivi opérationnel.
          </p>
          <p>
            {PUBLISHER_BRAND} n&apos;est pas un service officiel de l&apos;État, des greffes des tribunaux de commerce
            ou d&apos;Infogreffe. Les documents générés constituent une aide à la préparation et doivent être relus
            avant signature ou dépôt.
          </p>
        </Section>

        <Section title="Informations légales de l&apos;éditeur">
          <PublisherLegalBlock showDisclaimer={false} showLinks />
        </Section>

        <section className="rounded-md border border-emerald-200 bg-emerald-50/80 p-5 shadow-elevation-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="font-extrabold text-foreground">Conformité et transparence</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Les informations ci-dessus identifient l&apos;entité légale propriétaire du site{' '}
                {PUBLISHER_BRAND}. Pour toute question commerciale, contractuelle ou relative aux données
                personnelles, utilisez la page contact ou les coordonnées indiquées.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" asChild className="bg-white">
                  <Link to="/contact">Nous contacter</Link>
                </Button>
                <Button variant="outline" asChild className="bg-white">
                  <Link to="/mentions-legales">Mentions légales &amp; CGV</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </PublicPageLayout>
  </>
  );
};
