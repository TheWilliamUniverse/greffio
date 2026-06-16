# Mission Cursor – Améiorations ciblées Greffio

> **Date** : 16 juin 2026  
> **Usage** : document d'exécution Cursor – améliorations UX/produit filtrées depuis la spec ChatGPT  
> **Production** : `https://greffio.willentreprises.com` · API `https://api.greffio.willentreprises.com`  
> **Référence source** : `docs/CONTEXTE_ARCHITECTURE_ET_AMELIORATIONS_CHATGPT.md`

---

## 1. Résumé de compréhension (filtres utilisateur confirmés)

### 1.1 Credo validé

**Perfection absolue** – utile, élégant, cohérent, sobre, robuste, relié au backend, identité Greffio premium. Pas de rebrand global.

### 1.2 À APPLIQUER (périmètre validé)

| Zone | Périmètre |
|------|-----------|
| Signature | Quick win mobile P0 uniquement |
| Questionnaire | Strategic – mode `missing_but_continue_allowed` |
| Paiement | Quick win + strategic |
| Interconnectivité front/backend | **Tout** sauf Documents medium (statuts doc partiels ops-only) |
| Mobile web / app | **Tout** sauf Mobile Home medium, Mobile Dossier quick win, Mobile Documents medium |
| Dashboard | Pas de carte globale « Votre prochaine action » ; above-the-fold PC **uniquement** quand un dossier est sélectionné |
| Documents | Traçabilité, vérification, certificats, preuves – **pas** de filtres visibles client |
| Assistant IA | Medium avec `GreffioAssistantOrb` (robot animé, salut au survol, chat léger) |
| Preuves / certificats | Strategic – ops-only |
| SEO / perf / a11y | Prudent – pas de bulk section 8 sauf accessibilité quick win (sobre) |
| Notifications | Brancher la cloche sur le backend réel – **ne pas masquer** |
| Dossiers PC | Affichage et sélection comme sur mobile |

### 1.3 À NE PAS APPLIQUER

| Exclusion | Raison |
|-----------|--------|
| Carte « Votre prochaine action » sur `/dashboard` | Refus utilisateur |
| Ajouter Statuts à la sidebar | Déjà présent |
| Badge messages sur `MobileAccountPage` | Refus utilisateur |
| Filtres Documents visibles client | Backend only pour l'instant |
| Masquer la cloche notifications | Refus – brancher plutôt |
| Estimations de délai ops visibles client | Refus |
| Reste de la section 7 assistant non validé | Hors périmètre |
| Timeline enrichie, assistant documents, messages équipe | Plus tard sauf demande explicite |

### 1.4 Correctifs immédiats juin 2026 (déjà traités en code)

Voir section 8 en fin de document.

---

## 2. Credo d'exécution

1. **Utile avant joli** – chaque écran doit réduire une friction réelle (dépôt pièce, signature, paiement, questionnaire).
2. **Élégant et sobre** – institutionnel Greffio, pas de surcharge visuelle.
3. **Cohérent** – parité logique desktop / mobile web / app native sans copier bêtement le layout.
4. **Robuste** – erreurs explicites, fallbacks Capacitor, webhooks signés, pas de state fantôme.
5. **Backend-linked** – pas d'UI factice ; cloche, statuts documents, assistant = API réelles.
6. **Identité premium figée** – bleu `#1e4d8c`, cartes blanches, Inter + Plus Jakarta Sans.
7. **Diffs minimaux** – une zone à la fois, tests ciblés, pas de refonte transversale.

---

## 3. Contraintes identité figée

Référence : `.cursor/rules/preserve-brand-identity.mdc`

### Interdit sans demande explicite

- Landing (`LandingPage.jsx`) : hero, sections, copy, structure, CTA
- Tokens CSS globaux (`index.css`, thème Tailwind)
- Header / navbar public, footer marketing
- Refonte design system transversale (boutons, cartes, espacements globaux)
- Harmonisation cosmétique login/signup/paiement/légal

### Autorisé

- Features métier locales (questionnaire, dossiers, documents, paiement, mobile)
- Textes et métadonnées **locales** à une feature
- Corrections bug UI **ponctuelles** dans le composant concerné
- Shell mobile (`src/mobile/*`), entries, bottom nav, drawer
- Ops back-office (sans toucher landing)

### Zones P0/P1 protégées

Référence : `.cursor/rules/critical-files-guardrails.mdc`

| Zone | Fichiers pivot |
|------|----------------|
| Routage | `src/App.jsx`, `src/utils/platform.js`, `src/config/mobileNavigation.js` |
| Questionnaire | `src/lib/questionnaireFlow.js`, `QuestionnairePage.jsx` |
| PDF / documents | `src/utils/dossierDocumentFile.js`, routes serveur documents |
| Paiement | `GreffioPaymentTerminal.jsx`, `server/routes/mollieRoutes.js` |
| Auth | `AuthContext.jsx`, `BiometricSessionContext.jsx` |
| Version app | `AppUpdateDialog.jsx`, `server/config/appVersion.js` |

---

## 4. Zones d'amélioration détaillées

### 4.1 Signature mobile (P0 – quick win)

| Attribut | Détail |
|----------|--------|
| **Problème** | `DocumentSignPage` non alignée shell mobile natif – abandon signature procuration / non-condamnation sur app Capacitor |
| **Idée** | Wrapper `MobileSignableDocumentShell` : barre sticky (signer / refuser / aperçu), retour deep link cohérent, preview PDF via `dossierDocumentFile.js` |
| **Fichiers probables** | `src/pages/DocumentSignPage.jsx`, `src/mobile/entries/DocumentSignEntry.jsx` (à créer si absent), `src/mobile/ui/MobileSignableDocumentShell.jsx`, `src/utils/dossierDocumentFile.js` |
| **Backend** | `signaturePublicRoutes.js`, `documentSignRoutes.js`, `editableDocumentSignatureRoutes.js` – inchangé côté contrat |
| **Impact** | Réduction abandon signature mobile – P0 audit 16/06 |
| **Effort** | M (2–4 j) |
| **Phase** | 1 |

**Critères** : signature complète sur Android remote sans reload ; PDF ouvert via FileOpener ; retour dossier après callback.

---

### 4.2 Questionnaire – `missing_but_continue_allowed` (strategic)

| Attribut | Détail |
|----------|--------|
| **Problème** | Blocage dur sur champs manquants non critiques – abandon tunnel long |
| **Idée** | Flag stratégique par étape : autoriser « Continuer » avec bannière « à compléter plus tard » pour champs non bloquants greffe |
| **Fichiers probables** | `src/lib/questionnaireFlow.js`, `QuestionnairePage.jsx`, `src/components/questionnaire/*`, `server/index.js` (validation étapes) |
| **Backend** | Persister `missingFields` + `continueAllowed` dans `dataJson` ; endpoint complete-step tolérant |
| **Impact** | Complétion questionnaire +15–20 % estimé |
| **Effort** | L (1–2 sem) |
| **Phase** | 2 |

**Règle métier** : champs P0 greffe (dénomination, forme, capital, dirigeant) restent bloquants.

---

### 4.3 Paiement – quick win + strategic

#### 4.3a Quick win – écran vérification interstitiel

| Attribut | Détail |
|----------|--------|
| **Problème** | Retour Mollie sur app : attente sans feedback |
| **Idée** | `/paiement/verification` : spinner + polling `GET /api/payments/:id` toutes les 2 s, max 30 s |
| **Fichiers** | `PaymentVerificationPage.jsx`, `GreffioPaymentTerminal.jsx` |
| **Backend** | Webhook Mollie déjà en place – exposer statut lisible client |
| **Effort** | S |
| **Phase** | 1 |

#### 4.3b Quick win – rappel CGV condensé

| Attribut | Détail |
|----------|--------|
| **Problème** | CGV peu visibles avant CTA payer |
| **Idée** | Ligne locale au-dessus du bouton dans le terminal uniquement |
| **Fichiers** | `GreffioPaymentTerminal.jsx` |
| **Effort** | S |
| **Phase** | 1 |

#### 4.3c Strategic – parité deep link native

| Attribut | Détail |
|----------|--------|
| **Idée** | Custom Tabs Android + retour `greffio://paiement/verification` documenté |
| **Fichiers** | `capacitor.config.*`, `PaymentEntry.jsx`, `mollieRoutes.js` |
| **Effort** | M |
| **Phase** | 3 |

---

### 4.4 Interconnectivité front / backend (sauf Documents medium)

| Attribut | Détail |
|----------|--------|
| **Problème** | Plusieurs widgets UI déconnectés (notifications, compteurs, états dossier) |
| **Idée** | Brancher chaque affordance sur API réelle ; React Query invalidation cohérente |
| **Périmètre validé** | Dashboard notifications, dossier actif, messages non-lus header, statuts paiement, version app, push registration |
| **Exclu** | Filtres documents client (medium) – statuts doc partiels ops-only OK |
| **Fichiers** | `Header.jsx`, `DashboardPage.jsx`, `useDossierQuery.js`, `dossierMessageHub.js`, `server/routes/dossierMessageRoutes.js` |
| **Backend** | `GET /api/dossiers`, `GET /api/dossiers/:id/messages`, hub messages |
| **Effort** | M |
| **Phase** | 1–2 |

#### 4.4.1 Notifications cloche (quick win – NE PAS masquer)

| Attribut | Détail |
|----------|--------|
| **Problème** | `Header.jsx` – cloche à `count=0` fixe |
| **Idée** | `useQuery` sur messages non-lus ou `GET /api/notifications` ; badge réel ; lien vers `/team` |
| **Fichiers** | `Header.jsx`, `MobileTopBar.jsx`, route API notifications si absente |
| **Effort** | S |
| **Phase** | 1 |

---

### 4.5 Mobile web / app (hors exclusions)

#### Inclus

| Item | Niveau | Phase |
|------|--------|-------|
| Signature mobile shell | quick win | 1 |
| Sticky questionnaire safe-area | quick win | 1 |
| Ops mobile guard (CTA desktop) | medium | 2 |
| Profil/Settings shell mobile | medium | 2 |
| Post-login intelligent natif | strategic | 3 |
| Parité deep links | strategic | 3 |

#### Exclus (ne pas faire sans nouvelle validation)

| Item | Raison |
|------|--------|
| Mobile Home – sélecteur multi-dossiers | medium – refusé |
| Mobile Dossier – quick win divers | refusé |
| Mobile Documents – filtres pills | medium – refusé |

---

### 4.6 Dashboard PC – dossier sélectionné (above-the-fold)

| Attribut | Détail |
|----------|--------|
| **Problème** | Desktop : peu de contexte dossier actif sans ouvrir le détail |
| **Idée** | Bandeau dossier actif (nom, forme, progression, CTA continuer) **uniquement** si `activeDossierId` défini – pas de carte globale « prochaine action » |
| **Fichiers** | `DashboardPage.jsx`, `DashboardEntry.jsx`, `src/utils/dossierContinueUrl.js` |
| **Backend** | `useDossierQuery`, `resolveDossierContinueUrl` |
| **Impact** | Orientation client multi-dossiers desktop |
| **Effort** | M |
| **Phase** | 2 |

**Interdit** : carte « Votre prochaine action » agrégée globale sur `/dashboard`.

---

### 4.7 Sélection dossier PC comme mobile

| Attribut | Détail |
|----------|--------|
| **Problème** | Desktop dashboard liste dossiers mais sélection active peu visible vs mobile picker |
| **Idée** | `DossierVaultPickerOverlay` ou dropdown dossier actif dans `DashboardPage` / `Header` connecté – même `saveCurrentDossierId` |
| **Fichiers** | `DashboardPage.jsx`, `DossierVaultPickerOverlay.jsx`, `sessionStore.js` |
| **Effort** | M |
| **Phase** | 2 |

---

### 4.8 Documents – traçabilité, vérification, certificats (sans filtres client)

| Attribut | Détail |
|----------|--------|
| **Problème** | Coffre dense ; besoin preuves signature et vérification publique |
| **Idée validée** | Renforcer traçabilité (hash, date, lien `/verify/document/:id`), certificats ops, preuves téléchargeables ops |
| **Exclu** | Filtres pills « À fournir / En revue / Validés » côté client |
| **Fichiers** | `DocumentsPage.jsx`, `DocumentVerifyPage.jsx`, `server/pdf/stampSignatureOnPdf.js`, ops documents |
| **Backend** | `verificationRoutes.js`, stockage preuves S3 |
| **Effort** | M (client) / L (ops preuves) |
| **Phase** | 2–3 |

#### Statuts documents – partial ops-only (medium exclu côté client)

Les transitions de statut avancées (review queue, analyse auto) restent ops ; le client voit uniquement les statuts simplifiés via `resolveClientDocumentStatus`.

---

### 4.9 Assistant IA – GreffioAssistantOrb (medium)

| Attribut | Détail |
|----------|--------|
| **Problème** | Chat IA peu visible, pas d'incarnation marque |
| **Idée** | Composant `GreffioAssistantOrb` : SVG/Lottie robot discret, hover « Bonjour » / prénom, clic ouvre panneau chat léger |
| **Fichiers** | `src/components/assistant/GreffioAssistantOrb.jsx` (à créer), `ChatEntry.jsx`, `src/pages/ChatPage.jsx` |
| **Backend** | `POST /api/assistant` existant – pas de nouvelle clé front |
| **Placement** | Dashboard (coin bas droit), mobile drawer optionnel – **pas** sur landing |
| **Effort** | M |
| **Phase** | 2 |

**Exclu** : section 7 assistant non validée (RAG avancé, suggestions proactives documents).

---

### 4.10 Preuves et certificats (strategic – ops-only)

| Attribut | Détail |
|----------|--------|
| **Idée** | Vue ops : certificat signature, journal audit, export ZIP preuves par dossier |
| **Fichiers** | `server/services/signature/finalizeInternalSignature.js`, `opsRoutes.js`, `OpsDossierDetail` |
| **Effort** | L |
| **Phase** | 3 |

---

### 4.11 Accessibilité (quick win prudent)

| Attribut | Détail |
|----------|--------|
| **Idée** | `StatusBadge` – tokens sémantiques Greffio (mint/coral) ; focus visible boutons critiques questionnaire/paiement |
| **Fichiers** | `StatusBadge.jsx`, `QuestionnairePage.jsx` |
| **Effort** | S–M |
| **Phase** | 2 |

**Exclu** : bulk SEO/perf section 8 (Lighthouse landing, etc.).

---

### 4.12 SEO / perf (brief – prudent)

Documenter seulement ; pas d'exécution bulk :

- LCP landing : différer sections below-the-fold (`MobileLandingDeferredSections`)
- Fil d'Ariane pages SEO ressources (strategic ultérieur)
- Pas de modification hero

---

## 5. Plan d'action par phases

### Phase 1 – Semaine 1 (quick wins P0/P1)

| # | Tâche | Fichiers | Validation | Statut |
|---|-------|----------|------------|--------|
| 1 | Signature mobile shell | DocumentSignPage, MobileSignableDocumentShell | Signature complète Android | **Fait** |
| 2 | Cloche notifications backend | Header, DashboardPage, API summary | Badge dossiers actifs réels | **Fait** |
| 3 | Paiement vérification polling | PaymentVerificationPage, paymentsRoutes | Statut paid affiché < 30 s | **Fait** |
| 4 | CGV terminal paiement | GreffioPaymentTerminal | Texte visible sans scroll | **Fait** |
| 5 | Sticky questionnaire safe-area | QuestionnairePage, MobileStickyFormActions | Champs pas cachés par nav | **Fait** |
| 6 | **Correctifs juin 16** | StatutesPage, SignupPage, store.js | Voir section 8 | **Fait** |
| 7 | Dossiers PC cliquables | DashboardPage | Lien `/dossier/:id` | **Fait** |

### Phase 2 – Semaines 2–3 (medium validés)

| # | Tâche | Statut |
|---|-------|--------|
| 7 | Dashboard PC – bandeau dossier sélectionné | **Fait** |
| 8 | Sélecteur dossier PC (parité mobile) | **Fait** |
| 9 | GreffioAssistantOrb + chat léger | **Fait** |
| 10 | Questionnaire `missing_but_continue_allowed` (début) | **Fait** |
| 11 | Interconnectivité restante front/backend (`GET action-state`) | **Fait** |
| 12 | Accessibilité StatusBadge + focus | **Fait** |
| 13 | Ops mobile guard page | **Fait** |
| 14 | Preuves/certificats ops-only (export ZIP) | **Fait** |

### Phase 3 – Semaines 4–6 (strategic)

| # | Tâche |
|---|-------|
| 14 | Questionnaire strategic – finalisation + tests |
| 15 | Preuves/certificats ops-only |
| 16 | Post-login intelligent natif |
| 17 | Deep link paiement native strategic |
| 18 | Documents traçabilité avancée ops |

### Phase 4 – Continu (hors périmètre actuel)

- Timeline enrichie dossier
- Assistant documents
- Messages équipe refonte
- Kanban ops
- Filtres documents client (quand validé)

---

## 6. Checklist Cursor

### À faire

- [x] Lire `preserve-brand-identity.mdc` avant tout changement UI public
- [x] Lire `critical-files-guardrails.mdc` avant zones P0
- [x] Diffs minimaux, un flux à la fois
- [x] `npm run build` après changements front
- [ ] Tests manuels Capacitor pour PDF/signature/paiement
- [ ] Utiliser tiret en-dash (–) dans copy française
- [ ] Brancher UI sur API – jamais masquer une affordance non implémentée (sauf exclusion listée)
- [ ] React Query : invalider `queryKeys.dossier` après upload/signature
- [ ] Capacitor PDF : `savePdfBlobToDevice` / `openCachedPdfInSystemViewer`

### Ne pas toucher

- [ ] `LandingPage.jsx` hero / sections / CTA
- [ ] `index.css` tokens globaux / thème Tailwind
- [ ] Navbar publique / footer marketing
- [ ] Carte « Votre prochaine action » dashboard
- [ ] Badge messages `MobileAccountPage`
- [ ] Filtres documents visibles client
- [ ] Masquer cloche notifications
- [ ] Estimations délai ops côté client
- [ ] Sidebar – ajout Statuts (déjà fait)
- [ ] Commits incluant `dist_*.zip`, `staging-deploy/`, secrets

---

## 7. Critères d'acceptation globaux

### Signature mobile (Phase 1)

- [x] Parcours signature depuis app native sans layout desktop cassé
- [x] PDF ouvert via FileOpener / partage mobile
- [x] Retour documents via shell mobile

### Notifications (Phase 1)

- [x] Cloche affiche le nombre réel (dossiers actifs / actions)
- [x] Clic mène au dashboard ou lien notification
- [x] Pas de badge fantôme – API `GET /api/notifications/summary`

### Paiement (Phase 1)

- [x] Écran vérification avec états : en cours / succès / échec
- [x] Polling `GET /api/payments/verification/status` toutes les 2 s
- [x] Webhook seul met à jour le statut (pas le front)

### Questionnaire strategic (Phase 2–3)

- [x] Étapes non critiques passables avec avertissement
- [x] Champs greffe bloquants inchangés
- [x] `dataJson` reflète les champs manquants

### Dashboard PC (Phase 2)

- [x] Bandeau dossier visible si et seulement si dossier sélectionné
- [x] Pas de carte globale « prochaine action »
- [x] Sélecteur dossier fonctionnel comme mobile

### Documents (Phase 2–3)

- [ ] Pas de nouveaux filtres client
- [ ] Lien vérification publique accessible depuis ops
- [x] `filiation_declaration` absent de la checklist client

### Assistant (Phase 2)

- [x] Orb visible espace connecté uniquement
- [x] Chat utilise `/api/assistant`
- [x] Pas de dérive vers refonte landing

### Identité

- [ ] Aucun changement palette / typo globale
- [ ] Statuts William 27 articles intacts

---

## 8. Correctifs immédiats juin 2026 (implémentés)

> Lot exécuté le 16 juin 2026 – correctifs P0 avant chantiers Phase 1.

### 8.1 Statuts non téléchargeables sur mobile (Capacitor + mobile web)

| Avant | Après |
|-------|-------|
| `StatutesPage.onDownload` et aperçu PDF via blob URL seul – peu fiable en natif / mobile web | `normalizePdfBlob` + `openCachedPdfInSystemViewer` / partage Web API |
| Erreur silencieuse | `mapDocumentPreviewError` + toasts explicites |

**Fichiers** : `src/pages/StatutesPage.jsx`, `src/components/documents/PdfPreviewPanel.jsx`, `src/utils/dossierDocumentFile.js`

**Test** : générer statuts sur app Android ou mobile web → « Télécharger PDF » / « Ouvrir le PDF » → lecteur système ou menu partage.

---

### 8.2 Signup PC – suppression « Nom du demandeur »

| Avant | Après |
|-------|-------|
| Champ « Nom du demandeur » pour personne physique en doublon avec Prénom/Nom | Champ supprimé pour `personne_physique` |
| `initiatorName` saisi manuellement | Dérivé automatiquement : `firstName + lastName` à l'inscription |
| Personne morale | Conserve « Société demandeuse » + forme juridique |

**Fichier** : `src/pages/SignupPage.jsx`

---

### 8.3 Signup décomposé (progressif)

| Surface | Étapes |
|---------|--------|
| Desktop + mobile | 9 : profil → formalité → porteur → prénom → nom → email → mot de passe → entreprise → validation |

**Fichier** : `src/pages/SignupPage.jsx`

---

### 8.4 Suppression « Déclaration de filiation » redondante

| Couche | Action |
|--------|--------|
| Backend template | Pas de `filiation_declaration` dans `DOSSIER_DOCUMENT_TEMPLATES` (`server/store.js`) |
| API client | `filterClientVisibleDocuments` dans `server/domain/clientDocuments.js` + `GET /api/dossiers/:id` |
| UI client | `filterClientVisibleDocuments` dans `documentWorkflow.js` |

**Document conservé** : `manager_non_conviction` – « Déclaration non-condamnation et filiation » (combiné).

**Note** : les lignes `filiation_declaration` déjà en base restent mais sont filtrées côté client ; pas de migration destructive.

---

## 9. Architecture de référence (rappel)

### Stack

| Couche | Tech |
|--------|------|
| Front | React 18, Vite 7, Tailwind, Radix, Framer Motion |
| Back | Node ESM, Express 5, PM2, PostgreSQL prod |
| Mobile | Capacitor 8 remote-first Android |
| Paiement | Mollie B2C |
| Signature | `greffio_internal` (SES renforcée) |
| PDF | pdfkit, pdf-lib |

### Shells

```
isCapacitorNative() → MobileAppShell
isMobileBrowserViewport() → MobileWebShell
sinon → Header + Sidebar desktop
```

### Parcours type

```
Landing / SEO → Simulateur → Signup → Questionnaire → Documents → Statuts
→ Non-condamnation → Mandat → Paiement → Suivi greffe
```

---

## 10. Fichiers de référence

| Document | Rôle |
|----------|------|
| `docs/CONTEXTE_ARCHITECTURE_ET_AMELIORATIONS_CHATGPT.md` | Spec ChatGPT complète |
| `docs/AUDIT_PRIORITES_GREFFIO_2026-06-16.md` | P0/P1 |
| `docs/AUDIT_UX_GREFFIO_MOBILE_WEB_DESKTOP_2026-06-13.md` | Trois surfaces |
| `docs/CONTEXTE_QUESTIONNAIRE_MOBILE_INTERACTIF.md` | Questionnaire mobile |
| `docs/PAYMENTS_ARCHITECTURE.md` | Mollie |
| `MOBILE_RELEASE_PLAN.md` | Remote-first |
| `.cursor/rules/preserve-brand-identity.mdc` | Identité figée |
| `.cursor/rules/critical-files-guardrails.mdc` | Zones P0 |

---

## 11. Matrice effort / impact (synthèse)

| Zone | Impact | Effort | Phase |
|------|--------|--------|-------|
| Signature mobile | Très haut | M | 1 |
| Notifications réelles | Haut | S | 1 |
| Paiement vérification | Haut | S | 1 |
| Statuts download mobile | Haut | S | **Fait** |
| Signup décomposé | Moyen | S | **Fait** |
| Filiation checklist | Moyen | S | **Fait** |
| Dashboard dossier PC | Moyen | M | 2 |
| GreffioAssistantOrb | Moyen | M | 2 |
| Questionnaire strategic | Très haut | L | 2–3 |
| Preuves ops | Moyen | L | 3 |

---

## 12. Prompts Cursor recommandés

### Prompt Phase 1 – Signature mobile

```
Mission : wrapper mobile DocumentSignPage (voir MISSION_CURSOR_AMELIORATIONS_CIBLEES_2026-06-16.md §4.1).
Contraintes : identité figée, dossierDocumentFile.js pour PDF, diff minimal.
Livrable : MobileSignableDocumentShell + tests manuels Android.
```

### Prompt Phase 1 – Notifications

```
Brancher Header.jsx et MobileTopBar.jsx sur messages non-lus réels.
Ne pas masquer la cloche. API : dossier messages ou notifications.
Référence : §4.4.1.
```

### Prompt Phase 2 – Dashboard dossier PC

```
Ajouter bandeau dossier actif sur DashboardPage si activeDossierId défini.
Pas de carte « Votre prochaine action » globale.
Sélecteur dossier parité mobile via DossierVaultPickerOverlay.
```

---

*Document généré pour exécution Cursor – Greffio / William Establishments – 16 juin 2026.*
