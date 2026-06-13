import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { SERVICE_LANDING_PAGES, SERVICE_LANDING_ROUTES } from '@/config/serviceLandingPages.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_SERVICE_META } from '@/config/seoContent.js';

export const ServiceLandingPage = () => {
  const location = useLocation();
  const normalizedPath = location.pathname.endsWith('/') && location.pathname !== '/'
    ? location.pathname.slice(0, -1)
    : location.pathname;
  const slug = SERVICE_LANDING_ROUTES[normalizedPath];
  const page = slug ? SERVICE_LANDING_PAGES[slug] : null;
  const seoMeta = slug ? SEO_SERVICE_META[slug] : null;

  if (!page) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-extrabold">Service indisponible</h1>
        <p className="mt-3 text-sm text-muted-foreground">Cette page n'existe pas ou n'est pas encore publiée.</p>
      </main>
    );
  }

  return (
    <>
      {seoMeta ? (
        <SeoHead
          title={seoMeta.title}
          description={seoMeta.description}
          path={normalizedPath}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: page.title,
            description: seoMeta.description,
            provider: { '@type': 'Organization', name: 'Greffio' },
            areaServed: { '@type': 'Country', name: 'France' },
          }}
          jsonLdId={`service-${slug}`}
        />
      ) : null}
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-md bg-[hsl(var(--greffio-citron))] p-6">
          <p className="text-sm font-bold uppercase text-primary">Formalité</p>
          <h1 className="mt-2 text-4xl font-extrabold">{page.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dossier guidé, documents structurés, suivi administratif et accompagnement humain.
          </p>
          {page.contextNote ? (
            <p className="mt-4 rounded-md border border-primary/15 bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-foreground/80">
              <span className="font-bold text-primary">À retenir · </span>
              {page.contextNote}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Prix</p>
            <p className="mt-2 text-lg font-extrabold">{page.price}</p>
          </article>
          <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Délai indicatif</p>
            <p className="mt-2 text-sm font-semibold">{page.delay}</p>
          </article>
          <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Frais légaux</p>
            <p className="mt-2 text-sm font-semibold">{page.legalFees}</p>
          </article>
        </div>

        <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <h2 className="text-xl font-extrabold">Documents généralement demandés</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>- Pièce d'identité du déclarant</li>
            <li>- Justificatif de domiciliation / siège</li>
            <li>- Informations dirigeant et associés</li>
            <li>- Éléments complémentaires selon la formalité</li>
          </ul>
        </article>

        <article className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
          <h2 className="text-xl font-extrabold">Comparatif rapide</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seul: risque d'oubli documentaire et de retours administratifs. Avec Greffio: parcours guidé,
            vérification de complétude et suivi centralisé.
          </p>
        </article>

        <article className="rounded-md border border-border bg-muted p-5 text-sm text-muted-foreground">
          <p className="font-bold text-foreground">Service privé indépendant</p>
          <p className="mt-2">
            Greffio n'est pas un service officiel de l'État, des greffes ou d'Infogreffe. Greffio accompagne
            administrativement la préparation, le dépôt, le suivi et la régularisation des formalités.
          </p>
        </article>

        <div className="flex gap-3">
          <Button asChild>
            <Link to={QUESTIONNAIRE_NEW_PATH}>Créer mon dossier</Link>
          </Button>
          <Button asChild variant="outline" className="bg-white">
            <Link to="/contact">Parler à l'équipe</Link>
          </Button>
        </div>
      </section>
    </main>
    </>
  );
};
