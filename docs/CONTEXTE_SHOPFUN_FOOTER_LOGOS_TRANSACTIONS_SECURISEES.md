# Shopfun – Contexte : logos « Transactions sécurisées » dans le footer

> **Usage** : coller ce document entier dans Cursor (projet Shopfun), puis demander :
> « Ajoute la section Transactions sécurisées avec les logos Visa, Mastercard, CB, Amex dans le footer, en suivant ce contexte. »
>
> **Référence** : implémentation validée Greffio SaaS (William Establishments) · snapshot 16 juin 2026.
>
> **Objectif** : reproduire la **même méthode** que Greffio – pas seulement « mettre des images », mais une petite couche config + composant réutilisable + assets SVG versionnés par contexte (footer sombre vs checkout clair).

---

## Partie A – Instructions pour l’agent Cursor (Shopfun)

### Rôle

Tu implémentes une bande **« Transactions sécurisées »** dans le footer public de Shopfun, avec les marques de cartes **Visa, Mastercard, Cartes Bancaires (CB), American Express** – dans cet ordre.

### Ce que tu dois produire

1. **Assets SVG** dans `public/images/payments/` (ou équivalent Shopfun).
2. **Fichier config** `src/config/paymentBrands.js` (chemins + IDs + 3 variantes par marque).
3. **Composant** `PaymentBrandBadges` (3 modes : défaut, `inverse`, `floating`).
4. **Intégration footer** : titre + composant, sur fond sombre du footer existant.
5. **Accessibilité** : liste sémantique, labels sur les items, `alt=""` sur les `<img>` décoratives.

### Ce que tu ne dois PAS faire

| Interdit | Pourquoi |
|----------|----------|
| Boîtes blanches / cadres autour des logos sur footer **sombre** | Les `markSrc` sont transparents ; le footer doit rester propre |
| Rectangle sombre legacy Mastercard | Utiliser le **brand mark** (deux cercles rouge/orange), pas un badge rectangulaire |
| Modifier `visa-mark.svg` si copié depuis Greffio | Asset **validé** en prod Greffio |
| Logos PNG raster flous | Préférer SVG `object-contain` |
| Un seul fichier SVG pour tous les contextes | Footer sombre ≠ checkout clair (couleurs différentes) |
| Refonte globale du footer Shopfun | Ajout **local** de la section paiements uniquement |

### Checklist de validation visuelle

- [ ] Footer sombre : logos **sans cadre**, fond transparent, lisibles (Visa blanc, MC cercles colorés, CB gradient, Amex bleu+blanc).
- [ ] Espacement horizontal homogène (`gap-3`), hauteur ~32px (`h-8`).
- [ ] Mobile : logos ne débordent pas (`flex-wrap`).
- [ ] Pas de régression sur le reste du footer.
- [ ] Lazy loading + `decoding="async"` sur les images.

---

## Partie B – Architecture de référence (Greffio)

Greffio sépare **configuration**, **composant** et **intégration footer**. C’est le pattern à reproduire sur Shopfun.

### B.1 Arborescence cible (Shopfun)

```text
public/images/payments/
  visa.svg              # badge encadré (pages claires, optionnel)
  visa-mark.svg         # footer sombre – wordmark blanc, fond transparent
  visa-checkout.svg     # checkout clair – couleurs officielles
  mastercard.svg
  mastercard-mark.svg
  mastercard-checkout.svg
  cb.svg
  cb-mark.svg
  cb-checkout.svg
  amex.svg
  amex-mark.svg
  amex-checkout.svg
  apple-pay.svg         # optionnel – checkout / wallet, pas footer principal
  google-pay.svg        # optionnel
  sepa.svg              # optionnel – si virement SEPA affiché

src/config/paymentBrands.js
src/components/layout/PaymentBrandBadges.jsx   # ou chemin équivalent Shopfun
```

**Source des SVG Greffio** (à copier si Shopfun n’a pas encore les assets) :

`Greffio SaaS/public/images/payments/*.svg`

### B.2 Taxonomie des 3 variantes SVG

| Variante | Champ config | Contexte UI | Règle visuelle |
|----------|--------------|-------------|----------------|
| **Badge encadré** | `src` | Pages claires, cartes blanches | Logo dans rectangle blanc / badge type « carte » |
| **Mark (footer inverse)** | `markSrc` | Footer **sombre** (`inverse`) | Fond **transparent** ; Visa = wordmark blanc ; MC = deux cercles seuls ; CB = gradient sans boîte ; Amex = rectangle bleu acceptable |
| **Checkout** | `checkoutSrc` | Terminal paiement fond clair (`floating`) | Couleurs officielles, **sans cadre** autour |

**Footer Shopfun** → toujours `markSrc` via `PaymentBrandBadges inverse`.

### B.3 Config – `paymentBrands.js`

Reproduire la structure Greffio (adapter les chemins si Shopfun utilise un autre dossier public) :

```javascript
/**
 * Marques de paiement – 3 assets par réseau carte.
 * Footer sombre : markSrc + PaymentBrandBadges inverse.
 * Checkout : checkoutSrc + PaymentBrandBadges floating.
 */

export const PRINCIPAL_PAYMENT_BRANDS = [
  {
    id: 'visa',
    label: 'Visa',
    src: '/images/payments/visa.svg',
    markSrc: '/images/payments/visa-mark.svg',
    checkoutSrc: '/images/payments/visa-checkout.svg',
  },
  {
    id: 'mastercard',
    label: 'Mastercard',
    src: '/images/payments/mastercard.svg',
    markSrc: '/images/payments/mastercard-mark.svg',
    checkoutSrc: '/images/payments/mastercard-checkout.svg',
  },
  {
    id: 'cb',
    label: 'Cartes Bancaires',
    src: '/images/payments/cb.svg',
    markSrc: '/images/payments/cb-mark.svg',
    checkoutSrc: '/images/payments/cb-checkout.svg',
  },
  {
    id: 'amex',
    label: 'American Express',
    src: '/images/payments/amex.svg',
    markSrc: '/images/payments/amex-mark.svg',
    checkoutSrc: '/images/payments/amex-checkout.svg',
  },
];

/** Footer – ordre fixe : Visa, MC, CB, AMEX */
export const FOOTER_PAYMENT_BRAND_IDS = ['visa', 'mastercard', 'cb', 'amex'];

export const FOOTER_PAYMENT_BRANDS = FOOTER_PAYMENT_BRAND_IDS.map(
  (id) => PRINCIPAL_PAYMENT_BRANDS.find((brand) => brand.id === id),
).filter(Boolean);

/** Checkout carte – même ordre */
export const CHECKOUT_PAYMENT_BRAND_IDS = ['visa', 'mastercard', 'cb', 'amex'];
```

Fichier Greffio source : `src/config/paymentBrands.js`.

### B.4 Composant – `PaymentBrandBadges`

Composant React **sans dépendance métier** – uniquement affichage.

**Props :**

| Prop | Défaut | Usage |
|------|--------|-------|
| `inverse` | `false` | Footer sombre → `markSrc` + tailles footer |
| `floating` | `false` | Checkout → `checkoutSrc`, sans bordure |
| `compact` | `false` | Footer mobile – logos légèrement plus petits |
| `brandIds` | selon mode | Override liste (rare) |
| `className` | – | Marge top du bloc logos |

**Résolution de l’asset :**

```javascript
const resolveBrandSrc = (brand, { inverse, floating }) => {
  if (floating) return brand.checkoutSrc || brand.markSrc || brand.src;
  if (inverse) {
    // Visa footer : toujours markSrc (wordmark blanc validé)
    if (brand.id === 'visa') return brand.markSrc;
    return brand.markSrc || brand.checkoutSrc || brand.src;
  }
  return brand.src;
};
```

**Cache-bust footer** (optionnel mais utilisé Greffio) :

```javascript
const withAssetVersion = (src, version = '20260615') => {
  if (!src || src.includes('?')) return src;
  return `${src}?v=${version}`;
};
```

Appliquer `withAssetVersion` uniquement en mode `inverse` (footer).

**Tailles footer inverse (Greffio – reproduire) :**

```javascript
const FOOTER_INVERSE_BRAND_CLASS = {
  visa: 'h-8 w-[2.75rem]',
  mastercard: 'h-8 w-10',
  cb: 'h-8 w-10',
  amex: 'h-8 w-12 rounded-sm',
};
```

**Mode défaut (pages claires)** : chaque logo dans `rounded-md border border-border/40 bg-white shadow-sm`.

**Mode inverse / floating** : pas de bordure, pas de fond blanc sur le wrapper.

**Accessibilité :**

```jsx
<div role="list" aria-label="Moyens de paiement acceptés">
  <span role="listitem" title={brand.label} aria-label={brand.label}>
    <img alt="" aria-hidden="true" loading="lazy" decoding="async" />
  </span>
</div>
```

Fichier Greffio source : `src/components/layout/PaymentBrandBadges.jsx`.

### B.5 Intégration footer – section « Transactions sécurisées »

Greffio place la section **avant** le bandeau légal (copyright), dans un footer `bg-[#0b1220]` (bleu nuit).

**Desktop (`GreffioUltraFooter.jsx`) :**

```jsx
<div className="mt-8 grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-center">
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
      Transactions sécurisées
    </p>
    <PaymentBrandBadges inverse className="mt-3" />
  </div>
  {/* Optionnel : encart conformité à droite – adapter copy Shopfun */}
</div>
```

**Mobile (`MobileFooter.jsx`) :**

```jsx
<div className="mt-6 border-b border-white/10 pb-6">
  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
    Transactions sécurisées
  </p>
  <PaymentBrandBadges inverse compact className="mt-3" />
</div>
```

**Adapter pour Shopfun :**

- Reprendre le **libellé** « Transactions sécurisées » (ou variante légale Shopfun).
- Utiliser les **tokens couleur du footer Shopfun** pour le titre (`text-white/55`, uppercase, tracking).
- Ne pas changer la structure globale du footer – **insérer** ce bloc dans la zone existante équivalente.

Fichiers Greffio : `src/components/layout/GreffioUltraFooter.jsx`, `src/mobile/MobileFooter.jsx`.

### B.6 Checkout (optionnel Shopfun)

Si Shopfun a une page paiement, réutiliser le même composant :

```jsx
<PaymentBrandBadges compact floating />
```

- `floating` → `checkoutSrc`, logos colorés, **sans cadre**.
- Processeur (ex. Mollie, Stripe) : badge texte séparé, pas mélangé avec les réseaux carte dans le footer.

Greffio checkout : `src/components/payments/GreffioPaymentTerminal.jsx` ligne ~188.

Greffio badge processeur (référence) : `src/components/payments/MollieSecureTrustBadge.jsx` – texte « Paiements sécurisés effectués par » + wordmark Mollie.

---

## Partie C – Spécifications assets (copier depuis Greffio)

### C.1 Visa

| Fichier | Description |
|---------|-------------|
| `visa-mark.svg` | Wordmark **blanc** `#fff`, viewBox large, fond transparent – **NE PAS MODIFIER** si copié |
| `visa-checkout.svg` | Wordmark bleu officiel pour fond clair |
| `visa.svg` | Badge avec fond (pages claires) |

### C.2 Mastercard

| Fichier | Description |
|---------|-------------|
| `mastercard-mark.svg` | **Deux cercles** seuls (`#EB001B` + `#F79E1B`), fond transparent |
| `mastercard-checkout.svg` | Idem ou variante checkout |
| **Interdit** | Ancien `mastercard.svg` avec rectangle sombre `#253747` comme logo footer |

### C.3 Cartes Bancaires (CB)

| Fichier | Description |
|---------|-------------|
| `cb-mark.svg` | Logo CB avec **gradient** vert → bleu, sans rectangle blanc |
| `cb-checkout.svg` | Variante checkout |

### C.4 American Express

| Fichier | Description |
|---------|-------------|
| `amex-mark.svg` | Rectangle bleu `#2557D6` + wordmark blanc (acceptable sur footer sombre) |
| `amex-checkout.svg` | Variante checkout |

### C.5 Wallets & SEPA (footer optionnel)

Greffio **ne les met pas** dans `FOOTER_PAYMENT_BRAND_IDS` – seulement sur checkout si pertinent :

- `apple-pay.svg`, `google-pay.svg` – badges avec fond blanc (OK sur checkout clair).
- `sepa.svg` – si Shopfun affiche le virement SEPA.

Pour le footer Shopfun : **rester sur Visa + MC + CB + Amex** comme Greffio, sauf demande explicite d’élargir.

---

## Partie D – Plan d’implémentation pas à pas (Shopfun)

### Étape 1 – Assets

1. Créer `public/images/payments/`.
2. Copier depuis Greffio les 12 SVG principaux (4 marques × 3 variantes) ou équivalents officiels.
3. Vérifier en local : ouvrir chaque SVG sur fond `#0b1220` (footer) et fond `#f8fafc` (checkout).

### Étape 2 – Config

1. Créer `src/config/paymentBrands.js` (contenu Partie B.3).
2. Vérifier que les chemins `/images/payments/...` correspondent au dossier `public` de Shopfun (Vite/CRA/Next : généralement `public/` → racine URL).

### Étape 3 – Composant

1. Créer `PaymentBrandBadges.jsx` (logique Partie B.4).
2. Utiliser la helper `cn()` existante Shopfun (clsx/tailwind-merge) ou équivalent.
3. Tester les 3 modes : défaut, `inverse`, `floating`.

### Étape 4 – Footer

1. Localiser le composant footer public Shopfun (équivalent `GreffioUltraFooter` / `Footer.jsx`).
2. Ajouter le bloc titre + `<PaymentBrandBadges inverse />`.
3. Si footer mobile séparé : `inverse compact`.

### Étape 5 – QA

1. Desktop + mobile, zoom 100 % et 200 %.
2. Pas de boîtes blanches parasites sur fond sombre.
3. Ordre : Visa → Mastercard → CB → Amex.
4. Lighthouse / axe : liste accessible, pas de `alt` redondant sur 4 images identiques.

---

## Partie E – Mapping fichiers Greffio → Shopfun

| Greffio (référence) | Rôle | Shopfun (à créer / adapter) |
|--------------------|------|-----------------------------|
| `public/images/payments/*.svg` | Assets | `public/images/payments/*.svg` |
| `src/config/paymentBrands.js` | Source de vérité IDs + chemins | Idem |
| `src/components/layout/PaymentBrandBadges.jsx` | Affichage | `PaymentBrandBadges` (chemin layout Shopfun) |
| `src/components/layout/GreffioUltraFooter.jsx` | Footer desktop | Footer Shopfun desktop |
| `src/mobile/MobileFooter.jsx` | Footer mobile | Footer Shopfun mobile si existant |
| `docs/PAYMENT_LOGOS_LOCKED.md` | Règles verrouillage | Optionnel : `docs/PAYMENT_LOGOS.md` Shopfun |
| `.cursor/rules/payment-logos-locked.mdc` | Règle Cursor | Optionnel pour éviter régressions |

---

## Partie F – Prompts Cursor prêts à l’emploi (Shopfun)

### F.1 Implémentation complète

```text
Lis docs/CONTEXTE_SHOPFUN_FOOTER_LOGOS_TRANSACTIONS_SECURISEES.md.

Implémente la section « Transactions sécurisées » dans le footer Shopfun :
- Copier / créer les SVG dans public/images/payments/
- paymentBrands.js + PaymentBrandBadges (3 modes)
- Intégration footer sombre inverse + mobile compact
- Ne pas refondre le reste du footer
- Suivre exactement la méthode Greffio (markSrc, pas de cadres sur fond sombre)
```

### F.2 Assets seulement

```text
Copie les assets payment depuis le repo Greffio (public/images/payments/) vers Shopfun.
Vérifier visa-mark.svg et mastercard-mark.svg sur fond #0b1220.
```

### F.3 Checkout seulement

```text
Réutilise PaymentBrandBadges avec floating sur la page paiement Shopfun.
checkoutSrc, sans cadres. Réseaux : visa, mastercard, cb, amex.
```

---

## Partie G – Notes légales & marque (brief)

- Les logos Visa, Mastercard, CB et Amex sont des **marques déposées** ; usage typique = indication des moyens de paiement acceptés sur un site marchand.
- Shopfun doit n’afficher que les réseaux **réellement acceptés** par son processeur de paiement.
- Le libellé « Transactions sécurisées » est informatif ; ne remplace pas les mentions légales CGV / processeur (Stripe, Mollie, etc.).
- Greffio cite Mollie dans les pages légales et sur le terminal – pas dans la rangée footer des réseaux carte.

---

## Références Greffio (lecture seule)

| Élément | Chemin |
|---------|--------|
| Config marques | `src/config/paymentBrands.js` |
| Composant badges | `src/components/layout/PaymentBrandBadges.jsx` |
| Footer desktop | `src/components/layout/GreffioUltraFooter.jsx` (l.114–118) |
| Footer mobile | `src/mobile/MobileFooter.jsx` (l.101–105) |
| Doc verrouillage | `docs/PAYMENT_LOGOS_LOCKED.md` |
| Assets SVG | `public/images/payments/` |

---

*Document généré pour réplication cross-projet (Shopfun ← Greffio). Mettre à jour la version cache `withAssetVersion` lors d’un changement d’assets SVG.*
