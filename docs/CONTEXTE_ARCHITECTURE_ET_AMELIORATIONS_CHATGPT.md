# Greffio – Contexte architecture & améliorations UX (ChatGPT)

> **Usage** : coller ce document entier dans ChatGPT, puis ajouter un prompt de la section D.
>
> **Objectif** : proposer des idées d'amélioration de disposition, navigation, conversion et parcours – **dans le style et l'identité Greffio**, sans refonte globale.
>
> **Snapshot** : 16 juin 2026 · repo Greffio SaaS · production `greffio.willentreprises.com`

---

## Partie A – Instructions pour ChatGPT

### Rôle

Tu es **expert UX/produit Greffio** : plateforme SaaS de formalités d'entreprise dans l'écosystème **William Establishments**. Tu connais le positionnement premium legal-tech (comparables UX : Qonto, Finom ; complétude juridique : Legalstart).

### Contraintes impératives

1. **Identité figée** – ne pas proposer de modification sans demande explicite sur :
   - Landing (`LandingPage.jsx`) : hero, sections, copy, structure, CTA
   - Palette, tokens CSS globaux (`index.css`, Tailwind theme)
   - Header / navbar public, footer marketing, typographie de marque (Inter + Plus Jakarta Sans)
   - Refonte design system transversale (boutons, cartes, espacements globaux)
2. **Statuts** : livrable complet **27 articles William SAS** – jamais de résumé court.
3. **EI / micro-entreprise** : pas de génération de statuts dans le parcours.
4. **Pas de « refonte totale »** – améliorations locales, incrémentales, alignées marque.

### Ce que tu dois produire

Des **idées concrètes** pour améliorer :
- Disposition et navigation du site
- Tunnel de conversion (landing → simulateur → compte → dossier → paiement)
- Parité mobile web / desktop / app native
- Questionnaire et simulateur
- Dashboard client et coffre documents
- Paiement B2C (Mollie)
- Ops (brief, sans refonte landing)
- SEO, accessibilité, performance (brief)

### Format obligatoire pour chaque suggestion

| Zone | Problème | Idée | Impact | Effort |

- Utiliser le tiret **en-dash (–)** et non l'em-dash (—).
- Classer chaque idée : **quick win** | **medium** | **strategic**.
- Citer des routes ou fichiers probables quand pertinent.
- Distinguer ce qui est **autorisé** (feature locale) vs **interdit** (identité globale).

---

## Partie B – Contexte architecture complet

### B.1 Vision produit

Greffio guide le client de la formalité à la greffe : **simulateur → questionnaire → documents → statuts (si société) → mandat → paiement → suivi**.

| Élément | Valeur |
|---------|--------|
| Marque | Greffio |
| Éditeur | William Establishments |
| Site | `https://greffio.willentreprises.com` |
| API | `https://api.greffio.willentreprises.com` |
| Support | `greffio@willentreprises.com` |
| Score global estimé (juin 2026) | 7,8 / 10 |

**ADN visuel** : Institutionnel · Guidé · Rassurant. Bleu `#1e4d8c`, fonds clairs `#f8fafc`, cartes blanches, ombres douces.

### B.2 Stack & déploiement

| Couche | Technologie | Hébergement |
|--------|-------------|-------------|
| Frontend | React 18, Vite 7, React Router, Tailwind, Radix, Framer Motion | Hostinger static (git push → build) |
| Backend | Node.js ESM, Express 5, PM2 | VPS Ubuntu `/opt/greffio`, port 8787, Nginx |
| BDD prod | PostgreSQL (migrations SQL) | `DATABASE_URL` |
| BDD dev | SQLite | `server/data/greffio.sqlite` |
| Fichiers | S3 (prod), local (dev) | Driver `DOCUMENT_STORAGE_DRIVER` |
| Mobile | Capacitor 8 Android | `com.greffio.app`, mode **remote-first** |
| Email | Brevo (+ Resend fallback) | Templates transactionnels |
| Auth | JWT access/refresh, MFA TOTP/email, appareils de confiance | |
| IA | OpenAI via `POST /api/assistant` | Clé serveur uniquement |
| PDF | pdfkit, pdf-lib | Statuts, mandat, non-condamnation, preuves signature |

**Schéma logique**

```
[Visiteur / Client / Ops]
        │
        ▼
Frontend SPA (Hostinger) ──HTTPS /api/*──► API Express (VPS PM2)
        │                                        │
        │                                        ├── PostgreSQL
        │                                        ├── AWS S3 (documents)
        │                                        └── Services : Mollie, Didit, Brevo, OpenAI
        │
[App Android Capacitor remote] ──► même bundle web + même API
```

**Matrice déploiement remote (juin 2026)**

| Changement | Hostinger | VPS | AAB Android |
|------------|-----------|-----|-------------|
| UI questionnaire, paiement, shell mobile | Oui | Non | Non |
| PDF signés, procuration, webhooks Mollie | Non | Oui | Non |
| Changelog / seuil app-version | Non | Oui | Non |
| FileOpener, icône, plugins Capacitor | Non | Non | Oui |

### B.3 Trois surfaces utilisateur (shells)

```
Requête HTTP / deep link Capacitor
         │
    App.jsx → Layout
         │
    ┌────┴────────────────────────────────────────┐
    │ isCapacitorNative() && shouldUseMobileShell? │
    │   OUI → MobileAppShell (bottom nav native)   │
    │   NON → isMobileBrowserViewport() (<768px)   │
    │         && shouldUseMobileWebShell?          │
    │           OUI → MobileWebShell               │
    │           NON → layout desktop (Header + Sidebar par page) │
    └────────────────────────────────────────────────┘
```

| Critère | Desktop (≥768 px) | Mobile web (<768 px) | App native Capacitor |
|---------|-------------------|----------------------|----------------------|
| Détection | `isDesktopBrowserViewport()` | `isMobileBrowserViewport()` | `isCapacitorNative()` |
| Shell | Aucun – Header + Sidebar | `MobileWebShell.jsx` | `MobileAppShell.jsx` |
| Nav cockpit | `Sidebar.jsx` (12+ entrées) | Bottom nav + drawer ☰ | Bottom nav + drawer ☰ |
| 5e onglet auth | – | **Messages** → `/team` | **Compte** → `/mobile/account` |
| Exclusions shell | – | `/ops`, `/signature/`, `/callback` | idem |
| Biométrie | Non | Non | Oui (`BiometricSessionContext`) |
| Push FCM | Non | Non | Oui |
| OTA UI | Déploiement web immédiat | Idem | Shell remote → idem sans AAB |

**Breakpoints** (`src/utils/platform.js`) : mobile <768 px · tablette 768–1024 px (layout desktop) · desktop ≥1024 px.

**Fichiers pivot** : `src/App.jsx`, `src/utils/platform.js`, `src/config/mobileNavigation.js`, `src/mobile/MobileAppShell.jsx`, `src/mobile/MobileWebShell.jsx`, `src/mobile/entries/*.jsx`.

### B.4 Cartographie des routes (frontend)

#### Public – acquisition & SEO

| Route | Page / Entry | Notes |
|-------|--------------|-------|
| `/` | `LandingPage` (+ `MobileLandingPage` <768px) | Hero figé |
| `/tarifs` | `PricingEntry` | Aligné `LandingPricingSection` |
| `/simulateur` | `FormalityWizardEntry` | Simulateur formalités |
| `/services` | `ServicesEntry` | Catalogue services |
| `/service/:id` | `ServiceDetailPage` | Détail service |
| `/creation-sasu`, `/creation-sas`, `/creation-sarl`, `/creation-sci`, `/micro-entreprise`, `/transfert-siege`, etc. | `ServiceLandingPage` | Landing SEO par formalité |
| `/creation-entreprise`, `/modification-entreprise`, `/guichet-unique-inpi`, `/kbis`, `/annonce-legale` | `SeoPillarPage` | Piliers SEO |
| `/guides`, `/guides/:slug` | `SeoHubPage`, `SeoGuidePage` | Contenu éditorial |
| `/glossaire`, `/glossaire/:term` | `SeoHubPage`, `SeoGlossaryPage` | |
| `/faq` | `SeoFaqPage` | |
| `/guide` | `GuidePage` | FAQ client |
| `/contact`, `/a-propos` | `ContactPage`, `AboutPage` | |
| `/ressources` | `ResourcesPage` | Hub ressources |
| `/ressources/comparateur-forme-juridique` | `LegalFormComparatorPage` | |
| `/ressources/guides/:slug` | `ResourceGuidePage` | |
| `/app`, `/telechargement-app` | `AppInstallPage`, `AppDownloadGatePage` | Téléchargement APK |
| `/mentions-legales`, `/confidentialite`, `/cookies` | Pages légales | |
| `/login`, `/signup`, `/password-reset` | Auth | MFA, captcha si risky |
| `/auth/app-bridge` | `AppAuthBridgePage` | Handoff OAuth natif |
| `/credentials-unlock` | `CredentialsUnlockPage` | Déblocage identifiants |

#### Authentifié – espace client

| Route | Page / Entry | Rôle |
|-------|--------------|------|
| `/dashboard` | `DashboardEntry` | Accueil cockpit |
| `/dossiers` | `DossiersEntry` | Liste dossiers |
| `/dossier/:id` | `DossierDetailEntry` | Détail + timeline |
| `/questionnaire`, `/statuts-gratuits` | `QuestionnaireEntry` | Questionnaire dossier |
| `/documents` | `DocumentsEntry` | Coffre documents |
| `/assistant-documents` | `DocumentCompletionEntry` | Complétion PDF guidée |
| `/statuts` | `StatutsEntry` | Génération statuts William 27 articles |
| `/dossier/:id/declaration-non-condamnation` | `NonConvictionDeclarationPage` | Éditeur + signature |
| `/dossier/:id/liste-souscripteurs` | `SubscribersListPage` | |
| `/dossier/:id/pouvoirs-formalites` | `FormalityPowersPage` | |
| `/documents/:id/sign` | `DocumentSignPage` | Signature connectée |
| `/paiement` | `PaymentEntry` | Terminal Mollie B2C |
| `/paiement/verification` | `PaymentVerificationPage` | Retour checkout |
| `/boutique`, `/boutique/checkout`, `/boutique/commandes` | Boutique ressources | Panier + commandes `GRF-*` |
| `/chat` | `ChatEntry` | Assistant IA |
| `/team` | `TeamEntry` | Messages équipe |
| `/analytics` | `AnalyticsEntry` | Pilotage client |
| `/profil`, `/settings` | `ProfileEntry`, `SettingsEntry` | Compte |
| `/procuration` | `MandatePage` | Mandat public/protégé |
| `/mobile/search` | `MobileSearchPage` | Recherche mobile native |
| `/mobile/account` | `MobileAccountPage` | Hub compte app native |

#### Signature publique

| Route | Page |
|-------|------|
| `/signature/:token` | `SignaturePublicPage` |
| `/callback` | `SignatureCallbackPage` |
| `/verify/document/:id` | `DocumentVerifyPage` |

#### Ops (rôles ADMIN, OPS, FORMALISTE)

| Route | Page |
|-------|------|
| `/ops/cockpit` | Cockpit KPI |
| `/ops/dossiers`, `/ops/dossiers/:id` | File dossiers |
| `/ops/documents`, `/ops/relances`, `/ops/depot` | |
| `/ops/qualite`, `/ops/equipe`, `/ops/audit`, `/ops/settings` | |
| `/ops-observability` | Observabilité recherche entreprise / stockage |
| `/interfaces` | Statut intégrations (interne) |

#### Natif – onboarding

| Route | Page |
|-------|------|
| `/app/welcome` | Premier lancement |
| `/app/home` | Accueil natif pré-auth |

**Pattern Entry** : `*Entry.jsx` dans `src/mobile/entries/` bifurque desktop (`src/pages/`) vs mobile (`src/mobile/Mobile*Page.jsx`).

### B.5 Parcours client type (création SAS)

```
Landing (/) ou SEO service
    → Simulateur (/simulateur) : forme, formalité, synthèse
    → Signup / Login
    → Questionnaire (/questionnaire) : autosave, étapes pas à pas
    → Documents (/documents) : upload PDF, validation ops
    → Statuts (/statuts) si SAS/SASU/SARL/SCI : aperçu 27 articles, export
    → Déclaration non-condamnation, liste souscripteurs, pouvoirs (selon dossier)
    → Mandat (/procuration) + signature (/signature/:token ou /documents/:id/sign)
    → Paiement (/paiement) : GreffioPaymentTerminal Mollie, 3-D Secure
    → Suivi dossier (/dossier/:id) jusqu'à dépôt greffe
```

### B.6 Zones P0 / P1 (guardrails repo)

| Priorité | Zone | Fichiers clés | Statut juin 2026 |
|----------|------|---------------|------------------|
| **P0** | Questionnaire & création dossier | `QuestionnairePage.jsx`, `questionnaireFlow.js` | OK (navigation corrigée 16/06) |
| **P0** | Documents, PDF, signature | `dossierDocumentFile.js`, routes PDF serveur | RISK – parité signature mobile |
| **P0** | Auth, session, biométrie | `AuthContext.jsx`, `BiometricSessionContext.jsx` | OK |
| **P0** | Paiement Mollie B2C | `GreffioPaymentTerminal.jsx`, `mollieRoutes.js` | OK |
| **P0** | App remote & version | `appVersion.js`, `appContextRoutes.js`, `MobileAppShell` | OK |
| **P1** | Statuts William 27 articles | `server/legal/statutes/`, `StatutesPage.jsx` | OK |
| **P1** | Ops back-office | `/ops/*`, `opsRoutes.js` | OK – mobile non optimisé |
| **P1** | Double chemin signature (interne / Signwell legacy) | `signature-system.md` | RISK |
| **P1** | Sécurité & CI | CSP report-only, `test:security` hors CI | RISK |
| **P1** | Push & offline | `mobileOffline.js` | GAP partiel |

### B.7 Design system – figé vs évolutif

#### Figé (sans demande explicite)

- Hero landing, structure sections marketing
- Tokens `:root` (`--greffio-blue`, `--we-*`, shadcn)
- Navbar publique, footer marketing
- Typographie Inter + Plus Jakarta Sans

#### Tokens de référence (`docs/design-tokens.md`)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--greffio-blue` | `214 72% 32%` (~ `#1e4d8c`) | CTA, liens, sidebar active |
| `--greffio-blue-900` | `218 62% 9%` | Titres cockpit mobile |
| `--we-blue` | `#1e4d8c` | Hero landing |
| `--we-border` | `#c5d2e6` | Cartes `.we-card` |
| Mint / citron / coral | Accents sémantiques | Validation, badges, alertes douces |

**Classes utiles** : `.we-card`, `.choice-grid-2`, `.choice-card-mobile`, `.mobile-cockpit-px`, `.fluid-h1`, `.sticky-action-bar`.

#### Évolutif localement

- Textes et métadonnées d'une feature (ex. bandeau statuts « 27 articles · 16 pages »)
- Composants cockpit mobile (`src/mobile/ui/*`)
- Corrections bug UI ponctuelles dans le composant concerné
- Empty states, loading, erreurs par page
- Navigation drawer / bottom tabs (sans changer la palette globale)

**Vigilance branding** : deux rayons coexistent (8 px shadcn vs 22 px `.we-card`) – consolidation documentée, pas de refonte transversale imposée.

### B.8 Architecture paiement (résumé)

**Décision B2C** : **Mollie** actif en production. GoCardless = B2B uniquement. Qonto = réconciliation, pas PSP.

**Flux B2C** :
1. `GreffioPaymentTerminal` charge méthodes Mollie
2. Token carte → `POST /api/payments` (ou routes Mollie dédiées)
3. Webhook Mollie signé → mise à jour `payments` (jamais depuis le frontend)
4. Retour `/paiement/verification` ; app native via Custom Tabs + deep link

**Fichiers** : `src/components/payments/GreffioPaymentTerminal.jsx`, `server/routes/mollieRoutes.js`, `server/payments/PaymentProviderResolver.js`, `docs/PAYMENTS_ARCHITECTURE.md`.

### B.9 Architecture auth (résumé)

- Signup / login / refresh / forgot-password
- MFA TOTP + email + recovery codes + appareils de confiance
- Rôles : CLIENT, FORMALISTE, OPS, ADMIN
- Biométrie native : déverrouillage local post-login (jamais mot de passe en clair)
- `ProtectedRoute` : redirect login, splash boot, contrôle rôles ops

### B.10 Architecture PDF & documents (résumé)

- Upload PDF dossier → S3, statuts document séparés (`requested` → `valid` / `invalid`)
- Génération : statuts William 27 articles, mandat, non-condamnation, liste souscripteurs, pouvoirs formalités
- Éditeurs connectés avec preview PDF
- Complétion guidée `/assistant-documents`
- Vérification publique `/verify/document/:id`

### B.11 Architecture signature (résumé)

- Provider par défaut : **`greffio_internal`** (SES renforcée)
- Signwell : legacy, désactivé sauf config explicite
- Flux public `/signature/:token` : preview → consentement → OTP optionnel → estampillage PDF + certificat preuve
- Routes : `signaturePublicRoutes.js`, `documentSignRoutes.js`, `editableDocumentSignatureRoutes.js`
- **Dette** : parité `DocumentSignPage` mobile native (P0 audit 16/06)

### B.12 Stratégie mobile remote

- **Production Android** : `capacitor.config.remote.json` → `https://greffio.willentreprises.com/?nativeApp=1`
- UI déployée sur Hostinger sans resoumettre AAB à chaque correction UX
- AAB requis uniquement pour changements natifs (plugins, icône, FileOpener, biométrie)
- Contexte audit persisté : `GET /api/app-context` → Preferences Capacitor
- Offline V1 : cache dossiers RO, brouillon questionnaire (partiel), bannière offline native
- Bottom nav native : Accueil, Dossiers, **Nouveau** (questionnaire), Documents, Compte
- Drawer groupé : Mon activité / Pilotage / Créer / Compte (+ ops pour internes)

### B.13 API backend – structure haut niveau (`server/index.js`)

| Domaine | Routes principales |
|---------|-------------------|
| Santé | `GET /api/health`, `/api/ready`, `/api/public/security-config` |
| Auth | `/api/auth/*` (signup, login, refresh, MFA, trusted devices) |
| Dossiers | `/api/dossiers`, questionnaire, documents, transitions |
| Ops | `/api/ops/*` (dossiers, documents, paiements, resource-orders) |
| Paiements | `registerPaymentsRoutes`, `registerMollieRoutes`, webhooks |
| Signature | `registerSignaturePublicRoutes`, document sign, non-conviction |
| Statuts | génération PDF, preview, export office |
| Assistant | `POST /api/assistant`, `POST /api/mobile/search` |
| Mobile | push register, notifications |
| Identité | `/api/identity` (Didit), `/api/verification` |
| Ressources boutique | `/api/resources/*` |
| App | `/api/app-version`, `/api/app-context` |
| Public | company-search, contact, credentials-unlock, app-download |

Routers modulaires : `verificationRoutes`, `identityRoutes`, `opsRoutes`, `paymentsRoutes`, `mollieRoutes`, `dossierMessageRoutes`, `documentCompletionRoutes`, `appContextRoutes`.

### B.14 Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| Visiteur | Landing, simulateur, tarifs, guide, SEO, contact |
| CLIENT | Dossiers, questionnaire, documents, statuts, paiement, chat |
| FORMALISTE | Ops limité, dossiers assignés |
| OPS | Vue transversale, queue anti-rejet, documents, paiements |
| ADMIN | Tout OPS + gestion comptes, transitions manuelles |

---

## Partie C – Propositions d'amélioration (20 items)

> Basées sur audits `AUDIT_UX_GREFFIO_MOBILE_WEB_DESKTOP_2026-06-13`, `AUDIT_PRIORITES_GREFFIO_2026-06-16`, `audit-branding-greffio.md` et lecture codebase. **Aucune refonte identité globale.**

| # | Zone | Problème | Idée | Impact | Effort | Niveau |
|---|------|----------|------|--------|--------|--------|
| 1 | Signature mobile | `DocumentSignPage` non alignée sur le shell mobile natif (P0) | Wrapper mobile dédié avec `MobileSignableDocumentShell`, barre d'actions sticky, retour deep link cohérent | Réduction abandon signature procuration / non-condamnation sur app | M | **quick win** |
| 2 | Dashboard desktop | Cloche notifications à `count=0` fixe dans `Header.jsx` | Brancher sur hub messages `/team` ou masquer l'icône jusqu'à implémentation | Crédibilité UI, moins de fausses affordances | S | **quick win** |
| 3 | Sidebar desktop | Entrée **Statuts** absente alors qu'elle est dans le drawer mobile Pilotage | Ajouter « Statuts » en section Pilotage sidebar (même icône `FileSignature`) | Parité navigation desktop/mobile, accès direct post-questionnaire | S | **quick win** |
| 4 | Mobile native – Compte | Messages accessibles seulement via drawer, pas en onglet (vs web mobile) | Badge non-lu sur onglet Compte + lien prioritaire « Messages équipe » en tête `MobileAccountPage` | Moins de friction support client sur app | S | **quick win** |
| 5 | Paiement | Retour Mollie sur app : dépendance au deep link sans feedback intermédiaire | Écran interstitiel « Paiement en cours de vérification… » sur `/paiement/verification` avec polling statut | Réassurance post-checkout, moins de support | S | **quick win** |
| 6 | Questionnaire mobile | Padding bas parfois insuffisant vs bottom nav + clavier | Harmoniser `MobileStickyFormActions` + safe-area sur toutes les étapes `QuestionnairePage` | Moins d'erreurs de saisie, meilleure complétion | S | **quick win** |
| 7 | Dossier detail mobile | Un seul dossier mis en avant sur `MobileHomePage` | Sélecteur dossier actif (dropdown ou carrousel) + CTA « Voir tous » toujours visible | Parité info desktop, navigation multi-dossiers | M | **medium** |
| 8 | Simulateur | `FormalityWizardPage` monolithique (~1700+ lignes), maintenance difficile | Extraire steps en sous-composants (`WizardStepForme`, `WizardStepSynthese`…) sans changer le visuel `.we-card` | Vélocité correctifs, moins de régressions mobile/desktop | L | **medium** |
| 9 | Profil / Settings mobile | `ProfilePage` / `SettingsPage` gardent layout desktop (`Sidebar` hidden md) | Pages mobile natives légères ou shell sans double marge – réutiliser `MobilePageContainer` | Cohérence cockpit mobile, moins de scroll horizontal | M | **medium** |
| 10 | Ops mobile | `/ops/*` = layout desktop compressé (score UX ~3/10) | `OpsMobileGuardPage` bloquant avec CTA « Ouvrir sur ordinateur » + lien mailto support ops | Évite frustration formalistes sur téléphone | M | **medium** |
| 11 | Documents coffre | Liste dense desktop, peu de regroupement par statut dossier | Filtres pills « À fournir / En revue / Validés » + empty state actionnable (lien questionnaire ou upload) | Clarté prochaine action, moins d'appels support | M | **medium** |
| 12 | Conversion funnel | Après simulateur, friction signup avant de voir la synthèse complète | Bandeau post-synthèse « Créer mon espace pour enregistrer » avec bénéfices (autosave, suivi greffe) – copy locale simulateur uniquement | Conversion simulateur → compte | M | **medium** |
| 13 | Dashboard client | Pas de bloc unique « Actions requises » agrégé (pièces, paiement, signature) | Carte prioritaire en tête dashboard desktop + `MobileDossierStatusCard` enrichi | Réduction temps jusqu'à première action | M | **medium** |
| 14 | Boutique | `ClientShopPage` hybride avec double trigger drawer sur certaines largeurs | Unifier trigger panier via `MobileShellOverlayContext` | Moins de confusion navigation boutique mobile | S | **medium** |
| 15 | Paiement B2C | CGV présentes mais peu visibles avant le CTA final | Rappel condensé des conditions au-dessus du bouton payer (texte local terminal) | Conformité perçue, confiance | S | **quick win** |
| 16 | Accessibilité | `StatusBadge` mélange tokens Greffio et classes Tailwind génériques | Mapper états dossier sur tokens sémantiques existants (mint validation, coral attention) – composant local | Lisibilité, cohérence marque dans l'app connectée | M | **medium** |
| 17 | Performance | Landing mobile : sections différées partiellement | Étendre `MobileLandingDeferredSections` aux blocs below-the-fold non critiques | LCP mobile, score Lighthouse | M | **medium** |
| 18 | SEO / navigation | Hubs guides/glossaire nombreux mais peu de fil d'Ariane dans l'app connectée | Fil d'Ariane local sur pages SEO et ressources (sans toucher hero landing) | SEO interne, orientation visiteur | M | **strategic** |
| 19 | App native – post-login | Toujours redirect `/dashboard` au cold start connecté | Utiliser `resolveNativeDossierContinuePath` si action urgente (pièce manquante, signature en attente) | Time-to-value, rétention | M | **strategic** |
| 20 | Ops (brief) | Pas de vue kanban dossier, seulement liste + queue risque | Colonne kanban optionnelle par phase dossier dans `/ops/dossiers` (filtre, pas refonte cockpit) | Productivité formalistes, SLA visuels | L | **strategic** |

### Synthèse par niveau

| Niveau | Count | Exemples |
|--------|-------|----------|
| **quick win** | 6 | Notifications header, badge messages, sticky questionnaire, CGV paiement |
| **medium** | 11 | Parité Statuts sidebar, actions requises, ops mobile guard, filtres documents |
| **strategic** | 3 | Fil d'Ariane SEO, post-login intelligent, kanban ops |

---

## Partie D – Prompts templates pour ChatGPT

### Prompt 1 – Améliorations globales (recommandé)

```
Tu es expert UX/produit Greffio (contexte ci-dessus).

Propose 10 nouvelles améliorations complémentaires à la Partie C, en respectant STRICTEMENT l'identité figée (section A).

Format obligatoire pour chaque ligne :
Zone | Problème | Idée | Impact | Effort

Classe chaque idée : quick win | medium | strategic.
Utilise le tiret en-dash (–) partout.
Priorise : espace client authentifié, mobile, questionnaire, paiement.
Ne propose AUCUNE refonte landing, palette globale ou navbar publique.

Termine par : top 5 actions à lancer cette semaine + métriques de succès (conversion, complétion questionnaire, taux signature).
```

### Prompt 2 – Tunnel de conversion uniquement

```
À partir du contexte Greffio, audite le tunnel :
Landing / SEO service → /simulateur → signup → /questionnaire → /paiement.

Pour chaque étape, liste 2–3 frictions UX réelles et propose des améliorations LOCALES (copy, disposition, CTA, empty states) sans modifier le hero landing ni les tokens CSS globaux.

Format : Étape | Friction | Idée | Impact conversion | Effort | quick win / medium / strategic
```

### Prompt 3 – Parité mobile web vs app native

```
Compare les trois surfaces Greffio (desktop ≥768px, mobile web <768px, app Capacitor remote) en t'appuyant sur la Partie B.3 et B.4.

Identifie les écarts de navigation (bottom tabs, drawer, sidebar) et de parité fonctionnelle.

Propose des améliorations qui réduisent la confusion (ex. Messages vs Compte, Statuts, ops mobile) sans refonte visuelle de la tab bar.

Inclus des wireframes textuels (structure blocs) pour 2 écrans : MobileHomePage et DossierDetail mobile.
```

### Prompt 4 – Dashboard & coffre documents

```
Propose des améliorations UX pour le dashboard client (/dashboard) et le coffre documents (/documents) Greffio.

Contraintes : palette et typographie marque inchangées ; cartes blanches arrondies ; ton Institutionnel · Guidé · Rassurant.

Focus : carte « prochaine action », filtres documents, états vides, accessibilité clavier, lisibilité mobile.

Format tableau + mockup textuel du above-the-fold dashboard desktop et mobile.
```

---

## Annexes – Fichiers de référence

| Document | Rôle |
|----------|------|
| `docs/internal/GREFFIO-MASTER-ARCHITECTURE-ET-HISTORIQUE.md` | Architecture complète & historique |
| `docs/GREFFIO-AUDIT-CONTEXT-IA.md` | Contexte audit équipe / ops |
| `docs/AUDIT_PRIORITES_GREFFIO_2026-06-16.md` | P0/P1 et matrice déploiement |
| `docs/AUDIT_UX_GREFFIO_MOBILE_WEB_DESKTOP_2026-06-13.md` | Audit UX trois surfaces |
| `docs/design-tokens.md` | Tokens cockpit & mobile |
| `docs/audit-branding-greffio.md` | Brand book & scores |
| `docs/PAYMENTS_ARCHITECTURE.md` | Routing PSP Mollie B2C |
| `MOBILE_RELEASE_PLAN.md` | Stratégie remote-first Android |
| `.cursor/rules/preserve-brand-identity.mdc` | Règle identité figée |
| `src/App.jsx` | Routage complet |
| `src/utils/platform.js` | Détection shells |
| `src/config/mobileNavigation.js` | Tabs & drawer |

---

*Document généré pour usage ChatGPT – Greffio / William Establishments – juin 2026.*
