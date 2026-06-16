# Audit branding & design system – Greffio SaaS

> **Date** : 7 juin 2026  
> **Périmètre** : frontend React (`src/`), tokens globaux (`src/index.css`), pages marketing et application connectée  
> **Source de vérité** : tokens CSS réels du dépôt, composants en production  
> **Contrainte produit** : identité globale **figée** (landing hero, palette, header/footer public, typographie de marque) – voir `.cursor/rules/preserve-brand-identity.mdc`

---

## 1. Synthèse exécutive

Greffio dispose d'une identité visuelle **mature et reconnaissable** : bleu institutionnel profond, fonds clairs légèrement bleutés, typographie Inter / Plus Jakarta Sans, cartes blanches à coins généreux (22 px en marketing, 8 px en UI shadcn). L'écosystème William Establishments transparaît dans le ton sobre et professionnel.

**Forces principales**

- Tokens centralisés dans `:root` avec double notation HSL (shadcn) et hex (`--we-*`) pour le marketing.
- Couleurs sémantiques de marque distinctes : mint (succès/validation), citron (mise en avant douce), coral (alerte chaleureuse).
- Composants marketing `.we-card` / `.we-panel` cohérents avec la landing.
- Sidebar application : état actif navy (`--greffio-blue`) sur fond blanc – navigation claire.
- Page tarifs récemment **alignée** sur `LandingPricingSection` (grille 3 colonnes, sans icônes décoratives).
- `StatusBadge` avec glossaire client intégré (`title` + `sr-only`).

**Points de vigilance**

- Deux systèmes de rayons coexistent : `--radius: 0.5rem` (8 px, shadcn) vs `22px` (`.we-card`).
- `StatusBadge` utilise des classes Tailwind génériques (`blue-100`, `green-100`) plutôt que les tokens Greffio.
- Couleurs accent secondaires (mint, coral, citron) sous-utilisées dans l'app connectée.
- Duplication notation couleur : HSL + hex pour le même bleu primaire.

**Verdict global** : **7,8 / 10** – identité solide, consolidation du design system recommandée sans toucher au hero landing.

| Dimension | Score |
|-----------|-------|
| Cohérence palette | 8,0 |
| Typographie | 8,5 |
| Composants UI | 7,5 |
| Marketing / landing | 8,5 |
| App connectée | 7,5 |
| Mobile / Capacitor | 7,0 |
| Accessibilité | 7,0 |
| Documentation tokens | 6,5 |

---

## 2. Périmètre, méthode et contraintes

### Périmètre audité

| Zone | Fichiers / composants clés |
|------|---------------------------|
| Tokens globaux | `src/index.css`, `tailwind.config.js`, `docs/design-tokens.md` |
| Marketing | `LandingPage.jsx`, `PricingPage.jsx`, `LandingPricingSection.jsx`, `NavbarDropdown.jsx` |
| Application | `Sidebar.jsx`, `DashboardPage.jsx`, `StatusBadge.jsx`, composants shadcn `ui/*` |
| Mobile | `MobileLandingPage.jsx`, shells Capacitor, classes `.mobile-cockpit-px`, `.sticky-action-bar` |

### Méthode

1. Lecture des variables CSS réelles (`:root`, utilities).
2. Cartographie usage composants (`.we-card`, `shadow-elevation-*`, sidebar active).
3. Comparaison marketing vs app (rayons, couleurs, densité).
4. Distinction systématique **Observation** (état actuel) vs **Recommandation** (action proposée).

### Contraintes figées (ne pas modifier sans demande explicite)

- Hero et structure de la **landing page**.
- Palette, tokens CSS globaux, thème Tailwind de base.
- Header / navbar global public, footer public.
- Typographie de marque (Inter + Plus Jakarta Sans).

### Éléments récemment stabilisés (juin 2026)

- **Landing hero** : gelé, référence visuelle validée.
- **Page `/tarifs`** : refactorée pour réutiliser `LandingPricingSection` – cohérence tarifaire landing ↔ page dédiée.

---

## 3. Positionnement et ADN de marque

### Observation

Greffio se positionne comme plateforme SaaS de **formalités d'entreprise** (création, modification, suivi dossier), dans l'écosystème William Establishments. Le registre visuel évoque :

- **Confiance institutionnelle** : bleu profond `#1e4d8c`, navy `#0a1220`.
- **Clarté et lisibilité** : fonds `#f8fafc` / `#f6f8fc`, textes `#243247`.
- **Modernité SaaS** : cartes blanches, ombres douces, animations Framer Motion discrètes.
- **Humanité** : mint et coral pour les états positifs / attention, citron pour les badges « offre jeune ».

Le ton copy est professionnel, direct, sans jargon technique excessif côté client.

### Recommandation

- Documenter dans le mini brand book (§14) trois adjectifs verrouillés : **Institutionnel · Guidé · Rassurant**.
- Réserver mint et coral à des usages sémantiques stricts (validation, alerte douce) – éviter la dérive décorative.

---

## 4. Inventaire des tokens CSS actuels

Source : `src/index.css` (`:root` + utilities).

### 4.1 Couleurs sémantiques shadcn

| Token CSS | HSL | Hex approx. | Usage observé |
|-----------|-----|-------------|---------------|
| `--background` | `210 25% 98%` | `#f8fafc` | Fond global body |
| `--foreground` | `218 62% 9%` | `#0a1220` | Texte principal |
| `--primary` | `214 72% 32%` | `#1e4d8c` | CTA, liens, sidebar active |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | Texte sur primary |
| `--secondary` | `214 48% 93%` | `#e8eef7` | Fond cartes tarif highlight |
| `--muted` | `214 32% 93%` | `#e9edf3` | Survol ghost, hover UI |
| `--muted-foreground` | `218 32% 22%` | `#243247` | Texte secondaire |
| `--accent` | `214 32% 93%` | `#e9edf3` | Hover shadcn (gris-bleu, plus citron) |
| `--destructive` | `354 75% 55%` | `#e53e56` | Erreurs, suppressions |
| `--border` / `--input` | `218 28% 78%` | `#b8c4d4` | Bordures formulaires |
| `--ring` | `214 72% 32%` | `#1e4d8c` | Focus visible |
| `--card` | `0 0% 100%` | `#ffffff` | Cartes dashboard |

### 4.2 Couleurs marque Greffio

| Token CSS | HSL | Hex approx. | Usage observé |
|-----------|-----|-------------|---------------|
| `--greffio-blue` | `214 72% 32%` | `#1e4d8c` | = primary, icône sidebar |
| `--greffio-blue-900` | `218 62% 9%` | `#0a1220` | Titres cockpit, badges citron |
| `--greffio-mint` | `163 62% 47%` | `#2db88a` | Accent dark mode, validation brand |
| `--greffio-citron` | `45 100% 91%` | `#fff4d1` | Badges tarifs, blocs guide |
| `--greffio-coral` | `10 85% 66%` | `#f06b52` | Accent chaleureux (landing ponctuelle) |

### 4.3 Tokens hex legacy marketing (`--we-*`)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--we-blue` | `#1e4d8c` | Hero, grille surface |
| `--we-blue-dark` | `#0a1220` | Eyebrow hero (`.we-hero-eyebrow`) |
| `--we-bg` | `#f6f8fc` | `.surface-grid`, fonds alternatifs |
| `--we-border` | `#c5d2e6` | `.we-card`, `.we-panel` |
| `--we-muted` | `#243247` | Texte muted marketing |

### 4.4 Observation – duplication

`--primary`, `--greffio-blue` et `--we-blue` représentent le **même bleu** en trois notations. `--background` (`#f8fafc`) et `--we-bg` (`#f6f8fc`) diffèrent légèrement (~2 % luminosité).

### 4.5 Recommandation

- Conserver HSL comme source unique ; `--we-*` en alias calculés ou documentés comme « couche marketing ».
- Ajouter une note dans `docs/design-tokens.md` sur l'écart `--background` vs `--we-bg` (intentionnel : app vs marketing grid).

---

## 5. Échelles de couleurs normalisées

Proposition d'échelles **Primary / Neutral / Success / Warning / Error** dérivées des tokens existants, pour usage futur (badges, graphiques, ops).

### 5.1 Primary (hue 214–218)

| Niveau | HSL | Hex | Rôle |
|--------|-----|-----|------|
| 50 | `214 100% 97%` | `#f0f6fc` | Fond tint primary |
| 100 | `214 85% 93%` | `#e0eaf5` | = secondary actuel |
| 200 | `214 75% 85%` | `#b8cce6` | Bordures hover |
| 300 | `214 72% 70%` | `#6a9fd4` | Icônes secondaires |
| 400 | `214 72% 50%` | `#3570b0` | Liens hover |
| **500** | **`214 72% 32%`** | **`#1e4d8c`** | **CTA, primary, sidebar active** |
| 600 | `214 72% 26%` | `#183d70` | CTA hover |
| 700 | `214 72% 20%` | `#122e54` | Texte sur fond clair accentué |
| 800 | `218 62% 15%` | `#0e1a2e` | – |
| **900** | **`218 62% 9%`** | **`#0a1220`** | **Titres, foreground** |

### 5.2 Neutral

| Niveau | HSL | Hex | Rôle |
|--------|-----|-----|------|
| 50 | `210 25% 98%` | `#f8fafc` | = `--background` |
| 100 | `214 32% 93%` | `#e9edf3` | = `--muted` |
| 200 | `218 28% 78%` | `#b8c4d4` | = `--border` |
| 300 | `218 28% 65%` | `#94a3b8` | Placeholders |
| 400 | `218 32% 45%` | `#5a6d85` | Labels tertiaires |
| **500** | **`218 32% 22%`** | **`#243247`** | **= `--muted-foreground`** |
| 600 | `218 40% 16%` | `#182536` | – |
| 700 | `218 50% 12%` | `#101c2a` | – |
| 800 | `218 55% 10%` | `#0c1520` | – |
| 900 | `218 62% 9%` | `#0a1220` | = foreground |

### 5.3 Success (basé sur mint)

| Niveau | HSL | Hex | Rôle |
|--------|-----|-----|------|
| 50 | `163 60% 95%` | `#e8f8f2` | Fond badge validé |
| 100 | `163 55% 85%` | `#b8ead8` | – |
| 200 | `163 58% 70%` | `#6dd4b0` | – |
| 300 | `163 60% 58%` | `#45c89a` | – |
| **500** | **`163 62% 47%`** | **`#2db88a`** | **= `--greffio-mint`** |
| 700 | `163 65% 32%` | `#1a8f66` | Texte success foncé |
| 900 | `163 70% 18%` | `#0d4d36` | – |

### 5.4 Warning

| Niveau | HSL | Hex | Rôle |
|--------|-----|-----|------|
| 50 | `45 100% 91%` | `#fff4d1` | = `--greffio-citron` (fond) |
| 100 | `45 95% 85%` | `#ffecb8` | Bandeau info |
| 300 | `35 90% 65%` | `#f0b84d` | – |
| **500** | **`10 85% 66%`** | **`#f06b52`** | **= `--greffio-coral`** |
| 700 | `10 80% 48%` | `#d44a32` | Texte warning |

### 5.5 Error

| Niveau | HSL | Hex | Rôle |
|--------|-----|-----|------|
| 50 | `354 80% 96%` | `#fef0f2` | Fond erreur léger |
| 100 | `354 75% 90%` | `#fcd5da` | – |
| 300 | `354 75% 70%` | `#f07a8a` | – |
| **500** | **`354 75% 55%`** | **`#e53e56`** | **= `--destructive`** |
| 700 | `354 78% 42%` | `#c41e3a` | Texte erreur |

### Recommandation

Migrer progressivement `StatusBadge` et indicateurs ops vers ces échelles nommées (`bg-success-50 text-success-700`) plutôt que `green-100` / `red-100` Tailwind génériques.

---

## 6. Typographie

### Observation

| Rôle | Police | Poids importés | Application |
|------|--------|----------------|-------------|
| Corps | **Inter** | 400–800 | `body`, UI, formulaires |
| Titres | **Plus Jakarta Sans** | 600–800 | `h1`–`h6`, titres marketing |
| Titres fluides | – | – | `.fluid-h1`, `.fluid-h2` (`clamp()`) |

Règles CSS :

- `text-wrap: balance` sur les headings.
- Mobile : `font-size: 16px` forcé sur inputs (anti-zoom iOS).
- Marketing : eyebrow `.we-hero-eyebrow` – 10 px, uppercase, letter-spacing 0.28 em.

Hiérarchie observée :

- Landing H1 : `text-4xl` → `text-6xl` responsive.
- App H1 : `fluid-h1` ou `text-2xl font-extrabold` + `greffio-blue-900`.
- Labels sidebar : `text-sm font-semibold`.

### Recommandation

- Verrouiller une échelle type : Display (Jakarta 800) · H1 (Jakarta 700) · H2 (700) · Body (Inter 400/500) · Caption (Inter 500, 12–13 px).
- Ne pas introduire de troisième famille sans validation produit.

---

## 7. Espacements, rayons et grille

### Observation

| Token / classe | Valeur | Contexte |
|----------------|--------|----------|
| `--radius` | `0.5rem` (8 px) | shadcn : `rounded-md`, boutons, inputs |
| `.we-card`, `.we-panel` | `22px` | Landing, simulateur, cartes marketing |
| `.we-hero-eyebrow` | `999px` | Pill badge |
| `Sidebar` | `w-72` (288 px) | Navigation app desktop |
| `.mobile-cockpit-px` | `1rem` | Padding horizontal mobile |
| `.choice-grid-2` | `gap 0.75rem` | Grille choix 2×2 mobile |
| Breakpoint mobile | `< 768px` | Shell mobile, bottom nav |

**Dualité rayons** : l'UI applicative (dashboard, formulaires) est plus « carrée » (8 px) ; le marketing est plus « premium arrondi » (22 px). Cette distinction est **cohérente** avec la séparation marketing / produit.

### Recommandation

- Documenter explicitement : **marketing ≥ 22 px**, **app UI = 8 px (`rounded-md`)**, **badges = full pill**.
- Éviter d'introduire des rayons intermédiaires (12 px, 16 px) sans nécessité.

---

## 8. Ombres, surfaces et élévation

### Observation

| Classe | Valeur | Usage |
|--------|--------|-------|
| `.shadow-elevation-sm` | `0 1px 2px rgba(10,18,32,.12), 0 8px 24px rgba(10,18,32,.08)` | Sidebar active, cartes légères |
| `.shadow-elevation-md` | `0 12px 35px rgba(10,18,32,.16)` | Carte tarif highlight |
| `.shadow-elevation-lg` | `0 24px 70px rgba(10,18,32,.2)` | Modales, sections hero |
| `.we-card` | `0 16px 48px rgba(10,18,32,.1)` | Cartes landing |
| `.we-card:hover` | translateY(-4px) + ombre renforcée | Interactivité marketing |
| `.surface-grid` | Grille 32×32 px, bleu 10 % opacité | Fonds sections landing |
| `.interactive-hover` | Ring primary 14 % + ombre | Focus/hover générique |

Les ombres utilisent systématiquement la teinte navy `rgba(10, 18, 32, …)` – **cohérent** avec `--greffio-blue-900`.

### Recommandation

- Ne pas ajouter de niveaux d'élévation supplémentaires ; les 3 niveaux + `.we-card` suffisent.
- Vérifier que le dark mode (défini mais peu utilisé) réutilise les mêmes principes d'élévation.

---

## 9. Composants et patterns UI

### 9.1 Composants marketing (`.we-*`)

| Composant | Observation |
|-----------|-------------|
| `.we-card` | Bordure `--we-border`, fond blanc, radius 22 px, hover lift |
| `.we-panel` | Similaire sans hover transform |
| `.we-hero-eyebrow` | Badge pill uppercase, fond `#eef3fb` |
| `.logo-sheen` | Animation brillance logo (4,8 s) |
| `.animate-fade-up` | Entrée contenu (0,55 s) |

### 9.2 Composants shadcn / app

- `Button` : variants default / outline / ghost – ghost hover sur `--muted` (gris-bleu, plus citron depuis juin 2026).
- `Card` : fond blanc, bordure `--border`, radius shadcn.
- `StatusBadge` : pill `rounded-full`, couleurs Tailwind génériques, glossaire via `getStatusGlossary()`.

### 9.3 Sidebar (`Sidebar.jsx`)

**Observation** : fond blanc, item actif = `bg-[hsl(var(--greffio-blue))] text-white shadow-elevation-sm`. Items inactifs : `text-muted-foreground`, hover `bg-muted`. Icône entreprise : carré primary 44×44 px.

État **navy active** = aligné avec la marque, lisible, contraste WCAG AA sur texte blanc.

### 9.4 Recommandations

| Priorité | Action |
|----------|--------|
| P1 | Refactor `StatusBadge` vers tokens success/warning/error normalisés (§5) |
| P2 | Extraire styles sidebar active en classe `.sidebar-nav-active` documentée |
| P3 | Audit usages restants de `--greffio-citron` hors marketing (risque jaune hover résolu sur accent) |

---

## 10. Zone marketing (landing, tarifs, simulateur)

### 10.1 Landing hero – **FIGÉ**

**Observation** : `LandingPage.jsx` – hero animé Framer Motion, highlights, checklist, CTA « Générer mes statuts », recherche SIREN (`CompanyLookupCard`), sections processus / FAQ / tarifs via `LandingPricingSection`. Classe `.we-hero-eyebrow`, fond `.surface-grid`, cartes `.we-card`.

**Recommandation** : **Aucune modification structurelle ou visuelle** sans demande explicite ciblant le hero.

### 10.2 Tarifs – **ALIGNÉ (juin 2026)**

**Observation** :

- `PricingPage.jsx` importe et rend `LandingPricingSection` avec `showHeader={false}`.
- Grille 3 plans (`LANDING_PRICING_PLANS`), badge citron sur plan highlight, **sans icônes** décoratives par carte.
- Plan mis en avant : `border-primary bg-secondary shadow-elevation-md`.
- Blocs complémentaires : `PricingClarityBlock`, `PricingFaqSection`.

**Recommandation** : Maintenir cette unification ; toute évolution tarifaire doit modifier `landingPricingPlans.js` + `LandingPricingSection` en single source of truth.

### 10.3 Autres pages marketing

**Observation** : simulateur et guide réutilisent tokens primary / greffio-blue-900 ; App Install utilise `--greffio-citron` en fond section.

**Recommandation** : Limiter le citron aux pages acquisition (tarifs badge, guide, install app) – pas dans l'app connectée.

---

## 11. Zone application connectée

### 11.1 Layout général

**Observation** :

- Shell : `Sidebar` blanc + contenu sur `bg-background`.
- Cartes dashboard : composant `Card` shadcn, fond blanc, texte `foreground` / `muted-foreground`.
- Progress bars : `bg-primary` sur piste `bg-primary/20`.

### 11.2 StatusBadge et glossaire

**Observation** (`StatusBadge.jsx` + `statusGlossary.js`) :

- Libellés client en français (« EN COURS », « À FOURNIR », « VALIDÉ »…).
- Tooltip natif `title={glossary}` + texte `sr-only` pour lecteurs d'écran.
- Couleurs : palette Tailwind standard (blue/green/amber/red/slate), **pas** mint/coral Greffio.

Mapping sémantique :

| Statut | Couleur actuelle | Glossaire |
|--------|------------------|-----------|
| EN_COURS, EN_ANALYSE | blue-100 | Oui |
| VALIDE, TERMINE | green-100 | Oui |
| ATTENTE_DOCS, URGENT | amber-100 | Oui |
| REJETE, INVALID | red-100 | Oui |

**Recommandation** :

- Aligner couleurs badge sur `--greffio-mint` (succès) et `--destructive` (erreur).
- Exposer le glossaire en tooltip Radix visible au hover (accessibilité clavier), pas seulement `title`.

### 11.3 Ops / équipe

**Observation** : `OpsSidebar.jsx` et pages ops partagent la même logique primary ; `TeamPage` suit le layout app standard.

**Recommandation** : Différencier visuellement ops (badge « Interne » discret) sans nouvelle palette – teinte neutral-100 suffit.

---

## 12. Mobile, Capacitor et parité web

### Observation

- `MobileLandingPage.jsx` : variante landing native, pas le hero desktop complet.
- Classes utilitaires : `.app-shell-viewport` (`100dvh` + safe-area), `.sticky-action-bar`, `.landscape-compact-shell`.
- Sidebar masquée en natif Capacitor (`isCapacitorNative()` → `null`).
- Bottom nav mobile web, drawer `MobileSidebarDrawer`.

**Forces** : safe-area, typo fluide, grille 2×2 choix, padding uniforme.

**Écarts** : landing mobile ≠ hero desktop (intentionnel) ; StatusBadge identique web/mobile.

### Recommandation

- Maintenir parité tokens (pas de couleurs hardcodées spécifiques Android).
- Documenter dans brand book : mobile marketing = simplifié, mobile app = cockpit.

---

## 13. Accessibilité et contrastes

### Observations

| Paire | Ratio estimé | WCAG AA |
|-------|--------------|---------|
| `#1e4d8c` sur `#ffffff` | ~7,5:1 | ✅ Texte normal |
| `#0a1220` sur `#f8fafc` | ~16:1 | ✅ |
| `#243247` sur `#f8fafc` | ~11:1 | ✅ |
| `#ffffff` sur `#1e4d8c` (sidebar active) | ~7,5:1 | ✅ |
| `#2db88a` sur `#ffffff` | ~3,2:1 | ⚠️ Texte large uniquement |
| `#f06b52` sur `#ffffff` | ~3,5:1 | ⚠️ Texte large uniquement |

- `useReducedMotion` / `prefers-reduced-motion` : utilisé sur landing (Framer Motion).
- Focus : `--ring` primary, `.interactive-hover` ring 3 px.
- Mobile inputs 16 px : conforme iOS.

### Recommandations

- Ne jamais utiliser mint/coral seuls pour du texte body sur blanc – toujours avec fond tint (50/100) ou texte navy.
- Audit contraste `StatusBadge` green-800 sur green-100 ( généralement OK ).
- Ajouter test automatisé contrastes sur primary/secondary/destructive.

---

## 14. Mini brand book Greffio

### Logo et wordmark

- Logo Greffio bleu sur fond clair (header public, sidebar icône Building2 en fallback).
- Animation `.logo-sheen` autorisée landing uniquement.

### Palette – règles d'usage

| Couleur | Usage autorisé | Usage interdit |
|---------|------------------|------------------|
| Primary `#1e4d8c` | CTA, liens, nav active, focus ring | Grands aplats de fond |
| Navy `#0a1220` | Titres, eyebrow text | Texte long body |
| Mint `#2db88a` | Succès, validation, dark accent | CTA principal |
| Citron `#fff4d1` | Badges offre, fonds sections acquisition | Hover UI, sidebar |
| Coral `#f06b52` | Alertes douces, accents landing | Erreurs destructives |
| Destructive `#e53e56` | Erreurs, suppressions, refus | Décoratif |

### Typographie

- **Inter** : tout le UI, paragraphes, tableaux, formulaires.
- **Plus Jakarta Sans** : titres H1–H6, prix tarifs, chiffres hero.

### Composants canoniques

| Contexte | Carte | Radius | Ombre |
|----------|-------|--------|-------|
| Marketing | `.we-card` | 22 px | we-card shadow |
| App | `Card` shadcn | 8 px | border + légère |
| Tarif highlight | `border-primary` | 8 px | elevation-md |

### Ton rédactionnel

- Vouvoiement, phrases courtes, verbes d'action (« Compléter », « Signer », « Suivre »).
- Statuts client : jamais de clés techniques (`statutes_generated` → « À signer »).

### Interdits sans validation

- Modifier hero landing.
- Changer header/footer public.
- Refonte globale tokens `index.css`.
- Réintroduire hover jaune/citron sur composants UI (`--accent` reste gris-bleu).

---

## 15. Scoring qualitatif (/10)

| # | Dimension | Score | Justification |
|---|-----------|-------|---------------|
| 1 | Identité & reconnaissance | **8,5** | Bleu institutionnel distinctif, cohérent WX |
| 2 | Cohérence palette | **8,0** | Duplication HSL/hex mineure |
| 3 | Typographie | **8,5** | Inter + Jakarta bien appliqués |
| 4 | Système d'élévation | **8,0** | 3 niveaux + we-card, navy shadow |
| 5 | Composants marketing | **8,5** | we-card mature, landing figée |
| 6 | Composants app | **7,5** | shadcn solide, badges génériques |
| 7 | Navigation & sidebar | **8,0** | Navy active clair |
| 8 | Tarifs & pricing UI | **8,5** | Alignement landing/tarifs récent |
| 9 | Mobile & responsive | **7,0** | Safe-area OK, parité partielle |
| 10 | Accessibilité | **7,0** | Bon contrastes primary, mint/coral limités |
| 11 | Documentation tokens | **6,5** | design-tokens.md partiel |
| 12 | Maintenabilité DS | **7,0** | Centralisation CSS, pas de Storybook |
| | **Moyenne** | **7,8** | |

---

## 16. Priorités et feuille de route

Légende : **Observation** = constat · **Recommandation** = action proposée · **P0** = urgent · **P1** = important · **P2** = amélioration

### P0 – Ne pas faire (contraintes)

| # | Item | Type |
|---|------|------|
| 1 | Refondre hero landing | Interdit sans demande explicite |
| 2 | Modifier tokens globaux `index.css` pour « harmoniser » | Interdit |
| 3 | Changer header/footer public | Interdit |

### P1 – Consolidation (30 jours)

| # | Action | Type | Effort |
|---|--------|------|--------|
| 1 | Migrer `StatusBadge` vers échelles §5 (success/warning/error Greffio) | Recommandation | M |
| 2 | Enrichir `docs/design-tokens.md` avec échelles complètes et règles rayons | Recommandation | S |
| 3 | Single source tarifs : vérifier qu'aucune page n'utilise encore `PricingCard` legacy avec icônes | Observation → audit | S |
| 4 | Classe utilitaire `.sidebar-nav-active` extraite de `Sidebar.jsx` | Recommandation | S |
| 5 | Tooltip Radix sur StatusBadge (glossaire visible) | Recommandation | S |

### P2 – Amélioration (90 jours)

| # | Action | Type | Effort |
|---|--------|------|--------|
| 6 | Alias CSS `--we-blue` → `hsl(var(--primary))` pour réduire duplication | Recommandation | S |
| 7 | Tokens Tailwind `success`, `warning` mappés sur mint/coral/destructive | Recommandation | M |
| 8 | Page styleguide interne `/dev/tokens` (non public) | Recommandation | L |
| 9 | Harmoniser `--background` vs `--we-bg` (documenter ou unifier) | Recommandation | S |
| 10 | Emails transactionnels : vérifier wordmark + primary `#1e4d8c` | Observation | M |

### P3 – Long terme (6 mois)

| # | Action | Type |
|---|--------|------|
| 11 | Dark mode produit (tokens déjà présents, usage minimal) | Recommandation |
| 12 | Kit Figma aligné sur échelles §5 | Recommandation |
| 13 | Tests régression visuelle (Playwright screenshots) landing + dashboard | Recommandation |

---

## Annexe A – Bloc CSS design tokens consolidé

Proposition de consolidation **documentaire** (ne pas déployer sans validation produit) :

```css
:root {
  /* ── Primary ── */
  --color-primary-50: 214 100% 97%;
  --color-primary-500: 214 72% 32%;   /* = --primary = #1e4d8c */
  --color-primary-900: 218 62% 9%;    /* = --greffio-blue-900 = #0a1220 */

  /* ── Neutral ── */
  --color-neutral-50: 210 25% 98%;    /* = --background ≈ #f8fafc */
  --color-neutral-100: 214 32% 93%;   /* = --muted */
  --color-neutral-200: 218 28% 78%;     /* = --border */
  --color-neutral-500: 218 32% 22%;     /* = --muted-foreground ≈ #243247 */

  /* ── Success / Warning / Error ── */
  --color-success-500: 163 62% 47%;     /* = --greffio-mint ≈ #2db88a */
  --color-warning-50: 45 100% 91%;      /* = --greffio-citron ≈ #fff4d1 */
  --color-warning-500: 10 85% 66%;      /* = --greffio-coral ≈ #f06b52 */
  --color-error-500: 354 75% 55%;       /* = --destructive ≈ #e53e56 */

  /* ── Marketing aliases (legacy) ── */
  --we-blue: #1e4d8c;
  --we-blue-dark: #0a1220;
  --we-bg: #f6f8fc;
  --we-border: #c5d2e6;
  --we-muted: #243247;

  /* ── Radius ── */
  --radius-ui: 0.5rem;      /* shadcn */
  --radius-marketing: 22px; /* .we-card */
  --radius-pill: 999px;

  /* ── Typography ── */
  --font-body: 'Inter', sans-serif;
  --font-heading: 'Plus Jakarta Sans', sans-serif;

  /* ── Elevation (navy-tinted) ── */
  --shadow-sm: 0 1px 2px rgba(10, 18, 32, 0.12), 0 8px 24px rgba(10, 18, 32, 0.08);
  --shadow-md: 0 12px 35px rgba(10, 18, 32, 0.16);
  --shadow-lg: 0 24px 70px rgba(10, 18, 32, 0.2);
}
```

---

## Annexe B – Matrice observation vs recommandation (récap.)

| Sujet | Observation (juin 2026) | Recommandation |
|-------|-------------------------|----------------|
| Hero landing | Figé, animé, `.we-card` / `.surface-grid` | Ne pas modifier |
| Page tarifs | Alignée sur `LandingPricingSection`, sans icônes | Maintenir single source |
| Sidebar | Actif navy `#1e4d8c`, fond blanc | Extraire classe utilitaire |
| StatusBadge | Glossaire OK, couleurs Tailwind génériques | Migrer tokens Greffio |
| Accent hover | Gris-bleu (`--accent` = `--muted`) | Conserver, ne pas remettre citron |
| Rayons | 8 px app / 22 px marketing | Documenter la dualité |
| Tokens | HSL + hex dupliqués | Alias documentés, pas de refonte |
| Mint / coral | Sous-utilisés en app | Usage sémantique strict |

---

*Document généré pour l'équipe Greffio / William Establishments. Révision recommandée après toute modification de `src/index.css` ou des composants marketing listés en §2.*
