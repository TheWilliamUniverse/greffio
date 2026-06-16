# Contexte Greffio – Audit UI/UX → plan d’actions Cursor (ChatGPT)

> **Usage** : coller ce document dans ChatGPT avec la consigne ci-dessous. ChatGPT doit produire un **plan d’actions exécutable** pour l’agent Cursor (Auto) sur le repo `Greffio SaaS`, **sans modifier l’identité globale du site**.
>
> **Documents complémentaires** (ne pas dupliquer, s’y référer si besoin) :
> - `docs/UI_UX_AUDIT_2026-06-13.md` – audit détaillé findings
> - `docs/audit-branding-greffio.md` – tokens et contraintes marque
> - `.cursor/rules/preserve-brand-identity.mdc` – règle Cursor impérative
> - `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` – travail paiement récent

---

## Consigne à donner à ChatGPT

```
Tu es un lead produit + tech lead front-end. À partir du contexte fourni :

1. Produis un PLAN D’ACTIONS pour l’agent Cursor (exécutant le code).
2. Respecte STRICTEMENT la conservation de l’identité Greffio (section 2).
3. Structure le plan en lots séquentiels (Lot 0 → Lot N), chaque lot = 1 PR logique max.
4. Pour CHAQUE action, utilise le format ACTION-XXX défini en section 8.
5. Classe chaque action : P0 (urgent) | P1 (important) | P2 (finition).
6. Indique les fichiers exacts, ce qui est INTERDIT, les critères d’acceptation testables, et les dépendances.
7. Ne propose AUCUNE refonte landing, navbar publique, footer public, tokens globaux index.css, ni harmonisation cosmétique large login/signup/paiement/légal.
8. Termine par : ordre d’exécution recommandé, risques, et checklist de validation manuelle.
```

---

## 1. État du produit (snapshot 13 juin 2026)

### 1.1 Stack & architecture front

| Élément | Détail |
|---------|--------|
| Framework | React 19 + Vite 7 |
| Routing | React Router – ~80 routes (`src/App.jsx`) |
| UI | shadcn/Radix (`src/components/ui/`, 55 fichiers) |
| Styles | Tailwind + CSS vars (`src/index.css`) |
| Mobile | Capacitor + shells (`MobileAppShell`, `MobileWebShell`) |
| Animations | Framer Motion (login, payment terminal, landing) |
| Toasts | Sonner (`App.jsx`) |
| Backend | Node VPS + API `api.greffio.willentreprises.com` |

### 1.2 Trois surfaces utilisateur

```
┌─────────────────────────────────────────────────────────────┐
│ MARKETING / SEO / PUBLIC                                     │
│ NavbarDropdown · pages SEO · landing · tarifs · contact      │
│ Footer : GreffioUltraFooter (partiel – voir gaps)            │
└─────────────────────────────────────────────────────────────┘
                              ↓ signup/login
┌─────────────────────────────────────────────────────────────┐
│ APP CLIENT AUTHENTIFIÉE                                      │
│ Header.jsx + Sidebar.jsx (desktop) · pages src/pages/*       │
│ Mobile : entries → Mobile*Page.jsx                           │
└─────────────────────────────────────────────────────────────┘
                              ↓ rôles internes
┌─────────────────────────────────────────────────────────────┐
│ OPS BACK-OFFICE                                              │
│ /ops/* (OpsShell) + legacy /ops-legacy                       │
│ Palette slate interne (acceptable)                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Travaux récents (contexte – ne pas casser)

| Zone | État | Fichiers |
|------|------|----------|
| Paiement terminal accordéon | Implémenté localement, partiellement déployé | `GreffioPaymentTerminal.jsx`, `PaymentPage.jsx`, `MobilePaymentPage.jsx` |
| Amazon Pay live | Backend VPS OK, signature corrigée | `amazonPayService.js`, `AmazonPayCheckoutPanel.jsx` |
| Google Pay | Mode TEST, fix OR_BIBED_06 (gateway example) | `useGooglePay.js`, `googlePayService.js` |
| Navbar CTA | « Créer mon espace » → `/signup` | `NavbarDropdown.jsx` (commité) |

### 1.4 Dette connue (chiffres)

| Métrique | Valeur |
|----------|--------|
| Fichiers JSX avec hex hardcodés | ~47 |
| Paires desktop/mobile dupliquées | ~10 features |
| Patterns loading différents | 5+ |
| Patterns empty state différents | 3 |
| Composants shadcn morts ou sous-utilisés | `form`, `field`, `empty`, `skeleton`, `progress` |
| Pages sans route | `ProjectsPage.jsx`, `ProjectDetailPage.jsx` |
| Fichiers orphelins | `WalletPaymentTerminal.jsx`, `MobileAuthShell.jsx`, `LoadingSpinner.jsx`, `NotificationToast.jsx` |

---

## 2. Règle absolue – conservation identité (NON NÉGOCIABLE)

Source : `.cursor/rules/preserve-brand-identity.mdc`

### 2.1 INTERDIT pour Cursor (sauf demande utilisateur explicite ciblant l’identité)

| Zone | Fichiers / scope |
|------|------------------|
| Landing hero, sections, copy, structure, CTA | `src/pages/LandingPage.jsx`, `src/mobile/MobileLandingPage.jsx` (structure/copy hero) |
| Palette & tokens globaux | `src/index.css` (`:root`, `.dark`, utilities globales), `tailwind.config.js` |
| Navbar / header public marketing | `src/components/NavbarDropdown.jsx` |
| Footer public de marque | `src/components/layout/GreffioUltraFooter.jsx` (design) |
| Typographie de marque | Inter + Plus Jakarta Sans – pas de changement de fonts globales |
| Refonte design system transversale | Pas de changement global `button.jsx` variants, `card.jsx`, espacements globaux pour « harmoniser » |
| Harmonisation cosmétique large | Login, signup, paiement, pages légales – pas de refonte layout globale |

### 2.2 AUTORISÉ pour Cursor

| Type | Exemples |
|------|----------|
| Bug UI ponctuel dans un composant | Badge notif fictif dans `Header.jsx` |
| Composants patterns **nouveaux** (sans remplacer tokens globaux) | `PageLoadingState.jsx`, `EmptyState.jsx` dans `src/components/patterns/` |
| Amélioration UX locale à une feature | Loading `DocumentsPage`, erreurs inline `LoginPage` |
| Tokenisation **locale** questionnaire/wizard | Remplacer `#d4e2f5` par classes utilisant **tokens existants** (`border-border`, `bg-muted`, `hsl(var(--greffio-blue))`) – **sans ajouter de nouvelles vars `:root`** |
| Fonctionnalités métier | Dossiers, statuts, paiement, mobile, ops |
| Nettoyage code mort | Supprimer fichiers non importés |
| Layout wrapper **composition** | `PublicPageLayout` qui **réutilise** `GreffioUltraFooter` tel quel |
| Ops | Améliorer empty/loading ops, redirect legacy |

### 2.3 Zone grise – à traiter avec prudence

| Sujet | Règle pour le plan |
|-------|-------------------|
| `GreffioPaymentTerminal.jsx` | Améliorations UX OK ; ne pas refondre toute la page paiement sidebar |
| `FormalityWizardPage.jsx` | Refactor structure (split fichiers) OK ; ne pas changer le rendu visuel wizard marketing |
| `LoginPage` / `SignupPage` | Erreurs inline, loading OK ; pas de redesign layout/hero auth |
| Footer sur `/contact`, `/tarifs` | Ajouter footer **existant** via layout OK ; pas de redesign footer |
| Fix CSS safe-area | Correction syntaxe calc OK si **ligne isolée** sans refonte tokens |

---

## 3. Cartographie routes & fichiers (référence plan)

### 3.1 Layout & navigation

| Rôle | Fichier |
|------|---------|
| App root | `src/App.jsx` |
| Header client | `src/components/Header.jsx` |
| Sidebar desktop | `src/components/Sidebar.jsx` |
| Navbar marketing | `src/components/NavbarDropdown.jsx` |
| Footer marketing | `src/components/layout/GreffioUltraFooter.jsx` |
| Shell mobile web | `src/mobile/MobileWebShell.jsx` |
| Shell app native | `src/mobile/MobileAppShell.jsx` |
| Drawer mobile | `src/components/MobileSidebarDrawer.jsx` |
| Bottom nav | `src/components/WebMobileBottomNav.jsx`, `src/mobile/MobileAuthenticatedNav.jsx` |
| Ops shell | `src/components/ops/OpsShell.jsx` |

### 3.2 Pages client authentifié (priorité UX)

| Route | Desktop | Mobile entry |
|-------|---------|--------------|
| `/dashboard` | `DashboardPage.jsx` | `MobileHomePage.jsx` |
| `/dossiers` | `DossiersPage.jsx` | `MobileDossiersPage.jsx` |
| `/dossier/:id` | `DossierDetailPage.jsx` | `MobileDossierDetailPage.jsx` |
| `/documents` | `DocumentsPage.jsx` | `MobileDocumentsPage.jsx` |
| `/paiement` | `PaymentPage.jsx` | `MobilePaymentPage.jsx` |
| `/simulateur` | `FormalityWizardPage.jsx` | `presentation="mobile"` |
| `/questionnaire` | `QuestionnairePage.jsx` | `QuestionnaireEntry` |
| `/login`, `/signup` | `LoginPage.jsx`, `SignupPage.jsx` | même composant |

### 3.3 Composants UI de référence

| Composant | Fichier | État |
|-----------|---------|------|
| Button | `src/components/ui/button.jsx` | `rounded-full`, hex dans variants – **ne pas refactorer globalement** |
| Input | `src/components/ui/input.jsx` | Standard shadcn |
| Card | `src/components/ui/card.jsx` | Standard shadcn |
| Progress | `src/components/ui/progress.jsx` | Sous-utilisé |
| Empty | `src/components/ui/empty.jsx` | **0 usage pages** |
| Skeleton | `src/components/ui/skeleton.jsx` | Sous-utilisé |
| Form/Field | `src/components/ui/form.jsx`, `field.jsx` | **0 usage** |

---

## 4. Problèmes priorisés – backlog pour le plan ChatGPT

Chaque item ci-dessous doit devenir une ou plusieurs actions ACTION-XXX dans le plan ChatGPT.

### 4.1 P0 – Urgent (crédibilité / bug UX visible)

| ID | Problème | Fichier(s) | Amélioration | Interdit |
|----|----------|------------|--------------|----------|
| P0-01 | Badge notification rouge permanent sans notif | `Header.jsx` | Afficher badge si `count > 0` ou retirer | Changer design header |
| P0-02 | Chargement documents invisible | `DocumentsPage.jsx` | Skeleton ou `PageLoadingState` pendant fetch | Refonte page entière |
| P0-03 | Erreurs login toast-only | `LoginPage.jsx` | Messages inline sous email/password + aria | Redesign page login |
| P0-04 | Hex questionnaire non maintenables | `QuestionnairePage.jsx`, `StepLayout.jsx`, `QuestionSelect.jsx`, `FormalityWizardPage.jsx` | Remplacer hex par tokens **existants** (`border-border`, `bg-background`, etc.) | Nouvelles vars `:root`, changer layout wizard |
| P0-05 | CSS safe-area calc invalide | `src/index.css` (~L1045) | Corriger syntaxe `calc(... + env(...))` | Refonte variables nav |
| P0-06 | Code mort bruyant | `ProjectsPage.jsx`, `ProjectDetailPage.jsx`, `LoadingSpinner.jsx`, `NotificationToast.jsx`, `WalletPaymentTerminal.jsx`, `MobileAuthShell.jsx` | Supprimer ou archiver | – |

### 4.2 P1 – Important (cohérence espace client)

| ID | Problème | Fichier(s) | Amélioration | Interdit |
|----|----------|------------|--------------|----------|
| P1-01 | Empty states fragmentés | Dashboard OK ; Analytics sans CTA ; Ops minimal | Créer `src/components/patterns/EmptyState.jsx` wrapping `ui/empty` | Changer empty dashboard existant |
| P1-02 | Loading fragmenté | Multiples pages | Créer `src/components/patterns/PageLoadingState.jsx` | – |
| P1-03 | Progress inline dupliqué | `DashboardPage`, `DossiersPage`, `DossierDetailPage`, `FormalityWizardPage`, `QuestionnairePage`, `AnalyticsPage`, `MobileDossierDetailPage` | Utiliser `ui/progress.jsx` | – |
| P1-04 | Erreurs `text-red-600` vs `text-destructive` | Questionnaire, Documents, CredentialsUnlock | Standardiser `text-destructive` | – |
| P1-05 | Footer absent pages publiques | `ContactPage`, `PricingPage`, `LegalMentionsPage`, etc. | `PublicPageLayout` compose Navbar + children + `GreffioUltraFooter` **sans modifier footer** | Redesign footer |
| P1-06 | `/ops-legacy` vs `/ops` | `App.jsx`, `OpsDashboardPage.jsx` | Redirect 301 ou Navigate vers `/ops/cockpit` | Refonte ops |
| P1-07 | Select natif Dossiers | `DossiersPage.jsx` | Remplacer par `ui/select.jsx` | – |
| P1-08 | Login mobile h-12, Signup non aligné | `LoginPage.jsx`, `SignupPage.jsx` | Hook partagé `useAuthInputClass()` | Redesign signup |
| P1-09 | Double feedback toast+inline | `NonConvictionDeclarationPage.jsx` | Garder un seul canal (inline prioritaire) | – |
| P1-10 | FormalityWizard monolithique | `FormalityWizardPage.jsx` (1771 lignes) | Extraire steps dans `src/components/formality-wizard/` | Changer UI visible |
| P1-11 | Mobile : features hors tab bar | `Sidebar` vs bottom nav | Drawer « Plus » ou enrichir drawer existant | Changer tab bar design |
| P1-12 | Bandeau Google Pay TEST | `PaymentPage.jsx`, `GreffioPaymentTerminal.jsx` | Alert info si config.mode=test | Refonte terminal |
| P1-13 | `outline` + `bg-white` répété 25× | Multiples pages | Option : prop `className` documentée OU variant local dans patterns – **pas** refactor global `button.jsx` sans accord | Modifier variants button globaux |

### 4.3 P2 – Finition premium (long terme)

| ID | Problème | Fichier(s) | Amélioration | Interdit |
|----|----------|------------|--------------|----------|
| P2-01 | Pas de PageHeader commun | Pages client | `PageHeader.jsx` + migration progressive | – |
| P2-02 | AuthenticatedLayout absent | Pages avec Sidebar répétée | Layout wrapper | Changer Sidebar design |
| P2-03 | Framer motion inégal | Dashboard vs login | Motion légère listes dossiers | – |
| P2-04 | Fusion mobile/desktop | Paires Mobile* / Desktop* | Composants partagés (liste dossiers, etc.) | Big-bang rewrite |
| P2-05 | Bundle ~2 Mo index.js | `vite.config` | Code split wizard, ops, payment | – |
| P2-06 | WCAG audit | Formulaires | aria-invalid, focus | – |
| P2-07 | Storybook | – | Catalogue patterns | – |
| P2-08 | NotFound sans shell public | `NotFoundPage.jsx` | Wrap PublicPageLayout | – |
| P2-09 | SignWellCallback bouton raw `<a>` | `SignWellCallbackPage.jsx` | `Button asChild` | – |
| P2-10 | Tablet sidebar gap 768-1024 | `Sidebar.jsx` | Drawer à `lg:` breakpoint | – |

---

## 5. Patterns à créer (recommandation architecture)

ChatGPT doit inclure ces créations dans le plan **avant** les migrations massives.

```
src/components/patterns/
  EmptyState.jsx          ← wrap ui/empty.jsx, props: icon, title, description, cta
  PageLoadingState.jsx    ← skeleton branded ou Loader2 + label
  PageHeader.jsx          ← title, subtitle, breadcrumb slot, actions slot
  FieldError.jsx          ← text-destructive + id pour aria
  GreffioField.jsx        ← Label + Input/Select + FieldError (optional)
```

**Contraintes patterns :**
- Utiliser **uniquement** tokens existants : `primary`, `muted`, `border`, `destructive`, `hsl(var(--greffio-blue))`, `shadow-elevation-sm`
- Pas de nouvelles couleurs hex dans les patterns
- Pas de modification `index.css` `:root`

---

## 6. Ordre de dépendances (graph logique)

```
P0-06 (nettoyage) ──┐
P0-05 (css fix) ────┤
                    ├──► P1-02 PageLoadingState ──► P0-02 Documents loading
                    ├──► P1-01 EmptyState ──► P1-01 Analytics CTA
P0-04 (hex→tokens) ─┤
                    ├──► P1-10 wizard split (après P0-04)
P0-01, P0-03 ───────┘ (indépendants)

P1-05 PublicPageLayout ──► P2-08 NotFound wrap
P1-06 ops redirect ──► indépendant
P1-12 payment bandeau ──► indépendant (après terminal stable)
```

---

## 7. Lots suggérés pour Cursor (template ChatGPT)

ChatGPT peut structurer le plan ainsi :

| Lot | Objectif | Actions typiques | PR title suggéré |
|-----|----------|------------------|------------------|
| **Lot 0** | Hygiène | P0-06, P0-05 | `chore: remove dead UI components and fix safe-area calc` |
| **Lot 1** | Patterns fondation | Créer patterns/ (5 fichiers) | `feat(ui): add shared EmptyState and PageLoadingState patterns` |
| **Lot 2** | P0 UX bugs | P0-01, P0-02, P0-03 | `fix(ui): header notification, documents loading, login errors` |
| **Lot 3** | Questionnaire tokens | P0-04 | `refactor(questionnaire): replace hardcoded hex with design tokens` |
| **Lot 4** | Client coherence | P1-01, P1-03, P1-04, P1-07, P1-09 | `fix(ui): unify empty, progress, errors in client app` |
| **Lot 5** | Public layout | P1-05, P2-08 | `feat(layout): PublicPageLayout with existing footer` |
| **Lot 6** | Auth mobile | P1-08 | `fix(auth): align login/signup input sizing` |
| **Lot 7** | Ops & payment | P1-06, P1-12 | `fix(ops): deprecate legacy dashboard; payment test banner` |
| **Lot 8** | Wizard refactor | P1-10 | `refactor(wizard): split FormalityWizardPage modules` |
| **Lot 9** | Mobile nav | P1-11 | `feat(mobile): secondary nav in drawer` |
| **Lot 10+** | P2 items | Par priorité produit | – |

---

## 8. Format obligatoire de chaque action (pour ChatGPT)

ChatGPT **doit** produire chaque tâche Cursor dans ce format :

```markdown
### ACTION-XXX – [Titre court]

- **Priorité** : P0 | P1 | P2
- **Lot** : Lot N
- **Type** : fix | feat | refactor | chore
- **Fichiers** :
  - `chemin/fichier.jsx` (modifier | créer | supprimer)
- **Scope IN** : ce que Cursor doit faire
- **Scope OUT (interdit)** : ce que Cursor ne doit pas toucher
- **Contexte** : pourquoi (1-2 phrases)
- **Implémentation suggérée** : étapes concrètes
- **Critères d’acceptation** :
  - [ ] Critère testable 1
  - [ ] Critère testable 2
- **Tests manuels** :
  1. Étape…
  2. Résultat attendu…
- **Régression à vérifier** : pages/routes
- **Dépendances** : ACTION-YYY ou aucune
- **Estimation** : S | M | L
```

### Exemple rempli (ChatGPT doit en produire ~25-40)

```markdown
### ACTION-002 – Loading visible page Documents

- **Priorité** : P0
- **Lot** : Lot 2
- **Type** : fix
- **Fichiers** :
  - `src/pages/DocumentsPage.jsx` (modifier)
  - `src/components/patterns/PageLoadingState.jsx` (créer si Lot 1 fait)
- **Scope IN** : Afficher PageLoadingState ou Skeleton pendant `loadingDossiers || loadingDossier`
- **Scope OUT** : Ne pas modifier layout colonnes, upload flow, Didit panels
- **Contexte** : Fetch sans UI = page vide, perception de bug
- **Implémentation suggérée** :
  1. Early return si loading && !data
  2. Réutiliser PageLoadingState avec label « Chargement des documents… »
- **Critères d’acceptation** :
  - [ ] Skeleton visible <2s au chargement initial
  - [ ] Pas de flash empty state avant données
- **Tests manuels** :
  1. Ouvrir /documents connecté, throttling Slow 3G
  2. Voir skeleton puis liste
- **Régression** : upload, téléchargement, filtre dossier
- **Dépendances** : ACTION-001 (PageLoadingState)
- **Estimation** : S
```

---

## 9. Checklist validation globale (fin de plan ChatGPT)

ChatGPT doit terminer son plan avec cette checklist :

### Identité préservée
- [ ] Aucun diff sur `LandingPage.jsx` hero/sections/CTA
- [ ] Aucun diff `:root` dans `index.css` (sauf fix calc L1045 si Lot 0)
- [ ] Aucun diff design `NavbarDropdown.jsx`, `GreffioUltraFooter.jsx`
- [ ] Pas de refactor global `button.jsx` / `card.jsx`

### UX client
- [ ] Documents loading visible
- [ ] Login erreurs inline
- [ ] Header sans fausse notif
- [ ] Analytics empty avec CTA (si Lot 4)

### Technique
- [ ] `npm run build` OK
- [ ] Pas de imports cassés après suppressions Lot 0
- [ ] Mobile + desktop testés sur /dashboard, /documents, /paiement, /login

### Ops
- [ ] `/ops-legacy` redirige (si Lot 7)

---

## 10. Instructions spécifiques agent Cursor (à recopier dans le plan ChatGPT)

Quand ChatGPT rédige le plan pour Cursor, il doit inclure :

1. **Principe diff minimal** – smallest change that fixes the issue
2. **Lire avant d’écrire** – match conventions fichier voisin
3. **Pas de commit/push/deploy** sauf demande utilisateur explicite
4. **Pas de markdown docs** supplémentaires sauf demande
5. **Français UI** – tous libellés utilisateur en français
6. **Tests** – lancer `npm run build` après chaque lot
7. **Mobile** – vérifier `*Entry.jsx` si page a variante mobile
8. **Paiement** – ne pas casser `GreffioPaymentTerminal`, Amazon Pay, Google Pay TEST

---

## 11. Risques & mitigations (pour le plan ChatGPT)

| Risque | Mitigation |
|--------|------------|
| Casser identité en tokenisant questionnaire | Utiliser tokens existants seulement ; revue visuelle wizard |
| Régression mobile/desktop drift | Modifier paires Entry + les deux pages si UX partagée |
| Suppression code mort casse import indirect | `grep -r` avant delete |
| PublicPageLayout double navbar | Ne pas wrapper pages ayant déjà NavbarDropdown inline |
| Wizard split casse mobile prop | Garder `presentation="mobile"` API stable |

---

## 12. Métriques de succès (3 mois)

| KPI | Baseline | Cible |
|-----|----------|-------|
| Fichiers hex hors brand/payment | ~47 | <20 (hors payment brands) |
| Pages client sans loading state | ~8 | 0 |
| Composants patterns réutilisés | 0 | ≥4 |
| Empty states sans CTA (client) | Analytics, ops | 0 client |
| Lignes FormalityWizardPage | 1771 | <400 fichier principal |

---

## 13. Références rapides hex → tokens existants (pour P0-04)

**Ne pas inventer de nouvelles vars.** Mapping suggéré :

| Hex actuel (questionnaire/wizard) | Remplacement token existant |
|-----------------------------------|----------------------------|
| `#d4e2f5`, `#c5d2e6`, `#dbe7f7` | `border-border` ou `border-[hsl(var(--border))]` |
| `#fafcff`, `#f8fbff`, `#f0f6ff` | `bg-background`, `bg-muted/30`, `bg-secondary/40` |
| `#e2ebf8` | `bg-secondary` |
| Texte erreur `#red` classes | `text-destructive` |
| Bleu accent | `text-primary`, `bg-primary`, `hsl(var(--greffio-blue))` |

Payment terminal hex (`GreffioPaymentTerminal`) : **hors scope Lot 3** – traiter en P2 local si needed.

---

## 14. Synthèse une phrase pour ChatGPT

> Greffio a une landing premium figée et un espace client fragmenté (loading, empty, erreurs, hex locaux, double mobile/desktop) : produis un plan de lots Cursor qui améliore UX et maintenabilité **sans toucher l’identité globale**, en créant d’abord des patterns réutilisables puis en migrant page par page avec critères d’acceptation testables.

---

*Document généré le 13 juin 2026 – branche `main`, repo Greffio SaaS – destiné à ChatGPT → plan d’actions Cursor.*
