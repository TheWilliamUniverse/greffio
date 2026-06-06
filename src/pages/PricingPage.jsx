import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { NavbarDropdown } from '@/components/NavbarDropdown.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PRICING_DISCLAIMER, PRICING_FAQ, PRICING_PLANS } from '@/config/pricingPlans.js';

export const PricingPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <NavbarDropdown />

    <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase text-primary">Tarifs Greffio</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
        Des offres claires — prestation Greffio et frais légaux séparés
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
        Comparez ce que couvre Greffio avant de démarrer. Les frais de greffe, d’annonce légale ou d’organismes tiers sont indiqués avant validation.
      </p>
      <p className="mt-4 max-w-3xl rounded-md border border-primary/15 bg-secondary/40 p-4 text-sm leading-6 text-muted-foreground">
        {PRICING_DISCLAIMER}
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-md border p-6 text-left ${plan.highlight ? 'border-primary bg-secondary shadow-elevation-md' : 'border-border bg-white shadow-elevation-sm'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold">{plan.name}</p>
                <p className="text-xs font-semibold uppercase text-muted-foreground">{plan.subtitle}</p>
              </div>
              {plan.badge ? (
                <span className="rounded-full bg-[hsl(var(--greffio-citron))] px-2 py-1 text-xs font-bold text-[hsl(var(--greffio-blue-900))]">
                  {plan.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-3xl font-extrabold">
              {plan.price}
              {plan.youngPrice ? (
                <span className="mt-2 block text-sm font-semibold text-muted-foreground">
                  Jeune -26 ans : {plan.youngPrice} HT sur formalités éligibles
                </span>
              ) : null}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.text}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {plan.includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {plan.excludes?.length ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Non inclus : {plan.excludes.join(' · ')}
              </p>
            ) : null}
            <Button asChild className="mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
              <Link to={plan.ctaLink}>
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-md border border-border bg-white p-6 shadow-elevation-sm md:p-8">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-extrabold">FAQ tarifs</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="rounded-md border border-border bg-background p-4">
              <h3 className="font-bold">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/simulateur?type=statuts">Générer mes statuts</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="bg-white">
          <Link to="/contact">Parler à l&apos;équipe</Link>
        </Button>
      </div>
    </main>
  </div>
);

export default PricingPage;
