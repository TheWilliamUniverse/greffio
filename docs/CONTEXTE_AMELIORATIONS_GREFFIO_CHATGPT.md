# Greffio – Contexte pour proposer des améliorations (ChatGPT)

> **Usage** : coller ce document entier dans ChatGPT, puis ajouter la consigne de la section 1 (ou une variante ciblée). ChatGPT doit **proposer des améliorations concrètes** – produit, UX, parcours, technique front – en respectant les contraintes de marque.
>
> **Pour transformer les propositions en plan d’exécution Cursor** : utiliser ensuite `docs/CONTEXTE_PLAN_ACTIONS_UI_UX_CHATGPT.md`.
>
> **Documents détaillés** (à demander à ChatGPT de lire si tu les colles en complément) :
> - `docs/UI_UX_AUDIT_2026-06-13.md` – audit UI/UX complet (682 lignes)
> - `docs/CONTEXTE_PLAN_ACTIONS_UI_UX_CHATGPT.md` – backlog priorisé + format ACTION-XXX pour Cursor
> - `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` – paiement récent (Amazon Pay, Google Pay, terminal accordéon)
> - `docs/GREFFIO-AUDIT-CONTEXT-IA.md` – contexte ops / équipe interne
> - `docs/audit-branding-greffio.md` – tokens et identité visuelle
> - `.cursor/rules/preserve-brand-identity.mdc` – règle impérative identité

**Snapshot** : 13 juin 2026 · repo `Greffio SaaS` · branche `main`

---

## 1. Consignes à coller dans ChatGPT (choisir une variante)

### Variante A – Améliorations globales (recommandée)

```
Tu es lead produit + UX senior sur une plateforme SaaS juridique (Greffio).

À partir du contexte fourni :

1. Propose des améliorations classées P0 (urgent) / P1 (important) / P2 (finition).
2. Respecte STRICTEMENT la conservation de l’identité Greffio (section 3) – aucune refonte landing, navbar publique, footer, tokens globaux.
3. Pour chaque proposition, indique :
   - Problème utilisateur (1 phrase)
   - Amélioration concrète
   - Fichiers / zones code probablement concernés
   - Impact attendu (crédibilité, conversion, rétention, ops…)
   - Effort estimé (S / M / L)
   - Risques et ce qu’il ne faut PAS toucher
4. Priorise l’espace client authentifié, le mobile, le questionnaire/simulateur, le paiement, et l’ops – pas le marketing figé.
5. Distingue « quick wins » (< 1 jour dev) vs chantiers structurants.
6. Termine par : top 5 actions à faire en premier, métriques de succès, questions ouvertes pour le fondateur.

Réponds en français. Sois spécifique au produit Greffio, pas générique.
```

### Variante B – UX espace client uniquement

```
Propose des améliorations UX uniquement pour l’espace client authentifié Greffio (dashboard, dossiers, documents, paiement, questionnaire connecté).

Contraintes : identité landing figée ; pas de refonte design system global ; privilégier patterns réutilisables (loading, empty, erreurs).

Format : tableau Problème | Page | Solution | Priorité | Fichiers.
```

### Variante C – Mobile (Capacitor + web mobile)

```
Propose des améliorations pour l’expérience mobile Greffio (app Android Capacitor + web mobile).

Contexte : ~10 features en double desktop/mobile ; bottom nav 5 items vs sidebar 12+ entrées.

Contraintes : pas de refonte tab bar design ; améliorations fonctionnelles et cohérence parcours OK.
```

### Variante D – Transformer en plan Cursor

```
À partir du contexte + de tes propositions, produis un PLAN D’ACTIONS exécutable pour l’agent Cursor.

Utilise le format ACTION-XXX décrit dans docs/CONTEXTE_PLAN_ACTIONS_UI_UX_CHATGPT.md section 8.
Structure en lots séquentiels (Lot 0 → Lot N), 1 PR logique max par lot.
```

---

## 2. Qu’est-ce que Greffio ?

Greffio est une **plateforme SaaS de formalités d’entreprise** (création, modification, suivi dossier, documents, signature, paiement) dans l’écosystème **William Establishments**.

| Élément | Détail |
|---------|--------|
| Positionnement | Parcours client guidé premium (type Legalstart / Qonto) + back-office ops interne |
| Site web | `https://greffio.willentreprises.com` |
| API | `https://api.greffio.willentreprises.com` |
| Stack front | React 19, Vite 7, React Router (~80 routes), shadcn/Radix, Tailwind, Framer Motion |
| Mobile | Capacitor (Android), shells `MobileAppShell` / `MobileWebShell` |
| Backend | Node.js Express, SQLite/Supabase, VPS Hostinger |

### Parcours client type

```
Landing / SEO → Simulateur (/simulateur) → Signup → Questionnaire → Documents → Paiement → Instruction greffe
                      ↓
              Recherche SIREN, tarifs, guide, assistant IA
```

### Formalités & statuts

- **27 formalités** au catalogue simulateur
- **Statuts générés** : SAS, SASU, SARL, SCI (template William 27 articles – **livrable complet obligatoire**)
- **Pas de statuts** : micro-entreprise, EI
- Documents : déclaration non-condamnation, liste souscripteurs, pouvoirs, procuration, mandat

### Rôles

| Rôle | Accès |
|------|-------|
| Visiteur | Marketing, simulateur, tarifs, contact |
| CLIENT | Dossiers, questionnaire, documents, paiement, assistant |
| FORMALISTE / OPS / ADMIN | `/ops/*` – file dossiers, validation docs, risques, emails |

---

## 3. Règle absolue – identité figée (NON NÉGOCIABLE)

Source : `.cursor/rules/preserve-brand-identity.mdc`

### INTERDIT sans demande explicite du fondateur

| Zone | Fichiers |
|------|----------|
| Landing hero, sections, copy, CTA | `LandingPage.jsx`, `MobileLandingPage.jsx` |
| Palette & tokens globaux | `index.css` (`:root`), `tailwind.config.js` |
| Navbar / header marketing | `NavbarDropdown.jsx` |
| Footer public | `GreffioUltraFooter.jsx` (design) |
| Refonte design system transversal | `button.jsx`, `card.jsx`, espacements globaux |
| Harmonisation cosmétique large | Login, signup, paiement, pages légales |

### AUTORISÉ

- Bug UI **ponctuel** dans un composant (ex. badge notif fictif dans `Header.jsx`)
- **Patterns réutilisables** nouveaux (`EmptyState`, `PageLoadingState` dans `src/components/patterns/`)
- Amélioration UX **locale** à une feature (loading documents, erreurs inline login)
- Remplacer hex locaux par **tokens existants** (`border-border`, `text-destructive`, `hsl(var(--greffio-blue))`) – sans nouvelles vars `:root`
- Fonctionnalités métier, nettoyage code mort, ops

### Zone grise (prudence)

- `GreffioPaymentTerminal.jsx` : UX OK, pas refonte page paiement entière
- `FormalityWizardPage.jsx` : split fichiers OK, pas changement rendu visuel
- Footer sur `/contact`, `/tarifs` : ajouter footer **existant** via layout OK

---

## 4. Architecture UI – trois surfaces

```
┌─────────────────────────────────────────────────────────────┐
│ MARKETING / SEO / PUBLIC (identité premium FIGÉE)            │
│ NavbarDropdown · landing · tarifs · contact · pages SEO      │
│ Score perçu ~7,5/10 – ne pas dégrader                       │
└─────────────────────────────────────────────────────────────┘
                              ↓ signup/login
┌─────────────────────────────────────────────────────────────┐
│ APP CLIENT AUTHENTIFIÉE (fragmentée – priorité améliorations)│
│ Header + Sidebar desktop · Mobile*Page.jsx · bottom nav      │
│ Score perçu ~5,5/10 – loading, empty, erreurs incohérents    │
└─────────────────────────────────────────────────────────────┘
                              ↓ rôles internes
┌─────────────────────────────────────────────────────────────┐
│ OPS BACK-OFFICE (/ops/* + legacy /ops-legacy)                │
│ Palette slate interne acceptable · cockpit récent ~7/10      │
└─────────────────────────────────────────────────────────────┘
```

**Problème central** : rupture visuelle post-login (marketing `we-*` / hex wizard → app shadcn compacte). Améliorer **l’espace client** avec tokens Greffio existants, sans toucher la landing.

---

## 5. Cartographie rapide – où agir

### Layout & navigation

| Rôle | Fichier |
|------|---------|
| Routes | `src/App.jsx` |
| Header client | `src/components/Header.jsx` |
| Sidebar | `src/components/Sidebar.jsx` |
| Navbar marketing | `src/components/NavbarDropdown.jsx` |
| Footer | `src/components/layout/GreffioUltraFooter.jsx` |
| Shell mobile | `src/mobile/MobileAppShell.jsx`, `MobileWebShell.jsx` |
| Bottom nav | `WebMobileBottomNav.jsx`, `MobileAuthenticatedNav.jsx` |
| Ops | `src/components/ops/OpsShell.jsx` |

### Pages client prioritaires

| Route | Desktop | Mobile |
|-------|---------|--------|
| `/dashboard` | `DashboardPage.jsx` | `MobileHomePage.jsx` |
| `/dossiers` | `DossiersPage.jsx` | `MobileDossiersPage.jsx` |
| `/dossier/:id` | `DossierDetailPage.jsx` | `MobileDossierDetailPage.jsx` |
| `/documents` | `DocumentsPage.jsx` | `MobileDocumentsPage.jsx` |
| `/paiement` | `PaymentPage.jsx` | `MobilePaymentPage.jsx` |
| `/simulateur` | `FormalityWizardPage.jsx` (~1771 lignes) | `presentation="mobile"` |
| `/questionnaire` | `QuestionnairePage.jsx` | `QuestionnaireEntry` |
| `/login`, `/signup` | `LoginPage.jsx`, `SignupPage.jsx` | même composant |

### Composants UI (shadcn)

55 fichiers dans `src/components/ui/`. Sous-utilisés ou morts : `form`, `field`, `empty`, `skeleton`, `progress` (0 usage pages pour form/field/empty).

**Patterns à créer** (recommandation audit – dossier `src/components/patterns/` n’existe pas encore) :

```
EmptyState.jsx       – wrap ui/empty, props icon/title/description/cta
PageLoadingState.jsx – skeleton ou Loader2 + label
PageHeader.jsx       – titre, subtitle, breadcrumb, actions
FieldError.jsx       – text-destructive + aria
GreffioField.jsx     – Label + Input + FieldError
```

---

## 6. Problèmes connus – matière pour propositions

### P0 – Urgent (crédibilité / bug visible)

| ID | Problème | Fichier(s) |
|----|----------|------------|
| P0-01 | Badge notification rouge permanent sans notif réelle | `Header.jsx` |
| P0-02 | Chargement documents invisible (page vide pendant fetch) | `DocumentsPage.jsx` |
| P0-03 | Erreurs login en toast seulement, pas inline | `LoginPage.jsx` |
| P0-04 | ~47 fichiers avec hex hardcodés (questionnaire, wizard) | `QuestionnairePage.jsx`, `StepLayout.jsx`, `FormalityWizardPage.jsx`… |
| P0-05 | CSS safe-area calc invalide | `index.css` (~L1045) |
| P0-06 | Code mort | `ProjectsPage.jsx`, `ProjectDetailPage.jsx`, `WalletPaymentTerminal.jsx`, `MobileAuthShell.jsx`, `LoadingSpinner.jsx`, `NotificationToast.jsx` |

### P1 – Important (cohérence espace client)

| ID | Problème | Fichier(s) |
|----|----------|------------|
| P1-01 | Empty states fragmentés (Analytics sans CTA vs Dashboard OK) | Multiples pages |
| P1-02 | 5+ patterns de loading différents | Multiples pages |
| P1-03 | Progress bar inline dupliquée au lieu de `ui/progress.jsx` | Dashboard, Dossiers, Wizard… |
| P1-04 | Erreurs `text-red-600` vs `text-destructive` | Questionnaire, Documents |
| P1-05 | Footer absent sur `/contact`, `/tarifs`, pages légales | Créer `PublicPageLayout` |
| P1-06 | `/ops-legacy` coexiste avec `/ops/*` | `App.jsx` |
| P1-07 | Select natif HTML sur Dossiers | `DossiersPage.jsx` |
| P1-08 | Login mobile h-12, Signup non aligné | `LoginPage.jsx`, `SignupPage.jsx` |
| P1-09 | Double feedback toast + inline | `NonConvictionDeclarationPage.jsx` |
| P1-10 | `FormalityWizardPage` monolithique 1771 lignes | Split modules sans changer UI |
| P1-11 | Mobile : 12 entrées sidebar vs 5 tabs bottom nav | Drawer « Plus » |
| P1-12 | Bandeau Google Pay TEST non visible pour l’utilisateur | `PaymentPage.jsx`, `GreffioPaymentTerminal.jsx` |

### P2 – Finition (long terme)

- `PageHeader` commun, `AuthenticatedLayout` wrapper
- Fusion progressive desktop/mobile (10 paires dupliquées)
- Code split bundle (~2 Mo index.js)
- WCAG aria-invalid, focus
- NotFound sans shell public
- Tablet gap sidebar 768–1024px

---

## 7. Travaux récents – ne pas casser

| Zone | État au 13/06/2026 | Fichiers clés |
|------|-------------------|---------------|
| Terminal paiement accordéon | Implémenté localement, partiellement déployé | `GreffioPaymentTerminal.jsx` |
| Amazon Pay | Production OK, signature corrigée | `amazonPayService.js`, `AmazonPayCheckoutPanel.jsx` |
| Google Pay | Mode TEST, fix OR_BIBED_06 | `useGooglePay.js`, `googlePayService.js` |
| Navbar CTA | « Créer mon espace » → `/signup` | `NavbarDropdown.jsx` |

Voir `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` pour détails paiement.

---

## 8. Métriques dette & cibles (3 mois)

| KPI | Baseline | Cible |
|-----|----------|-------|
| Fichiers hex hors brand/payment | ~47 | < 20 |
| Pages client sans loading state | ~8 | 0 |
| Composants patterns réutilisés | 0 | ≥ 4 |
| Empty states client sans CTA | Analytics, ops | 0 |
| Lignes FormalityWizardPage | 1771 | < 400 (fichier principal) |
| Score UX espace client (estimé) | 5,5/10 | 7,5/10 |

---

## 9. Mapping hex → tokens existants (questionnaire/wizard)

**Ne pas inventer de nouvelles CSS vars sans accord.**

| Hex actuel | Remplacement |
|------------|--------------|
| `#d4e2f5`, `#c5d2e6`, `#dbe7f7` | `border-border` |
| `#fafcff`, `#f8fbff`, `#f0f6ff` | `bg-background`, `bg-muted/30` |
| `#e2ebf8` | `bg-secondary` |
| Erreurs rouges ad hoc | `text-destructive` |
| Bleu accent | `text-primary`, `hsl(var(--greffio-blue))` |

---

## 10. Format de réponse attendu de ChatGPT

Pour chaque amélioration proposée :

```markdown
### [Titre court]

- **Priorité** : P0 | P1 | P2
- **Catégorie** : UX | Produit | Technique | Ops | Mobile | Paiement
- **Problème utilisateur** : …
- **Proposition** : …
- **Fichiers probables** : …
- **Impact** : crédibilité | conversion | rétention | maintenabilité | ops
- **Effort** : S (< 4h) | M (1–2 j) | L (> 2 j)
- **Interdit** : ce qu’il ne faut pas toucher
- **Quick win ?** : oui / non
- **Dépendances** : …
```

Puis un **Top 5 priorisé** et **questions ouvertes** pour arbitrage produit.

---

## 11. Questions ouvertes (ChatGPT peut les poser au fondateur)

1. Priorité conversion simulateur → signup vs rétention espace client ?
2. Google Pay : basculer en production ou garder TEST visible ?
3. Fusion mobile/desktop : par feature (dossiers d’abord) ou big-bang ?
4. Ops legacy : redirect immédiat ou période de transition ?
5. Assistant IA : investir UX chat ou stabiliser parcours documentaire ?
6. Boutique ressources : priorité produit ou secondaire ?

---

## 12. Synthèse une phrase

> Greffio a une landing premium figée et un espace client fragmenté : propose des améliorations concrètes qui renforcent crédibilité et cohérence post-login **sans toucher l’identité globale**, en priorisant loading/empty/erreurs, mobile, questionnaire et paiement.

---

## 13. Workflow recommandé ChatGPT → Cursor

```
1. Coller CE document dans ChatGPT + Variante A
2. Itérer sur les propositions (filtrer, prioriser)
3. Coller docs/CONTEXTE_PLAN_ACTIONS_UI_UX_CHATGPT.md + Variante D
4. Exécuter le plan lot par lot dans Cursor (Auto)
5. Valider avec checklist section 9 de CONTEXTE_PLAN_ACTIONS
```

---

*Document généré le 13 juin 2026 – Greffio SaaS – pour brainstorming améliorations ChatGPT.*
