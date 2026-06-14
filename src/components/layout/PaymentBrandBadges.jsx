import React from 'react';
import { cn } from '@/lib/utils.js';
import { PRINCIPAL_PAYMENT_BRANDS } from '@/config/paymentBrands.js';

export const PaymentBrandBadges = ({
  compact = false,
  inverse = false,
  className,
}) => (
  <div
    className={cn('flex flex-wrap items-center gap-2.5', className)}
    role="list"
    aria-label="Moyens de paiement acceptés"
  >
    {PRINCIPAL_PAYMENT_BRANDS.map((brand) => (
      <span
        key={brand.id}
        role="listitem"
        title={brand.label}
        aria-label={brand.label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center',
          compact ? 'h-7 px-1' : 'h-8 px-1.5',
          inverse
            ? 'rounded-md border border-white/10 bg-transparent'
            : 'overflow-hidden rounded-md border border-border/40 bg-white shadow-sm',
        )}
      >
        <img
          src={inverse ? (brand.markSrc || brand.src) : brand.src}
          alt=""
          aria-hidden="true"
          className={cn(
            'w-auto max-w-none object-contain',
            compact ? 'h-5' : 'h-6',
            inverse && 'opacity-90',
          )}
          loading="lazy"
          decoding="async"
        />
      </span>
    ))}
  </div>
);
