# Prompt Cursor – Intégration paiements Shopfun (méthode Greffio / Mollie)

> Copier-coller le bloc ci-dessous dans Cursor ouvert sur le **projet Shopfun**.
> Prérequis : avoir lu `docs/CONTEXTE_SHOPFUN_INTEGRATION_PAIEMENTS_MOLLIE.md` (à copier depuis le repo Greffio si besoin).
> Les clés Mollie Shopfun doivent être dans `.env` local — ne pas les coller dans le chat.

---

## Prompt principal (implémentation complète)

```text
Tu travailles sur Shopfun (e-commerce). L’objectif est d’intégrer les paiements
exactement comme sur Greffio SaaS : Mollie en B2C, architecture serveur-first,
Mollie Components pour la carte embarquée, checkout hosted pour Apple Pay / virement,
webhook comme source de vérité pour le statut paid.

Lis en entier le document de contexte :
docs/CONTEXTE_SHOPFUN_INTEGRATION_PAIEMENTS_MOLLIE.md

Référence technique Greffio (repo source, lecture seule) :
- server/mollie.js, server/config/mollieUrls.js
- server/payments/ (PaymentService, MolliePaymentAdapter, PaymentProviderResolver)
- server/routes/paymentsRoutes.js, mollieRoutes.js, webhookRoutes.js (handleMollieWebhook)
- server/resourcesCheckout.js, resourcesCartCheckout.js (patterns e-commerce)
- src/components/payments/GreffioPaymentTerminal.jsx, MollieCardForm.jsx
- src/pages/PaymentPage.jsx, PaymentVerificationPage.jsx
- src/api/payments.js, src/api/mollie.js
- docs/PAYMENT_SYSTEM_ARCHITECTURE_2026-06-14.md

Variables d’environnement Shopfun (déjà dans .env, ne pas committer) :
- MOLLIE_API_KEY
- MOLLIE_PROFILE_ID
- APP_URL, API_PUBLIC_URL
- MOLLIE_WEBHOOK_URL, MOLLIE_CALLBACK_URL (si custom)
- VITE_MOLLIE_PROFILE_ID

Mission — implémenter sur Shopfun :

1. BACKEND
   - Client Mollie serveur (createPayment, listMethods, retrievePayment).
   - Adapter + service création paiement avec persistance table payments.
   - Routes : GET /api/mollie/methods, GET /api/mollie/status, GET /api/mollie/callback,
     POST /api/webhooks/mollie, GET /api/payments/terminal-config,
     GET /api/payments/verification/status, POST checkout commande (équivalent orders/:id/checkout).
   - Webhook : retrieve paiement Mollie, idempotence payment_events, markOrderPaid côté Shopfun.
   - Montant recalculé serveur depuis le catalogue produits (jamais faire confiance au client seul).

2. FRONTEND
   - Terminal checkout (adapté GreffioPaymentTerminal) : sélection méthode, CGV, MollieCardForm.
   - Page checkout + page vérification avec poll serveur post-retour Mollie.
   - openPaymentCheckoutUrl pour méthodes hosted et 3DS.
   - MollieSecureTrustBadge + PaymentBrandBadges floating (voir aussi doc footer logos).

3. CONFIG & OPS
   - Documenter les URLs à enregistrer dans le dashboard Mollie Shopfun.
   - CSP : autoriser js.mollie.com si applicable.

Contraintes strictes :
- MOLLIE_API_KEY uniquement serveur — jamais dans le frontend.
- Jamais marquer une commande paid depuis le navigateur ; webhook ou poll API serveur uniquement.
- Pas de refonte globale UI Shopfun — changements localisés checkout/paiement.
- Pas de second PSP B2C en parallèle sans passer par un resolver central.
- CAWL / Amazon Pay / Google Pay : ne pas activer (hors scope, Greffio les a retirés/dormants).

Livrables attendus :
- Code backend + frontend fonctionnel.
- Migration SQL payments si absente.
- Liste des fichiers créés/modifiés.
- Checklist de test manuel (carte test Mollie, webhook, retour verification).

Commence par explorer la structure actuelle Shopfun (stack, routes existantes, modèle commande),
puis implémente en minimisant le diff tout en respectant l’architecture Greffio.
```

---

## Prompt court (backend seulement)

```text
Sur Shopfun, implémente la couche paiements Mollie côté serveur comme Greffio :
mollie.js, MolliePaymentAdapter, webhook /api/webhooks/mollie, callback /api/mollie/callback,
POST orders/:id/checkout. Lis docs/CONTEXTE_SHOPFUN_INTEGRATION_PAIEMENTS_MOLLIE.md.
Clés dans .env uniquement. Montant recalculé serveur. paid uniquement via webhook.
```

---

## Prompt court (frontend seulement)

```text
Sur Shopfun, implémente le terminal checkout Mollie comme Greffio :
MollieCardForm (Components), terminal type GreffioPaymentTerminal, PaymentPage + PaymentVerificationPage,
api/mollie.js et api/payments.js. Carte = cardToken → API ; hosted = redirect checkoutUrl.
Lis docs/CONTEXTE_SHOPFUN_INTEGRATION_PAIEMENTS_MOLLIE.md. Pas de clé API côté client.
```

---

## Prompt diagnostic (paiement bloqué)

```text
Shopfun — le paiement Mollie ne finalise pas (reste pending / webhook absent).
Compare notre implémentation à Greffio (webhookRoutes handleMollieWebhook, mollieUrls, upsertPayment).
Vérifie : MOLLIE_WEBHOOK_URL reachable, provider_payment_id persisté, nginx proxy /api,
retrieveMolliePayment au webhook, side-effect markOrderPaid.
Propose correctifs minimaux avec preuves (logs, curl).
```

---

## Variables à renseigner avant de lancer le prompt

Coller dans `.env` Shopfun (exemple — **remplacer par les vraies valeurs**, ne pas committer) :

```env
MOLLIE_API_KEY=
MOLLIE_PROFILE_ID=
APP_URL=
API_PUBLIC_URL=
VITE_MOLLIE_PROFILE_ID=
```

Si les clés n’ont pas encore été créées : dashboard Mollie → Developers → API keys + Website profiles.
