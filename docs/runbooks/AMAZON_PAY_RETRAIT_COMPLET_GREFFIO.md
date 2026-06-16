# Runbook – Retrait complet Amazon Pay Greffio (désactivation + suppression code)

> **Usage** : coller ce document **entier** dans Cursor (ou ChatGPT) quand tu voudras **retirer Amazon Pay** de Greffio – UI, API, webhooks, variables serveur, mentions marketing, Seller Central.
>
> **Statut au 13 juin 2026** : Amazon Pay est **intégré techniquement** (backend + terminal accordéon frontend) mais la **vérification marchand Seller Central est bloquée** (pages légales – corrigées séparément). Ce runbook sert à **couper proprement** l’intégration en attendant une éventuelle réactivation future.
>
> **Ne pas confondre avec** :
> - `docs/runbooks/AMAZON_PAY_VERIFICATION_LEGAL_GREFFIO.md` – débloquer la vérification (pages légales)
> - `docs/AMAZON_PAY_SETUP.md` – config Seller Central / variables

**Domaine production** : `https://greffio.willentreprises.com`  
**API** : `https://api.greffio.willentreprises.com`  
**Entité marchande** : WILLIAM ESTABLISHMENTS (Greffio)

---

## Table des matières

1. [Consigne Cursor (copier-coller)](#1-consigne-cursor-copier-coller)
2. [Objectifs et périmètre](#2-objectifs-et-périmètre)
3. [Stratégie recommandée : 2 phases](#3-stratégie-recommandée--2-phases)
4. [Phase A – Désactivation rapide (sans supprimer le code)](#4-phase-a--désactivation-rapide-sans-supprimer-le-code)
5. [Phase B – Suppression complète dans le repo](#5-phase-b--suppression-complète-dans-le-repo)
6. [Inventaire exhaustif des fichiers](#6-inventaire-exhaustif-des-fichiers)
7. [Modifications frontend détaillées](#7-modifications-frontend-détaillées)
8. [Modifications backend détaillées](#8-modifications-backend-détaillées)
9. [Variables d'environnement et secrets VPS](#9-variables-denvironnement-et-secrets-vps)
10. [Seller Central Amazon Pay](#10-seller-central-amazon-pay)
11. [Données existantes (paiements historiques)](#11-données-existantes-paiements-historiques)
12. [Déploiement et ordre d'exécution production](#12-déploiement-et-ordre-dexécution-production)
13. [Tests post-retrait](#13-tests-post-retrait)
14. [Rollback / réactivation future](#14-rollback--réactivation-future)
15. [Checklist finale](#15-checklist-finale)

---

## 1. Consigne Cursor (copier-coller)

```
Tu travailles sur le repo Greffio SaaS.

Objectif : RETIRER COMPLÈTEMENT Amazon Pay pour le moment – aucune référence UI,
aucun endpoint actif, aucune variable serveur requise, aucun script externe Amazon chargé.

Suis le runbook docs/runbooks/AMAZON_PAY_RETRAIT_COMPLET_GREFFIO.md :

1. Phase B complète (suppression code) – pas seulement masquage UI.
2. Ne pas toucher à la landing (LandingPage.jsx), navbar globale, tokens CSS globaux.
3. Conserver Google Pay, carte bancaire, GoCardless SEPA pro.
4. GreffioPaymentTerminal : retirer l’accordéon Amazon Pay ; Google Pay ou carte par défaut.
5. Supprimer routes /api/payments/amazon-pay/* et /api/webhooks/amazon-pay.
6. Retirer registerAmazonPayRoutes de server/index.js.
7. Mettre à jour tous les textes marketing (mentions légales, footer badges, FAQ SEO, signup, payment pages).
8. Ne pas committer de secrets (.env, .pem).
9. Laisser les lignes DB provider='amazon_pay' intactes (historique) – documenter seulement.
10. Mettre à jour .env.example et PRODUCTION_SECRETS_TEMPLATE.env (section Amazon commentée/supprimée).

Livrables :
- Diff minimal mais complet
- Liste des fichiers supprimés
- Commandes déploiement VPS (frontend + pm2 restart API)
- Note Seller Central (actions manuelles fondateur)

Réponds en français. Exécute les changements, ne te contente pas de lister.
```

---

## 2. Objectifs et périmètre

### Ce qu’on veut obtenir

| Zone | État cible |
|------|------------|
| UI paiement web/mobile | Plus de bouton, accordéon, badge ou texte « Amazon Pay » |
| API Greffio | Plus de routes `amazon-pay` ni webhook IPN |
| Scripts tiers | Plus de chargement `static-eu.payments-amazon.com/checkout.js` |
| Config serveur | Variables `AMAZON_PAY_*` retirées ou vides sur VPS |
| Marketing / légal | Textes « Amazon Pay, Google Pay… » → « Google Pay, carte… » |
| Seller Central | Origin / IPN désactivés ou store suspendu (action manuelle) |
| Code source | Fichiers dédiés supprimés ou archivés |

### Ce qu’on ne touche pas

- Landing page hero / structure (`LandingPage.jsx`)
- Identité visuelle globale (palette, navbar publique figée)
- Google Pay, CAWL, GoCardless, virement manuel
- Paiements **historiques** en base avec `provider = 'amazon_pay'` (audit comptable)

### Dossiers à ignorer pour le diff (non production)

- `staging-deploy/` – miroir déploiement ; resync ou regénération séparée
- `staging/` – idem
- Archives `dist_*.zip`, `greffio-deploy.tar.gz`

---

## 3. Stratégie recommandée : 2 phases

### Phase A – Désactivation rapide (~30 min)

Utile si tu veux **couper immédiatement** en production sans gros refactor :

1. VPS : vider toutes les variables `AMAZON_PAY_*` dans `/opt/greffio/.env`
2. `pm2 restart greffio-api --update-env`
3. L’API renvoie `enabled: false` sur `/api/payments/amazon-pay/config` → le panneau affiche une erreur / fallback

**Limite** : l’UI Amazon Pay reste visible (accordéon, badges footer, textes légaux).

### Phase B – Suppression complète (~2–4 h dev + déploiement)

À exécuter via la consigne Cursor section 1. C’est **ce que tu demanderas plus tard**.

Ordre :

```
Code repo (frontend + backend)
    → build frontend
    → déploiement Hostinger + VPS
    → Seller Central (manuel)
    → tests
    → suppression clé .pem sur VPS (optionnel, backup d’abord)
```

---

## 4. Phase A – Désactivation rapide (sans supprimer le code)

### VPS – vider les variables

Éditer `/opt/greffio/.env` (ou chemin réel) :

```bash
# Désactivation Amazon Pay – laisser vides ou commenter tout le bloc
# AMAZON_PAY_SANDBOX=false
# AMAZON_PAY_MERCHANT_ID=
# AMAZON_PAY_CLIENT_ID=
# ...
```

Redémarrer :

```bash
pm2 restart greffio-api --update-env
```

Vérifier :

```bash
curl -sS https://api.greffio.willentreprises.com/api/payments/amazon-pay/config
# Attendu : {"ok":true,"config":{"enabled":false,...}}
```

### Effet côté utilisateur

- `AmazonPayCheckoutPanel` affiche : *« Amazon Pay est prêt côté interface, mais les variables serveur ne sont pas encore complètes »* ou message indisponible.
- L’accordéon Amazon Pay reste **visible** – mauvaise UX si tu restes longtemps en Phase A seule.

---

## 5. Phase B – Suppression complète dans le repo

### 5.1 Fichiers à **supprimer** entièrement

| Fichier | Rôle |
|---------|------|
| `server/services/amazonPayService.js` | Signature RSASSA-PSS, checkout, IPN SNS |
| `server/routes/amazonPayRoutes.js` | Routes REST + webhook |
| `src/components/payments/AmazonPayCheckoutPanel.jsx` | Bouton + script Amazon |

### 5.2 Fichiers à **modifier** (liste maîtresse)

Voir sections 7 et 8 pour le détail ligne par ligne.

---

## 6. Inventaire exhaustif des fichiers

### Frontend (`src/`)

| Fichier | Référence Amazon Pay | Action Phase B |
|---------|---------------------|----------------|
| `components/payments/AmazonPayCheckoutPanel.jsx` | Composant entier | **Supprimer** |
| `components/payments/GreffioPaymentTerminal.jsx` | Accordéon, import, default `amazon-pay` | Retirer méthode Amazon ; default `google-pay` ou `card` |
| `components/layout/PaymentBrandBadges.jsx` | Badge `amazonpay` | Retirer entrée |
| `api/payments.js` | `getAmazonPayConfig`, `createAmazonPaySession`, `completeAmazonPaySession` | Supprimer 3 exports |
| `App.jsx` | Route `/paiement/amazon-pay/retour` | Supprimer route |
| `pages/PaymentVerificationPage.jsx` | Logique retour Amazon Pay | Retirer branche `isAmazonPayReturn` |
| `pages/PaymentPage.jsx` | Filtre `amazon-pay`, textes marketing | Retirer filtre + copy |
| `mobile/MobilePaymentPage.jsx` | Idem | Idem |
| `pages/LegalMentionsPage.jsx` | « Amazon Pay, Google Pay… » | Texte sans Amazon |
| `pages/SignupPage.jsx` | « Paiement sécurisé Amazon Pay… » | Texte sans Amazon |
| `pages/InterfacesPage.jsx` | Description interfaces | Retirer mention |
| `components/payments/GooglePayCheckoutPanel.jsx` | Fallback « Utilisez Amazon Pay » | Remplacer par « carte bancaire » |
| `config/catalog.js` | `PAYMENT_METHODS` entrée `amazon-pay` | Supprimer entrée |
| `config/siteFooter.js` | `GREFFIO_FOOTER_PAYMENT_LABELS` | Retirer `'Amazon Pay'` |
| `config/seoContent.js` | FAQ moyens de paiement | Retirer Amazon Pay |
| `config/businessCatalog.js` | Réexport PAYMENT_METHODS | Indirect via catalog.js |

### Backend (`server/`)

| Fichier | Action |
|---------|--------|
| `services/amazonPayService.js` | **Supprimer** |
| `routes/amazonPayRoutes.js` | **Supprimer** |
| `index.js` | Retirer `import registerAmazonPayRoutes`, appel `registerAmazonPayRoutes(...)`, exception raw body `/api/webhooks/amazon-pay` |
| `payments/types.js` | Retirer `AMAZON_PAY: 'amazon_pay'` du commentaire/const (garder compat lecture DB si besoin – voir §11) |

### Config / docs / env

| Fichier | Action |
|---------|--------|
| `.env.example` | Supprimer ou commenter bloc `AMAZON_PAY_*` |
| `PRODUCTION_SECRETS_TEMPLATE.env` | Idem |
| `docs/AMAZON_PAY_SETUP.md` | Archiver ou ajouter bannière « DÉSACTIVÉ » en tête |
| `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` | Ne pas modifier (historique) |
| `docs/contexte-amazon-pay-verification-shopfun-chatgpt.md` | Garder (historique blocage) |
| `releases/MOBILE_RELEASE_*.md` | Ne pas réécrire les releases passées |

### Mobile natif

| Fichier | Action |
|---------|--------|
| `src/mobile/MobilePaymentPage.jsx` | Via PaymentEntry – même changements que PaymentPage |
| `releases/MOBILE_RELEASE_1.2.10.md` | Mention historique – pas de changement obligatoire |

### Hors repo (VPS / Seller Central)

| Élément | Action |
|---------|--------|
| `/opt/greffio/secrets/amazon-pay-live.pem` | Backup puis suppression |
| Variables `.env` VPS | Retirer bloc Amazon |
| Seller Central origins / IPN | Voir §10 |

---

## 7. Modifications frontend détaillées

### 7.1 `GreffioPaymentTerminal.jsx`

**Avant** : 3 méthodes (Amazon Pay recommandé par défaut).

**Après** :

1. Supprimer `import AmazonPayCheckoutPanel`
2. Supprimer composant `AmazonMark`
3. Retirer l’objet `{ id: 'amazon-pay', ... }` du tableau `methods`
4. `useState('google-pay')` ou `'card'` comme défaut
5. Retirer le bloc `{method.id === 'amazon-pay' ? ...}`
6. Ajuster le sous-titre header : « deux chemins » au lieu de « trois chemins »

### 7.2 `PaymentPage.jsx` / `MobilePaymentPage.jsx`

```js
// Avant
methods.filter((method) => ['google-pay', 'amazon-pay', 'cards'].includes(method.id));

// Après
methods.filter((method) => ['google-pay', 'cards'].includes(method.id));
```

Remplacer toutes les occurrences texte :

| Avant | Après |
|-------|-------|
| `Amazon Pay, Google Pay ou carte` | `Google Pay ou carte bancaire` |
| `Paiement Amazon Pay / Google Pay` | `Paiement Google Pay / carte` |

### 7.3 `PaymentVerificationPage.jsx`

Supprimer :

- Import `completeAmazonPaySession` si plus utilisé
- Variables `amazonCheckoutSessionId`, `isAmazonPayReturn`
- `useEffect` de finalisation Amazon Pay
- États UI « Validation Amazon Pay en cours »

Conserver la page pour les autres providers (Google Pay, carte).

### 7.4 `App.jsx`

Supprimer la route :

```jsx
<Route path="/paiement/amazon-pay/retour" element={<PaymentVerificationPage />} />
```

### 7.5 `PaymentBrandBadges.jsx`

Retirer l’entrée :

```js
{ id: 'amazonpay', label: 'Amazon Pay', ... }
```

### 7.6 `catalog.js` – PAYMENT_METHODS

Supprimer l’objet :

```js
{
  id: 'amazon-pay',
  name: 'Amazon Pay',
  ...
}
```

### 7.7 `LegalMentionsPage.jsx`

Remplacer :

- Carte « Paiements » : `Google Pay, carte bancaire et prélèvement SEPA professionnel`
- Section moyens de paiement : idem sans Amazon Pay

### 7.8 `GooglePayCheckoutPanel.jsx`

Remplacer messages fallback :

- `Utilisez Amazon Pay ou la carte` → `Utilisez la carte bancaire`

---

## 8. Modifications backend détaillées

### 8.1 `server/index.js`

**Retirer** :

```js
import { registerAmazonPayRoutes } from './routes/amazonPayRoutes.js';
```

**Retirer** (vers fin bootstrap routes) :

```js
registerAmazonPayRoutes(app, { requireAuth, appUrl });
```

**Retirer** dans le middleware JSON (raw body exception) :

```js
if (req.path === '/api/webhooks/amazon-pay') return next();
```

> Après retrait, le webhook Amazon ne doit plus exister – les IPN Amazon recevront 404 (normal).

### 8.2 Supprimer fichiers

```bash
rm server/services/amazonPayService.js
rm server/routes/amazonPayRoutes.js
rm src/components/payments/AmazonPayCheckoutPanel.jsx
```

### 8.3 `server/payments/types.js`

Option **conservatrice** (recommandée) : garder `'amazon_pay'` dans le typedef JSDoc pour que le code qui lit l’historique DB ne casse pas, mais retirer la constante exportée `AMAZON_PAY` si plus utilisée.

Option **agressive** : retirer toute mention – OK si grep confirme zéro usage runtime.

### 8.4 `src/api/payments.js`

Supprimer :

```js
export const getAmazonPayConfig = ...
export const createAmazonPaySession = ...
export const completeAmazonPaySession = ...
```

---

## 9. Variables d'environnement et secrets VPS

### Variables à retirer du VPS

```env
AMAZON_PAY_SANDBOX
AMAZON_PAY_MERCHANT_ID
AMAZON_PAY_CLIENT_ID
AMAZON_PAY_STORE_ID
AMAZON_PAY_PUBLIC_KEY_ID
AMAZON_PAY_PRIVATE_KEY_PATH
AMAZON_PAY_PRIVATE_KEY
AMAZON_PAY_ACCESS_KEY
AMAZON_PAY_SECRET_KEY
AMAZON_PAY_LWA_SECRET_KEY
AMAZON_PAY_STORE_NAME
AMAZON_PAY_LEDGER_CURRENCY
AMAZON_PAY_CHECKOUT_LANGUAGE
AMAZON_PAY_SCRIPT_URL
AMAZON_PAY_REGION
```

### Fichier clé privée

Chemin typique documenté :

```text
/opt/greffio/secrets/amazon-pay-live.pem
```

**Avant suppression** : copie chiffrée locale (hors Git) si réactivation possible un jour.

### Templates repo

Mettre à jour :

- `.env.example` – retirer bloc lignes ~62–76
- `PRODUCTION_SECRETS_TEMPLATE.env` – retirer lignes ~70–83

---

## 10. Seller Central Amazon Pay

Actions **manuelles** (fondateur – Cursor ne peut pas les faire) :

### Option 1 – Suspendre / ne plus utiliser (recommandé temporairement)

1. [Integration Central](https://sellercentral-europe.amazon.com/external-payments/amazon-pay/integration-central/lwa)
2. Store Greffio → **Edit**
3. **Allowed JavaScript origins** : supprimer `https://greffio.willentreprises.com/`
4. **Return URL** : supprimer ou laisser (sans site actif, inutile)
5. **IPN URL** : supprimer `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay`
6. **Save**

### Option 2 – Fermer le compte marchand

Contact Seller Central si tu ne prévois **aucune** réactivation → [Contact](https://sellercentral-europe.amazon.com/cu/contact-us)

### Business info

Pas obligatoire de modifier [Business and contact info](https://sellercentral-europe.amazon.com/external-payments/business-and-contact-info) pour un simple retrait technique – sauf si tu closes le compte.

### Appeal en cours

Si un appeal de vérification était ouvert : **ne pas relancer**. Le retrait rend Amazon Pay inactif côté Greffio.

---

## 11. Données existantes (paiements historiques)

### Base SQLite / Postgres

Les paiements créés via Amazon Pay peuvent avoir :

```text
provider = 'amazon_pay'
provider_payload JSON contenant amazonPay, amazonCheckoutSessionId, etc.
```

**Ne pas supprimer** ces lignes – obligation d’audit / comptabilité.

### Ops / dashboard

Si l’ops affiche le nom du provider tel quel, `amazon_pay` peut rester visible sur **anciens** dossiers – c’est normal.

### Aucune migration SQL requise

Pas besoin de migration pour « nettoyer » l’enum provider.

---

## 12. Déploiement et ordre d'exécution production

### Ordre recommandé

```
1. Merge code Phase B (main)
2. npm run build
3. Déployer dist/ → Hostinger (frontend)
4. Déployer server/ → VPS (rsync ou pscp des fichiers modifiés + suppressions)
5. Éditer /opt/greffio/.env – retirer AMAZON_PAY_*
6. pm2 restart greffio-api --update-env
7. Seller Central – retirer origins / IPN
8. Tests §13
```

### Commandes type

```bash
# Local
npm run build

# VPS (adapter chemins)
pm2 restart greffio-api --update-env
pm2 logs greffio-api --lines 50

# Vérifier absence endpoints
curl -sS -o /dev/null -w "%{http_code}" https://api.greffio.willentreprises.com/api/payments/amazon-pay/config
# Attendu après suppression : 404
```

---

## 13. Tests post-retrait

### Frontend

- [ ] `/paiement` – terminal sans accordéon Amazon Pay
- [ ] `/paiement` – Google Pay + carte fonctionnent
- [ ] Footer – plus de badge Amazon Pay
- [ ] `/mentions-legales` – textes sans Amazon Pay
- [ ] `/signup` – texte paiement sans Amazon
- [ ] Mobile web `/paiement` – idem
- [ ] App native Android – parcours paiement sans crash

### Backend

- [ ] `GET /api/payments/amazon-pay/config` → **404**
- [ ] `POST /api/payments/amazon-pay/session` → **404**
- [ ] `POST /api/webhooks/amazon-pay` → **404**
- [ ] `GET /api/payments/google-pay/config` → OK
- [ ] `GET /api/health` → OK
- [ ] Logs PM2 sans `[amazon-pay]`

### Réseau / sécurité

- [ ] Aucune requête vers `static-eu.payments-amazon.com` dans l’onglet Network du navigateur sur `/paiement`
- [ ] Aucune variable `AMAZON_PAY_*` active sur VPS (`grep AMAZON_PAY /opt/greffio/.env` vide)

### Seller Central

- [ ] Origins JavaScript retirés ou store inactif
- [ ] IPN retiré

---

## 14. Rollback / réactivation future

Si tu veux **réactiver** Amazon Pay plus tard :

1. Restaurer fichiers depuis Git (commits `168024b`, `50dfe6a`, `50dfe6a`+ terminal accordéon)
2. Reconfigurer `.env` VPS + clé `.pem`
3. Seller Central : origins, return URL, IPN (voir `docs/AMAZON_PAY_SETUP.md`)
4. Pages légales conformes (voir `docs/runbooks/AMAZON_PAY_VERIFICATION_LEGAL_GREFFIO.md`)
5. Appeal Seller Central
6. Redéployer frontend + backend

Commits de référence :

| Commit | Contenu |
|--------|---------|
| `168024b` | Amazon Pay production, IPN, routes |
| `50dfe6a` | Fix signature bouton RSASSA-PSS |
| Lot local non commité | `GreffioPaymentTerminal.jsx` accordéon |

---

## 15. Checklist finale

### Code

- [ ] Fichiers Amazon Pay supprimés (service, routes, panel)
- [ ] `GreffioPaymentTerminal` sans Amazon
- [ ] Routes App sans `/paiement/amazon-pay/retour`
- [ ] API client sans fonctions Amazon
- [ ] Textes marketing / légaux mis à jour
- [ ] `.env.example` / secrets template mis à jour
- [ ] `grep -ri "amazon.pay\|amazon-pay\|Amazon Pay" src server` → 0 hit hors docs/historique

### Production

- [ ] Frontend déployé
- [ ] Backend déployé + PM2 restart
- [ ] Variables VPS retirées
- [ ] Clé `.pem` archivée/supprimée
- [ ] Seller Central nettoyé

### Communication

- [ ] Équipe ops informée (plus de Amazon Pay au checkout)
- [ ] Support client : répondre « Google Pay ou carte bancaire »

---

## Annexe – grep de vérification (post-retrait)

```bash
# Depuis la racine du repo – doit retourner uniquement docs/ et éventuellement staging-deploy/
rg -i "amazon.?pay|amazon-pay|amazon_pay|AMAZON_PAY" --glob "!staging-deploy/**" --glob "!staging/**" --glob "!docs/**"
```

Résultat attendu : **aucune** occurrence dans `src/` et `server/`.

---

## Annexe – URLs Amazon Pay actuelles (référence avant retrait)

| Type | URL |
|------|-----|
| JavaScript origin | `https://greffio.willentreprises.com/` |
| Return URL | `https://greffio.willentreprises.com/paiement/amazon-pay/retour` |
| IPN webhook | `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay` |
| Script checkout | `https://static-eu.payments-amazon.com/checkout.js` |
| API Amazon EU | `pay-api.amazon.eu` |

---

*Document généré pour Greffio / WILLIAM ESTABLISHMENTS – retrait Amazon Pay temporaire. À renvoyer tel quel à Cursor pour exécution automatisée.*
