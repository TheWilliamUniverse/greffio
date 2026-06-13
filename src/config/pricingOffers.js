export const YOUNG_ENTREPRENEUR_OFFER = Object.freeze({
  id: 'jeune-entrepreneur',
  code: 'jeune-entrepreneur',
  badge: 'Offre Jeune',
  title: 'Offre Spéciale Jeune Entrepreneur.e',
  headline: 'En ce moment : Offre Spéciale Jeune Entrepreneur.e',
  subtitle: 'Réservée aux créateurs et porteurs de projet de moins de 26 ans.',
  standardPriceCents: 14900,
  youngPriceCents: 7000,
  standardPriceLabel: '149 €',
  youngPriceLabel: '70 €',
  maxAge: 25,
});

export const YOUNG_ENTREPRENEUR_LANDING_FOOTER = `${YOUNG_ENTREPRENEUR_OFFER.headline} – réservée aux créateurs et porteurs de projet de moins de 26 ans. Tarif Formalité à ${YOUNG_ENTREPRENEUR_OFFER.youngPriceLabel} au lieu de ${YOUNG_ENTREPRENEUR_OFFER.standardPriceLabel}.`;

export const formatOfferPrice = (cents) => `${Math.round(Number(cents) / 100)} €`;

export const resolveServicePriceCents = ({ youngEligible = false, standardCents = YOUNG_ENTREPRENEUR_OFFER.standardPriceCents } = {}) => (
  youngEligible ? YOUNG_ENTREPRENEUR_OFFER.youngPriceCents : standardCents
);
