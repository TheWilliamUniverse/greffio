import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { isMobileBrowserViewport } from '@/utils/platform.js';
import { SeoHead, buildFaqJsonLd } from '@/components/seo/SeoHead.jsx';
import { runtimeConfig } from '@/config/runtime.js';
import { SEO_DISCLAIMER } from '@/config/seoContent.js';

const SeoPageFooter = () => (
  isMobileBrowserViewport()
    ? <MobileFooter />
    : <GreffioUltraFooter compact showIntro={false} />
);

const SeoBreadcrumb = ({ items }) => (
  <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
    <ol className="flex flex-wrap items-center gap-1">
      {items.map((item, index) => (
        <li key={item.to} className="inline-flex items-center gap-1">
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {index === items.length - 1 ? (
            <span className="font-semibold text-foreground">{item.label}</span>
          ) : (
            <Link to={item.to} className="hover:text-primary">{item.label}</Link>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export const SeoPillarPage = ({ page }) => {
  const pageUrl = `${runtimeConfig.appUrl}${page.path}`;
  const faqJsonLd = page.faq?.length ? buildFaqJsonLd(page.faq, pageUrl) : null;

  return (
    <>
      <SeoHead title={page.title} description={page.description} path={page.path} jsonLd={faqJsonLd} jsonLdId={`pillar-${page.path}`} />
      <main className="min-h-screen bg-background">
        <article className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <SeoBreadcrumb items={[{ to: '/', label: 'Accueil' }, { to: page.path, label: page.h1 }]} />
          <header className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Greffio · Ressources</p>
            <h1 className="mt-2 text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))] sm:text-4xl">{page.h1}</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{page.intro}</p>
          </header>

          {page.sections?.map((section) => (
            <section key={section.title} className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <h2 className="text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-muted-foreground">{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {section.bullets.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}

          {page.greffioBlock ? (
            <section className="rounded-md border border-primary/15 bg-[hsl(var(--greffio-citron))]/40 p-6">
              <h2 className="text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Ce que Greffio clarifie</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{page.greffioBlock}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="h-10"><Link to="/simulateur">Démarrer un dossier</Link></Button>
                <Button asChild variant="outline" className="h-10 bg-white"><Link to="/contact">Nous contacter</Link></Button>
              </div>
            </section>
          ) : null}

          {page.faq?.length ? (
            <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
              <h2 className="text-xl font-extrabold">FAQ</h2>
              <div className="mt-4 space-y-4">
                {page.faq.map((item) => (
                  <div key={item.question}>
                    <h3 className="text-sm font-bold text-foreground">{item.question}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {page.relatedLinks?.length ? (
            <section className="rounded-md border border-dashed border-border p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Aller plus loin</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {page.relatedLinks.map((link) => (
                  <li key={link.to}><Link to={link.to} className="text-sm font-semibold text-primary hover:underline">{link.label}</Link></li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-xs leading-6 text-muted-foreground">{SEO_DISCLAIMER}</p>
        </article>
        <SeoPageFooter />
      </main>
    </>
  );
};

export const SeoGuidePage = ({ page }) => (
  <SeoPillarPage page={{
    ...page,
    faq: page.faq,
    greffioBlock: page.greffioBlock || 'Greffio structure votre parcours avec un questionnaire guidé et un suivi centralisé.',
    relatedLinks: page.relatedLinks,
  }} />
);

export const SeoGlossaryPage = ({ page }) => (
  <>
    <SeoHead title={page.title} description={page.description} path={page.path} jsonLdId={`glossary-${page.path}`} />
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <SeoBreadcrumb items={[{ to: '/', label: 'Accueil' }, { to: '/glossaire', label: 'Glossaire' }, { to: page.path, label: page.term }]} />
        <header className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
          <p className="text-xs font-bold uppercase text-primary">Glossaire</p>
          <h1 className="mt-2 text-3xl font-extrabold">{page.term}</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{page.definition}</p>
          <p className="mt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Exemple : </span>{page.example}</p>
        </header>
        {page.related?.length ? (
          <section className="rounded-md border border-border bg-muted/30 p-5">
            <h2 className="text-sm font-bold">Voir aussi</h2>
            <ul className="mt-2 flex flex-wrap gap-3">
              {page.related.map((link) => (
                <li key={link.to}><Link to={link.to} className="text-sm font-semibold text-primary hover:underline">{link.label}</Link></li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="text-xs text-muted-foreground">{SEO_DISCLAIMER}</p>
      </article>
      <SeoPageFooter />
    </main>
  </>
);

export const SeoHubPage = ({ hub }) => (
  <>
    <SeoHead title={hub.title} description={hub.description} path={hub.path} jsonLdId={`hub-${hub.path}`} />
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <SeoBreadcrumb items={[{ to: '/', label: 'Accueil' }, { to: hub.path, label: hub.h1 }]} />
        <header>
          <h1 className="text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{hub.h1}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{hub.intro}</p>
        </header>
        {hub.cards ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {hub.cards.map((card) => (
              <Link key={card.to} to={card.to} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm transition hover:border-primary/30 hover:shadow-elevation-md">
                <h2 className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">{card.label}</h2>
                <p className="mt-2 text-sm text-primary">Lire →</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
      <SeoPageFooter />
    </main>
  </>
);

export const SeoFaqPage = ({ hub, items }) => {
  const pageUrl = `${runtimeConfig.appUrl}${hub.path}`;
  return (
    <>
      <SeoHead title={hub.title} description={hub.description} path={hub.path} jsonLd={buildFaqJsonLd(items, pageUrl)} jsonLdId="faq-page" />
      <main className="min-h-screen bg-background">
        <article className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
          <SeoBreadcrumb items={[{ to: '/', label: 'Accueil' }, { to: hub.path, label: 'FAQ' }]} />
          <h1 className="text-3xl font-extrabold">{hub.h1}</h1>
          <p className="text-sm leading-7 text-muted-foreground">{hub.intro}</p>
          <div className="space-y-4">
            {items.map((item) => (
              <section key={item.question} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <h2 className="text-base font-bold">{item.question}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </section>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{SEO_DISCLAIMER}</p>
        </article>
        <SeoPageFooter />
      </main>
    </>
  );
};
