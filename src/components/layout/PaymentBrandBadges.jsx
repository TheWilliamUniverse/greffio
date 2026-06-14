import React from 'react';
import { cn } from '@/lib/utils.js';
import { PRINCIPAL_PAYMENT_BRANDS } from '@/config/paymentBrands.js';

export const PaymentBrandBadges = ({
  compact = false,
  inverse = false,
  className,
}) => (
  <div
    className={cn('flex flex-wrap items-center gap-2', className)}
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
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-sm',
          compact ? 'h-7 px-2' : 'h-7 px-2.5',
          inverse
            ? 'border-white/20 bg-white/95'
            : 'border-border/50 bg-white',
        )}
      >
        <img
          src={brand.src}
          alt=""
          aria-hidden="true"
          className="h-5 w-auto max-w-none object-contain"
          loading="lazy"
          decoding="async"
        />
      </span>
    ))}
  </div>
);
