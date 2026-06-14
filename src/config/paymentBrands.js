/**
 * Marques de paiement Greffio – VERROUILLÉES (voir docs/PAYMENT_LOGOS_LOCKED.md).
 *
 * Règles :
 * - Footer landing (fond sombre) : `markSrc` via PaymentBrandBadges inverse – Visa VALIDÉ, ne pas modifier visa-mark.svg.
 * - Terminal checkout (fond clair) : `checkoutSrc` via PaymentBrandBadges floating – pas de cadre blanc.
 * - Mastercard : brand mark officiel (deux cercles rouge/orange), jamais le rectangle sombre legacy.
 */

export const PRINCIPAL_PAYMENT_BRANDS = [
  {
    id: 'visa',
    label: 'Visa',
    src: '/images/payments/visa.svg',
    markSrc: '/images/payments/visa-mark.svg',
    checkoutSrc: '/images/payments/visa-checkout.svg',
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    src: '/images/payments/mastercard.svg',
    markSrc: '/images/payments/mastercard-mark.svg',
    checkoutSrc: '/images/payments/mastercard-checkout.svg',
  },
  {
    id: 'cb',
    label: 'Cartes Bancaires',
    src: '/images/payments/cb.svg',
    markSrc: '/images/payments/cb-mark.svg',
    checkoutSrc: '/images/payments/cb-checkout.svg',
  },
  {
    id: 'amex',
    label: 'American Express',
    src: '/images/payments/amex.svg',
    markSrc: '/images/payments/amex-mark.svg',
    checkoutSrc: '/images/payments/amex-checkout.svg',
  },
];

/** Footer landing / mobile footer – Visa + MC + CB + AMEX (markSrc, fond transparent). */
export const FOOTER_PAYMENT_BRAND_IDS = ['visa', 'mastercard', 'cb', 'amex'];

export const FOOTER_PAYMENT_BRANDS = FOOTER_PAYMENT_BRAND_IDS.map(
  (id) => PRINCIPAL_PAYMENT_BRANDS.find((brand) => brand.id === id),
).filter(Boolean);

/** Terminal checkout – tous les réseaux carte (checkoutSrc, mode floating). */
export const CHECKOUT_PAYMENT_BRAND_IDS = ['visa', 'mastercard', 'cb', 'amex'];

/** Mollie – affiché sur terminal checkout, pas footer principal. */
export const MOLLIE_BRAND = {
  id: 'mollie',
  label: 'Mollie',
  src: '/images/payments/mollie.svg',
};
