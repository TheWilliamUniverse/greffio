import React from 'react';
import { cn } from '@/lib/utils.js';
import {
  CHECKOUT_PAYMENT_BRAND_IDS,
  FOOTER_PAYMENT_BRAND_IDS,
  PRINCIPAL_PAYMENT_BRANDS,
} from '@/config/paymentBrands.js';

/** Footer sombre : markSrc (Visa = visa-mark.svg verrouillé). Checkout : checkoutSrc. */
const withAssetVersion = (src, version = '20260615') => {
  if (!src || src.includes('?')) return src;
  return `${src}?v=${version}`;
};

const resolveBrandSrc = (brand, { inverse, floating }) => {
  let src;
  if (floating) src = brand.checkoutSrc || brand.markSrc || brand.src;
  else if (inverse) {
    if (brand.id === 'visa') src = brand.markSrc;
    else src = brand.markSrc || brand.checkoutSrc || brand.src;
  } else {
    src = brand.src;
  }
  return inverse ? withAssetVersion(src) : src;
};

const FOOTER_INVERSE_BRAND_CLASS = {
  visa: 'h-8 w-[2.75rem]',
  mastercard: 'h-8 w-10',
  cb: 'h-8 w-10',
  amex: 'h-8 w-12 rounded-sm',
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
        floating || inverse ? 'gap-3' : 'gap-2.5',
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
            !floating && !inverse && (compact ? 'h-7 px-1' : 'h-8 px-1.5'),
            !floating &&
              !inverse &&
              'overflow-hidden rounded-md border border-border/40 bg-white shadow-sm',
          )}
        >
          <img
            src={resolveBrandSrc(brand, { inverse, floating })}
            alt=""
            aria-hidden="true"
            className={cn(
              'object-contain',
              floating || inverse
                ? (inverse && FOOTER_INVERSE_BRAND_CLASS[brand.id]
                  ? FOOTER_INVERSE_BRAND_CLASS[brand.id]
                  : (compact ? 'h-6 w-auto max-w-[4.5rem]' : 'h-7 w-auto max-w-[5rem]'))
                : (compact ? 'h-5 w-auto max-w-[4rem]' : 'h-6 w-auto max-w-[4.5rem]'),
              inverse && brand.id !== 'amex' && 'opacity-90',
            )}
            loading="lazy"
            decoding="async"
          />
        </span>
      ))}
    </div>
  );
};
