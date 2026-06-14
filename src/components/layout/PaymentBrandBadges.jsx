import React from 'react';
import { cn } from '@/lib/utils.js';
import {
  CHECKOUT_PAYMENT_BRAND_IDS,
  FOOTER_PAYMENT_BRAND_IDS,
  PRINCIPAL_PAYMENT_BRANDS,
} from '@/config/paymentBrands.js';

const resolveBrandSrc = (brand, { inverse, floating }) => {
  if (inverse) return brand.markSrc || brand.src;
  if (floating) return brand.checkoutSrc || brand.markSrc || brand.src;
  return brand.src;
};

const resolveBrandList = ({ brandIds, inverse, floating }) => {
  const defaultIds = floating
    ? CHECKOUT_PAYMENT_BRAND_IDS
    : inverse
      ? FOOTER_PAYMENT_BRAND_IDS
      : PRINCIPAL_PAYMENT_BRANDS.map((brand) => brand.id);
  const ids = brandIds?.length ? brandIds : defaultIds;
  return ids
    .map((id) => PRINCIPAL_PAYMENT_BRANDS.find((brand) => brand.id === id))
    .filter(Boolean);
};

export const PaymentBrandBadges = ({
  compact = false,
  inverse = false,
  floating = false,
  brandIds,
  className,
}) => {
  const brands = resolveBrandList({ brandIds, inverse, floating });

  return (
    <div
      className={cn(
        'flex flex-wrap items-center',
        floating ? 'gap-3' : 'gap-2.5',
        className,
      )}
      role="list"
      aria-label="Moyens de paiement acceptés"
    >
      {brands.map((brand) => (
        <span
          key={brand.id}
          role="listitem"
          title={brand.label}
          aria-label={brand.label}
          className={cn(
            'inline-flex shrink-0 items-center justify-center',
            !floating && (compact ? 'h-7 px-1' : 'h-8 px-1.5'),
            !floating && (
              inverse
                ? 'rounded-md border border-white/10 bg-transparent'
                : 'overflow-hidden rounded-md border border-border/40 bg-white shadow-sm'
            ),
          )}
        >
          <img
            src={resolveBrandSrc(brand, { inverse, floating })}
            alt=""
            aria-hidden="true"
            className={cn(
              'w-auto max-w-none object-contain',
              floating ? (compact ? 'h-6' : 'h-7') : (compact ? 'h-5' : 'h-6'),
              inverse && 'opacity-90',
            )}
            loading="lazy"
            decoding="async"
          />
        </span>
      ))}
    </div>
  );
};
