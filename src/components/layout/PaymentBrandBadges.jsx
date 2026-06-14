import React from 'react';
import { cn } from '@/lib/utils.js';

const BRANDS = [
  { id: 'visa', label: 'Visa', src: '/images/payments/visa.svg' },
  { id: 'mastercard', label: 'Mastercard', src: '/images/payments/mastercard.svg' },
  { id: 'cb', label: 'Cartes Bancaires', src: '/images/payments/cb.svg' },
  { id: 'amex', label: 'American Express', src: '/images/payments/amex.svg' },
  { id: 'apple-pay', label: 'Apple Pay', src: '/images/payments/apple-pay.svg' },
  { id: 'google-pay', label: 'Google Pay', src: '/images/payments/google-pay.svg' },
  { id: 'sepa', label: 'SEPA', src: '/images/payments/sepa.svg' },
  { id: 'mollie', label: 'Mollie', src: '/images/payments/mollie.svg' },
];

export const PaymentBrandBadges = ({ compact = false, className }) => (
  <div className={cn('flex flex-wrap items-center gap-2', className)}>
    {BRANDS.map((brand) => (
      <span
        key={brand.id}
        title={brand.label}
        aria-label={brand.label}
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/95',
          compact ? 'h-7 w-[52px]' : 'h-8 w-[60px]',
        )}
      >
        <img
          src={brand.src}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </span>
    ))}
  </div>
);
