import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PRICING_DISCLAIMER } from '@/config/pricingPlans.js';
import { PRICING_EASE, usePricingMotion } from '@/components/pricing/usePricingMotion.js';

const clarityItems = [
  {
    icon: FileCheck2,
    title: 'Prestation Greffio',
    text: 'Questionnaire, préparation documentaire, contrôles de cohérence, suivi dossier et échanges avec l’équipe.',
    accent: 'bg-secondary text-primary',
  },
  {
    icon: Building2,
    title: 'Frais légaux (hors Greffio)',
    text: 'Greffe, annonce légale, RCS et autres organismes tiers : montants affichés avant validation, selon la formalité.',
    accent: 'bg-[hsl(var(--greffio-blue))]/10 text-[hsl(var(--greffio-blue-900))]',
  },
];

export const PricingClarityBlock = ({ showCta = true, className = '' }) => {
  const { reduceMotion, reveal, hoverLift } = usePricingMotion();

  return (
    <section id="en-clair" className={`px-4 py-16 sm:px-6 lg:px-8 ${className}`}>
      <motion.div
        {...reveal()}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-md border border-primary/15 bg-white p-6 shadow-elevation-md md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 surface-grid opacity-40" />
        <div className="relative">
          <motion.div
            {...reveal(0.05)}
            className="we-hero-eyebrow mb-5 inline-flex items-center gap-2 shadow-elevation-sm"
          >
            <Sparkles className="h-4 w-4" />
            En clair
          </motion.div>
          <motion.h2
            {...reveal(0.1)}
            className="max-w-3xl text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))] sm:text-4xl"
          >
            Ce que Greffio facture – et ce qu’il ne facture pas
          </motion.h2>

          <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
            {clarityItems.map((item, index) => (
              <motion.div
                key={item.title}
                {...reveal(0.14 + index * 0.08)}
                whileHover={hoverLift}
                className="rounded-md border border-border bg-background/90 p-3 backdrop-blur-sm sm:p-5"
              >
                <motion.div
                  animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md sm:mb-4 sm:h-11 sm:w-11 ${item.accent}`}
                >
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.div>
                <h3 className="text-sm font-extrabold leading-snug sm:text-lg">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">{item.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...reveal(0.28)}
            className="mt-6 rounded-md border border-primary/10 bg-secondary/35 p-4"
          >
            <p className="text-sm leading-6 text-muted-foreground">{PRICING_DISCLAIMER}</p>
          </motion.div>

          <motion.div
            {...reveal(0.34)}
            className="mt-4 flex items-start gap-3 text-sm leading-6 text-muted-foreground"
          >
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Greffio est un service privé d’assistance administrative. Ce n’est pas un service officiel de l’État, des greffes ou d’Infogreffe.
            </p>
          </motion.div>

          {showCta ? (
            <motion.div {...reveal(0.4)} className="mt-6">
              <Button asChild variant="outline" className="group bg-white">
                <Link to="/tarifs">
                  Voir le détail des tarifs
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
};
