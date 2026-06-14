/** Marques de paiement principales – footer landing et pages checkout. */
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
    checkoutSrc: '/images/payments/mastercard-mark.svg',
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

/** Mollie – affiché sur terminal checkout, pas footer principal. */
export const MOLLIE_BRAND = {
  id: 'mollie',
  label: 'Mollie',
  src: '/images/payments/mollie.svg',
};
