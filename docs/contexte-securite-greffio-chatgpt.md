# Contexte Greffio – Sécurité, résilience & protection contre les attaques (référence ChatGPT)

> **Usage** : coller ce fichier (ou des sections) dans une conversation ChatGPT pour qu’il **élabore des fonctionnalités et améliorations de sécurité** : anti-DDoS, anti-abus, durcissement applicatif, surveillance, conformité, runbooks incident.
>
> **Code source de vérité** : le repo `TheWilliamUniverse/greffio` prime sur ce document en cas de divergence.
>
> **Ne pas demander à l’IA** : secrets, mots de passe, clés API, contenu `.env`, refonte de l’identité visuelle globale (landing, palette, header public).

**Dernière mise à jour** : juin 2026 · commit de référence ~`fd8ebb7` (20 mesures + auth résiliente + AAB 1.2.8)

---

## 1. Mission & périmètre sécurité

Greffio est une plateforme SaaS française de **formalités d’entreprise** (création, modification, documents, statuts, paiement, signature, dépôt) éditée par **William Establishments**.

| Surface | URL | Hébergement |
|---------|-----|-------------|
| Frontend web + PWA | `https://greffio.willentreprises.com` | Hostinger (git-deploy, build Vite) |
| API backend | `https://api.greffio.willentreprises.com` | VPS Ubuntu (PM2 `greffio-api`, Nginx reverse proxy) |
| App Android | `com.greffio.app` (Capacitor, bundle `dist` embarqué) | Google Play |
| Base de données | PostgreSQL (Supabase) | Cloud managé |
| Documents clients | AWS S3 `greffio-production-documents` (région `eu-west-3`) | Prod active |

**Objectif de ce document** : permettre à ChatGPT de proposer un **plan de sécurité opérationnel** (court / moyen / long terme) sans réinventer l’architecture existante.

---

## 2. Architecture technique (vue sécurité)

```
[Client web / app Android]
        │ HTTPS
        ▼
[Hostinger CDN/static]          [Nginx VPS :443]
 greffio.willentreprises.com          │
 (SPA React, sw.js, assets)           ▼
                               [Express greffio-api :8787]
                               helmet, CORS, rate limits
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              PostgreSQL            AWS S3              APIs tierces
              (Supabase)         (documents)      Resend, SignWell, Didit,
                                                    OpenAI, GoCardless, etc.
```

**Déploiement backend** : tarball SCP local → `/opt/greffio` (pas de `git pull` sur le VPS). Script : `scripts/deploy-backend-vps.ps1`. Variables sensibles : `/opt/greffio/.env` uniquement.

**Fichiers clés sécurité applicative** :
- `server/index.js` – middleware global, rate limits, routes auth
- `server/authMiddleware.js` – JWT Bearer, rôles, blocage tokens MFA pending
- `server/tokens.js` – JWT access (15m) / refresh (7j), secret min 64 car. en prod
- `src/api/client.js` – intercepteur 401 → refresh → retry, résilience réseau
- `src/api/networkResilience.js` – retries transitoires, pas de logout sur coupure deploy
- `public/sw.js` – service worker shell minimal (pas de cache API/JS dynamique)

---

## 3. État actuel – mesures déjà en place

### 3.1 Transport & en-têtes HTTP

| Mesure | Implémentation | Fichier / lieu |
|--------|----------------|----------------|
| HTTPS | Certbot Nginx (API + front) | VPS + Hostinger |
| Helmet | Headers sécurité Express | `server/index.js` |
| CORS prod | Origines autorisées uniquement : `greffio.willentreprises.com` (+ www) | `server/index.js` |
| Cache API | `Cache-Control: no-store, private` sur `/api/*` | `server/index.js` |
| Trust proxy | `app.set('trust proxy', 1)` en production (IP réelle derrière Nginx) | `server/index.js` |

### 3.2 Rate limiting (express-rate-limit)

Limitation **par IP** (fenêtre glissante) – **pas de WAF edge ni rate limit global Nginx documenté** :

| Limiteur | Fenêtre | Max | Routes |
|----------|---------|-----|--------|
| `authLimiter` | 15 min | 30 | signup, login, MFA, forgot/reset password |
| `authRefreshLimiter` | 15 min | 120 | `/api/auth/refresh` |
| `paymentLimiter` | 10 min | 40 | création paiement |
| `uploadLimiter` | 10 min | 30 | upload documents |
| `companyLookupPublicLimiter` | 1 min | 40 | recherche SIREN publique |
| `statutesPreviewDraftLimiter` | 1 min | 30 | preview statuts |
| `assistantLimiter` | 10 min | 60 | assistant IA |
| `contactLimiter` | 10 min | 20 | formulaire contact |
| `credentialsUnlockLimiter` | 15 min | 12 | déverrouillage credentials ops |

**Limite connue** : pas de rate limit **global** sur toutes les routes `/api/*` → un attaquant peut saturer des endpoints non limités ou multiplier les IPs (botnet).

### 3.3 Authentification & sessions

| Mesure | Détail |
|--------|--------|
| Mots de passe | `scrypt` + salt (`server/authStore.js`) |
| JWT | Access 15 min, refresh 7 j (`ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`) |
| Refresh | Rotation côté client ; endpoint dédié avec limite 120/15min |
| MFA | TOTP, code email, recovery codes, appareils de confiance (`server/mfaStore.js`, routes `/api/auth/mfa/*`) |
| Rôles | `CLIENT`, `FORMALISTE`, `OPS`, `ADMIN` – middleware `requireRole` |
| Signup | Rôle forcé `CLIENT` côté serveur (ignore payload client) |
| Brute-force login | Compteur mémoire in-process : 3 échecs / 15 min → email `suspicious_login_attempt` |
| Idle web | `IdleSessionGuard` : verrouillage UI après 30 min inactivité (logout manuel) |
| Biométrie mobile | Refresh token dans coffre natif Capacitor (pas de mot de passe en clair) |
| Auth résiliente | Retries + pas de déconnexion sur erreurs transitoires (deploy) – `networkResilience.js` |

**Limite connue** : compteur login failures **en mémoire process** → perdu au restart PM2, non partagé multi-instances.

### 3.4 Autorisation & données

| Mesure | Détail |
|--------|--------|
| Dossiers | Vérification `userId` sur accès client |
| Ops | Routes `/api/ops/*` protégées rôles internes |
| Documents | Upload PDF only, 10 Mo, analyse PDF (`documentAnalysis.js`) |
| Stockage | S3 prod ; URLs signées TTL 900s |
| Supabase RLS | Migration `013_supabase_rls_lockdown.sql` (tables sensibles) |
| PII logs | Logs structurés JSON (`server/utils/structuredLog.js`) avec `dossierId` sur certains events |

### 3.5 Webhooks & paiements

| Fournisseur | Vérification |
|-------------|--------------|
| Resend | `resend.webhooks.verify` |
| Brevo | Handler dédié |
| GoCardless | `verifyGoCardlessWebhook` |
| SignWell | `SIGNWELL_WEBHOOK_ID` + callback |
| CAWL | HMAC-SHA256 (`CawlPaymentAdapter.verifyWebhookSignature`) |
| Google Pay / CAWL | Clés backend + webhook CAWL |

**Limite connue** : certains webhooks génériques mentionnent « vérification HMAC à venir » dans `server/index.js` – à auditer.

### 3.6 Frontend & résilience

| Mesure | Détail |
|--------|--------|
| Error boundaries | Global + par route (`GlobalErrorBoundary`, `RouteErrorBoundary`) |
| Anti page blanche | Boot splash, recovery ChunkLoadError |
| Service worker | Cache **uniquement** manifest + icônes (`public/sw.js` v2) – pas d’API ni assets hashés |
| React Query | `staleTime: 0`, invalidation focus – pas de vérité UI depuis localStorage pour dossiers |
| Smoke prod | `npm run smoke:prod` – health, ready, app-version |

### 3.7 Emails & abus métier

| Mesure | Détail |
|--------|--------|
| Relances dossier | Policy `shouldSendReminderForUser` – respect préférences profil |
| Délai relance | `DOSSIER_REMINDER_MIN_DAYS=2` (VPS `.env` + défaut code) |
| Anti-doublon email | `hasRecentSuccessfulEmail` (72h relances, 168h digest) |
| Purge brouillons fantômes | Auto au login + KPI Ops cockpit |

---

## 4. Surfaces d’attaque & scénarios à traiter

Demander à ChatGPT de **prioriser** des réponses pour chaque scénario :

### 4.1 DDoS & saturation

- **Volumétrique L3/L4** : VPS unique API – pas de CDN/WAF devant `api.greffio.*` documenté
- **Application layer** : endpoints publics (`/api/health`, `/api/company-search`, `/api/public/*`, landing) sans global throttle
- **Slowloris / connexions** : pas de `limit_req` Nginx documenté
- **Upload bombing** : limité 30/10min mais fichiers 10 Mo × 30 = charge disque/CPU analyse PDF

**Pistes attendues de ChatGPT** : Cloudflare / Hostinger WAF, Nginx `limit_req` + `limit_conn`, rate limit global Express, IP denylist, challenge CAPTCHA sur login/signup/contact.

### 4.2 Brute-force & credential stuffing

- Login rate limit 30/15min/IP – contournable multi-IP
- Pas de CAPTCHA, pas de lockout compte persistant en DB
- Email alerte après 3 échecs – bon signal mais réactif

**Pistes** : fail2ban, Redis rate limit distribué, Have I Been Pwned, MFA obligatoire ops/admin, device fingerprinting.

### 4.3 Injection & XSS

- Express `json()` body parser – pas de sanitization HTML globale
- React échappe par défaut – risque sur `dangerouslySetInnerHTML` (à inventorier)
- Upload PDF – parsing `pdf2json` (surface parser)

**Pistes** : audit SAST, CSP strict via Helmet custom, validation Zod sur toutes les entrées, sandbox analyse PDF.

### 4.4 IDOR & élévation de privilèges

- Vérifier systématiquement que chaque `/api/dossiers/:id/*` contrôle `req.auth.sub`
- Ops transitions manuelles réservées rôles internes
- Tokens MFA pending bloqués sur routes métier

**Pistes** : tests automatisés IDOR, audit routes sans `requireAuth`.

### 4.5 Fuite de données & secrets

- `.env` VPS – jamais dans Git
- `VITE_*` uniquement variables publiques dans le build front
- Risque : logs PM2, stack traces en prod, buckets S3 ACL

**Pistes** : rotation JWT_SECRET, audit IAM S3 least-privilege, Sentry sans PII, scan secrets CI.

### 4.6 Supply chain & dépendances

- `npm ci` sur VPS et CI
- Pas de Dependabot / Snyk documenté

**Pistes** : npm audit en CI, lockfile integrity, SBOM.

### 4.7 Mobile & deep links

- App Links `assetlinks.json` (SHA256 upload key)
- API base URL figée dans le bundle Android
- Pas de certificate pinning documenté

**Pistes** : pinning optionnel, détection root/jailbreak, Play Integrity API.

### 4.8 Disponibilité & incident

- Un seul VPS API (SPOF)
- PM2 restart auto – pas de cluster Node documenté
- Backups `/opt/greffio-backup-*` avant deploy

**Pistes** : second VPS, health checks externes (UptimeRobot), runbook DDoS, communication incident clients.

---

## 5. Infrastructure VPS (contexte ops, sans secrets)

| Élément | Valeur |
|---------|--------|
| Hôte | `187.127.232.210` (Hostinger VPS) |
| OS | Ubuntu |
| Process | PM2 `greffio-api`, port `8787` local |
| Proxy | Nginx → `127.0.0.1:8787` |
| Deploy | `scripts/deploy-backend-vps.ps1` (tarball) |
| Health | `GET /api/health`, `GET /api/ready` |
| Cron | Relances dossier (`ops:send-dossier-reminders`) – configurable |

**Variables `.env` pertinentes sécurité** (noms uniquement) :
`NODE_ENV`, `JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `DATABASE_URL`, `AWS_*`, `SIGNWELL_*`, `DIDIT_*`, `OPENAI_API_KEY`, `DOSSIER_REMINDER_MIN_DAYS`, webhooks PSP.

---

## 6. Conformité & données personnelles (rappel)

- Pages légales : `/confidentialite`, `/cookies`, `/suppression-compte`
- Données : identité, documents KYC, questionnaires, logs emails
- Hébergement UE (S3 `eu-west-3`, formalités françaises)
- Droit à l’effacement : flux suppression compte à renforcer si proposé par l’IA

---

## 7. Ce qui manque explicitement (backlog sécurité à faire évaluer par ChatGPT)

Cocher / prioriser avec l’IA :

1. **WAF / CDN** devant API et front (Cloudflare, Hostinger Pro, etc.)
2. **Rate limit global** + **ban IP** persistant (Redis ou fichier Nginx)
3. **Nginx hardening** : `limit_req`, `limit_conn`, timeouts, hide version
4. **CAPTCHA** (hCaptcha / Turnstile) sur login, signup, contact, reset password
5. **Account lockout** DB après N échecs (pas seulement email)
6. **MFA obligatoire** pour `ADMIN`, `OPS`, `FORMALISTE`
7. **CSP** stricte + `Permissions-Policy` via Helmet config custom
8. **Audit logs** immuables (connexions, accès dossier, téléchargements docs)
9. **Sentry** front + back (`SENTRY_DSN_*` prévus dans `GITHUB_SECRETS_TEMPLATE.md`)
10. **SIEM / alertes** : pic 401/429, uploads échoués, CPU/RAM VPS
11. **Tests sécu automatisés** : OWASP ZAP, nuclei, Playwright auth abuse
12. **Rotation secrets** runbook (JWT, webhooks, clés S3 IAM)
13. **DDoS runbook** : qui fait quoi, bascule maintenance, communication
14. **Honeypot** endpoints / headers canary
15. **Geo-blocking** optionnel si trafic non-FR aberrant

---

## 8. Prompt recommandé à coller dans ChatGPT

```
Tu es un expert sécurité applicative et infrastructure pour un SaaS B2B français (Greffio).

Contexte : [coller les sections 1 à 7 de ce fichier]

Consignes :
1. Propose un plan en 3 horizons : immédiat (1–2 semaines), moyen terme (1–3 mois), long terme.
2. Pour chaque mesure : objectif, menace couverte (STRIDE ou OWASP Top 10), effort (S/M/L), fichier/repo impacté, dépendance infra.
3. Priorise anti-DDoS et anti-abus (brute force, scraping, upload bombing) sans casser l’UX client.
4. Distingue ce qui se fait sur VPS/Nginx/Cloudflare vs ce qui se fait dans le code Express/React.
5. Ne propose pas de modifier l’identité visuelle globale ni la landing.
6. Ne demande jamais de secrets – seulement des noms de variables d’environnement.
7. Inclure des critères d’acceptation testables et un runbook incident « attaque en cours ».
8. Estimer coût mensuel indicatif des solutions edge (WAF/CDN) pour un trafic PME.

Format de sortie :
- Tableau priorisé (P0/P1/P2)
- Architecture cible (schéma ASCII ou Mermaid)
- Checklist déploiement
- Métriques de succès (ex. taux 429, latence p95, zero credential leak)
```

---

## 9. Références repo (pour aller plus loin)

| Document | Contenu |
|----------|---------|
| `docs/GREFFIO-AUDIT-CONTEXT-IA.md` | Fonctionnalités produit & ops |
| `docs/internal/GREFFIO-MASTER-ARCHITECTURE-ET-HISTORIQUE.md` | Architecture complète |
| `BACKEND_VPS_SETUP.md` | Nginx, SSL, `.env` |
| `DEPLOY_VPS_HOSTINGER.md` / `RUNBOOK_DEPLOYMENT.md` | Déploiement |
| `GITHUB_SECRETS_TEMPLATE.md` | Secrets CI + mention Sentry |
| `docs/assistant-integrations.md` | WebSocket nginx, intégrations |
| `docs/qa-android-release-checklist.md` | QA mobile avant release |

---

## 10. Journal récent (juin 2026)

- Auth résiliente pendant deploy (plus de « session invalide » sur coupure réseau)
- `authRefreshLimiter` 120/15min
- Purge auto brouillons fantômes au login
- Cockpit Ops : KPI uploads S3 échoués, bloqués >48h
- `DOSSIER_REMINDER_MIN_DAYS=2` en prod VPS
- AAB Android 1.2.8 / `versionCode` 261510007

---

*Fin du contexte – prêt pour audit sécurité ChatGPT.*
