# Guide complet – Footer public Greffio

> **Usage** : document de référence pour reproduire le footer marketing Greffio sur un autre projet (Shopfun, nouveau SaaS, etc.) ou pour qu’un agent Cursor implémente la même structure.
>
> **Snapshot** : 16 juin 2026 · repo Greffio SaaS · inspiration UX : footers structurés type Namirial (colonnes, conformité, paiements).

---

## Table des matières

1. [Vision produit & UX](#1-vision-produit--ux)
2. [Les 3 variantes de footer](#2-les-3-variantes-de-footer)
3. [Design system visuel](#3-design-system-visuel)
4. [Anatomie zone par zone](#4-anatomie-zone-par-zone)
5. [Architecture fichiers](#5-architecture-fichiers)
6. [Configuration des colonnes](#6-configuration-des-colonnes)
7. [Données éditeur / légales](#7-données-éditeur--légales)
8. [Composant principal – `GreffioUltraFooter`](#8-composant-principal--greffioultrafooter)
9. [Footer mobile – `MobileFooter`](#9-footer-mobile--mobilefooter)
10. [Logos paiement – `PaymentBrandBadges`](#10-logos-paiement--paymentbrandbadges)
11. [Intégration dans les pages](#11-intégration-dans-les-pages)
12. [Sous-composants internes](#12-sous-composants-internes)
13. [Responsive & breakpoints](#13-responsive--breakpoints)
14. [Accessibilité](#14-accessibilité)
15. [Plan d’implémentation pas à pas](#15-plan-dimplémentation-pas-à-pas)
16. [Variantes & props](#16-variantes--props)
17. [Références croisées](#17-références-croisées)

---

## 1. Vision produit & UX

Le footer Greffio n’est pas un bandeau copyright minimal. C’est un **footer marketing structuré** qui :

- **Rassure** (conformité, hébergement Europe, transactions sécurisées).
- **Oriente** (navigation vers produit, SEO, documentation, conformité).
- **Clarifie le positionnement** (service privé, pas un organe de l’État).
- **Donne un accès direct au support** (CTA Contact).
- **Respecte le mobile** (accordéon, pas 5 colonnes empilées illisibles).

Principes :

| Principe | Application |
|----------|-------------|
| Fond sombre institutionnel | `#0b1220` (bleu nuit William) – contraste net avec pages claires |
| Hiérarchie en bandes | Chaque section = `border-b border-white/10` |
| Labels de section | Uppercase 11px, tracking large, `text-white/55` |
| Liens secondaires | `text-white/72` → hover `text-white` |
| Touch targets | Liens footer `min-h-[36px]` |
| Contenu data-driven | Colonnes dans `siteFooter.js`, pas hardcodées dans le JSX |

---

## 2. Les 3 variantes de footer

Greffio utilise **trois footers** selon le contexte :

| Composant | Contexte | Fond | Contenu |
|-----------|----------|------|---------|
| **`GreffioUltraFooter`** | Landing, pages marketing desktop | `#0b1220` sombre | Complet : barre utilitaire, intro, 5 colonnes, paiements, conformité, légal |
| **`MobileFooter`** | Web mobile `<768px` | `#0b1220` sombre | Même contenu, layout accordéon + `max-w-lg` |
| **`PublicMinimalLegalFooter`** | Login desktop, pages utilitaires | `bg-muted/20` clair | Copyright + 5 liens légaux seulement |

**Règle de sélection** (`PublicPageLayout.jsx`) :

```text
footer === 'marketing'  → mobile ? MobileFooter : GreffioUltraFooter
footer === 'minimal'    → mobile ? MobileFooter : PublicMinimalLegalFooter
```

Sur mobile web, **même le mode minimal affiche `MobileFooter`** (footer complet) – seul le desktop minimal reste léger.

**Cas particuliers :**

- `SeoPages` desktop : `GreffioUltraFooter compact showIntro={false}` (colonnes sans bloc intro logo).
- `LandingPage` : `<GreffioUltraFooter />` en mode complet par défaut.

---

## 3. Design system visuel

### 3.1 Couleurs

| Token / valeur | Usage footer |
|----------------|--------------|
| `bg-[#0b1220]` | Fond principal (`--we-blue-dark` dans `index.css`) |
| `border-white/10` | Séparateurs horizontaux |
| `text-white` | Titres forts, hover liens |
| `text-white/72` | Corps de lien, description courte |
| `text-white/55` | Labels section, mentions légales, disclaimer |
| `text-white/65` | Texte encart conformité |
| `border-white/15` | Badge langue |
| `border-white/20` | Bouton outline Contact |
| `bg-white/5` | Fond bouton outline |
| Encart conformité | `border-emerald-400/20 bg-emerald-950/30` |
| Icône conformité | `text-emerald-300` |

### 3.2 Typographie

| Élément | Classes Tailwind |
|---------|------------------|
| Label de section (« Utilitaire », « Transactions sécurisées ») | `text-[11px] font-bold uppercase tracking-[0.14em] text-white/55` |
| Liens colonnes | `text-sm leading-snug` |
| Description intro | `text-sm leading-7 text-white/70` |
| Disclaimer service | `text-xs leading-6 text-white/55` |
| Bandeau légal | `text-xs leading-6 text-white/55` |
| Titre encart conformité | `text-sm font-bold text-white` |
| Texte encart | `text-xs leading-5 text-white/65` |

Fonts globales Greffio : **Inter** (UI), **Plus Jakarta Sans** (wordmark logo via `GreffioLogo`).

### 3.3 Espacements & conteneur

| Zone | Classes |
|------|---------|
| Conteneur max | `mx-auto max-w-7xl` (desktop) · `max-w-lg` (mobile) |
| Padding footer | `px-4 py-10 sm:px-6 lg:px-8 lg:py-12` |
| Gap colonnes | `gap-8` |
| Marge section | `mt-8` entre bandes |
| Padding bande | `pb-6` ou `pb-8` avant `border-b` |

### 3.4 Bouton Contact (outline sombre)

```jsx
<Button
  asChild
  variant="outline"
  className="h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
>
  <Link to="/contact">
    <Mail className="h-4 w-4" />
    Contact & support
  </Link>
</Button>
```

Mobile : `w-full` sur le bouton.

---

## 4. Anatomie zone par zone

Schéma vertical du **`GreffioUltraFooter`** (mode complet, desktop) :

```text
┌─────────────────────────────────────────────────────────────────┐
│ FOOTER bg #0b1220 · border-t border-white/10                    │
├─────────────────────────────────────────────────────────────────┤
│ [A] BARRE UTILITAIRE (border-b)                                 │
│     Label "Greffio" + pitch court          [Contact & support]  │
├─────────────────────────────────────────────────────────────────┤
│ [B] INTRO + COLONNES (border-b) · lg:grid 1.1fr / 1.9fr        │
│     ┌──────────────┐  ┌────┬────┬────┬────┬────┐               │
│     │ Logo inverse │  │Util│Prod│Conf│SEO │Doc │  (5 cols)     │
│     │ Description  │  │    │    │    │    │    │               │
│     │ Disclaimer   │  └────┴────┴────┴────┴────┘               │
├─────────────────────────────────────────────────────────────────┤
│ [C] PAIEMENTS + CONFORMITÉ (border-b) · lg:grid 1fr / auto    │
│     Transactions sécurisées          │ Encart emerald         │
│     [Visa][MC][CB][Amex]             │ ShieldCheck + texte    │
├─────────────────────────────────────────────────────────────────┤
│ [D] BANDEAU LÉGAL                                               │
│     © + RCS + adresse + email + disclaimer juridique            │
│     [Français] À propos · Mentions légales · email             │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile (`MobileFooter`)** : zones A→D identiques en contenu, mais :

- Colonnes → **Accordion** Radix (une section ouverte par défaut : `utilitaire`).
- Pas de barre utilitaire séparée : logo + pitch + CTA dans le premier bloc.
- Encart conformité **pleine largeur** sous les logos paiement (pas en colonne droite).

---

## 5. Architecture fichiers

```text
src/
  config/
    siteFooter.js          # GREFFIO_FOOTER_COLUMNS – data des 5 colonnes
    publisher.js           # Raison sociale, RCS, adresse, emails
    paymentBrands.js       # IDs + chemins SVG logos paiement
  components/
    layout/
      GreffioUltraFooter.jsx      # Footer desktop complet
      PublicMinimalLegalFooter.jsx # Footer léger clair
      PublicPageLayout.jsx        # Wrapper pages publiques + choix footer
      PaymentBrandBadges.jsx      # Logos Visa/MC/CB/Amex
    GreffioLogo.jsx               # variant="inverse" sur fond sombre
    ui/
      button.jsx                  # shadcn Button
      accordion.jsx               # shadcn Accordion (mobile)
  mobile/
    MobileFooter.jsx              # Footer mobile web
  utils/
    platform.js                   # isMobileBrowserViewport() < 768px

public/
  images/payments/               # SVG markSrc pour footer inverse
  icons/greffio-icon.svg         # Si logo mark-only
```

---

## 6. Configuration des colonnes

Fichier : `src/config/siteFooter.js`

Structure de chaque colonne :

```javascript
{
  id: 'utilitaire',           // id stable (accordion mobile value=)
  title: 'Utilitaire',        // label section uppercase
  links: [
    { to: '/a-propos', label: 'À propos de Greffio' },
    // ...
  ],
}
```

**5 colonnes Greffio** (ordre fixe) :

| id | title | Rôle |
|----|-------|------|
| `utilitaire` | Utilitaire | À propos, contact, tarifs, app, guide |
| `produit` | Produit | Catalogue, simulateur, espace client, ressources |
| `conformite` | Conformité | Confidentialité, cookies, suppressions RGPD |
| `seo` | Formalités & SEO | Pages SEO long tail (création, KBIS, FAQ…) |
| `documentation` | Documentation | Mentions légales, procuration, paiement |

**Pour un autre projet** : dupliquer ce fichier, adapter les `to` et `label`, garder les `id` courts et stables.

Le composant **ne duplique pas** les liens – il mappe `GREFFIO_FOOTER_COLUMNS`.

---

## 7. Données éditeur / légales

Fichier : `src/config/publisher.js`

Constantes injectées dans le bandeau [D] :

```javascript
PUBLISHER_LEGAL_NAME    // 'WILLIAM ESTABLISHMENTS'
PUBLISHER_RCS           // 'RCS Nice 102 230 414'
PUBLISHER_ADDRESS_FULL  // adresse complète
PUBLISHER_CONTACT_EMAIL // contact@willentreprises.com
PUBLISHER_PHONE         // '04 11 81 86 70'
PUBLISHER_SERVICE_DISCLAIMER // texte service privé / pas l'État
```

**Textes footer codés en dur** (à centraliser si refonte) :

- Pitch barre utilitaire : « Formalités d'entreprise, documents et suivi… »
- Description intro : « Application SaaS de gestion de formalités… »
- Disclaimer greffe / Infogreffe (doublon partiel de `PUBLISHER_SERVICE_DISCLAIMER`)
- Disclaimer conseil juridique : « Les contenus ne constituent pas un conseil juridique… »
- Encart conformité : hébergement Europe, signatures, journalisation

**Bonnes pratiques** : une seule source pour email (footer affiche parfois `greffio@willentreprises.com` en dur vs `PUBLISHER_CONTACT_EMAIL` – harmoniser sur nouveau projet).

---

## 8. Composant principal – `GreffioUltraFooter`

Fichier : `src/components/layout/GreffioUltraFooter.jsx`

### 8.1 Props

| Prop | Défaut | Effet |
|------|--------|-------|
| `id` | `'mentions-legales'` | `id` HTML du `<footer>` (ancre scroll) |
| `className` | – | Classes additionnelles |
| `compact` | `false` | Mode réduit (voir §16) |
| `showIntro` | `true` | Affiche bloc logo + description à gauche des colonnes |

### 8.2 Structure JSX (ordre d’implémentation)

```jsx
<footer id={id} className="border-t border-white/10 bg-[#0b1220] text-white ...">
  <div className="mx-auto max-w-7xl">
    {/* 1. Barre utilitaire – masquée si compact */}
  {/* 2. Intro + colonnes OU colonnes seules */}
  {/* 3. Paiements + encart conformité – masqué si compact */}
  {/* 4. Bandeau légal – toujours visible */}
  </div>
</footer>
```

### 8.3 Grille colonnes

```jsx
<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
  {columns.map((column) => (
    <FooterColumn key={column.id} title={column.title} links={column.links} />
  ))}
</div>
```

Avec intro (`showIntro && !compact`) :

```jsx
<div className="lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
  <div>{/* logo + textes */}</div>
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">{/* colonnes */}</div>
</div>
```

### 8.4 Logo sur fond sombre

```jsx
<GreffioLogo variant="inverse" />
```

`variant="inverse"` résout en interne vers le style **tile** : pastille bleue Greffio + wordmark blanc (`bg-[hsl(var(--greffio-blue))]`).

---

## 9. Footer mobile – `MobileFooter`

Fichier : `src/mobile/MobileFooter.jsx`

### 9.1 Différences clés vs desktop

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Conteneur | `max-w-7xl` | `max-w-lg px-4 py-8` |
| Colonnes | Grille 5 cols | `Accordion` type `multiple` |
| Section ouverte par défaut | – | `defaultValue={['utilitaire']}` |
| Logos paiement | `PaymentBrandBadges inverse` | `inverse compact` |
| Encart conformité | Colonne droite | Bloc pleine largeur sous paiements |
| CTA Contact | Bouton inline barre utilitaire | Bouton `w-full` sous intro |

### 9.2 Accordéon – pattern

```jsx
<Accordion type="multiple" defaultValue={['utilitaire']} className="border-b border-white/10 pb-2">
  {GREFFIO_FOOTER_COLUMNS.map((column) => (
    <AccordionItem key={column.id} value={column.id} className="border-white/10">
      <AccordionTrigger className="py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 hover:no-underline [&[data-state=open]]:text-white/80">
        {column.title}
      </AccordionTrigger>
      <AccordionContent className="pb-3">
        <ul className="space-y-0.5">
          {column.links.map((link) => (
            <li key={link.to}>
              <FooterLink to={link.to}>{link.label}</FooterLink>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

**Important** : `value={column.id}` doit correspondre aux `id` dans `siteFooter.js`.

---

## 10. Logos paiement – `PaymentBrandBadges`

Section [C] du footer. Voir aussi `docs/CONTEXTE_SHOPFUN_FOOTER_LOGOS_TRANSACTIONS_SECURISEES.md`.

### 10.1 Usage footer

```jsx
<p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
  Transactions sécurisées
</p>
<PaymentBrandBadges inverse className="mt-3" />
```

Mobile : ajouter `compact`.

### 10.2 Règles visuelles

- Mode `inverse` → assets `markSrc` (fond transparent).
- **Pas de cadre blanc** autour des logos sur fond sombre.
- Ordre : Visa → Mastercard → CB → Amex (`FOOTER_PAYMENT_BRAND_IDS`).
- Hauteur cible : `h-8` (32px).

### 10.3 Config

`src/config/paymentBrands.js` + SVG dans `public/images/payments/`.

---

## 11. Intégration dans les pages

### 11.1 Via `PublicPageLayout` (recommandé)

```jsx
import { PublicPageLayout } from '@/components/layout/PublicPageLayout.jsx';

export const MaPage = () => (
  <PublicPageLayout footer="marketing">
  <main>...</main>
  </PublicPageLayout>
);
```

`footer="minimal"` pour pages auth desktop (login) → footer léger clair.

### 11.2 Directement sur une page

```jsx
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';

export const LandingPage = () => (
  <>
    <main>...</main>
    <GreffioUltraFooter />
  </>
);
```

### 11.2 Choix mobile / desktop manuel

```jsx
import { isMobileBrowserViewport } from '@/utils/platform.js';

{isMobileBrowserViewport() ? <MobileFooter /> : <GreffioUltraFooter />}
```

Breakpoint : `MOBILE_BREAKPOINT = 768` dans `platform.js` (web non-Capacitor, `innerWidth < 768`).

---

## 12. Sous-composants internes

Définis dans `GreffioUltraFooter.jsx` (peuvent être extraits sur un gros projet) :

### `FooterLink`

```jsx
const FooterLink = ({ to, children, className }) => (
  <Link
    to={to}
    className={cn(
      'inline-flex min-h-[36px] items-center text-sm leading-snug text-white/72 transition hover:text-white',
      className,
    )}
  >
    {children}
  </Link>
);
```

### `FooterColumn`

```jsx
const FooterColumn = ({ title, links, compact = false }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">{title}</p>
    <ul className={cn('mt-3 space-y-1', compact && 'space-y-0.5')}>
      {links.map((link) => (
        <li key={link.to}>
          <FooterLink to={link.to}>{link.label}</FooterLink>
        </li>
      ))}
    </ul>
  </div>
);
```

`MobileFooter` duplique `FooterLink` – sur un refactor, exporter depuis un `footerShared.jsx`.

---

## 13. Responsive & breakpoints

| Viewport | Composant | Layout colonnes |
|----------|-----------|-----------------|
| `< 768px` web | `MobileFooter` | Accordéon |
| `≥ 768px` | `GreffioUltraFooter` | `sm:grid-cols-2` |
| `≥ 1024px` | `GreffioUltraFooter` | `lg:grid-cols-5`, paiements 2 cols |
| `compact` desktop | `GreffioUltraFooter` | 3 colonnes max (`slice(0, 3)`), pas paiements |

**Tablette** : Greffio traite `768–1024` comme desktop (`isDesktopBrowserViewport` ≥ 768) – le footer 5 colonnes peut être dense ; acceptable car 2 cols puis 5.

---

## 14. Accessibilité

| Élément | Pratique Greffio |
|---------|------------------|
| Footer | `<footer id="mentions-legales">` – ancre légale |
| Liens | Texte visible, zone clic 36px min |
| Logos paiement | `role="list"` / `listitem`, `aria-label` par marque, `img alt=""` décoratif |
| Accordéon | Composant Radix – clavier natif |
| Badge langue | `Globe` + texte « Français » (pas de sélecteur i18n actif) |
| Email | Lien `mailto:` avec email lisible |

Améliorations possibles sur nouveau projet :

- `aria-label="Pied de page"` sur `<footer>`.
- `<nav aria-label="Liens Utilitaire">` par colonne.

---

## 15. Plan d’implémentation pas à pas

### Phase 1 – Fondations

1. Créer `publisher.js` (données légales centralisées).
2. Créer `siteFooter.js` (colonnes + liens).
3. Vérifier stack : React Router `Link`, Tailwind, `cn()` utility.

### Phase 2 – Composant desktop

1. Créer `FooterLink` + `FooterColumn`.
2. Implémenter `<footer>` avec fond `#0b1220` et conteneur `max-w-7xl`.
3. Ajouter bandes [A] → [D] dans l’ordre.
4. Tester sans colonnes SEO (3 cols) puis 5 cols.

### Phase 3 – Mobile

1. Copier contenu dans `MobileFooter`.
2. Remplacer grille par `Accordion`.
3. Tester `defaultValue` et scroll long.

### Phase 4 – Paiements & conformité

1. Assets SVG + `paymentBrands.js`.
2. `PaymentBrandBadges inverse`.
3. Encart `ShieldCheck` emerald.

### Phase 5 – Intégration

1. `PublicPageLayout` avec switch mobile/desktop.
2. Landing : footer complet.
3. Login : `minimal` desktop + mobile full.

### Phase 6 – QA

- [ ] Tous les liens `siteFooter.js` existent dans le router.
- [ ] Footer sombre après section claire (pas de double border).
- [ ] iPhone SE : accordéon + logos ne débordent pas.
- [ ] Desktop 1440px : 5 colonnes alignées.
- [ ] Focus visible sur liens et bouton Contact.

---

## 16. Variantes & props

### `GreffioUltraFooter` – matrice des modes

| Mode | Props | Sections visibles |
|------|-------|-------------------|
| **Complet** (landing) | défaut | A + B (intro) + C + D |
| **SEO compact** | `compact showIntro={false}` | Colonnes (3 max) + D – **pas** A, **pas** C |
| **Compact + intro** | `compact showIntro={true}` | Rare – intro + 3 cols + D |

`compact` masque :

- Barre utilitaire [A]
- Section paiements + conformité [C]
- Limite à 3 colonnes (`GREFFIO_FOOTER_COLUMNS.slice(0, 3)`)

### `PublicMinimalLegalFooter` – structure

```jsx
<footer className="border-t border-border bg-muted/20 px-4 py-6">
  <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-muted-foreground">{PUBLISHER_LEGAL_NAME}</p>
    <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-4 ...">
      <Link to="/mentions-legales">Mentions légales</Link>
      ...
    </nav>
  </div>
</footer>
```

Utile quand le contenu principal doit rester focal (login) sans charger 5 colonnes SEO.

---

## 17. Références croisées

| Document / fichier | Contenu |
|--------------------|---------|
| `docs/CONTEXTE_SHOPFUN_FOOTER_LOGOS_TRANSACTIONS_SECURISEES.md` | Logos paiement footer (Visa, MC, CB, Amex) |
| `docs/PAYMENT_LOGOS_LOCKED.md` | Règles verrouillage assets paiement |
| `src/components/layout/GreffioUltraFooter.jsx` | Implémentation desktop |
| `src/mobile/MobileFooter.jsx` | Implémentation mobile |
| `src/config/siteFooter.js` | Data colonnes |
| `src/config/publisher.js` | Data légales |
| `src/components/layout/PublicPageLayout.jsx` | Routage footer |
| `.cursor/rules/preserve-brand-identity.mdc` | Ne pas modifier footer marketing sans demande explicite |

### Prompt Cursor (reproduction sur autre projet)

```text
Lis docs/GUIDE_FOOTER_GREFFIO.md.

Implémente un footer marketing structuré calqué sur Greffio :
- Fond #0b1220, bandes border-white/10
- siteFooter.js (5 colonnes data-driven)
- publisher.js pour le bandeau légal
- GreffioUltraFooter desktop + MobileFooter accordéon <768px
- Section Transactions sécurisées + PaymentBrandBadges inverse
- Encart conformité emerald
- PublicPageLayout avec modes marketing / minimal
Ne pas simplifier en un seul bandeau copyright.
```

---

*Guide maintenu pour Greffio SaaS · William Establishments · dernière révision : 16 juin 2026.*
