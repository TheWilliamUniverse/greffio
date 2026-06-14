# Payments Architecture

> Statut 2026-06-14 : le paiement B2C actif en production est **Mollie**.
> CAWL/Worldline reste présent dans le code comme piste dormante, mais ne doit
> pas être considéré comme le PSP B2C courant. Pour l’état détaillé à jour, voir
> aussi `docs/PAYMENT_SYSTEM_ARCHITECTURE_2026-06-14.md`.

> Document de référence pour William Establishments (Greffio + boutique en
> ligne). Toute modification du routing PSP doit passer par ce document
> avant d'être implémentée en code.

## 1. Décision métier

- **B2C → Mollie.** Tous les paiements B2C actifs (dossiers, boutique,
  prestations numériques, paiements ponctuels) sont traités par **Mollie**.
  Les écrans doivent afficher un seul bloc de confiance Mollie, sans doublon
  TLS/carte autour du terminal.
- **GoCardless → B2B uniquement.** GoCardless est strictement réservé aux
  paiements B2B (prélèvements SEPA / virements pros). Il est explicitement
  **interdit en B2C** : toute tentative est rejetée côté serveur avec un
  code `GOCARDLESS_FORBIDDEN_FOR_B2C` (HTTP 409).
- **Qonto → rapprochement bancaire.** Qonto sert au suivi bancaire, à la
  réconciliation des paiements encaissés, à la trésorerie et la facturation.
  Qonto **n'est pas un PSP** : son adapter ne crée pas de paiement.
- **Virements manuels (`manual_bank_transfer`)** : disponibles pour les B2B
  qui ne souhaitent pas utiliser GoCardless, avec rapprochement Qonto.

## 2. Provider routing

| Type client                | Provider par défaut         | Fallback              |
|----------------------------|-----------------------------|-----------------------|
| B2C                        | `mollie`                    | aucun (erreur 503)    |
| B2B                        | `gocardless` (si configuré) | `manual_bank_transfer`|
| Tout type – réconciliation | `qonto`                     | –                     |

Providers prévus pour extension future (déclarés comme stubs inactifs) :
`stripe`, `payplug`. Brancher un de ces providers consiste à
remplacer le stub par un adapter conforme à `PaymentProviderAdapter` puis à
inscrire la règle dans `PaymentProviderResolver`.

## 3. Flux B2C (Mollie)

1. Le frontend affiche `GreffioPaymentTerminal` et charge les méthodes Mollie.
2. La carte est saisie dans le formulaire embarqué Mollie ; le token carte est
   transmis au backend.
3. Le serveur crée le paiement (`pending`, `provider: mollie`) et déclenche
   3-D Secure si nécessaire.
4. Mollie envoie son webhook signé/configuré côté serveur.
5. Le webhook normalise le statut (`paid`, `failed`, `cancelled`…) et met à
   jour la ligne `payments`. Aucun statut n'est jamais accepté depuis le
   frontend.

CAWL/Worldline : dormant. Ne pas documenter un nouveau flux CAWL comme actif
tant que le resolver B2C et la prod ne pointent pas explicitement vers lui.

## 4. Flux B2B

1. Le frontend appelle `POST /api/payments` avec `customerType: "b2b"`.
2. `PaymentProviderResolver.resolve('b2b')` choisit `gocardless` si
   `GOCARDLESS_ACCESS_TOKEN` est présent, sinon `manual_bank_transfer`.
3. GoCardless suit son flow standard (billing request + flow), webhook
   sur `POST /api/webhooks/gocardless` (déjà en place dans `server/index.js`).
4. En `manual_bank_transfer`, l'adapter renvoie les coordonnées IBAN/BIC
   et un identifiant de virement à indiquer en référence ; le rapprochement
   se fait côté ops via Qonto.

## 5. Providers supportés

| Code                    | Statut             | Rôle                                  |
|-------------------------|--------------------|---------------------------------------|
| `mollie`                | actif (B2C)        | PSP carte / wallets B2C                 |
| `cawl`                  | dormant            | Piste Worldline/CAWL, non active B2C    |
| `gocardless`            | actif (B2B uniqu.) | SEPA / virement pro                   |
| `qonto`                 | actif              | Réconciliation, jamais PSP B2C        |
| `manual_bank_transfer`  | actif              | Virement manuel B2B                   |
| `stripe`                | stub inactif       | Réservé extension future              |
| `payplug`               | stub inactif       | Réservé extension future              |

## 6. Variables d'environnement

```env
# CAWL – PSP B2C (capture token Google Pay)
CAWL_API_BASE_URL=
CAWL_API_KEY=
CAWL_API_KEY_ID=
CAWL_MERCHANT_ID=
CAWL_WEBHOOK_SECRET=
CAWL_RETURN_URL=
CAWL_CANCEL_URL=

# Google Pay – wallet B2C (frontend + config publique)
GOOGLE_PAY_API_KEY=
GOOGLE_PAY_MERCHANT_ID=
GOOGLE_PAY_MERCHANT_NAME=Greffio
GOOGLE_PAY_ENVIRONMENT=TEST
GOOGLE_PAY_GATEWAY=cawl
GOOGLE_PAY_GATEWAY_MERCHANT_ID=
VITE_GOOGLE_PAY_ENABLED=true
VITE_GOOGLE_PAY_MERCHANT_ID=
VITE_GOOGLE_PAY_ENVIRONMENT=TEST
VITE_GOOGLE_PAY_MERCHANT_NAME=Greffio

# GoCardless – B2B uniquement
GOCARDLESS_ACCESS_TOKEN=
GOCARDLESS_WEBHOOK_SECRET=
GOCARDLESS_ENV=live

# Qonto – rapprochement
QONTO_CLIENT_ID=
QONTO_CLIENT_SECRET=
QONTO_ORGANIZATION_ID=

# Virement manuel
WILLIAM_ESTABLISHMENTS_IBAN=
WILLIAM_ESTABLISHMENTS_BIC=
```

## 7. Routes API

| Méthode | Route                                | Description                                                 |
|---------|--------------------------------------|-------------------------------------------------------------|
| POST    | `/api/payments`                      | Crée un paiement multi-prestataires (B2C → CAWL, B2B → GC). |
| GET     | `/api/payments/:id`                  | Lit un paiement (propriétaire ou ops).                      |
| POST    | `/api/payments/:id/refund`           | Remboursement (rôles ADMIN/OPS).                            |
| GET     | `/api/payments/providers/status`     | Liste les providers et leur état de configuration.          |
| POST    | `/api/webhooks/cawl`                 | Webhook CAWL signé HMAC SHA256.                             |
| POST    | `/api/webhooks/gocardless`           | Webhook GoCardless (B2B).                                   |
| POST    | `/api/payments/create` (legacy)      | Flow dossier Greffio. Refuse B2C explicite (409).           |

## 8. Webhooks

- **CAWL** : header `X-Cawl-Signature: t=<unix>,v1=<hex>` (placeholder).
  Le secret est `CAWL_WEBHOOK_SECRET`. En `NODE_ENV !== 'production'`, la
  vérification est tolérante pour le développement local mais loggue un
  warning.
- **GoCardless** : header `Webhook-Signature` HMAC SHA256, secret
  `GOCARDLESS_WEBHOOK_SECRET`. Vérification stricte en production.
- Idempotence : chaque évènement webhook est stocké dans `payment_events`
  avec un `provider_event_id` unique pour éviter les doubles traitements.

## 9. Règles de sécurité

- **Clés API serveur uniquement** : aucune clé CAWL/GoCardless/Qonto ne doit
  être exposée au frontend (Vite / mobile).
- **Création de paiement obligatoirement serveur** : le frontend ne fait
  qu'appeler `/api/payments`. Le `PaymentService` recalcule / vérifie le
  montant via `server/pricing.js`.
- **Le statut `paid` n'est jamais déclenché par le frontend** ; uniquement
  par webhook signé ou job ops manuel.
- **Webhooks vérifiés** : toute requête non signée correctement renvoie 401
  (en production).
- **Logs** : on logue `PaymentError.code` + `provider`, jamais le payload
  brut PSP, jamais de PAN, IBAN complet ou secret.
- **GoCardless interdit en B2C** : double protection (resolver + adapter).

## 10. TODO[CAWL-API] – endpoints à brancher

Le projet ne dispose pas (encore) de la documentation officielle CAWL. Les
points suivants sont prêts à recevoir l'intégration réelle dans
`server/payments/providers/CawlPaymentAdapter.js` :

- `POST /checkout/sessions` (ou équivalent CAWL) – création de paiement.
- `GET /checkout/sessions/:id` – récupération statut.
- `POST /refunds` – remboursement total / partiel.
- Schéma exact du payload webhook + en-tête de signature.

Pour brancher l'intégration réelle, remplir `CAWL_API_BASE_URL` /
`CAWL_API_KEY` dans `.env`, ajuster les paths dans `request()` et le
mapping de statuts dans `mapCawlStatus()`. Aucune autre couche du code
applicatif (resolver, service, routes, UI) ne devra changer.

## 11. Réconciliation Qonto (extension future)

Champ `payments.qonto_transaction_id` ajouté (migration `012`). Lorsque le
job de rapprochement Qonto identifie une transaction correspondant à un
paiement CAWL/GoCardless encaissé, il met à jour ce champ pour permettre :

- recherche bi-directionnelle (paiement ↔ transaction bancaire),
- exports comptables consolidés,
- attachement de justificatifs PDF.

L'encaissement B2C n'est **jamais** bloqué sur Qonto : Qonto est un suivi
a posteriori.
