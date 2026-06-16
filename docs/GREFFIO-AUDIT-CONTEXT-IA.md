# Greffio – Contexte d’audit IA (équipe & professionnels)

> **Usage** : document de contexte pour qu’une IA ou un auditeur produit évalue les fonctionnalités existantes et propose des évolutions **côté administrateurs, formalistes et équipe Greffio** – sans accès aux secrets, credentials, ni détails d’exploitation sensibles.
>
> **Dernière mise à jour** : juin 2026 · **Repo** : Greffio SaaS (monorepo React + Express)

---

## 1. Vision produit

Greffio est une plateforme SaaS de **formalités d’entreprise** (création, modification, suivi de dossier, documents, signature, paiement, dépôt guichet unique) éditée dans l’écosystème **William Establishments**.

**Positionnement** : parcours client guidé (type Legalstart / Qonto en finesse UX) + back-office ops pour l’équipe interne.

**URLs publiques** (sans détail infra) :
- Site & app web : `https://greffio.willentreprises.com`
- API : `https://api.greffio.willentreprises.com`

**Identité visuelle** : landing, palette, header global et typographie de marque sont **figés** sauf demande explicite ciblée. Les évolutions admin/pro ne doivent pas refondre la charte transversale.

---

## 2. Rôles utilisateurs

| Rôle | Description |
|------|-------------|
| **Visiteur** | Landing, tarifs, simulateur, guide, contact, recherche entreprise (SIREN/SIRET) |
| **CLIENT** | Compte, dossiers, questionnaire, documents, statuts, paiement, chat assistant |
| **FORMALISTE** | Accès ops limité aux dossiers assignés / file de traitement |
| **OPS** | Vue transversale dossiers, documents, risques, paiements, emails |
| **ADMIN** | Tout OPS + gestion comptes internes, transitions manuelles, scripts ops |

Les rôles internes partagent la plupart des endpoints `/api/ops/*`.

---

## 3. Parcours client – fonctionnalités actuelles

### 3.1 Acquisition & simulateur
- Landing animée, CTA vers simulateur / tarifs / création d’espace
- **Simulateur** (`/simulateur`) : choix formalité (création, modification, statuts gratuits), forme juridique, questionnaire progressif une question à la fois, synthèse documentaire, offres payantes
- **Recherche entreprise** : préremplissage par SIREN/SIRET (API publique rate-limitée + recherche authentifiée)
- **Tarifs** : offres Starter / Formalité / partenaire, bloc « En clair »
- **Guide** : FAQ client (pièces, procuration, bonnes pratiques) – contenu ops retiré du public
- **Recherche site** (header) : index pages + services + raccourci Ctrl+K

### 3.2 Compte & espace client
- Inscription, connexion, refresh token, mot de passe oublié
- MFA (TOTP, email, appareils de confiance)
- Profil, paramètres, alertes connexion
- Dashboard (desktop + variante mobile Capacitor)
- Liste dossiers, corbeille, restauration
- Questionnaire multi-étapes avec autosauvegarde
- Documents : upload PDF, validation ops, téléchargement, éditeur déclaration non-condamnation
- Statuts : aperçu, génération PDF (27 articles SAS William), export DOCX/ODT, téléchargement
- Procuration / mandat : génération PDF, signature
- Déclaration non-condamnation : éditeur, aperçu PDF officiel, signature électronique
- Paiement dossier (legacy Mollie + stack multi-PSP en cours : CAWL, GoCardless, virement)
- Assistant conversationnel (OpenAI côté serveur uniquement)
- Vérification identité (Didit), moteur de pré-vérification dossier, score risque
- Ressources / boutique (commandes ressources payantes)
- App mobile Android (Capacitor) : biométrie, push, scanner, deep links

### 3.3 Règles métier notables
- **EI / micro-entreprise** : pas de génération de statuts ; parcours déclaratif uniquement
- **EURL retirée** du catalogue ; SAS, SASU, SARL, SCI supportés pour statuts
- Statuts : template William SAS 2026, 27 articles, dispositions préliminaires unifiées, typo greffe (13–16–18 pt)
- Documents PDF stockés sur driver configurable (S3 en prod recommandé)

---

## 4. Back-office ops – fonctionnalités actuelles

### 4.1 Dashboard ops (`/ops`)
- KPI dossiers, volume paiements
- Liste dossiers avec filtres
- **Queue anti-rejet** : tri par score risque, délai, pièces manquantes
- Détail dossier : statut, assignation (`assignedToUserId`, priorité, file)
- Notes ops par dossier
- Liste documents + changement statut document (`requested` → `valid` / `invalid`)
- Historique transitions statut dossier
- Profil risque dossier (identité, complétude, incohérences)
- Commandes ressources : changement statut fulfillment
- Observabilité : métriques recherche entreprise, stockage
- Interfaces : statut intégrations (storage, assistant, etc.)

### 4.2 Actions API ops (non exhaustif)
- `GET /api/ops/dossiers`, `/api/ops/dossiers-risk`
- `PATCH` assignation, champs ops dossier
- `POST /api/dossiers/:id/transition` (transition manuelle contrôlée par machine à états)
- `PATCH /api/ops/dossiers/:id/documents/:docKey/status`
- `GET /api/ops/payments`, refund
- `GET /api/ops/email-events`
- Scripts CLI : promotion admin, envoi identifiants, refresh comptes, suppression dossiers user

### 4.3 Machine à états dossier (résumé)
Phases : intake → questionnaire → documents → mandat → statuts → paiement → préparation → validation client → dépôt → instruction → complément → acceptation/rejet → clôture.

Statuts document séparés : `requested`, `uploaded`, `under_review`, `valid`, `invalid`.

Emails transactionnels déclenchés sur certaines transitions (Brevo/Resend).

---

## 5. Stack technique (sans secrets)

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Vite 7, React Router, Tailwind, Radix, Framer Motion |
| Backend | Node.js ESM, Express 5, PM2 |
| BDD prod | PostgreSQL (migrations SQL numérotées) |
| BDD dev | SQLite fallback |
| Fichiers | S3 (prod), Supabase Storage (legacy), local (dev) |
| Auth | JWT access/refresh, MFA, rôles |
| Email | Brevo (+ Resend fallback), templates HTML/texte |
| Paiements | CAWL, GoCardless, Qonto réconciliation, virement manuel ; Mollie legacy |
| Identité | Didit KYC + webhook |
| IA | OpenAI via `/api/assistant` (clé serveur uniquement) |
| Mobile | Capacitor 8 Android, FCM push |
| PDF | pdfkit, pdf-lib (statuts, mandat, non-condamnation) |
| Déploiement | Frontend Hostinger (git push build) ; API VPS Ubuntu + Nginx |

---

## 6. Modules métier backend (cartographie)

- `server/stateMachine.js` – transitions dossier
- `server/store.js` – persistance dossiers, documents, paiements, generated_documents
- `server/statuts/` – pipeline statuts William (adaptateurs, validateurs, PDF)
- `server/legal/statutes/` – catalogues formes juridiques
- `server/services/verification/` – moteur pré-vérification
- `server/services/identity/` – Didit
- `server/services/objectStorage.js` – abstraction stockage
- `server/services/nonConvictionDocumentService.js` – PDF non-condamnation + S3
- `server/services/statutesPdfService.js` – génération statuts + S3
- `server/emails/` – templates transactionnels
- `server/payments/` – registry multi-PSP
- `server/routes/` – modules routes (payments, verification, identity, signatures, app-version)

---

## 7. Ce qui manque ou est partiel (pistes d’audit)

> **Objectif de l’audit IA** : prioriser des évolutions **admin / formaliste / pro Greffio**, pas des refontes landing.

### 7.1 Gestion dossiers & workflow
- [ ] Vue kanban par statut dossier (au-delà de la liste + queue risque)
- [ ] SLA / échéances par étape avec alertes ops
- [ ] Réassignation bulk, files par formaliste
- [ ] Modèles de notes / checklists ops par type de formalité
- [ ] Historique unifié « timeline client + ops + emails + webhooks »
- [ ] Simulation de transition (dry-run) avant changement statut
- [ ] Export dossier complet (PDF + pièces) pour greffe partenaire

### 7.2 Documents & conformité
- [ ] Revue side-by-side document vs données questionnaire
- [ ] Règles anti-rejet configurables par type de pièce
- [ ] Validation en lot (batch approve/reject)
- [ ] Versioning statuts signés vs générés
- [ ] Registre des modifications post-génération statuts
- [ ] OCR pipeline ops (au-delà du préremplissage client)

### 7.3 Communication client
- [ ] Éditeur ops des emails type avant envoi
- [ ] Relances automatiques configurables (inactif, pièce manquante, validation)
- [ ] Portail client « actions requises » agrégé
- [ ] SMS complémentaires (Brevo SMS partiellement câblé)

### 7.4 Paiements & facturation
- [ ] Reconciliation dashboard Qonto temps réel
- [ ] Remboursements partiels, avoirs, factures PDF
- [ ] Tarification dynamique par formalité / offre jeune
- [ ] Suivi impayés + relances paiement

### 7.5 Équipe & gouvernance
- [ ] RBAC fin (permissions par action, pas seulement par rôle)
- [ ] Journal d’audit admin (qui a validé quoi)
- [ ] Gestion utilisateurs internes UI (au-delà des scripts CLI)
- [ ] Métriques productivité formaliste (dossiers / délai / taux rejet)
- [ ] Sandbox / dossiers test isolés

### 7.6 Intégrations pro
- [ ] Webhook sortant vers CRM William
- [ ] Connecteur guichet unique (INPI) si/API disponible
- [ ] Export comptable des paiements
- [ ] API partenaire greffier (lecture statut dossier)

### 7.7 Observabilité
- [ ] Dashboard erreurs API / latence
- [ ] Alerting stockage S3, webhooks Didit/PSP
- [ ] Suivi taux succès emails (Brevo events)

---

## 8. Contraintes à respecter pour toute proposition

1. **Ne pas modifier** landing, tokens CSS globaux, header/footer public sans demande explicite.
2. **Statuts PDF** : livrable complet 27 articles ; pas de résumé court.
3. **EI/micro** : jamais de statuts dans le parcours.
4. **Sécurité** : secrets uniquement côté serveur ; jamais de clés API en frontend.
5. **Cohérence web/mobile** : toute feature client doit exister ou être explicitement exclue sur mobile.
6. **Emails** : ton professionnel, structure salutation / message / remerciement ; pas de jargon technique client.

---

## 9. Questions ouvertes pour l’auditeur IA

1. Quelles 10 features ops apporteraient le plus de gain immédiat (réduction rejet greffe, délai traitement) ?
2. Où la machine à états est-elle trop rigide ou trop permissive pour l’équipe ?
3. Quels écrans ops manquent par rapport à un formaliste Legalstart / Externe ?
4. Comment structurer un « cockpit formaliste » unique vs dashboards éclatés actuels ?
5. Quelle roadmap en 3 lots (30j / 90j / 6 mois) pour l’équipe Greffio ?

---

## 10. Documents complémentaires (repo, non sensibles)

- `docs/PAYMENTS_ARCHITECTURE.md`
- `docs/storage.md`
- `docs/verification-engine.md`
- `RUNBOOK_DEPLOYMENT.md`, `BACKEND_VPS_SETUP.md`
- `README.md`

---

*Ce document ne contient volontairement aucun secret, mot de passe, clé API, IP serveur, chemin `.env`, ni donnée personnelle client.*
