import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { PRICING_FAQ } from '@/config/pricingPlans.js';
import { PRICING_EASE, usePricingMotion } from '@/components/pricing/usePricingMotion.js';

export const PricingFaqSection = ({ id = 'faq-tarifs' }) => {
  const { reduceMotion, reveal } = usePricingMotion();
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id={id} className="mt-16">
      <motion.div
        {...reveal()}
        className="overflow-hidden rounded-md border border-border bg-white p-6 shadow-elevation-sm md:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-primary">FAQ</p>
            <h2 className="text-2xl font-extrabold">Questions tarifs et formalités</h2>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {PRICING_FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={item.q}
                {...reveal(index * 0.05)}
                className={`rounded-md border transition-colors ${
                  isOpen ? 'border-primary/30 bg-secondary/25 shadow-elevation-sm' : 'border-border bg-background'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-[hsl(var(--greffio-blue-900))]">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25, ease: PRICING_EASE }}
                    className="shrink-0 text-primary"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: PRICING_EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm leading-6 text-muted-foreground">{item.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};
