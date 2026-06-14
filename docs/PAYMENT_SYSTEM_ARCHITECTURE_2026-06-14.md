# Architecture paiement Greffio – Mollie-only (2026-06-14)

Document de référence pour le routing PSP centralisé (`PaymentProviderResolver`).

## Matrice flux × client × PSP

| Flux métier | `PAYMENT_FLOWS` | B2C | B2B |
|-------------|-----------------|-----|-----|
| Carte dossier / offre | `b2c_card` | **Mollie** | GoCardless → Mollie → virement |
| Commande ressource / document | `resource` | **Mollie** | N/A (B2C catalogue) |
| Formalité | `formality` | **Mollie** | GoCardless → Mollie → virement |
| Dossier pro | `dossier` | **Mollie** | GoCardless → Mollie → virement |
| Facture | `invoice` | **Mollie** | **Mollie** (fallback virement) |
| SEPA récurrent | `b2b_sepa` | Interdit | GoCardless |

## Règles invariantes

- **B2C** : Mollie uniquement (checkout hosted). GoCardless interdit.
- **B2B** : GoCardless prioritaire, Mollie en fallback, virement manuel ultime.
- **CAWL** : dormant (`CAWL_ENABLED=false` par défaut). Code conservé, routes gated.
- **Google Pay** : dormant (juin 2026). Terminal Greffio = carte Mollie.
- Aucun statut `paid` depuis le frontend : webhooks Mollie ou job ops uniquement.

## Endpoints

| Route | Rôle |
|-------|------|
| `POST /api/payments` | Création paiement multi-flux (auth) |
| `POST /api/payments/create` | Legacy dossiers B2B (GoCardless) |
| `POST /api/resources/orders/:id/checkout` | Checkout commande document |
| `GET /api/payments/terminal-config` | Config terminal UI (sans secrets) |
| `GET /api/mollie/callback` | Retour utilisateur après checkout |
| `GET /api/mollie/status` | Diagnostic configuration |
| `POST /api/webhooks/mollie` | Webhook serveur Mollie (primaire) |
| `POST /api/webhooks/cawl` | Webhook CAWL (dormant si `CAWL_ENABLED=false`) |

## Variables d'environnement

```env
MOLLIE_API_KEY=live_...
MOLLIE_PROFILE_ID=pfl_...
MOLLIE_CALLBACK_URL=https://greffio.willentreprises.com/api/mollie/callback
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
CAWL_ENABLED=false
```

## Frontend

- `GreffioPaymentTerminal.jsx` : terminal avancé Mollie (Methods API + sélection + CGV)
- `MollieCardForm.jsx` : Mollie Components (carte embarquée, profile `pfl_Q6vFPJDb7P`)
- `PaymentPage.jsx` / `MobilePaymentPage.jsx` : parité web + app native
- `PaymentVerificationPage.jsx` : retour post-checkout Mollie

### Embedded vs hosted

| Méthode | Mode Greffio | Détail |
|---------|--------------|--------|
| `creditcard` | **Embedded** | Formulaire Mollie Components sur page Greffio → `cardToken` → API → redirect 3-D Secure uniquement |
| `applepay` | **Hosted** | Redirect Mollie (bouton / page Mollie) |
| `banktransfer` | **Hosted** | Redirect Mollie (détails virement sur page Mollie) |
| Autres (PayPal, iDEAL…) | **Hosted** | Redirect Mollie avec `method` pré-sélectionné |

### Mobile Capacitor

- **Carte (Components)** : formulaire dans la WebView Capacitor ; l’étape 3-D Secure ouvre le **navigateur système** (`CapApp.openUrl`) puis retour via `https://greffio.willentreprises.com/api/mollie/callback`.
- **Apple Pay / virement / hosted** : **navigateur système** dès le départ (`openPaymentCheckoutUrl`).
- Fallback WebView si `openUrl` échoue.

### Panier boutique groupé

- `POST /api/resources/cart/prepare` : crée N commandes, référence `GRF-YYYY-NNNN`
- `POST /api/resources/cart/pay` : un paiement Mollie pour tout le panier (`metadata.resourceOrderIds`, `lineItems`)
- Route : `/boutique` → panier → `/paiement?cartOrders=…` → Mollie → `/paiement/verification`

## Endpoints (ajouts)

| Route | Rôle |
|-------|------|
| `GET /api/mollie/methods` | Liste méthodes actives (Methods API) |
| `POST /api/resources/cart/prepare` | Préparer commandes panier |
| `POST /api/resources/cart/pay` | Paiement Mollie groupé |

## Tests

```bash
node --test server/payments/tests/paymentProviderResolver.test.js
node --test server/payments/tests/paymentService.test.js
node --test server/payments/tests/mollieAdapter.test.js
```

## Dashboard Mollie – vérifications manuelles

1. Profil live actif (`pfl_Q6vFPJDb7P`) avec méthodes carte, Apple Pay, virement activées.
2. **Mollie Components** activé sur le profil (Developers → Website profiles).
3. Webhook `https://api.greffio.willentreprises.com/api/webhooks/mollie` en statut OK.
4. Redirect URL autorisée : `https://greffio.willentreprises.com/api/mollie/callback`.
5. Logo / nom marchand « Greffio » cohérent avec l’identité site.
6. CSP production : autoriser `js.mollie.com` (`script-src`, `frame-src`) si applicable.
