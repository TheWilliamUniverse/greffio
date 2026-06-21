# Greffio – Contexte complet plateforme & intégrations API (ChatGPT)

> **Usage** : coller ce document entier dans ChatGPT (ou tout assistant IA) pour qu’il comprenne **l’architecture, le métier et chaque intégration externe** de Greffio sans accès au repo.
>
> **Snapshot** : 16 juin 2026 · monorepo Greffio SaaS · production `https://greffio.willentreprises.com`
>
> **Règle absolue** : ne jamais inventer de clés API, secrets ou URLs non listées ici. Toute clé reste **côté serveur** (`/opt/greffio/.env` en prod).

---

## Partie A – Instructions pour ChatGPT

### Rôle attendu

Tu es expert **produit + technique Greffio** : SaaS de formalités d’entreprise (création, modification, greffe, documents, signature, paiement) édité par **William Establishments**. Tu connais le positionnement legal-tech premium (UX type Qonto/Finom, complétude juridique type Legalstart).

### Contraintes impératives

1. **Identité visuelle figée** – ne pas proposer de refonte sans demande explicite sur : landing (`LandingPage.jsx`), palette/tokens globaux (`index.css`), header/footer public, design system transversale.
2. **Statuts SAS** : livrable **27 articles William SAS 2026** – jamais de résumé court.
3. **EI / micro-entreprise** : pas de génération de statuts.
4. **Secrets** : jamais exposer `OPENAI_API_KEY`, `MOLLIE_API_KEY`, `JWT_SECRET`, etc. au frontend.
5. **Paiement `paid`** : uniquement via webhook serveur signé – jamais depuis le navigateur.

### Ce que tu peux faire avec ce contexte

- Concevoir des features, corriger des bugs, rédiger des specs API
- Expliquer les flux utilisateur bout-en-bout
- Proposer des évolutions d’intégrations (nouveau PSP, nouveau provider KYC…)
- Rédiger copy métier, emails, checklists ops

---

## Partie B – Vision produit & écosystème

| Élément | Valeur |
|---------|--------|
| Marque | Greffio |
| Éditeur | William Establishments |
| Site web | `https://greffio.willentreprises.com` |
| API | `https://api.greffio.willentreprises.com` |
| Support | `greffio@willentreprises.com` |
| Repo | `TheWilliamUniverse/greffio` (branche `main`) |

### Promesse client

Parcours guidé de la formalité à la greffe :

```
Simulateur → Compte → Questionnaire → Documents → Statuts (si société)
→ Mandat → Signature → Paiement → Suivi ops → Dépôt guichet unique
```

### Rôles

| Rôle | Accès |
|------|-------|
| Visiteur | Landing, tarifs, simulateur, guide, contact |
| CLIENT | Dossiers, questionnaire, documents, paiement, assistant |
| FORMALISTE | Ops limité, dossiers assignés |
| OPS | Vue transversale dossiers, documents, paiements, emails |
| ADMIN | Tout OPS + gestion comptes internes |

---

## Partie C – Architecture technique

### Stack

| Couche | Technologie | Hébergement prod |
|--------|-------------|------------------|
| Frontend | React 18, Vite 7, React Router 7, Tailwind, Radix UI, Framer Motion | Hostinger (git push → build → `hostinger-frontend.js`) |
| Backend | Node.js ESM, Express 5, PM2 `greffio-api` | VPS Ubuntu `/opt/greffio`, port **8787**, Nginx reverse proxy |
| BDD prod | PostgreSQL (migrations SQL `server/migrations/`) | `DATABASE_URL` |
| BDD dev | SQLite `server/data/greffio.sqlite` | Local uniquement |
| Fichiers | Driver `DOCUMENT_STORAGE_DRIVER` : **s3** (prod), local (dev), supabase (legacy) | AWS S3 `eu-west-3` |
| Mobile | Capacitor 8 Android (`com.greffio.app`) | Mode **remote-first** (charge le site prod) |
| PDF | pdfkit, pdf-lib, @pdf-lib/fontkit | Génération serveur |
| OCR | tesseract.js + pdf-to-img | Analyse documents administratifs |

### Schéma logique

```
[Visiteur / Client / Ops / App Android]
              │
              ▼
┌─────────────────────────────────────────┐
│  Frontend SPA (Hostinger)               │
│  greffio.willentreprises.com            │
└─────────────────┬───────────────────────┘
                  │ HTTPS /api/*
                  ▼
┌─────────────────────────────────────────┐
│  API Express (VPS PM2)                  │
│  api.greffio.willentreprises.com:8787   │
└───┬─────────┬──────────┬────────────────┘
    │         │          │
    ▼         ▼          ▼
PostgreSQL  AWS S3    20+ services externes
                      (voir Partie D)
```

### Structure monorepo

| Dossier | Rôle |
|---------|------|
| `src/pages/` | Pages routées (Landing, Simulateur, Dossiers, Statuts, Ops…) |
| `src/components/` | UI, questionnaire, paiement, signature, documents |
| `src/api/` | Clients fetch vers l’API |
| `src/lib/` | Flow questionnaire, formalités |
| `src/mobile/` | Shell mobile natif, entries mobile/desktop |
| `server/index.js` | Point d’entrée Express (~3200 lignes), routes principales |
| `server/routes/` | Routers modulaires (paiements, signature, identity, onlyoffice…) |
| `server/services/` | Logique métier et adapters externes |
| `server/payments/` | Architecture multi-PSP |
| `server/emails/` | Templates + providers email |
| `server/statuts/` | Pipeline William SAS 27 articles |
| `server/migrations/` | Schéma PostgreSQL versionné |
| `android/` | Projet Capacitor Android (AAB Play Store) |

---

## Partie D – Panorama des intégrations (innovation Greffio)

Greffio n’est pas un simple formulaire : c’est une **orchestration** de services spécialisés, chacun couvrant un maillon du parcours legal-tech.

| # | Service / API | Catégorie | Statut prod | Innovation apportée |
|---|---------------|-----------|-------------|---------------------|
| 1 | **Mollie** | Paiement B2C | **Actif** | Checkout carte/wallets, 3-D Secure, webhooks fiables |
| 2 | **GoCardless** | Paiement B2B | Actif | Prélèvement SEPA pro, interdit en B2C |
| 3 | **Qonto** | Trésorerie B2B | Actif | Rapprochement bancaire, factures – **pas un PSP** |
| 4 | **Virement manuel** | Paiement B2B fallback | Actif | IBAN William + réconciliation ops/Qonto |
| 5 | **Brevo** | Email transactionnel | **Principal** | Relances dossier, signature, MFA, ops |
| 6 | **Resend** | Email fallback | Optionnel | Bascule si Brevo échoue |
| 7 | **Brevo SMS** | SMS transactionnel | Optionnel | OTP signature, alertes |
| 8 | **Didit** | KYC / identité | Actif | Vérification pièce d’identité guidée |
| 9 | **Greffio Internal Signature** | Signature électronique | **Défaut** | SES renforcée, preuve PDF, audit trail |
| 10 | **SignWell** | Signature legacy | Dormant | Webhooks conservés si réactivé |
| 11 | **Signaturit** | Signature | Roadmap | Adapter prévu, non actif par défaut |
| 12 | **OpenAI** | Assistant IA | Actif (si clé) | Chat contextuel dossier + RAG métier |
| 13 | **Ollama** | LLM local VPS | Fallback | Zéro coût API, latence plus élevée |
| 14 | **AWS S3** | Stockage documents | **Prod** | URLs présignées, bucket privé |
| 15 | **Supabase** | Postgres + Storage legacy | Partiel | `DATABASE_URL` possible ; storage legacy |
| 16 | **API Recherche Entreprises** | Open data FR | **Toujours dispo** | SIREN/SIRET, préremplissage |
| 17 | **Pappers** | Enrichissement entreprise | Optionnel | Dirigeants, siège, bilans |
| 18 | **INSEE Sirene** | Enrichissement | Optionnel | Données officielles SIREN |
| 19 | **BAN (data.gouv)** | Géocodage adresses | Actif | Normalisation adresses siège |
| 20 | **ONLYOFFICE** | Édition DOCX | Optionnel | Éditeur collaboratif statuts/documents |
| 21 | **Tesseract.js** | OCR | Actif (serveur) | Détection champs sur PDF scannés |
| 22 | **Firebase FCM** | Push Android | Optionnel | Notifications dossier mobile |
| 23 | **Cloudflare Turnstile** | Anti-bot | Configurable | Login/signup/contact |
| 24 | **Google reCAPTCHA** | Anti-bot fallback | Configurable | Si Turnstile indisponible |
| 25 | **Sentry** | Observabilité | Optionnel | Erreurs backend |
| 26 | **WebSocket** | Temps réel | Actif | Messagerie dossier client ↔ ops |
| 27 | **CAWL / Worldline** | PSP legacy | **Dormant** | Remplacé par Mollie (juin 2026) |
| 28 | **Google Pay** | Wallet | **Dormant** | Routes conservées, non actif B2C |
| 29 | **Amazon Pay** | Wallet | **Retiré** | Juin 2026 |
| 30 | **INPI / Guichet unique** | Statut dépôt | **Non intégré** | Accès API restreint |

---

## Partie E – Détail de chaque intégration

### E.1 Paiements – architecture multi-PSP

**Fichiers clés** : `server/payments/PaymentProviderResolver.js`, `PaymentService.js`, `providers/MolliePaymentAdapter.js`, `providers/GoCardlessAdapter.js`, `providers/QontoReconciliationAdapter.js`, `providers/ManualBankTransferAdapter.js`, `src/components/payments/GreffioPaymentTerminal.jsx`

**Règles métier centralisées** (ne jamais les disperser dans l’UI) :

| Type client | Provider par défaut | Fallback |
|-------------|---------------------|----------|
| B2C (carte, wallets, boutique) | **Mollie** | Erreur 503 si non configuré |
| B2B SEPA | **GoCardless** | Mollie ou virement manuel |
| B2B facture | Mollie si configuré | Virement manuel |
| Réconciliation | **Qonto** | Jamais création de paiement |

**GoCardless interdit en B2C** → code `GOCARDLESS_FORBIDDEN_FOR_B2C` (HTTP 409).

#### Mollie (PSP B2C principal – juin 2026)

| Élément | Détail |
|---------|--------|
| Rôle | Checkout hosted, cartes, méthodes locales, 3-D Secure |
| Variables | `MOLLIE_API_KEY`, `MOLLIE_PROFILE_ID`, `MOLLIE_WEBHOOK_URL`, `MOLLIE_CALLBACK_URL` |
| Routes publiques | `GET /api/mollie/callback`, `GET /api/mollie/status`, `GET /api/mollie/methods` |
| Webhook | `POST /api/webhooks/mollie` (dans `webhookRoutes.js`) |
| Frontend | `GreffioPaymentTerminal.jsx` – formulaire Mollie Components, pas de clé API côté client |
| Callback utilisateur | Redirige vers `/paiement/verification` avec `dossierId`, `status`, `molliePaymentId` |

**Flux B2C** :
1. Frontend charge méthodes via `/api/mollie/methods`
2. `POST /api/payments` crée paiement `pending` côté serveur (montant recalculé via `server/pricing.js`)
3. Client paie chez Mollie
4. Webhook Mollie → mise à jour `payments.status = paid` + transition dossier
5. Callback navigateur → page vérification (affichage uniquement, pas source de vérité)

#### GoCardless (B2B uniquement)

| Élément | Détail |
|---------|--------|
| Rôle | Mandat SEPA, billing request, prélèvement |
| Variables | `GOCARDLESS_ACCESS_TOKEN`, `GOCARDLESS_WEBHOOK_SECRET`, `GOCARDLESS_ENV` |
| Webhook | `POST /api/webhooks/gocardless` |
| Sécurité | Header `Webhook-Signature` HMAC SHA256 |

#### Qonto (rapprochement – pas PSP)

| Élément | Détail |
|---------|--------|
| Rôle | Suivi trésorerie, rapprochement virements, facturation client |
| API | `https://thirdparty.qonto.com/v2` |
| Variables | `QONTO_CLIENT_ID`, `QONTO_CLIENT_SECRET`, `QONTO_ORGANIZATION_ID` |
| Auth | Header `Authorization: login:secret` |
| Fichiers | `server/services/qonto/qontoClient.js`, `qontoInvoiceService.js` |

#### Virement manuel B2B

| Élément | Détail |
|---------|--------|
| Rôle | Coordonnées IBAN/BIC William affichées au client pro |
| Variables | `WILLIAM_ESTABLISHMENTS_IBAN`, `WILLIAM_ESTABLISHMENTS_BIC` |
| Statut `paid` | Validation manuelle ops ou rapprochement Qonto |

#### Providers dormants / retirés

| Provider | Statut | Notes |
|----------|--------|-------|
| CAWL / Worldline / e-Transactions | Dormant (`CAWL_ENABLED=false`) | Webhooks `/api/webhooks/cawl`, `/api/webhooks/cawl/worldline` conservés |
| Google Pay | Dormant | `server/routes/googlePayRoutes.js`, gateway historique CAWL puis Mollie |
| Amazon Pay | Retiré juin 2026 | Voir `docs/runbooks/AMAZON_PAY_RETRAIT_COMPLET_GREFFIO.md` |
| Stripe, PayPlug | Stubs | Extension future via `PaymentProviderAdapter` |

**Routes paiements communes** :

| Route | Description |
|-------|-------------|
| `POST /api/payments` | Création multi-PSP (resolver) |
| `GET /api/payments/:id` | Lecture paiement |
| `POST /api/payments/:id/refund` | Remboursement (ADMIN/OPS) |
| `GET /api/payments/providers/status` | État configuration providers |
| `POST /api/payments/create` | Legacy flow dossier Greffio |

**Idempotence webhooks** : table `payment_events` avec `provider_event_id` unique.

---

### E.2 Emails transactionnels – Brevo + Resend

**Fichiers** : `server/emails/provider.js`, `brevoProvider.js`, `templates.js`, `transactionalTemplates.js`, `dossierEmailPolicy.js`, `dossierReminderPolicy.js`

| Provider | Priorité | Variables |
|----------|----------|-----------|
| **Brevo** | Principal (`EMAIL_PROVIDER=brevo`) | `BREVO_API_KEY`, SMTP relay, `BREVO_SENDER_*`, `BREVO_WEBHOOK_SECRET` |
| **Resend** | Fallback | `RESEND_API_KEY`, `RESEND_WEBHOOK_SIGNING_SECRET` |
| Console | Dev sans clé | Log uniquement |

**Types d’emails** (feature flags dans `.env`) :

| Flag | Usage |
|------|-------|
| `EMAIL_DOSSIER_CREATED_ENABLED` | Création dossier |
| `EMAIL_DOSSIER_REMINDERS_ENABLED` | Relance inactivité (`DOSSIER_REMINDER_MIN_DAYS`) |
| `EMAIL_STATUTES_GENERATED_ENABLED` | Statuts prêts |
| `EMAIL_SIGNATURE_REQUESTS_ENABLED` | Lien signature |
| `EMAIL_DOCUMENT_UPLOAD_RECEIVED_ENABLED` | Accusé upload |
| `EMAIL_INVOICE_PAYMENT_ENABLED` | Facture / paiement |
| `EMAIL_SATISFACTION_REQUEST_ENABLED` | NPS périodique |
| `EMAIL_OPS_NOTIFICATIONS_ENABLED` | Alertes équipe |
| `EMAIL_WEEKLY_DIGEST_ENABLED` | Digest hebdo ops |

**Webhooks email** :
- `POST /api/webhooks/brevo` – delivered, opened, clicked, bounced
- `POST /api/webhooks/resend` – même logique via `email_events`

**Cron ops** : `npm run ops:send-dossier-reminders`, `ops:send-weekly-digest`

---

### E.3 SMS – Brevo Transactional SMS

**Fichier** : `server/emails/brevoSmsProvider.js`

| Élément | Détail |
|---------|--------|
| API | `https://api.brevo.com/v3/transactionalSMS/sms` |
| Variable | `BREVO_API_KEY` (partagée avec email) |
| Usage | OTP signature (`GREFFIO_SIGNATURE_REQUIRE_OTP`), alertes |
| Normalisation | Numéros FR → format E.164 `+33…` |

---

### E.4 Vérification identité – Didit (KYC)

**Fichiers** : `server/services/identity/didit.service.js`, `identity.provider.js`, `server/routes/identityRoutes.js`

| Élément | Détail |
|---------|--------|
| API | `https://verification.didit.me` |
| Variables | `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` |
| Flux | Client déclenche vérif → session Didit → URL guidée → webhook statut |
| Statuts mappés | `approved`, `declined`, `expired`, `under_review`, `pending_user` |

**Routes** :

| Route | Rôle |
|-------|------|
| `GET /api/identity/status/:dossierId` | Statut courant |
| `POST /api/identity/start/:dossierId` | Crée/reprend session |
| `POST /api/identity/refresh/:dossierId` | Rafraîchit depuis Didit |
| `POST /api/webhooks/didit` | Webhook signé HMAC SHA256 |

**Table** : `identity_verifications` (migration 017)

---

### E.5 Signature électronique

**Provider par défaut** : `greffio_internal` (SES renforcée – Simple Electronic Signature)

**Fichiers** : `server/services/signature/`, `server/routes/signaturePublicRoutes.js`, `src/pages/SignaturePublicPage.jsx`

| Provider | Statut | Variable |
|----------|--------|----------|
| `greffio_internal` | **Actif** | `GREFFIO_SIGNATURE_PROVIDER=greffio_internal` |
| SignWell | Legacy dormant | `SIGNWELL_ENABLED=false` |
| Signaturit | Roadmap | `SIGNATURIT_ACCESS_TOKEN` |

**Flux public** `/signature/:token` :
1. Ouverture lien → audit `link_opened`
2. Preview PDF + accusé de lecture
3. Adoption signature + consentement (`greffio-ses-fr-v1.0`)
4. OTP email/SMS si `GREFFIO_SIGNATURE_REQUIRE_OTP=true`
5. Estampillage PDF + certificat de preuve + timeline dossier

**Routes signature** :

| Route | Rôle |
|-------|------|
| `GET /api/signature/public/:token` | Session publique |
| `GET /api/signature/public/:token/pdf` | Preview |
| `POST /api/signature/public/:token/sign` | Finalisation |
| `GET /api/signature/public/:token/signed-document` | PDF signé |
| `GET /api/signature/public/:token/proof-certificate` | Certificat |

**Documents signables** : mandat, déclaration non-condamnation, liste souscripteurs, pouvoirs formalités, documents éditables.

**Tables** : `signature_requests`, `signatures`, `signature_audit_events`, `signature_otps`

---

### E.6 Assistant IA – OpenAI + Ollama + RAG local

**Fichiers** : `server/services/assistant/`, `server/assistant/`, `POST /api/assistant`

Greffio combine **3 niveaux d’intelligence** sans dépendre d’une seule API :

```
Message utilisateur
    ↓
1. Règles locales instantanées (localRules.js) – FAQ, statut dossier
    ↓ si pas de match
2. RAG keyword (~55 fiches knowledgeChunks.js) – SASU, capital, UBO, délais…
    ↓ si besoin LLM
3. OpenAI (gpt-4o-mini / gpt-5.1-mini) OU Ollama local (qwen2.5:7b, llama3.2:3b)
```

| Variable | Rôle |
|----------|------|
| `OPENAI_API_KEY` | Clé serveur uniquement |
| `OPENAI_MODEL` / `AI_PRIMARY_MODEL` | Modèle chat |
| `AI_PRIMARY_PROVIDER` | `openai` ou `ollama` |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` sur VPS |
| `AI_ENABLE_RAG` | Retrieval augmenté |
| `AI_ENABLE_LOCAL_RULES` | Réponses instantanées sans API |
| `ASSISTANT_HOURLY_MAX` / `DAILY_MAX` | Plafonds anti-coût |

**Contexte enrichi** : si utilisateur connecté, l’assistant reçoit l’état du dossier (`dossierContextBuilder.js`), l’intent classifié (`intentClassifier.js`), et des snippets RAG filtrés.

**Route** : `POST /api/assistant` (auth requise, rate limit dédié)

**Test** : `npm run test:assistant` → `node server/scripts/test-assistant.js`

---

### E.7 Stockage documents – AWS S3

**Fichiers** : `server/services/objectStorage.js`, `documentStore.js`

| Driver | Usage |
|--------|-------|
| `s3` | **Production** – bucket privé `greffio-production-documents` |
| `local` | Dev / fallback |
| `supabase` | Legacy optionnel |

| Variable | Rôle |
|----------|------|
| `DOCUMENT_STORAGE_DRIVER=s3` | Sélection driver |
| `AWS_REGION=eu-west-3` | Région |
| `AWS_S3_BUCKET` | Nom bucket |
| `AWS_S3_PRESIGNED_URL_TTL_SECONDS=900` | TTL URLs téléchargement |

**Clés objet** : `{dossierId}/{docKey}/{timestamp}_{filename}`

**Migration** : `npm run storage:migrate-s3` – local → S3

**Types de documents stockés** : pièces justificatives uploadées, statuts PDF/DOCX, mandats, déclarations non-condamnation signées, certificats de preuve, exports audit.

---

### E.8 Données entreprise France – open data + enrichissement

#### API Recherche d’Entreprises (toujours disponible, gratuit)

| Élément | Détail |
|---------|--------|
| URL | `https://recherche-entreprises.api.gouv.fr/search` |
| Fichiers | `server/services/companyLookup.js`, `verification/providers/enterpriseSearchProvider.js` |
| Routes | `GET /api/company-search`, `GET /api/public/company-search` (rate-limited) |
| Usage | Préremplissage simulateur, vérification SIREN, dashboard |

#### Pappers (optionnel, payant)

| Variable | `PAPPERS_API_TOKEN`, `COMPANY_LOOKUP_ENABLE_PAPPERS=true` |
| URL | `https://api.pappers.fr/v2` |
| Données | Dirigeants, bilans, procédures, siège détaillé |

#### INSEE Sirene (optionnel)

| Variable | `INSEE_API_TOKEN`, `COMPANY_LOOKUP_ENABLE_INSEE=true` |
| URL | `https://api.insee.fr/entreprises/sirene/V3.11` |

**Cache** : `COMPANY_LOOKUP_CACHE_TTL_MS=300000` (5 min)

---

### E.9 Géocodage – Base Adresse Nationale (BAN)

| Élément | Détail |
|---------|--------|
| API | `https://api-adresse.data.gouv.fr/search/` |
| Fichier | `server/services/addressSearch.js` |
| Route | `GET /api/geo/address-search` (auth) |
| Usage | Autocomplétion adresse siège, normalisation vérification |

---

### E.10 Moteur de pré-vérification dossier

**Fichier** : `server/services/verification/verificationEngine.js`  
**Doc** : `docs/verification-engine.md`

| Route | Description |
|-------|-------------|
| `POST /api/verification/company/search` | Recherche entreprise |
| `POST /api/verification/company/check` | Validation SIREN |
| `POST /api/verification/address/check` | Normalisation BAN |
| `POST /api/verification/dossier/:id/run` | Lance tous les checks |
| `GET /api/verification/dossier/:id/profile` | Score risque |
| `GET /api/verification/dossier/:id/checks` | Historique |

**Checks locaux sans API** : Luhn SIREN/SIRET, email jetable, complétude, cohérence forme/formalité.

**Niveaux de risque** : LOW (0–20), MEDIUM (21–50), HIGH (51–79), BLOCKING (80–100).

**UI** : `VerificationStatusCard` sur fiche dossier + queue anti-rejet ops.

---

### E.11 Éditeur de documents – ONLYOFFICE + formulaires guidés

Greffio propose **deux modes d’édition** selon le type de document :

| Mode | Provider | Documents |
|------|----------|-----------|
| Formulaire guidé | `guided_form` | Pouvoirs formalités, liste souscripteurs, déclaration non-condamnation |
| Édition libre DOCX | `onlyoffice` | Statuts DOCX, documents convertis |

**Fichiers** : `server/services/onlyofficeService.js`, `documentEditorProviderService.js`, `documentWorkspaceRoutes.js`, `src/components/documents/OnlyOfficeEditor.jsx`

| Variable | Rôle |
|----------|------|
| `ONLYOFFICE_URL` | URL Document Server (Docker `onlyoffice/documentserver`) |
| `ONLYOFFICE_JWT_SECRET` | JWT config éditeur |
| `GREFFIO_API_URL` | URL API accessible par le container ONLYOFFICE |

**Routes ONLYOFFICE** :
- `GET /api/onlyoffice/files/:sessionId/download` – téléchargement pour l’éditeur
- `POST /api/onlyoffice/callback/:sessionId` – sauvegarde après édition

**Workspace documentaire** :
- Versioning (`documentVersionService.js`)
- Preview PDF auto-refresh
- Workflow statuts (`domain/statutesWorkflow.js`)
- Routes sous `/api/dossiers/:id/documents/:docKey/editor`

---

### E.12 OCR & complétion intelligente de documents

**Fichiers** : `server/features/documentCompletion/`

| Technologie | Rôle |
|-------------|------|
| **tesseract.js** | OCR français (`fra.traineddata`) sur PDF scannés |
| **pdf-to-img** | Conversion pages PDF → images pour OCR |
| **pdf-parse / pdf2json** | Extraction couche texte native |
| **OpenAI** (optionnel) | `runAiFieldDetection.js` – détection champs sémantiques |

**Innovation** : détection automatique de zones signature, champs administratifs (mots-clés FR dans `frenchAdministrativeKeywords.js`), suggestions de complétion sur PDF administratifs greffe.

**Route** : `registerDocumentCompletionRoutes` → analyse à l’upload ou sur demande.

---

### E.13 Génération PDF statutaire (moteur interne – pas d’API externe)

**Pipeline William SAS 2026 – 27 articles** :

```
Questionnaire → statutesDataMapper.js → renderWilliamSas2026.js
→ validation capital → PDF (statutesPdf.js) / ODT-DOCX (statutesOfficeExport.js)
→ upload S3
```

**Formes supportées** : SAS, SASU, SARL, EURL, SCI  
**Formes sans statuts** : micro-entreprise, EI

**Routes** :
- `POST /api/statutes/preview-draft` – aperçu simulateur (non auth)
- `POST /api/dossiers/:id/statutes/generate` – génération dossier
- `GET /api/dossiers/:id/statutes/pdf` – téléchargement

**Autres PDF générés** : mandat, déclaration non-condamnation, liste souscripteurs, pouvoirs formalités, certificat preuve signature.

**Librairies** : pdfkit, pdf-lib, @pdf-lib/fontkit

---

### E.14 Push notifications mobile – Firebase FCM

**Fichier** : `server/utils/pushNotifications.js`

| Variable | `FCM_SERVICE_ACCOUNT_JSON` (JSON compte de service Firebase) |
| Package | `firebase-admin` |
| Plugin mobile | `@capacitor/push-notifications` |

**Routes** :
- `POST /api/mobile/push/register` – enregistre token device
- `POST /api/mobile/push/unregister` – retire token
- `GET /api/mobile/notifications` – historique
- `GET /api/notifications/summary` – badge non-lus

**Table** : `push_device_tokens` (migration 007)

---

### E.15 Sécurité & anti-abus

| Service | Fichiers | Usage |
|---------|----------|-------|
| **Cloudflare Turnstile** | `server/security/turnstile.js` | Signup, login risqué, contact, reset password |
| **Google reCAPTCHA** | `server/security/recaptcha.js` | Fallback si Turnstile indisponible |
| **Helmet + CSP** | `server/security/headers.js` | Headers sécurité, CSP report-only |
| **express-rate-limit** | `server/security/rateLimits.js` | 300 req/min/IP global, limiters par route |
| **JWT + MFA** | `authMiddleware.js`, `mfaStore.js` | Access 15m, refresh 7j, TOTP, email OTP, appareils confiance |
| **Verrouillage compte** | migration 021 | Anti brute-force |
| **IDOR tests** | `server/security/idor.test.js` | Tests accès dossier |

**Variables Turnstile** : `TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, flags par endpoint.

**Plafonds vérification** : `CAPTCHA_VERIFY_HOURLY_MAX`, `TURNSTILE_VERIFY_HOURLY_MAX`, etc.

---

### E.16 Observabilité – Sentry

| Variable | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |
| Package | `@sentry/node` |
| Init | `server/security/sentry.js` au bootstrap |
| Client errors | `POST /api/observability/client-error` |

**Alertes ops** : `SECURITY_ALERT_WEBHOOK_URL` (webhook générique)

---

### E.17 Messagerie temps réel – WebSocket

**Fichier** : `server/messaging/dossierMessageHub.js`

| Élément | Détail |
|---------|--------|
| Endpoint WS | `/api/ws/dossier-messages` |
| Fallback | Polling 15 s si WS indisponible |
| Usage | Chat client ↔ formaliste sur un dossier |
| Table | `dossier_messages` (migration 014) |

**Nginx** : upgrade WebSocket requis sur le bloc proxy API.

---

### E.18 Vérification publique d’intégrité document

| Route | `GET /api/public/verify/document/:documentId?token=…` |
| Fichier | `server/services/documentIntegrityService.js` |
| Usage | QR code / lien public prouvant l’authenticité d’un document Greffio |

---

### E.19 Application mobile Android – Capacitor

| Plugin Capacitor | Usage |
|------------------|-------|
| `@capgo/capacitor-native-biometric` | Déverrouillage session biométrique |
| `@capacitor/push-notifications` | FCM |
| `@capacitor/camera` | Scan pièces |
| `@capacitor/filesystem` + `@capawesome-team/capacitor-file-opener` | Ouverture PDF |
| `@capacitor/preferences` | Stockage local préférences |
| `@capacitor/haptics` | Retour haptique |
| `@capacitor/share` | Partage document |

**Mode remote-first** : l’AAB charge `greffio.willentreprises.com` – déploiement web = déploiement mobile sans resoumission Play Store (sauf changement natif).

**Auth native** : `GREFFIO_NATIVE_CLIENT_SECRET` + `VITE_GREFFIO_NATIVE_CLIENT_SECRET` – header client Capacitor.

**Version** : `server/config/appVersion.js` + `AppUpdateDialog.jsx` – force mise à jour si version minimale dépassée.

**Téléchargement APK** : `/api/public/app-download/*` – code email ou code admin.

---

## Partie F – API interne Greffio (cartographie routes)

### Santé & config

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/health` | Non | Healthcheck |
| `GET /api/ready` | Non | Readiness (DB, storage) |
| `GET /api/public/security-config` | Non | Config Turnstile frontend |
| `GET /api/interfaces/status` | ADMIN/OPS | État intégrations |

### Auth & compte

| Route | Description |
|-------|-------------|
| `POST /api/auth/signup` | Inscription |
| `POST /api/auth/login` | Connexion + MFA |
| `POST /api/auth/refresh` | Refresh token |
| `POST /api/auth/forgot-password` | Reset |
| `POST /api/auth/mfa/*` | TOTP, email OTP, appareils confiance |
| `GET/PATCH /api/user/profile` | Profil |

### Dossiers & questionnaire

| Route | Description |
|-------|-------------|
| `GET/POST /api/dossiers` | Liste / création |
| `GET /api/dossiers/:id` | Détail |
| `GET/PATCH /api/dossiers/:id/questionnaire` | Questionnaire |
| `POST /api/dossiers/:id/complete-step` | Avancement étape |
| `POST /api/dossiers/:id/transition` | Transition statut (ops) |
| `GET /api/dossiers/:id/action-state` | Actions disponibles UI |

### Documents

| Route | Description |
|-------|-------------|
| `POST /api/dossiers/:id/documents` | Upload PDF |
| `GET …/download` / `download-url` | Téléchargement |
| `GET/POST …/editor` | Workspace éditeur |
| `POST …/preview-pdf` | Aperçu PDF |

### Statuts & mandat

| Route | Description |
|-------|-------------|
| `POST /api/dossiers/:id/statutes/generate` | Génération |
| `GET /api/dossiers/:id/statutes/pdf` | PDF |
| `GET/POST /api/dossiers/:id/mandate/*` | Mandat procuration |

### Ressources / boutique

| Route | Description |
|-------|-------------|
| `GET /api/resources/services` | Catalogue |
| `POST /api/resources/orders` | Commande |
| `POST /api/resources/cart/pay` | Paiement panier |

### Ops

| Route | Description |
|-------|-------------|
| `GET /api/ops/*` | Dashboard, dossiers, documents, emails, paiements |
| Préfixe | Rôles ADMIN, OPS, FORMALISTE |

### Assistant & mobile

| Route | Description |
|-------|-------------|
| `POST /api/assistant` | Chat IA |
| `POST /api/mobile/search` | Recherche mobile |
| `POST /api/mobile/push/register` | Push token |

---

## Partie G – Machine à états dossier

**Fichier** : `server/stateMachine.js`

Transitions typiques (simplifié) :

```
draft → questionnaire_in_progress → documents_pending → awaiting_payment
→ paid → in_review → ready_for_greffe → submitted → completed
```

Chaque transition peut déclencher :
- Email transactionnel (policy `dossierEmailPolicy.js`)
- Événement timeline (`dossier_status_events`)
- Notification push
- Mise à jour score vérification

---

## Partie H – Variables d’environnement par catégorie

> Référence complète : `.env.example` (racine repo). **Ne jamais committer** `.env` réel.

| Catégorie | Variables principales |
|-----------|----------------------|
| URLs | `APP_URL`, `API_PUBLIC_URL`, `GREFFIO_APP_URL`, `GREFFIO_API_URL` |
| Auth | `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `ACCESS_TOKEN_EXPIRES_IN` |
| BDD | `DATABASE_URL` |
| Storage | `DOCUMENT_STORAGE_DRIVER`, `AWS_*`, `SUPABASE_*` |
| Paiement B2C | `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_URL` |
| Paiement B2B | `GOCARDLESS_*`, `WILLIAM_ESTABLISHMENTS_IBAN` |
| Trésorerie | `QONTO_*` |
| Email | `EMAIL_PROVIDER`, `BREVO_*`, `RESEND_*`, flags `EMAIL_*_ENABLED` |
| KYC | `DIDIT_*` |
| Signature | `GREFFIO_SIGNATURE_*`, `SIGNWELL_*` |
| IA | `OPENAI_*`, `AI_*`, `OLLAMA_*` |
| Entreprise FR | `PAPPERS_*`, `INSEE_*`, `COMPANY_LOOKUP_*` |
| ONLYOFFICE | `ONLYOFFICE_URL`, `ONLYOFFICE_JWT_SECRET` |
| Sécurité | `TURNSTILE_*`, `RECAPTCHA_*`, `SENTRY_DSN` |
| Mobile | `FCM_SERVICE_ACCOUNT_JSON`, `GREFFIO_NATIVE_CLIENT_*` |
| Ops | `DOSSIER_REMINDER_MIN_DAYS`, `EMAIL_OPS_*` |

---

## Partie I – Fichiers code clés (référence rapide)

| Domaine | Fichiers |
|---------|----------|
| Routage frontend | `src/App.jsx`, `src/utils/platform.js` |
| Questionnaire | `src/lib/questionnaireFlow.js`, `src/pages/QuestionnairePage.jsx` |
| Paiement | `src/components/payments/GreffioPaymentTerminal.jsx`, `server/payments/` |
| Auth / biométrie | `src/context/AuthContext.jsx`, `src/utils/biometricAuth.js` |
| Documents PDF | `src/utils/dossierDocumentFile.js`, `server/documentStore.js` |
| Statuts | `server/statuts/`, `server/legal/statutes/` |
| Signature | `server/services/signature/`, `src/pages/SignaturePublicPage.jsx` |
| Assistant | `server/services/assistant/` |
| Ops | `src/pages/OpsDashboardPage.jsx`, `server/routes/opsRoutes.js` |
| Version app | `src/components/AppUpdateDialog.jsx`, `server/config/appVersion.js` |
| Backend entry | `server/index.js` |

---

## Partie J – Zones protégées (règles Cursor workspace)

Ces zones sont **P0/P1** – toute modification doit être minimale et testée :

- Questionnaire, dossiers, PDF, signature, paiement, auth, biométrie, version app
- Voir `.cursor/rules/critical-files-guardrails.mdc`

---

## Partie K – État production & historique intégrations (juin 2026)

| Décision | Date | Détail |
|----------|------|--------|
| Mollie PSP B2C principal | Juin 2026 | Remplace CAWL/Google Pay comme checkout actif |
| Amazon Pay retiré | Juin 2026 | Runbook retrait complet |
| CAWL dormant | Juin 2026 | Code conservé, `CAWL_ENABLED=false` |
| SignWell → signature interne | 2026 | `greffio_internal` par défaut |
| S3 documents prod | 2026 | Remplace Supabase Storage |
| ONLYOFFICE éditeur | Juin 2026 | Workspace documentaire + DOCX statuts |
| OCR Tesseract | 2026 | Complétion documents administratifs |

---

## Partie L – Documents complémentaires dans le repo

| Document | Sujet |
|----------|-------|
| `docs/CONTEXTE_ARCHITECTURE_ET_AMELIORATIONS_CHATGPT.md` | UX & améliorations |
| `docs/contexte-generation-greffio-chatgpt.md` | Statuts & formalités |
| `docs/contexte-securite-greffio-chatgpt.md` | Sécurité |
| `docs/PAYMENTS_ARCHITECTURE.md` | Paiements multi-PSP |
| `docs/signature-system.md` | Signature |
| `docs/verification-engine.md` | Pré-vérification |
| `docs/assistant-integrations.md` | Config assistant IA |
| `docs/CONTEXTE_SIGNATURE_ET_MOBILE_GREFFIO.md` | Mobile & signature |
| `docs/internal/GREFFIO-MASTER-ARCHITECTURE-ET-HISTORIQUE.md` | Historique complet (interne) |

---

## Partie M – Prompt type pour ChatGPT

```
Tu as le contexte complet Greffio (document CONTEXTE_COMPLET_GREFFIO_INTEGRATIONS_CHATGPT).
Mission : [décrire la tâche].

Contraintes :
- Respecter l'identité figée (pas de refonte landing/palette)
- Secrets côté serveur uniquement
- Paiement paid = webhook uniquement
- Statuts SAS = 27 articles William

Produis : [livrable attendu]
```

---

*Document généré pour l’équipe William Establishments / Greffio. Ne pas exposer publiquement les détails d’exploitation VPS ni les secrets.*
