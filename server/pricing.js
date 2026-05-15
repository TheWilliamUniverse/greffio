const OFFER_MAP = Object.freeze({
  'statuts-gratuits': { service: 0, legalFees: 0 },
  'dossier-standard': { service: 9900, legalFees: 24500 },
  'equipe-premium': { service: 19900, legalFees: 24500 },
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

export {
  computePaymentAmounts,
};
