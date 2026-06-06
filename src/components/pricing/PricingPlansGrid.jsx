import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PRICING_DISCLAIMER, PRICING_PLANS } from '@/config/pricingPlans.js';
import { YOUNG_ENTREPRENEUR_LANDING_FOOTER } from '@/config/pricingOffers.js';
import { PRICING_EASE, usePricingMotion } from '@/components/pricing/usePricingMotion.js';

const planIcons = {
  starter: Sparkles,
  formalite: BadgeCheck,
  cabinet: Users,
};

export const PricingPlansGrid = ({
  showHeader = true,
  showFooter = true,
  compact = false,
  footerMode = 'faq',
}) => {
  const { reduceMotion, reveal, hoverLift } = usePricingMotion();

  return (
    <div className={compact ? '' : 'mt-4'}>
      {showHeader ? (
        <motion.div {...reveal()} className="text-center">
          <p className="text-sm font-bold uppercase text-primary">Tarifs</p>
          <h2 className="mt-2 text-4xl font-extrabold">
            Des offres claires pour démarrer, déléguer ou industrialiser.
          </h2>
        </motion.div>
      ) : null}

      <div className={`grid gap-4 md:grid-cols-3 ${showHeader ? 'mt-10' : 'mt-0'}`}>
        {PRICING_PLANS.map((plan, index) => {
          const PlanIcon = planIcons[plan.id] || Sparkles;
          return (
            <motion.div
              key={plan.id}
              {...reveal(0.06 + index * 0.08)}
              whileHover={hoverLift}
              className={`group relative overflow-hidden rounded-md border p-6 text-left transition-shadow ${
                plan.highlight
                  ? 'border-primary bg-secondary shadow-elevation-md'
                  : 'border-border bg-white shadow-elevation-sm hover:shadow-elevation-md'
              }`}
            >
              {plan.highlight && !reduceMotion ? (
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[hsl(var(--greffio-citron))]/25 blur-2xl"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : null}

              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                    plan.highlight ? 'bg-[hsl(var(--greffio-blue))] text-white' : 'bg-secondary text-primary'
                  }`}
                  >
                    <PlanIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold">{plan.name}</p>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{plan.subtitle}</p>
                  </div>
                </div>
                {plan.badge ? (
                  <span className="rounded-full bg-[hsl(var(--greffio-citron))] px-2 py-1 text-xs font-bold text-[hsl(var(--greffio-blue-900))]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <p className="relative mt-5 text-3xl font-extrabold">
                {plan.id === 'formalite' && compact && plan.youngPrice ? (
                  <>
                    {plan.youngPrice}
                    <span className="ml-2 text-xl font-semibold text-muted-foreground line-through">{plan.price}</span>
                  </>
                ) : (
                  plan.price
                )}
                {plan.youngPrice && !(compact && plan.id === 'formalite') ? (
                  <span className="mt-2 block text-sm font-semibold text-muted-foreground">
                    Jeune -26 ans : {plan.youngPrice} HT
                  </span>
                ) : null}
              </p>
              <p className="relative mt-3 min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.text}</p>

              {!compact && plan.includes?.length ? (
                <ul className="relative mt-4 space-y-2 text-sm">
                  {plan.includes.slice(0, 4).map((item, itemIndex) => (
                    <motion.li
                      key={item}
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + itemIndex * 0.05, ease: PRICING_EASE }}
                      className="flex items-start gap-2"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : null}

              <Button asChild className="relative mt-6 w-full" variant={plan.highlight ? 'default' : 'outline'}>
                <Link to={plan.ctaLink}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          );
        })}
      </div>

      {showFooter ? (
        <motion.div
          {...reveal(0.22)}
          className="mx-auto mt-8 max-w-3xl text-center"
        >
          {footerMode === 'landing' ? (
            <>
              <p className="text-sm leading-6 text-muted-foreground">{YOUNG_ENTREPRENEUR_LANDING_FOOTER}</p>
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-base font-extrabold">
                <Link to="/tarifs" className="group inline-flex items-center gap-2">
                  Voir tous les tarifs et la FAQ
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-muted-foreground">{PRICING_DISCLAIMER}</p>
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className="mx-auto mt-5 max-w-md rounded-md border border-primary/20 bg-secondary/30 p-4 shadow-elevation-sm"
              >
                <div className="flex items-center justify-center gap-2 text-primary">
                  <HelpCircle className="h-5 w-5" />
                  <span className="text-sm font-bold">Besoin de précisions ?</span>
                </div>
                <Button asChild variant="link" className="mt-1 h-auto p-0 text-base font-extrabold">
                  <Link to="/tarifs#faq-tarifs" className="group inline-flex items-center gap-2">
                    FAQ tarifs complète
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      ) : null}
    </div>
  );
};
