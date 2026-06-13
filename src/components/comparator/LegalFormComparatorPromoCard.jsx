import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

export const COMPARATOR_PAGE_PATH = '/ressources/comparateur-forme-juridique';

const EASE_OUT = [0.22, 1, 0.36, 1];

export const LegalFormComparatorPromoCard = ({
  className,
  variant = 'embedded',
  layout = 'responsive',
  revealDelay = 0,
  inView = true,
}) => {
  const reduceMotion = useReducedMotion();
  const isGridTile = variant === 'gridTile';

  const motionProps = reduceMotion || isGridTile
    ? {}
    : inView
      ? {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.35 },
        transition: { duration: 0.55, delay: revealDelay, ease: EASE_OUT },
      }
      : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: revealDelay, ease: EASE_OUT },
      };

  const card = isGridTile ? (
    <Link
      to={COMPARATOR_PAGE_PATH}
      className={cn(
        'group flex h-full min-h-[88px] flex-col justify-between rounded-2xl bg-[hsl(var(--greffio-blue))] p-4 text-left text-white shadow-[0_12px_32px_rgba(30,77,140,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(30,77,140,0.24)]',
        className,
      )}
    >
      <div>
        <p className="text-sm font-extrabold leading-snug">Comparer les formes juridiques</p>
        <p className="mt-1 text-xs font-medium leading-5 text-white/90">
          SAS, SARL, EI, SCI… guide pas à pas.
        </p>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--greffio-citron))]">
        Lancer le comparateur
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  ) : (
    <motion.div
      {...motionProps}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'flex w-full min-w-0 flex-col gap-6 rounded-2xl bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-[0_18px_48px_rgba(30,77,140,0.22)] sm:p-8',
        layout === 'responsive' && 'md:flex-row md:items-center md:justify-between',
        layout === 'stacked' && 'items-start',
        className,
      )}
    >
      <div className="min-w-0">
        <GreffioLogo variant="full" className="brightness-0 invert" to="/" />
        <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-white/92">
          Vous hésitez entre plusieurs formes ? Le comparateur vous guide étape par étape, sans afficher
          plusieurs écrans en même temps.
        </p>
      </div>
      <motion.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
        <Button asChild size="lg" variant="secondary" className="h-12 shrink-0 rounded-full px-7 font-extrabold">
          <Link to={COMPARATOR_PAGE_PATH}>
            Lancer le comparateur
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );

  if (variant === 'section') {
    return (
      <section className="border-t border-border bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{card}</div>
      </section>
    );
  }

  return card;
};
