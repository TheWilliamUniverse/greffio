const OFFER_MAP = Object.freeze({
  'statuts-gratuits': { service: 0, legalFees: 0 },
  'dossier-standard': { service: 9900, legalFees: 24500 },
  'equipe-premium': { service: 19900, legalFees: 24500 },
  'jeune-entrepreneur': { service: 7000, legalFees: 24500 },
  'formalite': { service: 14900, legalFees: 24500 },
  'formalite-jeune': { service: 7000, legalFees: 24500 },
});

const normalizeOffer = (offerCode) => {
  if (!offerCode) return 'dossier-standard';
  const normalized = offerCode
    .toLowerCase()
    .trim()
    .replaceAll('é', 'e')
    .replaceAll('è', 'e')
    .replaceAll('ê', 'e')
    .replaceAll(' ', '-');
  if (normalized.includes('gratuit')) return 'statuts-gratuits';
  if (normalized.includes('premium')) return 'equipe-premium';
  if (normalized.includes('jeune')) return 'jeune-entrepreneur';
  if (normalized.includes('formalite') && normalized.includes('jeune')) return 'formalite-jeune';
  if (normalized.includes('formalite')) return 'formalite';
  return 'dossier-standard';
};

const computePaymentAmounts = (offerCode) => {
  const normalizedOffer = normalizeOffer(offerCode);
  const profile = OFFER_MAP[normalizedOffer] || OFFER_MAP['dossier-standard'];
  const amountServiceCents = profile.service;
  const amountLegalFeesCents = profile.legalFees;
  const amountTotalCents = amountServiceCents + amountLegalFeesCents;
  return {
    normalizedOffer,
    amountServiceCents,
    amountLegalFeesCents,
    amountTotalCents,
    currency: 'EUR',
  };
};

const computeResourcePaymentAmounts = (priceTtcCents) => {
  const serviceCents = Math.max(0, Math.round(Number(priceTtcCents) || 0));
  return {
    normalizedOffer: 'resource-document',
    amountServiceCents: serviceCents,
    amountLegalFeesCents: 0,
    amountTotalCents: serviceCents,
    currency: 'EUR',
  };
};

export {
  computePaymentAmounts,
  computeResourcePaymentAmounts,
};
