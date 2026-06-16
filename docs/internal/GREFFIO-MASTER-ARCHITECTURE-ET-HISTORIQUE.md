# Greffio – Dossier maître architecture & historique des demandes

> **CONFIDENTIEL – Équipe William Establishments / Greffio uniquement**
>
> **Emplacement VPS** : `/opt/greffio/docs/internal/GREFFIO-MASTER-ARCHITECTURE-ET-HISTORIQUE.md`
>
> **Dernière mise à jour** : 6 juin 2026
>
> Ce document résume l’origine du projet, l’architecture complète, l’historique des demandes utilisateur et l’état de production. Il ne doit **pas** être exposé via le frontend public.

---

## Table des matières

1. [Genèse et création originale](#1-genèse-et-création-originale)
2. [Philosophie produit & marque](#2-philosophie-produit--marque)
3. [Architecture technique complète](#3-architecture-technique-complète)
4. [Infrastructure & déploiement](#4-infrastructure--déploiement)
5. [Modules métier détaillés](#5-modules-métier-détaillés)
6. [Machine à états & emails](#6-machine-à-états--emails)
7. [Mobile Android](#7-mobile-android)
8. [Chronologie des demandes utilisateur](#8-chronologie-des-demandes-utilisateur)
9. [Travaux récents (sessions Cursor – mai/juin 2026)](#9-travaux-récents-sessions-cursor--maijuin-2026)
10. [Variables d’environnement (catégories)](#10-variables-denvironnement-catégories)
11. [Scripts ops & CLI](#11-scripts-ops--cli)
12. [Décisions techniques structurantes](#12-décisions-techniques-structurantes)
13. [Points ouverts & dette connue](#13-points-ouverts--dette-connue)
14. [Références fichiers clés](#14-références-fichiers-clés)

---

## 1. Genèse et création originale

### 1.1 Point de départ (mai 2026)

Greffio naît d’une refonte d’un site existant livré en archive **`SiteGreffio.zip`**, avec pour ambition de devenir un **SaaS complet de formalités d’entreprise**, comparable en UX à **Qonto / Finom** et en complétude juridique à **Legalstart**.

**Commande originale (Codex / Cursor, 17 mai 2026)** – synthèse :
- Conserver le logo et le style Greffio, enrichir animations et effets
- Dashboard client complet une fois connecté
- Backend réel (pas de maquette statique)
- Refonte complète site + application
- Améliorer le modèle ZIP initial en fonctionnalités
- Ignorer les parties « test » du livrable initial

### 1.2 Évolution de l’architecture initiale

| Phase | État |
|-------|------|
| **V0** | Site statique / prototype ZIP, peu de backend |
| **V1** | Monorepo React + Express, SQLite dev, Supabase Postgres annoncé |
| **V2** | VPS Ubuntu API dédiée, PM2, Nginx, DNS `api.greffio.willentreprises.com` |
| **V3** | Frontend Hostinger git-deploy, PostgreSQL migrations, S3 documents |
| **V4** | Mobile Capacitor Android, Didit KYC, multi-PSP, moteur statuts William 27 articles |
| **V5 (actuel)** | Ops anti-rejet, OCR/prefill, emails transactionnels, recherche site, exports office |

### 1.3 Repository & organisation

- **GitHub** : `TheWilliamUniverse/greffio`, branche `main`
- **Monorepo** : un `package.json` – frontend Vite, API Express, Capacitor Android, scripts deploy
- **Workspace local** : `Application SaaS créée/Greffio SaaS`

---

## 2. Philosophie produit & marque

### 2.1 Greffio dans l’écosystème William

- Marque cliente : **Greffio**
- Entité éditrice : **William Establishments**
- Domaine : `greffio.willentreprises.com`
- Support : `greffio@willentreprises.com`, téléphone affiché footer

### 2.2 Identité figée (règle workspace)

**Interdit sans demande explicite** :
- Landing (`LandingPage.jsx`) : hero, sections, copy, structure, CTA
- Palette, tokens CSS, thème global (`index.css`)
- Header / navbar global, footer public
- Refonte design system transversale

**Autorisé** :
- Features métier (statuts, dossiers, API, mobile)
- Textes locaux à une feature
- Corrections bug UI ponctuelles dans le composant concerné

### 2.3 Promesse client

Parcours guidé de la formalité : simulateur → questionnaire → documents → statuts (si société) → mandat → paiement → suivi greffe – avec assistant IA et app mobile.

---

## 3. Architecture technique complète

### 3.1 Schéma logique

```
[Visiteur / Client / Ops]
        │
        ▼
┌───────────────────────────────────────┐
│  Frontend SPA (React + Vite)          │
│  greffio.willentreprises.com          │
│  Hostinger Node static + hostinger-   │
│  frontend.js                          │
└───────────────┬───────────────────────┘
                │ HTTPS /api/*
                ▼
┌───────────────────────────────────────┐
│  API Express (PM2 greffio-api)        │
│  api.greffio.willentreprises.com      │
│  Port interne 8787, Nginx reverse     │
│  proxy /opt/greffio                   │
└───────┬───────────┬──────────┬────────┘
        │           │          │
        ▼           ▼          ▼
   PostgreSQL    AWS S3     Services externes
   (migrations)  documents  Didit, Brevo, OpenAI,
                              CAWL, GoCardless, etc.

[App Android Capacitor] ──► même API + deep links
```

### 3.2 Frontend (`src/`)

| Dossier / zone | Rôle |
|----------------|------|
| `src/pages/` | Pages routées (Landing, Simulateur, Dossiers, Statuts, Ops, Chat…) |
| `src/components/` | UI réutilisable, navbar, sidebar, questionnaire |
| `src/api/` | Clients fetch vers API (auth headers, parse errors) |
| `src/config/` | Catalogues formalités, tarifs, recherche site, runtime |
| `src/lib/` | Flow questionnaire, moteur formalités |
| `src/mobile/` | Shell mobile natif |
| `src/utils/` | Export statuts office, session, preview |

**Pages critiques** :
- `FormalityWizardPage.jsx` – simulateur statuts / création
- `QuestionnairePage.jsx` – questionnaire dossier authentifié
- `StatutesPage.jsx` – génération & export statuts
- `NonConvictionDeclarationPage.jsx` – déclaration + signature
- `OpsDashboardPage.jsx` – back-office
- `GuidePage.jsx` – FAQ publique nettoyée

### 3.3 Backend (`server/`)

| Zone | Rôle |
|------|------|
| `server/index.js` | Point d’entrée Express (~2800 lignes), routes principales |
| `server/routes/` | Routers modulaires |
| `server/services/` | Logique domaine |
| `server/store.js` | Couche données (Postgres/SQLite) |
| `server/migrations/` | 19 migrations SQL |
| `server/pdf/` | Génération PDF (statuts, mandat, non-condamnation) |
| `server/statuts/` | Pipeline William SAS 2026 |
| `server/emails/` | Templates Brevo/Resend |
| `server/payments/` | Multi-PSP |
| `server/stateMachine.js` | Transitions dossier |

### 3.4 Base de données

- **Production** : PostgreSQL via `DATABASE_URL` (historiquement Supabase-hosted, migrations appliquées sur VPS)
- **Dev** : SQLite `server/data/greffio.sqlite` (interdit en prod)
- **Tables principales** : users, dossiers, dossier_documents, generated_documents, payments, dossier_status_events, ops_notes, push_tokens, signatures, resource_orders, email_events…

### 3.5 Stockage documents

Driver `DOCUMENT_STORAGE_DRIVER` :
- **`s3`** (production actuelle) – bucket dédié, IAM minimal (`docs/aws-iam-greffio-documents-policy.json`)
- **`supabase`** – legacy
- **`local`** – dev / fallback

Clés S3 : `{dossierId}/{docKey}/{timestamp}_{filename}`

Services :
- `objectStorage.js` – upload/delete/signed URL
- `statutesPdfService.js` – génère + upload statuts
- `nonConvictionDocumentService.js` – génère + upload non-condamnation

---

## 4. Infrastructure & déploiement

### 4.1 Topologie production

| Composant | Hébergement | URL / chemin |
|-----------|-------------|--------------|
| Frontend | Hostinger (git push → build) | `greffio.willentreprises.com` |
| API | VPS Hostinger Ubuntu 24.04 | `api.greffio.willentreprises.com` → `:8787` |
| Code API | `/opt/greffio` | PM2 `greffio-api` |
| Env secrets | `/opt/greffio/.env` | **Jamais commité** |
| Backups code | `/opt/greffio-backup-{timestamp}` | Avant chaque deploy |
| Documents | AWS S3 | `s3://` URLs en base |
| BDD | PostgreSQL distant | `DATABASE_URL` |

### 4.2 Déploiement backend

**Script principal** : `scripts/deploy-backend-vps.ps1`
- Tarball local : `server/`, `scripts/`, `docs/`, `package.json`
- SCP → VPS `/tmp/greffio-deploy.tar.gz`
- Extraction `/opt/greffio`, `npm ci --omit=dev`, `npm run db:migrate`, `pm2 restart`

**Alternative** : GitHub Actions `backend-deploy.yml`, `scripts/vps-deploy.sh`

### 4.3 Déploiement frontend

- Push `main` → Hostinger rebuild
- Commands : `npm run hostinger:build` → `npm run hostinger:start`
- `VITE_API_BASE_URL=https://api.greffio.willentreprises.com`

### 4.4 DNS

- Enregistrement **A** `api` → IP VPS API (distinct de FTP legacy Hostinger)
- Frontend sur domaine principal William

---

## 5. Modules métier détaillés

### 5.1 Simulateur & questionnaire

- Entrées : `/simulateur?type=statuts|creation|modification`, `?formality=sas|ei`
- Wizard 4 étapes : démarche → projet → dirigeants/questionnaire → synthèse → offres
- Questionnaire une question / fois avec animation validation (fix timer juin 2026)
- Preview statuts via `POST /api/statutes/preview-draft`
- Draft local `sessionStore` + autosave API questionnaire

### 5.2 Recherche entreprise

- Endpoints : `/api/public/company-search`, `/api/company-search`
- Sources : API Recherche Entreprises (open data), cache, métriques observabilité
- Providers optionnels : Pappers, INSEE (env)
- Prefill intelligent : `intelligentIntake.js`, OCR pièces

### 5.3 Statuts William SAS / SASU

- Template : **27 articles** (SAS), canon William 2026
- Pipeline : `mapStatutesData` → `draftStatutesDocument` → `adaptToLegacyDocument` → PDF / preview
- Dispositions préliminaires : **un seul bloc**, sous-titres en gras, pas d’articles dupliqués
- Typo PDF : garde 18 pt, titres 16 pt, corps 13 pt
- Export client : `statutesOfficeExport.js` (DOCX/ODT structurés)
- API : preview, generate (S3), download PDF (regen si absent)

### 5.4 Documents dossier

- Slots par formalité (`signed_statutes`, `manager_non_conviction`, pièce identité…)
- Upload multer PDF max 10 Mo
- Review ops : valid / invalid + motif → email `document_invalid`
- Download signed URL S3 ou stream local

### 5.5 Déclaration non-condamnation

- Schema `manager_non_conviction_v7`
- PDF layout officiel (Times, sections Identité/Déclaration/Information légale)
- Persist S3 à chaque génération/signature (`nonConvictionDocumentService.js`)
- Migration `019_reset_non_conviction_v7.sql` – reset PDFs obsolètes
- Fix frontend : import `runtimeConfig` dans `nonConviction.js`

### 5.6 Mandat / procuration

- `generateMandatePdf`, signature, statut dossier `mandate_signed`

### 5.7 Paiements

- **Legacy** : Mollie dossier checkout (`/api/payments/create`)
- **Nouveau** : registry CAWL (B2C), GoCardless (B2B SEPA), Qonto reconciliation, virement manuel
- Doc : `docs/PAYMENTS_ARCHITECTURE.md`

### 5.8 Identité & vérification

- **Didit** : workflow KYC, webhook → statut pièce identité VALID
- **Verification engine** : `docs/verification-engine.md`, score risque, blocage étapes
- Ops queue anti-rejet triée par risque

### 5.9 Assistant IA

- `POST /api/assistant` – OpenAI côté serveur
- Modèle configurable `OPENAI_MODEL`
- UI : `/chat`, widgets intégrés – mention « propulsé par ChatGPT »

### 5.10 Emails transactionnels

- Provider : Brevo primary, Resend fallback
- Templates : `transactionalTemplates.js` + legacy `templates.js`
- Format standard (juin 2026) :
  ```
  Bonjour {Prénom},

  {Message métier}

  Nous vous remercions.
  ```
- Email statuts `statutes_generated` : **sans mention ChatGPT**, relire avant signature
- Alias : `statutes_ready` → `statutes_generated`

### 5.11 Ressources / boutique

- Catalogue services, commandes, checkout, webhook paiement ressource

---

## 6. Machine à états & emails

### 6.1 Statuts dossier (extrait)

`draft` → `contact_*` → `questionnaire_*` → `documents_*` → `mandate_*` → `statutes_*` → `payment_*` → `dossier_preparation` → `client_validation_*` → `ready_for_filing` → `filed_*` → `under_administration_review` → `regularization_*` → `accepted`/`rejected` → `official_documents_available` → `completed`

Exceptions : `manual_review_required`, `abandoned`, `refunded`

### 6.2 Acteurs transition

CLIENT, ADMIN, OPS, FORMALISTE, SYSTEM, WEBHOOK

### 6.3 Audit

Table `dossier_status_events` : from, to, actor, reason, timestamp

---

## 7. Mobile Android

- **Capacitor 8**, appId `com.greffio.app`
- Version actuelle prod API : `1.2.3` (versionCode 261510002)
- CI : GitHub Actions `mobile-artifacts.yml` → APK/AAB artifacts
- Play Store : deep links `greffio.willentreprises.com`, assetlinks.json
- Plugins : camera, push (FCM), biometric, filesystem
- Releases documentées : `releases/MOBILE_RELEASE_*.md`

**Problèmes historiques résolus** : versionCode duplicate Play Console, upload key reset, incrément version build.

---

## 8. Chronologie des demandes utilisateur

> Synthèse thématique de l’historique Cursor/Codex (mai–juin 2026). Non exhaustif ligne à ligne mais couvre l’intention produit.

### 8.1 Fondations & refonte (17 mai 2026)

- Refonte SaaS complète depuis SiteGreffio.zip
- Style Qonto/Legalstart, dashboard client, backend réel
- Build `.aab` / `.apk`, publication Play Store
- Catch-up conversation Codex 17-05-2026

### 8.2 Audit & cohérence produit (16 mai 2026)

- Poursuite améliorations post-audit (landing, parcours, backend)
- Interfaces séparées paiement / backend / frontend
- Comparateur de demandes fonctionnel
- Corriger incohérences (statuts proposés en EI, etc.)
- Appliquer préconisations audits UI/UX William

### 8.3 Parcours EI / micro (16 mai 2026)

- **Création EI** : jamais de statuts, infos pertinentes uniquement
- Distinction micro-entreprise et EI
- **Suppression EURL** du catalogue

### 8.4 Questionnaire progressif & recherche (16 mai 2026)

- Questionnaire progressif généralisé (type formalité → forme → questions)
- Animations
- **Recherche SIREN/SIRET** : multiple itérations jusqu’à fix prod (`/api/public/company-search`, DNS api, runtime.js)
- Boutons « Continuer » questionnaire : fixes validation

### 8.5 Innovation & ops (16 mai 2026)

- Auto-collecte intelligente : prefill SIREN + OCR + cohérence
- Provider secondaire company lookup (env)
- Métriques observabilité par source
- Score risque dossier, queue anti-rejet ops
- Blocage étapes si identité KO
- OCR & vérification identité Didit

### 8.6 Assistant ChatGPT & infra (16–17 mai 2026)

- Intégration OpenAI API serveur (pas Assistants API deprecated)
- Config VPS : OPENAI, storage Supabase puis **migration S3**
- Deploy VPS, Nginx, HTTPS, DNS enregistrement `api`
- Scripts ops comptes admin William

### 8.7 Sync web/mobile & prod réelle (22 mai 2026)

- Règle : modif site = modif app (sauf fichiers mobile natifs)
- Suppression mocks frontend → API réelle
- Passe vérification production E2E (auth, dossiers, documents, emails)

### 8.8 Tarifs, Didit, AWS, landing (fin mai 2026)

- Page `/tarifs`, bloc « En clair »
- Sync Didit → VALID pièce identité
- AWS S3 production documents
- Animations scroll landing
- PDF non-condamnation modèle service-public

### 8.9 Statuts, PDF, signature (début juin 2026)

- Fix PDF non-condamnation obsolète (cache S3, regen, upload)
- Fix signature (`runtimeConfig` manquant)
- Statuts PDF S3 + regen download
- Export DOCX/ODT gras/tailles/structure
- Dispositions préliminaires unifiées
- Loupe header recherche site (Ctrl+K)

### 8.10 Simulateur & emails (6 juin 2026)

- Fix bouton **Valider** questionnaire simulateur (timer animation React)
- Emails espacement salutation / message / remerciement
- Guide public : retrait contenu ops (noms fichiers, workflow interne, FAQ ZIP/VPS)
- Email statuts : retrait encart ChatGPT, message « relire vos statuts »

### 8.11 Documentation (6 juin 2026 – present)

- Fichier audit IA sans divulgation (`docs/GREFFIO-AUDIT-CONTEXT-IA.md`)
- Present dossier maître interne VPS

---

## 9. Travaux récents (sessions Cursor – mai/juin 2026)

### Commits significatifs (fin mai – début juin 2026)

| Commit | Sujet |
|--------|-------|
| `a1d7537` | PDF non-condamnation aligné modèle officiel |
| `6fba9fd` | Tarifs, Didit sync, PDF service-public |
| `443ba18` | Recherche header, statuts S3/export, non-condamnation S3 |
| `5c53745` | Fix Valider simulateur, emails espacement |
| `275ef52` | Guide nettoyé, email statuts simplifié |

### Migrations récentes

- `019_reset_non_conviction_v7.sql` – invalidation PDF non-condamnation v6

### État prod vérifié (juin 2026)

- `storageDriver: s3`, S3 configured
- Didit configuré
- API health/ready OK post-deploy
- Frontend Hostinger rebuild on push

---

## 10. Variables d’environnement (catégories)

> **Ne jamais committer `.env`**. Template : `PRODUCTION_SECRETS_TEMPLATE.env`, `GITHUB_SECRETS_TEMPLATE.md`

| Catégorie | Exemples de clés |
|-----------|------------------|
| Core | `NODE_ENV`, `PORT`, `APP_URL`, `API_BASE_URL` |
| BDD | `DATABASE_URL` |
| Auth | `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, token TTL |
| Storage | `DOCUMENT_STORAGE_DRIVER`, `AWS_*`, `SUPABASE_*` |
| Email | `BREVO_*`, `RESEND_*`, `EMAIL_PROVIDER` |
| Paiements | `MOLLIE_*`, `CAWL_*`, `GOCARDLESS_*`, `QONTO_*` |
| Identité | `DIDIT_*` |
| IA | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Entreprise | `PAPPERS_*`, `INSEE_*`, `COMPANY_LOOKUP_*` |
| Mobile | `FCM_*`, `APP_LATEST_VERSION_CODE`, `APP_PLAY_STORE_URL` |
| Frontend Vite | `VITE_API_BASE_URL`, `VITE_APP_URL` |
| Deploy CI | `VPS_HOST`, `VPS_SSH_KEY`, Android keystore secrets |

---

## 11. Scripts ops & CLI

```bash
npm run db:migrate          # Migrations Postgres
npm run ops:promote-william   # Promotion admin
npm run ops:send-account-credentials
npm run ops:refresh-all-accounts
npm run ops:delete-user-dossiers
```

Deploy :
```powershell
pwsh -File scripts/deploy-backend-vps.ps1
```

---

## 12. Décisions techniques structurantes

1. **Monorepo** – un repo, frontend + API + mobile
2. **Postgres obligatoire prod** – SQLite dev only
3. **S3 documents prod** – Supabase storage legacy
4. **PDF statuts serveur** – pas jsPDF client pour livrable greffe
5. **Machine à états centralisée** – transitions contrôlées + audit
6. **Emails template builder** – HTML responsive + texte plain
7. **Identité landing figée** – évolutions métier ailleurs
8. **EI sans statuts** – règle non négociable produit
9. **Tarball deploy VPS** – pas git pull sur serveur (staging directory)
10. **Assistant OpenAI server-side** – clé jamais frontend

---

## 13. Points ouverts & dette connue

- Coexistence Mollie legacy + multi-PSP nouveau – consolidation à terme
- `FormalityWizardPage` export DOCX simulateur encore via ancien `downloadPreview` (StatutsPage corrigée)
- README racine mentionne encore Mollie/Supabase seuls – doc à harmoniser
- RBAC ops = rôle global, pas permissions granulaires UI
- Pas de kanban ops natif
- Relances email automatiques partielles
- Webhook guichet unique INPI non intégré
- iOS Capacitor configuré mais focus Android Play Store

---

## 14. Références fichiers clés

### Documentation publique / technique repo

- `docs/GREFFIO-AUDIT-CONTEXT-IA.md` – contexte audit IA (sans secrets)
- `docs/PAYMENTS_ARCHITECTURE.md`
- `docs/storage.md`
- `docs/verification-engine.md`
- `RUNBOOK_DEPLOYMENT.md`
- `BACKEND_VPS_SETUP.md`
- `FRONTEND_HOSTINGER_GIT_DEPLOY.md`

### Code critique

- `server/index.js` – routes API
- `server/stateMachine.js` – workflow
- `server/statuts/` – statuts
- `server/services/statutesPdfService.js`
- `server/services/nonConvictionDocumentService.js`
- `server/emails/transactionalTemplates.js`
- `src/pages/FormalityWizardPage.jsx`
- `src/pages/StatutesPage.jsx`
- `src/utils/statutesOfficeExport.js`
- `src/config/siteSearchIndex.js`
- `scripts/deploy-backend-vps.ps1`

### Règles Cursor workspace

- `.cursor/rules/preserve-brand-identity.mdc`

---

## Annexe A – Structure repo (arborescence utile)

```
Greffio SaaS/
├── src/                 # Frontend React
├── server/              # API Express
│   ├── migrations/
│   ├── routes/
│   ├── services/
│   ├── statuts/
│   ├── pdf/
│   └── emails/
├── android/             # Capacitor Android
├── docs/                # Documentation
│   └── internal/        # Docs confidentiels VPS
├── scripts/             # Deploy & ops
├── public/              # Assets + .well-known
├── dist/                # Build frontend (généré)
└── releases/            # Notes releases mobile
```

---

## Annexe B – Contacts & support ops

- Site : https://greffio.willentreprises.com
- API : https://api.greffio.willentreprises.com/api/health
- Email support : greffio@willentreprises.com
- Équipe : William Establishments / Greffio Team

---

*Document généré pour usage interne. Ne pas diffuser publiquement. Mettre à jour après chaque lot majeur produit ou infra.*
