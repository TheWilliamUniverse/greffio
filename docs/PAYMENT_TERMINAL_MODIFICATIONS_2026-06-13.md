# Modifications paiement Greffio – terminal unifié, Amazon Pay, Google Pay

**Date :** 12–13 juin 2026  
**Périmètre :** intégration Amazon Pay production, terminal de paiement accordéon, correction Google Pay `OR_BIBED_06`, déploiements frontend/backend  
**Statut Git au 13/06/2026 :** commits `168024b` → `50dfe6a` poussés sur `main` ; lot terminal accordéon + fix Google Pay avancé **local non commité**

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Chronologie Git (commits poussés)](#2-chronologie-git-commits-poussés)
3. [Architecture avant / après](#3-architecture-avant--après)
4. [Backend – Amazon Pay](#4-backend--amazon-pay)
5. [Backend – Google Pay](#5-backend--google-pay)
6. [Frontend – nouveau terminal accordéon](#6-frontend--nouveau-terminal-accordéon)
7. [Frontend – panneaux Amazon Pay et Google Pay](#7-frontend--panneaux-amazon-pay-et-google-pay)
8. [Frontend – pages de paiement](#8-frontend--pages-de-paiement)
9. [Frontend – retour Amazon Pay / vérification](#9-frontend--retour-amazon-pay--vérification)
10. [API client (`src/api/payments.js`)](#10-api-client-srcapipaymentsjs)
11. [Corrections de bugs rencontrés](#11-corrections-de-bugs-rencontrés)
12. [Déploiements effectués](#12-déploiements-effectués)
13. [Configuration production (VPS + Seller Central)](#13-configuration-production-vps--seller-central)
14. [Modifications locales non commitées (diff exact)](#14-modifications-locales-non-commitées-diff-exact)
15. [Limitations connues et prochaines étapes](#15-limitations-connues-et-prochaines-étapes)
16. [Plan de test](#16-plan-de-test)

---

## 1. Contexte et objectifs

### Demandes utilisateur

1. Activer **Amazon Pay** comme mode de paiement express prioritaire sur Greffio.
2. Unifier **Amazon Pay + Google Pay + carte bancaire** dans une seule interface.
3. Corriger l’UI (logos, centrage, boutons dupliqués).
4. Réparer Google Pay (erreur `OR_BIBED_06` : « Ce marchand ne parvient pas à accepter votre paiement »).
5. Concevoir **un seul grand terminal** : clic sur un mode → déroulement des infos nécessaires (accordéon).

### Contraintes respectées

- **Identité globale Greffio non modifiée** (landing, palette globale, navbar publique, design system transversal).
- Modifications **locales au parcours paiement** uniquement.
- Pas de refonte cosmétique large hors composants paiement.

---

## 2. Chronologie Git (commits poussés)

| Commit | Date | Message | Fichiers touchés |
|--------|------|---------|------------------|
| `a789c12` | antérieur | Activer Amazon Pay dans l'interface generale Greffio | UI initiale Amazon Pay |
| `168024b` | 12/06 23:26 | Activer Amazon Pay en production avec IPN, finalisation checkout et terminal paiement unifie | 12 fichiers (+655 / -32) |
| `42f8226` | 13/06 00:05 | Corriger affichage Amazon Pay, logos wallets et centrage du terminal paiement | 5 fichiers |
| `5683153` | 13/06 00:10 | Fix Amazon Pay renderButton: passer un selecteur CSS au lieu d'un element DOM | `AmazonPayCheckoutPanel.jsx` |
| `50dfe6a` | 13/06 00:17 | Corriger la signature Amazon Pay bouton (stringToSign AMZN-PAY-RSASSA-PSS-V2 + hash payload) | `amazonPayService.js` |

### Lot local (non commité au 13/06)

| Fichier | Nature |
|---------|--------|
| `src/components/payments/GreffioPaymentTerminal.jsx` | **Nouveau** – terminal accordéon |
| `src/components/payments/WalletPaymentTerminal.jsx` | Réduit à un réexport |
| `src/components/payments/AmazonPayCheckoutPanel.jsx` | Mode `embedded` / `active` |
| `src/components/payments/GooglePayCheckoutPanel.jsx` | Mode `embedded` / `active`, fix bouton |
| `src/hooks/useGooglePay.js` | Fix gateway / merchantId |
| `server/services/googlePayService.js` | `readyForPayment`, `markPaid` test |
| `src/pages/PaymentPage.jsx` | Intégration terminal + anti-doublon carte |
| `src/mobile/MobilePaymentPage.jsx` | Idem mobile |

---

## 3. Architecture avant / après

### Avant

```
PaymentPage / MobilePaymentPage
├── Bouton carte (sidebar ou bas de page)
├── WalletPaymentTerminal (empilement vertical)
│   ├── AmazonPayCheckoutPanel (carte autonome avec header)
│   └── GooglePayCheckoutPanel (carte autonome avec header)
└── Bouton carte dupliqué selon les flows
```

Problèmes :
- Double bouton « G Pay » (header + bouton officiel Google).
- Panneaux empilés sans interaction accordéon.
- Google Pay avec `merchantId` fictif `BCR2DN4TZ4F2QR3B` → `OR_BIBED_06`.
- Amazon Pay `renderButton([object HTMLDivElement])` → bouton invisible.

### Après

```
PaymentPage / MobilePaymentPage
└── GreffioPaymentTerminal (accordéon unique, max-w-2xl)
    ├── En-tête : icône WalletCards, titre, montant TTC, offre
    ├── Accordéon Amazon Pay (ouvert par défaut)
    │   └── AmazonPayCheckoutPanel embedded active
    ├── Accordéon Google Pay
    │   └── GooglePayCheckoutPanel embedded active
    ├── Accordéon Carte bancaire
    │   └── Bouton → handleCheckout (CAWL / GoCardless)
    └── Footer sécurité (ShieldCheck + LockKeyhole)
```

`WalletPaymentTerminal.jsx` devient un alias :

```js
export { GreffioPaymentTerminal as WalletPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
```

---

## 4. Backend – Amazon Pay

### Fichiers

| Fichier | Rôle |
|---------|------|
| `server/services/amazonPayService.js` | Logique métier, signature, sessions, IPN |
| `server/routes/amazonPayRoutes.js` | Routes Express |
| `server/index.js` | Enregistrement `registerAmazonPayRoutes` |
| `docs/AMAZON_PAY_SETUP.md` | Runbook Seller Central |
| `PRODUCTION_SECRETS_TEMPLATE.env` | Variables Amazon Pay documentées |

### Routes API ajoutées

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/payments/amazon-pay/config` | Non | Config publique (merchantId, publicKeyId, sandbox, scriptUrl…) |
| `POST` | `/api/payments/amazon-pay/session` | Oui | Crée session checkout signée + enregistrement paiement `pending` |
| `POST` | `/api/payments/amazon-pay/complete` | Oui | Finalise après retour utilisateur Amazon |
| `POST` | `/api/webhooks/amazon-pay` | Non (IPN Amazon) | Webhook notifications instantanées |

### `getAmazonPayPublicConfig()`

Retourne côté frontend (sans secrets) :

```js
{
  enabled: Boolean(merchantId && clientId && publicKeyId && clé privée),
  sandbox: AMAZON_PAY_SANDBOX,
  merchantId,
  publicKeyId,
  ledgerCurrency: 'EUR',
  checkoutLanguage: 'fr_FR',
  merchantStoreName: 'Greffio',
  scriptUrl: 'https://static-eu.payments-amazon.com/checkout.js'
}
```

**Production VPS vérifiée :** `GET https://api.greffio.willentreprises.com/api/payments/amazon-pay/config` → `enabled: true`.

### `createAmazonPayCheckoutSession()`

1. Valide la cible (dossier ou commande ressource) et calcule le montant TTC.
2. Génère un `paymentId` UUID.
3. Construit l’URL de retour : `/paiement/amazon-pay/retour?provider=Amazon Pay&paymentId=…&dossierId|resourceOrderId=…`
4. Payload Amazon Pay :
   - `paymentIntent: AuthorizeWithCapture`
   - `chargeAmount` en EUR
   - `merchantMetadata.merchantStoreName: Greffio`
   - `noteToBuyer` : description Greffio
5. **Signe le payload** via `signPayload()` (voir section bugs).
6. `upsertPayment` status `pending`, provider `amazon_pay`.
7. Retourne `createCheckoutSessionConfig: { payloadJSON, signature, algorithm, publicKeyId }`.

### `completeAmazonPayCheckoutSession()`

1. Vérifie `paymentId`, `amazonCheckoutSessionId`, propriété utilisateur.
2. Appelle l’API Amazon Pay EU (`pay-api.amazon.eu`) pour compléter la session.
3. Met à jour le paiement (`paid` / `processing` selon réponse).
4. Transition dossier → `PAYMENT_CONFIRMED` si applicable.
5. Déclenche `handleResourceOrderPaymentPaid` pour les commandes ressources.

### `handleAmazonPayIpn()`

- Accepte le body brut SNS/IPN Amazon.
- Confirme l’abonnement SNS si nécessaire.
- Sur notification `CHARGE`, relit le statut via API Amazon Pay.
- Idempotence via `hasPaymentEventProviderId`.

### Signature bouton – correction `50dfe6a`

**Avant (incorrect) :** signature RSA du JSON brut.

**Après (conforme Amazon Pay RSASSA-PSS-V2) :**

```js
const AMAZON_PAY_ALGORITHM = 'AMZN-PAY-RSASSA-PSS-V2';

const signPayload = (payloadJSON) => {
  const stringToSign = `${AMAZON_PAY_ALGORITHM}\n${sha256Hex(payloadJSON)}`;
  return signAmazonPayString(stringToSign, 32);
};

const signAmazonPayString = (stringToSign, saltLength = 32) => {
  return crypto.createSign('RSA-SHA256')
    .update(stringToSign)
    .sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength,
    }, 'base64');
};
```

**Erreur corrigée :** `InvalidSignatureError` côté widget Amazon (« Adopter et signer »).

### Variables VPS (production live)

| Variable | Valeur prod (constatée) |
|----------|-------------------------|
| `AMAZON_PAY_SANDBOX` | `false` |
| `AMAZON_PAY_MERCHANT_ID` | `A1YO5FBGC53G6G` |
| `AMAZON_PAY_PUBLIC_KEY_ID` | `LIVE-AFS53DEZ3DWJFCBULLR33F37` |
| `AMAZON_PAY_PRIVATE_KEY_PATH` | `/opt/greffio/secrets/amazon-pay-live.pem` |

---

## 5. Backend – Google Pay

### Fichiers

| Fichier | Rôle |
|---------|------|
| `server/services/googlePayService.js` | Config publique + traitement charge |
| `server/routes/googlePayRoutes.js` | Routes Express |

### Routes API

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/payments/google-pay/config` | Non | Config environnement / gateway |
| `POST` | `/api/payments/google-pay` | Oui | Traite le token Google Pay |

### `getGooglePayPublicConfig()` – modifications

**Avant :**

```js
const hasMerchant = Boolean(GOOGLE_PAY_API_KEY || GOOGLE_PAY_MERCHANT_ID);
enabled: hasMerchant || environment === 'TEST'
```

**Après :**

```js
const merchantId = process.env.GOOGLE_PAY_MERCHANT_ID || '';
const gatewayMerchantId = process.env.GOOGLE_PAY_GATEWAY_MERCHANT_ID || process.env.CAWL_MERCHANT_ID || '';
const gateway = String(process.env.GOOGLE_PAY_GATEWAY || 'cawl').toLowerCase();
const cawlReady = Boolean(process.env.CAWL_API_BASE_URL && process.env.CAWL_API_KEY);
const productionReady = environment === 'PRODUCTION' && Boolean(merchantId && gatewayMerchantId && cawlReady);
const testReady = environment === 'TEST';

return {
  enabled: productionReady || testReady,
  readyForPayment: productionReady || testReady,
  environment,
  merchantId,
  merchantName: 'Greffio',
  gateway,
  gatewayMerchantId,
  countryCode: 'FR',
  currencyCode: 'EUR',
  mode: productionReady ? 'live' : testReady ? 'test' : 'unavailable',
};
```

**Réponse VPS actuelle (13/06) :**

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "readyForPayment": true,
    "environment": "TEST",
    "merchantId": "",
    "merchantName": "Greffio",
    "gateway": "cawl",
    "gatewayMerchantId": "",
    "countryCode": "FR",
    "currencyCode": "EUR",
    "mode": "test"
  }
}
```

### `processGooglePayCharge()` – modification `markPaid`

**Avant :**

```js
const markPaid = !cawlReady && process.env.NODE_ENV !== 'production';
```

→ Sur VPS (`NODE_ENV=production`), les paiements Google Pay TEST restaient `pending` même en mode démo.

**Après :**

```js
const isTestEnvironment = process.env.GOOGLE_PAY_ENVIRONMENT !== 'PRODUCTION';
const markPaid = !cawlReady && (process.env.NODE_ENV !== 'production' || isTestEnvironment);
```

→ En `GOOGLE_PAY_ENVIRONMENT=TEST`, le paiement est marqué `paid` côté Greffio (flux démo sans CAWL).

Le token Google Pay est stocké dans `providerPayload` en attendant le branchement CAWL (`TODO[CAWL-API]`).

---

## 6. Frontend – nouveau terminal accordéon

### Fichier : `src/components/payments/GreffioPaymentTerminal.jsx` (NOUVEAU, 230 lignes)

#### Props

| Prop | Type | Défaut | Usage |
|------|------|--------|-------|
| `amountCents` | number | `0` | Montant en centimes |
| `amountLabel` | string | – | Affichage « 4,90 € TTC » |
| `offerLabel` | string | `'Greffio'` | Titre offre / ressource |
| `dossierId` | string | – | Cible dossier |
| `resourceOrderId` | string | – | Cible commande ressource |
| `offerCode` | string | – | Code offre tarifaire |
| `onPayByCard` | function | – | Handler checkout carte |
| `isCreatingPayment` | boolean | `false` | État loading bouton carte |
| `cardButtonLabel` | string | `'Payer par carte bancaire'` | Libellé bouton carte |
| `className` | string | – | Classes CSS additionnelles |

#### État interne

```js
const [activeMethod, setActiveMethod] = useState('amazon-pay');
```

Amazon Pay ouvert par défaut.

#### Trois modes (accordéon)

| ID | Titre | Badge | Sous-titre |
|----|-------|-------|------------|
| `amazon-pay` | Amazon Pay | Recommandé (vert) | Paiement express avec votre compte Amazon |
| `google-pay` | Google Pay | Express (bleu ciel) | Cartes enregistrées dans Google Wallet |
| `card` | Carte bancaire | Sécurisé (bleu Greffio) | Visa, Mastercard – confirmation serveur Greffio |

#### Marques inline (remplace les SVG custom des panneaux)

- **AmazonMark :** pill orange `#FF9900`, texte `amazon pay`
- **GoogleMark :** pill noir, texte `G Pay`
- **CardMark :** icône `CreditCard` sur fond `--greffio-blue`

#### Style (identité Greffio, local au composant)

- Container : `rounded-[28px]`, bordure `#cfe0f5`, dégradé radial bleu + linéaire `#f8fbff → #ffffff → #eef4ff`
- Ombre : `shadow-[0_28px_80px_rgba(30,77,140,0.14)]`
- Overlay top : gradient `--greffio-blue` / 10%
- Icône header : `WalletCards` dans carré `rounded-2xl` bleu Greffio
- Label : `Terminal Greffio` + icône `Sparkles`
- Montant : bloc glass `bg-white/90`, typo `text-3xl font-extrabold`
- Accordéon actif : bordure `--greffio-blue/30`, ombre portée
- Animation : Framer Motion `AnimatePresence` + `motion.div` height/opacity, easing `[0.22, 1, 0.36, 1]`, durée 0.28s
- Chevron `ChevronDown` rotation 180° quand ouvert
- Footer : `ShieldCheck` + `LockKeyhole`

#### Rendu conditionnel des panneaux

Seul le panneau **actif** monte son contenu :

```jsx
{method.id === 'amazon-pay' ? (
  <AmazonPayCheckoutPanel embedded active ... />
) : null}
```

Les panneaux inactifs ne sont pas rendus → pas de double initialisation Google Pay / Amazon Pay.

#### Section carte

- Bloc informatif Visa / Mastercard / 3-D Secure
- Bouton Greffio standard (`Button`) avec `onPayByCard`, disabled si `isCreatingPayment || !amountCents`
- Libellé dynamique : `{cardButtonLabel} – {amountLabel}`

---

## 7. Frontend – panneaux Amazon Pay et Google Pay

### `AmazonPayCheckoutPanel.jsx`

#### Nouvelles props

| Prop | Défaut | Effet |
|------|--------|-------|
| `embedded` | `false` | Si `true`, retourne le corps sans wrapper `<section>` |
| `active` | `true` | Si `false`, return `null` + skip useEffect |

#### Fix renderButton (`5683153`)

**Avant :**

```js
window.amazon.Pay.renderButton(buttonRef.current, { ... });
```

**Après :**

```js
const buttonContainerId = useId().replace(/:/g, '');
const buttonSelector = `#${buttonContainerId}`;
// ...
window.amazon.Pay.renderButton(buttonSelector, { ... });
```

Amazon exige un **sélecteur CSS**, pas un nœud DOM.

#### Double `requestAnimationFrame`

Attente du layout DOM avant injection du bouton :

```js
await new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});
```

#### Mode embedded vs standalone

| Mode | Affichage montant | Badge environnement |
|------|-------------------|---------------------|
| Standalone (`embedded=false`) | Bloc montant + offerLabel | – |
| Embedded (`embedded=true`) | Pas de montant (déjà dans le terminal) | Sandbox / Live + texte « Session signée Greffio » |

#### Suppressions UI (commit local)

- Composant `AmazonPayMark` SVG supprimé
- Import `ShieldCheck` supprimé (footer déplacé au terminal)
- Header autonome « Amazon Pay / Recommandé » supprimé en mode embedded

#### Conteneur bouton

```js
className="mx-auto flex min-h-[48px] w-full max-w-[340px] items-center justify-center"
```

Couleur bouton Amazon : `buttonColor: 'Gold'`.

---

### `GooglePayCheckoutPanel.jsx`

#### Nouvelles props

Identiques à Amazon Pay : `embedded`, `active`.

#### Fix double bouton G Pay

**Problème :** un petit bouton « G Pay » apparaissait en haut à gauche (marque custom) **en plus** du bouton officiel `client.createButton()`.

**Corrections :**
1. Suppression du composant `GooglePayMark` SVG et du header autonome.
2. Bouton Google injecté uniquement via `client.createButton()` dans un conteneur `#buttonContainerId`.
3. `useId()` pour ID stable (comme Amazon Pay).
4. Bouton caché si `!ready || !canPay || error || submitting`.
5. Rendu du bouton Google **uniquement quand le panneau est actif** (via prop `active` remontée depuis l’accordéon).

#### Gestion erreur OR_BIBED

```js
if (code.includes('OR_BIBED')) {
  toast.error('Google Pay n’est pas encore configuré pour encaisser en live. Utilisez Amazon Pay ou la carte.');
}
```

#### Mode embedded

- Badge « Mode test Google » (ambre) ou « Live » (vert)
- Texte explicatif CAWL / tokenisation
- Pas de bloc montant dupliqué

#### États UI

| État | Affichage |
|------|-----------|
| Chargement | Spinner « Préparation Google Pay… » |
| Erreur config | Bandeau ambre |
| Soumission | Spinner « Traitement sécurisé… » |
| Non disponible device | Message fallback Amazon Pay / carte |

---

### `useGooglePay.js` – modifications détaillées

#### Nouvelle prop `active`

```js
export const useGooglePay = ({ amountCents, label, active = true }) => { ... }
```

- Si `active=false` : pas de chargement script, pas de client.
- Reset `ready` / `error` au changement d’onglet.

#### Suppression merchantId fictif (fix OR_BIBED_06)

**Avant :**

```js
merchantInfo: {
  merchantId: config.merchantId || 'BCR2DN4TZ4F2QR3B',  // ← FAUX, causait OR_BIBED_06
  merchantName: 'Greffio',
}
gatewayMerchantId: config.gatewayMerchantId || config.merchantId || 'greffio_pending'
```

**Après :**

```js
const isTest = config.environment !== 'PRODUCTION';
const gateway = isTest ? 'example' : String(config.gateway || 'cawl').toLowerCase();
const gatewayMerchantId = isTest
  ? 'exampleGatewayMerchantId'
  : String(config.gatewayMerchantId || '').trim();

if (!isTest && !gatewayMerchantId) return null;

const merchantInfo = { merchantName: config.merchantName || 'Greffio' };
if (!isTest && config.merchantId) {
  merchantInfo.merchantId = config.merchantId;
}
```

En **TEST** : gateway Google officiel `example` (flux démo sans compte marchand).  
En **PRODUCTION** : exige `gatewayMerchantId` CAWL + `merchantId` Google Business Console.

#### Condition d’activation

```js
if (!merged.readyForPayment && !merged.enabled) {
  setError('Google Pay sera disponible dès branchement complet du prestataire carte.');
}
```

---

## 8. Frontend – pages de paiement

### `src/pages/PaymentPage.jsx`

#### Import

```diff
- import { WalletPaymentTerminal } from '@/components/payments/WalletPaymentTerminal.jsx';
+ import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
```

#### Flow ressource (colonne principale)

Ajout props :

```jsx
<GreffioPaymentTerminal
  ...
  onPayByCard={handleCheckout}
  isCreatingPayment={isCreatingPayment}
  cardButtonLabel="Payer par carte bancaire"
/>
```

#### Flow dossier standard (sidebar)

```jsx
<GreffioPaymentTerminal
  className="mt-5"
  ...
  onPayByCard={handleCheckout}
  isCreatingPayment={isCreatingPayment}
  cardButtonLabel="Payer maintenant"
/>
```

#### Anti-doublon bouton carte

**Avant :**

```jsx
{(showB2BProviders || resourceOrder) && !resourceLanding ? (
  <Button onClick={handleCheckout}>...</Button>
) : null}
```

**Après :**

```jsx
{(showB2BProviders || (resourceOrder && !currentUser)) && !resourceLanding ? (
  <Button onClick={handleCheckout}>...</Button>
) : null}
```

→ Si l’utilisateur est connecté et voit le terminal, le bouton carte standalone **n’apparaît plus** (la carte est dans l’accordéon).

---

### `src/mobile/MobilePaymentPage.jsx`

Mêmes changements :

- Import `GreffioPaymentTerminal`
- Props `onPayByCard`, `isCreatingPayment`, `cardButtonLabel`
- Condition anti-doublon `(resourceOrder && !currentUser)`

---

### `WalletPaymentTerminal.jsx` (commit `42f8226` puis refactor local)

**Commit `42f8226` :** création d’un wrapper centré empilant Amazon + Google.

**Refactor local :** fichier réduit à 1 ligne d’export pour rétrocompatibilité des imports restants.

---

## 9. Frontend – retour Amazon Pay / vérification

### Route (`src/App.jsx`)

```jsx
<Route path="/paiement/amazon-pay/retour" element={<PaymentVerificationPage />} />
```

### `PaymentVerificationPage.jsx` (commit `168024b`)

Ajouts :

- Import `completeAmazonPaySession`
- Lecture query params : `paymentId`, `amazonCheckoutSessionId`
- Détection `isAmazonPayReturn = location.pathname.includes('amazon-pay')`
- `useEffect` : appel `completeAmazonPaySession({ paymentId, amazonCheckoutSessionId })`
- États UI : loading / success / processing / error avec copy Amazon Pay
- Messages d’erreur orientant vers terminal (Amazon Pay, Google Pay, carte)

---

## 10. API client (`src/api/payments.js`)

Fonctions ajoutées (commit `168024b`) :

```js
export const getAmazonPayConfig = () => apiGet('/api/payments/amazon-pay/config');

export const createAmazonPaySession = ({ dossierId, resourceOrderId, offerCode }) =>
  apiPost('/api/payments/amazon-pay/session', { dossierId, resourceOrderId, offerCode });

export const completeAmazonPaySession = ({ paymentId, amazonCheckoutSessionId }) =>
  apiPost('/api/payments/amazon-pay/complete', { paymentId, amazonCheckoutSessionId });
```

Fonctions Google Pay existantes :

```js
export const getGooglePayConfig = () => apiGet('/api/payments/google-pay/config');
export const processGooglePayPayment = ({ dossierId, resourceOrderId, offerCode, paymentData }) =>
  apiPost('/api/payments/google-pay', { ... });
```

---

## 11. Corrections de bugs rencontrés

| Erreur | Symptôme | Cause racine | Correctif | Fichier |
|--------|----------|--------------|-----------|---------|
| API 404 Amazon Pay | Bouton ne charge pas | Backend non déployé VPS | Deploy tarball + restart PM2 | VPS |
| `API_ERROR` frontend | Message générique | Idem | Idem | – |
| `querySelector [object HTMLDivElement]` | Bouton Amazon invisible | `renderButton(DOMNode)` au lieu de sélecteur CSS | `#${buttonContainerId}` via `useId()` | `AmazonPayCheckoutPanel.jsx` |
| `InvalidSignatureError` | Widget Amazon refuse la session | Signature du JSON brut | `AMZN-PAY-RSASSA-PSS-V2\n{sha256(payload)}` + RSA-PSS | `amazonPayService.js` |
| Double bouton G Pay | Petit « G Pay » + bouton officiel | Marque SVG + `createButton()` | Suppression marque, mode embedded | `GooglePayCheckoutPanel.jsx` |
| `OR_BIBED_06` | Popup Google « Ce marchand ne parvient pas à accepter… » | `merchantId: BCR2DN4TZ4F2QR3B` fictif + gateway CAWL sans merchant | Gateway `example` en TEST, pas de merchantId fictif | `useGooglePay.js` |
| Bouton carte dupliqué | Deux CTAs carte | Terminal + bouton sidebar | Condition `!currentUser` sur bouton standalone | `PaymentPage`, `MobilePaymentPage` |
| Paiement Google TEST `pending` sur prod | Pas de redirection succès | `markPaid` bloqué par `NODE_ENV=production` | Autoriser `markPaid` si `GOOGLE_PAY_ENVIRONMENT=TEST` | `googlePayService.js` |

---

## 12. Déploiements effectués

### Frontend – Hostinger (statique)

| Étape | Détail |
|-------|--------|
| Build | `npm run build` → bundle principal `dist/assets/index-DXWQJ50I.js` |
| Archive | `dist_20260613_001500.zip` (~2,8 Mo) |
| Outil | MCP `hosting_deployStaticWebsite` |
| Domaine | `greffio.willentreprises.com` |
| Compte | `u379817729` |
| Résultat | Upload + deploy `Request accepted` |

### Backend – VPS Ubuntu

| Étape | Détail |
|-------|--------|
| Hôte | `187.127.232.210` (`/opt/greffio`) |
| Fichier poussé | `server/services/googlePayService.js` (lot local) |
| Commande | `pscp` → `pm2 restart greffio-api --update-env` |
| Health | `GET http://127.0.0.1:8787/api/payments/google-pay/config` → OK |

**Note :** Amazon Pay backend déployé lors des commits antérieurs (`168024b`, `50dfe6a`). Le lot terminal accordéon frontend est déployé via zip ; le code source correspondant n’est pas encore commité sur GitHub.

---

## 13. Configuration production (VPS + Seller Central)

### Seller Central Amazon Pay

| Paramètre | URL |
|-----------|-----|
| Return URL | `https://greffio.willentreprises.com/paiement/amazon-pay/retour` |
| JavaScript Origin | `https://greffio.willentreprises.com/` |
| IPN | `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay` |

Documenté dans `docs/AMAZON_PAY_SETUP.md`.

### Variables `.env` VPS – Amazon Pay

Voir `PRODUCTION_SECRETS_TEMPLATE.env` lignes 70–83.

### Variables `.env` VPS – Google Pay (état actuel)

```env
GOOGLE_PAY_ENVIRONMENT=TEST
GOOGLE_PAY_GATEWAY=cawl
GOOGLE_PAY_MERCHANT_ID=          # vide
GOOGLE_PAY_GATEWAY_MERCHANT_ID=  # vide
# CAWL_API_BASE_URL / CAWL_API_KEY non configurés
```

→ Mode **test** actif. Live impossible tant que CAWL + merchant IDs Google ne sont pas renseignés.

### Frontend build

Variables optionnelles dans `src/config/googlePay.js` :

- `VITE_GOOGLE_PAY_ENVIRONMENT`
- `VITE_GOOGLE_PAY_ENABLED`
- `VITE_GOOGLE_PAY_MERCHANT_ID`

La config runtime est **primée par l’API** `/api/payments/google-pay/config`.

---

## 14. Modifications locales non commitées (diff exact)

### Statistiques `git diff` (13/06)

```
 releases/MOBILE_RELEASE_1.2.8.md                   |  15 +-
 server/services/googlePayService.js                |  23 ++-
 src/components/payments/AmazonPayCheckoutPanel.jsx | 114 +++++++--------
 src/components/payments/GooglePayCheckoutPanel.jsx | 162 +++++++++++----------
 src/components/payments/WalletPaymentTerminal.jsx  |  57 +-------
 src/hooks/useGooglePay.js                          |  40 +++--
 src/mobile/MobilePaymentPage.jsx                   |   9 +-
 src/pages/PaymentPage.jsx                          |  14 +-
 8 files changed, 199 insertions(+), 235 deletions(-)
```

Plus fichier **non tracké** : `src/components/payments/GreffioPaymentTerminal.jsx` (230 lignes).

### `WalletPaymentTerminal.jsx` – contenu final

```js
export { GreffioPaymentTerminal as WalletPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
```

---

## 15. Limitations connues et prochaines étapes

### Google Pay production

Pour encaisser réellement :

1. Obtenir `GOOGLE_PAY_MERCHANT_ID` (Google Business Console).
2. Configurer CAWL : `CAWL_API_BASE_URL`, `CAWL_API_KEY`, `GOOGLE_PAY_GATEWAY_MERCHANT_ID`.
3. Passer `GOOGLE_PAY_ENVIRONMENT=PRODUCTION` sur VPS.
4. Tester capture token → CAWL dans `processGooglePayCharge()`.

### Amazon Pay

- Vérifier Seller Central : origin JS, return URL, IPN confirmés.
- Surveiller IPN `CHARGE` en logs PM2.

### Git

- Committer et pousser le lot `GreffioPaymentTerminal` + refactors embedded.
- Éviter de committer les archives `dist_*.zip`, `greffio-deploy.tar.gz`, dossiers `staging/`, `tmp/`.

### Mobile release

- `releases/MOBILE_RELEASE_1.2.8.md` modifié localement (+15 lignes) – à synchroniser si release mobile prévue.

---

## 16. Plan de test

### Terminal accordéon

- [ ] Page `/paiement` – terminal visible, montant TTC correct
- [ ] Amazon Pay ouvert par défaut, chevron animé
- [ ] Clic Google Pay → déroulement, Amazon se referme visuellement
- [ ] Clic Carte → bouton unique, pas de doublon sidebar
- [ ] Mobile : même comportement sur `MobilePaymentPage`

### Amazon Pay live

- [ ] Bouton gold visible, centré, max 340px
- [ ] Clic → redirect Amazon checkout
- [ ] Retour `/paiement/amazon-pay/retour?paymentId=…&amazonCheckoutSessionId=…`
- [ ] Page vérification → « Paiement confirmé »
- [ ] Dossier / ressource → statut payé

### Google Pay test

- [ ] Badge « Mode test Google » visible dans accordéon
- [ ] Bouton officiel « Pay with G Pay » unique (pas de petit G Pay en coin)
- [ ] Pas d’erreur `OR_BIBED_06` en TEST
- [ ] Après paiement démo → redirect vérification statut `paid`

### Carte bancaire

- [ ] Bouton accordéon → redirect prestataire (CAWL B2C / GoCardless B2B selon flow)
- [ ] État « Initialisation… » pendant `isCreatingPayment`

### API

```bash
curl -sS https://api.greffio.willentreprises.com/api/payments/amazon-pay/config
curl -sS https://api.greffio.willentreprises.com/api/payments/google-pay/config
```

---

## Annexe – autres fichiers touchés dans les commits antérieurs (hors lot local)

| Fichier | Modification (commit `168024b`) |
|---------|--------------------------------|
| `server/index.js` | `registerAmazonPayRoutes(app, { requireAuth, appUrl })` |
| `src/components/NavbarDropdown.jsx` | CTA « Créer mon espace » : `/simulateur?type=creation` → `/signup` (3 occurrences) |
| `PRODUCTION_SECRETS_TEMPLATE.env` | Bloc variables Amazon Pay (+15 lignes) |
| `docs/AMAZON_PAY_SETUP.md` | Runbook IPN, return URL, origin JS |

---

*Document généré le 13 juin 2026 – reflète l’ensemble des modifications apportées lors de l’intégration paiement Greffio (Amazon Pay production + terminal accordéon + correction Google Pay).*
