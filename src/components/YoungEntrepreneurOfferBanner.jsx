import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { YOUNG_ENTREPRENEUR_OFFER } from '@/config/pricingOffers.js';

const APPEAR_DELAY_MS = 2800;

export const YoungEntrepreneurOfferBanner = ({
  compact = false,
  variant = 'inline',
}) => {
  const isHeroOverlay = variant === 'hero-overlay';
  const [visible, setVisible] = useState(!isHeroOverlay);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isHeroOverlay || dismissed) return undefined;
    const timer = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dismissed, isHeroOverlay]);

  if (dismissed) return null;

  const card = (
    <div
      className={[
        'relative overflow-hidden rounded-xl border border-[#3d5f8f]/50',
        'bg-[#0a1220] text-white shadow-[0_16px_48px_rgba(10,18,32,0.28)]',
        compact ? 'rounded-md' : '',
      ].filter(Boolean).join(' ')}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1e4d8c]/35 via-transparent to-[#1e4d8c]/20"
        aria-hidden="true"
      />
      <div className={`relative flex flex-col gap-3 ${compact ? 'p-4' : 'p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'}`}>
        <div className="flex items-start gap-3 pr-8 sm:pr-0">
          <Sparkles className={`${compact ? 'h-5 w-5' : 'h-5 w-5'} mt-0.5 shrink-0 text-[#f5e676]`} aria-hidden="true" />
          <div>
            <p className={`${compact ? 'text-sm' : 'text-sm sm:text-base'} font-extrabold leading-snug text-white`}>
              {YOUNG_ENTREPRENEUR_OFFER.headline}
            </p>
            <p className={`${compact ? 'text-xs' : 'text-xs sm:text-sm'} mt-1 leading-6 text-white/88`}>
              {YOUNG_ENTREPRENEUR_OFFER.subtitle}
              {' '}
              <span className="font-bold text-[#f5e676]">
                {YOUNG_ENTREPRENEUR_OFFER.youngPriceLabel}
              </span>
              {' '}
              au lieu de
              {' '}
              <span className="text-white/55 line-through">{YOUNG_ENTREPRENEUR_OFFER.standardPriceLabel}</span>.
            </p>
          </div>
        </div>
        {!compact ? (
          <Link
            to="/simulateur?offer=jeune-entrepreneur"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-[#f5e676] px-4 py-2.5 text-sm font-extrabold text-[#0a1220] transition hover:bg-[#ffe98a]"
          >
            Profiter de l&apos;offre
          </Link>
        ) : null}
        {isHeroOverlay ? (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-3 rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer le bandeau promotionnel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );

  if (isHeroOverlay) {
    return (
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="young-offer-hero-banner"
            className="pointer-events-none absolute inset-x-4 top-2 z-30 mx-auto max-w-7xl sm:inset-x-6 lg:inset-x-8"
            initial={{ opacity: 0, y: -28 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-auto">
              {card}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }

  return card;
};
