import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LANDING_PRICING_PLANS, YOUNG_ENTREPRENEUR_LANDING_FOOTER } from '@/config/landingPricingPlans.js';
import { PRICING_FAQ } from '@/config/pricingPlans.js';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

export const MobilePricingPage = () => {
  const [openFaq, setOpenFaq] = useState(0);
  const meta = SEO_PAGE_META.tarifs;

  return (
    <>
      <SeoHead title={meta.title} description={meta.description} path={meta.path} jsonLdId="tarifs-mobile" />
    <MobilePageContainer className="pb-8">
      <MobileAnimatedSection delay={0}>
        <div className="rounded-2xl bg-[hsl(var(--greffio-blue))] px-5 py-6 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            Tarifs transparents
          </p>
          <h1 className="mt-4 text-2xl font-extrabold leading-tight">
            Payez au bon moment, sans surprise.
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/85">
            Frais Greffio, greffe et annonces légales affichés avant validation – sans surprise.
          </p>
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.04} className="mt-5 space-y-3">
        {LANDING_PRICING_PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-2xl border p-5 shadow-elevation-sm ${
              plan.highlight
                ? 'border-primary bg-white ring-2 ring-primary/15'
                : 'border-border bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold text-foreground">{plan.name}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
                  {plan.price}
                  {plan.compareAt ? (
                    <span className="ml-2 text-base font-semibold text-muted-foreground line-through">
                      {plan.compareAt}
                    </span>
                  ) : null}
                </p>
              </div>
              {plan.badge ? (
                <span className="shrink-0 rounded-full bg-[hsl(var(--greffio-citron))] px-2.5 py-1 text-[10px] font-bold uppercase text-[hsl(var(--greffio-blue-900))]">
                  {plan.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.text}</p>
            <ul className="mt-4 space-y-2">
              {(plan.highlight
                ? ['Dossier guidé + relecture', 'Dépôt au greffe', 'Suivi Kbis']
                : ['Questionnaire + checklist', 'Espace documentaire', 'Équipe Greffio']
              ).map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className={`mt-5 h-12 w-full rounded-2xl text-base font-bold ${plan.highlight ? '' : 'bg-white'}`}
              variant={plan.highlight ? 'default' : 'outline'}
            >
              <Link to={plan.ctaLink || '/simulateur'}>
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>
        ))}
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.08} className="mt-6 rounded-2xl border border-border bg-[#f6f8fc] p-4">
        <p className="text-xs leading-6 text-muted-foreground">{YOUNG_ENTREPRENEUR_LANDING_FOOTER}</p>
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.1} className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Questions fréquentes</h2>
        </div>
        <div className="space-y-2">
          {PRICING_FAQ.slice(0, 5).map((item, index) => {
            const open = openFaq === index;
            return (
              <div key={item.q} className="overflow-hidden rounded-2xl border border-border bg-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-bold"
                  onClick={() => setOpenFaq(open ? -1 : index)}
                >
                  {item.q}
                  <ArrowRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>
                {open ? (
                  <p className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </MobileAnimatedSection>

      <MobileAnimatedSection delay={0.12} className="mt-8 space-y-3">
        <Button asChild className="h-12 w-full rounded-2xl text-base font-bold">
          <Link to="/simulateur?type=statuts">Simuler ma formalité</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-2xl bg-white text-base font-bold">
          <Link to="/contact">Parler à l&apos;équipe</Link>
        </Button>
      </MobileAnimatedSection>
    </MobilePageContainer>
    <MobileFooter />
    </>
  );
};
