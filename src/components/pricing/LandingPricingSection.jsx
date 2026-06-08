import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { LANDING_PRICING_PLANS, YOUNG_ENTREPRENEUR_LANDING_FOOTER } from '@/config/landingPricingPlans.js';

export const LandingPricingSection = ({ showHeader = true, className = '' }) => (
  <div className={className}>
    {showHeader ? (
      <div className="text-center">
        <p className="text-sm font-bold uppercase text-primary">Tarifs</p>
        <h2 className="mt-2 text-4xl font-extrabold">
          Des offres claires pour démarrer, déléguer ou industrialiser.
        </h2>
      </div>
    ) : null}

    <div className={`grid gap-4 md:grid-cols-3 ${showHeader ? 'mt-10' : 'mt-0'}`}>
      {LANDING_PRICING_PLANS.map((plan) => (
        <div
          key={plan.name}
          className={`landing-pricing-card rounded-md border p-6 text-left ${
            plan.highlight
              ? 'border-primary bg-secondary shadow-elevation-md'
              : 'border-border bg-background'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-extrabold">{plan.name}</p>
            {plan.badge ? (
              <span className="rounded-full bg-[hsl(var(--greffio-citron))] px-2 py-1 text-xs font-bold text-[hsl(var(--greffio-blue-900))]">
                {plan.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-3xl font-extrabold">
            {plan.price}
            {plan.compareAt ? (
              <span className="ml-2 text-lg font-semibold text-muted-foreground line-through">
                {plan.compareAt}
              </span>
            ) : null}
          </p>
          <p className="mt-3 min-h-[52px] text-sm leading-6 text-muted-foreground">{plan.text}</p>
          <Button asChild className="mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
            <Link to={plan.ctaLink || '/simulateur'}>{plan.cta}</Link>
          </Button>
        </div>
      ))}
    </div>

    <div className="mx-auto mt-8 max-w-3xl text-center">
      <p className="text-sm leading-6 text-muted-foreground">{YOUNG_ENTREPRENEUR_LANDING_FOOTER}</p>
      <Button asChild variant="link" className="mt-3 h-auto p-0 text-base font-extrabold">
        <Link to="/tarifs" className="group inline-flex items-center gap-2">
          Voir tous les tarifs et la FAQ
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  </div>
);
