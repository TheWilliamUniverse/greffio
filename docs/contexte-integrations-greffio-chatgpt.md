# Contexte Greffio — Intégrations API (référence ChatGPT / Cursor)

> **Usage** : document de référence pour comprendre les intégrations externes Greffio, leurs endpoints, variables d'environnement et règles d'usage. **Ne jamais exposer de secrets dans le frontend.**

---

## 1. Vue d'ensemble

| Intégration | Rôle | Côté serveur | Côté client |
|-------------|------|--------------|-------------|
| **Mollie** | Paiements CB, Visa, Mastercard, Apple Pay, Google Pay (selon activation Mollie) | `server/services/mollie*.js` | `/paiement`, checkout redirect |
| **GoCardless** | Prélèvement SEPA récurrent | routes billing | dashboard abonnement |
| **SignWell** | Signature électronique documents | `server/services/signwell*.js` | éditeurs documents en ligne |
| **Didit** | Vérification identité (OCR, liveness) | routes identity | `IdentityVerificationCard` |
| **Brevo (ex-Sendinblue)** | Emails transactionnels | `server/services/email*.js` | — |
| **Google reCAPTCHA** | Anti-bot login/signup | middleware captcha | `SecurityChallengeWidget` |
| **INPI / Guichet unique** | Formalités (selon flux) | services formalités | questionnaire |
| **Supabase / S3** | Stockage documents | `objectStorage.js` | upload API |
| **Resend** | Emails alternatifs (si configuré) | env `RESEND_API_KEY` | — |

**Apple Pay / Google Pay** : pas d'API Apple/Google à fournir séparément. Ces moyens passent par **Mollie** une fois activés dans le dashboard Mollie et la méthode `applepay` / `googlepay` sur la session checkout.

---

## 2. Paiement — Mollie

### Variables d'environnement (VPS `.env`)

```env
MOLLIE_API_KEY=live_xxx ou test_xxx
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
PUBLIC_APP_URL=https://greffio.willentreprises.com
```

### Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/payments/create-checkout` | Crée une session Mollie |
| GET | `/api/payments/:id/status` | Statut paiement |
| POST | `/api/webhooks/mollie` | Webhook Mollie (signature) |

### Moyens affichés footer

CB · Visa · Mastercard · Apple Pay · Google Pay · SEPA — **uniquement si activés côté Mollie/GoCardless prod**.

---

## 3. Documents signables

### API documents dossier

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dossiers/:id/documents` | Liste |
| POST | `/api/dossiers/:id/documents/:docKey` | Upload PDF |
| GET | `/api/dossiers/:id/documents/:docKey/download` | Téléchargement |
| DELETE | `/api/dossiers/:id/documents/:docKey` | Suppression pièce jointe |

### Signature interne + SignWell fallback

| Doc | Routes signature | Layout PDF |
|-----|------------------|------------|
| Non-condamnation | `/api/dossiers/:id/non-conviction/sign` | `non_conviction_official` |
| Liste souscripteurs | routes editable | `subscribers_list_official` |
| Pouvoirs formalités | routes editable | `formality_powers_official` |

Tampon : `server/pdf/stampSignatureOnPdf.js` — empreinte GRF en marge basse, mentions sur fond blanc près signature.

---

## 4. Statuts — pipeline canonique

**Une seule logique de rendu** pour landing et dashboard :

```
mapStatutesDataFromSimulator / mapQuestionnaireToStatutsData
  → draftStatutesDocument (statutesDrafting.js)
  → renderWilliamSas2026 / williamAdaptations
  → PDF statutesPdfService.js
```

| Route | Usage |
|-------|-------|
| POST | `/api/statutes/preview-draft` | Simulateur landing (non auth) |
| POST | `/api/statutes/preview-draft/pdf` | PDF preview simulateur |
| GET | `/api/dossiers/:id/statutes/preview` | Dashboard |
| POST | `/api/dossiers/:id/statutes/generate` | Génération finale |
| GET | `/api/dossiers/:id/statutes/pdf` | Téléchargement PDF |

Service simulateur : `server/services/simulatorStatutesPreviewService.js` → appelle `draftStatutesDocument` comme le dashboard.

---

## 5. Identité — Didit

```env
DIDIT_API_KEY=...
DIDIT_WORKFLOW_ID=...
DIDIT_WEBHOOK_SECRET=...
```

Routes typiques : création session vérification, callback webhook, statut dossier.

---

## 6. Email — Brevo / Resend

```env
BREVO_API_KEY=...
# ou
RESEND_API_KEY=...
MAIL_FROM=Greffio <noreply@...>
```

---

## 7. Sécurité

```env
RECAPTCHA_SECRET_KEY=...
RECAPTCHA_SITE_KEY=...  # public, index.html / SecurityChallengeWidget
JWT_SECRET=...
SESSION_SECRET=...
```

reCAPTCHA **principal** (Turnstile retiré en prod Greffio).

---

## 8. Déploiement

| Composant | URL prod |
|-----------|----------|
| Frontend | `https://greffio.willentreprises.com` |
| API | `https://api.greffio.willentreprises.com` |
| VPS | `187.127.232.210` |

Scripts :

```powershell
npm run build
pwsh -File scripts/deploy-backend-vps.ps1
```

---

## 9. Règles produit transverses

- App native Capacitor : **session persistante** (pas de logout 30 min).
- Navigateur web : **IdleSessionGuard** 30 min → écran bleu + déconnexion.
- Pas de message « Recharger la page » (SW silencieux, GlobalErrorBoundary).
- Libellés UI : jamais `personne_physique` brut — utiliser `formatInitiatorType`.

---

## 10. Fichiers de contexte associés

- `docs/contexte-generation-greffio-chatgpt.md` — statuts William 27 articles
- `docs/contexte-securite-greffio-chatgpt.md` — sécurité P0/P1
- `docs/contexte-seo-greffio-chatgpt.md` — SEO pages piliers
