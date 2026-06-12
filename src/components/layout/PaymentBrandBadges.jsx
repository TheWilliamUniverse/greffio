import React from 'react';
import { cn } from '@/lib/utils.js';

const BRANDS = [
  {
    id: 'visa',
    label: 'Visa',
    className: 'bg-[#1a1f71] text-white',
    mark: 'VISA',
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    className: 'bg-[#252525] text-white',
    mark: 'MC',
  },
  {
    id: 'cb',
    label: 'Carte bancaire',
    className: 'bg-[#0b3d91] text-white',
    mark: 'CB',
  },
  {
    id: 'apple',
    label: 'Apple Pay',
    className: 'border border-white/20 bg-white/10 text-white',
    mark: '',
  },
  {
    id: 'google',
    label: 'Google Pay',
    className: 'border border-white/20 bg-white/10 text-white',
    mark: 'G Pay',
  },
  {
    id: 'sepa',
    label: 'Prélèvement SEPA',
    className: 'border border-white/20 bg-white/10 text-white',
    mark: 'SEPA',
  },
];

export const PaymentBrandBadges = ({ compact = false, className }) => (
  <div className={cn('flex flex-wrap items-center gap-2', className)}>
    {BRANDS.map((brand) => (
      <span
        key={brand.id}
        title={brand.label}
        aria-label={brand.label}
        className={cn(
          'inline-flex min-h-[28px] items-center justify-center rounded-md px-2.5 text-[10px] font-extrabold uppercase tracking-wide',
          compact ? 'min-w-[44px]' : 'min-w-[52px]',
          brand.className,
        )}
      >
        {brand.id === 'mastercard' ? (
          <span className="flex items-center gap-0.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#eb001b]" />
            <span className="-ml-1.5 h-3 w-3 rounded-full bg-[#f79e1b]" />
          </span>
        ) : brand.mark ? (
          brand.mark
        ) : (
          <span className="text-[9px] font-bold"> Pay</span>
        )}
      </span>
    ))}
  </div>
);
