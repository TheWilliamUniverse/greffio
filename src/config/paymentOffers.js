/** Montants TTC indicatifs alignés sur server/pricing.js (service + frais légaux). */
export const resolveOfferAmountCents = (offerCode) => {
  const key = String(offerCode || '').toLowerCase();
  if (key.includes('gratuit') || key.includes('statuts')) return 0;
  if (key.includes('premium')) return 19900 + 24500;
  if (key.includes('jeune')) return 7000 + 24500;
  if (key.includes('formalite') || key.includes('formalité')) return 14900 + 24500;
  return 9900 + 24500;
};

export const formatEuroCents = (cents) => `${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')} €`;
