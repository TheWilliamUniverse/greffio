import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { YOUNG_ENTREPRENEUR_OFFER } from '@/config/pricingOffers.js';

export const YoungEntrepreneurOfferBanner = ({ compact = false }) => (
  <div className={`${compact ? 'rounded-md' : 'rounded-md border border-[hsl(var(--greffio-citron))]/40'} bg-gradient-to-r from-[hsl(var(--greffio-blue))] to-[hsl(var(--greffio-blue-dark))] text-white shadow-elevation-sm`}>
    <div className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'}`}>
      <div className="flex items-start gap-3">
        <Sparkles className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} mt-0.5 shrink-0 text-[hsl(var(--greffio-citron))]`} />
        <div>
          <p className={`${compact ? 'text-sm' : 'text-base'} font-extrabold`}>{YOUNG_ENTREPRENEUR_OFFER.headline}</p>
          <p className={`${compact ? 'text-xs' : 'text-sm'} mt-1 text-white/90`}>
            {YOUNG_ENTREPRENEUR_OFFER.subtitle}
            {' '}
            <span className="font-bold text-[hsl(var(--greffio-citron))]">
              {YOUNG_ENTREPRENEUR_OFFER.youngPriceLabel}
            </span>
            {' '}
            au lieu de
            {' '}
            <span className="line-through opacity-80">{YOUNG_ENTREPRENEUR_OFFER.standardPriceLabel}</span>.
          </p>
        </div>
      </div>
      {!compact ? (
        <Link
          to="/simulateur?offer=jeune-entrepreneur"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-[hsl(var(--greffio-citron))] px-4 py-2.5 text-sm font-extrabold text-[hsl(var(--greffio-blue-900))] transition hover:opacity-95"
        >
          Profiter de l&apos;offre
        </Link>
      ) : null}
    </div>
  </div>
);
