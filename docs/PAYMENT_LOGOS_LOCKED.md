# Logos paiement Greffio – VERROUILLÉS

> Ne pas modifier sans demande explicite de l'utilisateur. Commit de référence : `1113caf`.

## Règles par contexte

| Contexte | Composant | Mode | Assets | Interdit |
|----------|-----------|------|--------|----------|
| Footer landing (`GreffioUltraFooter`) | `PaymentBrandBadges` | `inverse` | `markSrc` (fond transparent) | Boîtes blanches, changer Visa |
| Terminal checkout (`GreffioPaymentTerminal`) | `PaymentBrandBadges` | `floating` | `checkoutSrc` | Cadres/boîtes autour des logos |
| Badges encadrés (pages claires) | `PaymentBrandBadges` | défaut | `src` | – |

## Marques affichées

**Footer** (`FOOTER_PAYMENT_BRAND_IDS`) : Visa, Mastercard, CB, AMEX – dans cet ordre.

**Checkout** (`CHECKOUT_PAYMENT_BRAND_IDS`) : Visa, Mastercard, CB, AMEX – logos colorés sans cadre.

## Fichiers sources de vérité

- `src/config/paymentBrands.js` – IDs, chemins SVG, commentaires LOCK
- `public/images/payments/visa-mark.svg` – **VALIDÉ**, ne pas toucher
- `public/images/payments/visa-checkout.svg` – **VALIDÉ** pour terminal
- `public/images/payments/mastercard-mark.svg` / `mastercard-checkout.svg` – brand mark officiel (deux cercles)
- `public/images/payments/cb-mark.svg` / `cb-checkout.svg` – logo CB gradient
- `public/images/payments/amex-mark.svg` / `amex-checkout.svg` – wordmark blanc (footer) / bleu (checkout)

## Mastercard

Utiliser uniquement le **brand mark** (deux cercles rouge/orange). Le rectangle sombre `#253747` de l'ancien `mastercard.svg` est **interdit**.

## Pour les agents Cursor

Voir aussi `.cursor/rules/payment-logos-locked.mdc`.
