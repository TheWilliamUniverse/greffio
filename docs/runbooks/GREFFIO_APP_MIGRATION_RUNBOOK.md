# Runbook — Duplication miroir puis migration vers `greffio.app`

**Version :** 1.0 — 17 juin 2026  
**Statut :** Prêt à l’emploi — **ne pas exécuter sans validation William**  
**Stratégie :** Phase A = **miroir** (deux domaines actifs, même codebase, mises à jour communes) → Phase B = **migration intégrale** (canonique `greffio.app`, redirections 301)

---

## 1. Objectif

| Domaine actuel (canonique prod) | Domaine cible |
|--------------------------------|---------------|
| `https://greffio.willentreprises.com` | `https://greffio.app` |
| `https://api.greffio.willentreprises.com` | `https://api.greffio.app` |

**Ce runbook ne migre pas les e-mails** (`greffio@willentreprises.com`, `contact@willentreprises.com`) : ils peuvent rester sur le domaine William Entreprises pendant et après la bascule web.

**Ce runbook ne change pas** le package Android `com.greffio.app` (déjà aligné marque).

---

## 2. Architecture actuelle (référence)

| Composant | Hébergement | Détail |
|-----------|-------------|--------|
| Frontend SPA | Hostinger Node | `server/hostinger-frontend.js` sert `dist/`, proxy Mollie |
| API Node | VPS Hostinger KVM | `/opt/greffio`, PM2 `greffio-api`, port `8787` |
| IP API | `187.127.232.210` | Nginx TLS → Node |
| IP frontend | `147.79.119.94` + `77.37.50.129` | Enregistrements A `greffio` dans zone `willentreprises.com` |
| DNS | Hostinger | NS `ns1.dns-parking.com` / `ns2.dns-parking.com` |
| Stockage docs | AWS S3 | Indépendant du domaine |
| E-mails transactionnels | Brevo | Liens générés via `APP_URL` |
| Paiements | Mollie | Callback frontend + webhook API |
| Mobile prod | Capacitor remote | `capacitor.config.remote.json` → `greffio.willentreprises.com` |

---

## 3. Principes de la stratégie « miroir »

### 3.1 Ce qu’on veut

- **Un seul dépôt**, **un seul build** (ou deux builds identiques sauf métadonnées), **un seul backend**.
- Les deux frontends pointent vers **la même API** (recommandé en phase miroir : garder `api.greffio.willentreprises.com` pour simplifier Mollie/webhooks).
- Toute évolution produit se déploie **une fois** et est visible sur **les deux domaines**.
- **Pas de redirection 301** vers `greffio.app` tant que la phase miroir n’est pas validée.

### 3.2 Ce qu’on évite

- Deux bases de données ou deux buckets S3.
- Deux comptes Mollie avec webhooks différents (sauf test isolé).
- Canon SEO dupliqué sans `rel=canonical` (pénalité Google).
- Sessions cookies partagées entre domaines (impossible cross-domain) → l’utilisateur se reconnecte si change de domaine.

### 3.3 Canonique pendant le miroir

| Élément | Domaine canonique (phase miroir) | Domaine miroir |
|---------|----------------------------------|----------------|
| SEO / Search Console | `greffio.willentreprises.com` | `greffio.app` avec `noindex` ou canonical vers l’ancien |
| E-mails / liens clients | `greffio.willentreprises.com` | — |
| Communication marketing | Les deux possibles | Tester `greffio.app` en interne |
| Mollie (dashboard) | URLs actuelles | Ne pas changer tant que miroir non validé |

---

## 4. Inventaire des points de configuration

### 4.1 Variables d’environnement (VPS `/opt/greffio/.env`)

```env
APP_URL=https://greffio.willentreprises.com
GREFFIO_APP_URL=https://greffio.willentreprises.com
API_PUBLIC_URL=https://api.greffio.willentreprises.com
GREFFIO_API_URL=https://api.greffio.willentreprises.com
```

**Phase miroir :** ne pas remplacer par `greffio.app` tout de suite — ajouter plutôt le support multi-origine (CORS).  
**Phase migration :** basculer vers `greffio.app` / `api.greffio.app`.

### 4.2 Variables Hostinger (frontend)

```env
VITE_API_BASE_URL=https://api.greffio.willentreprises.com
VITE_APP_URL=https://greffio.willentreprises.com
```

### 4.3 CORS API (`server/index.js`)

Origines actuelles :

- `https://greffio.willentreprises.com`
- `https://www.greffio.willentreprises.com`
- `capacitor://localhost`, `https://localhost`, etc.

**À ajouter en phase miroir :**

- `https://greffio.app`
- `https://www.greffio.app`

### 4.4 Résolution API côté frontend (`src/config/runtime.js`)

Aujourd’hui, seul `greffio.willentreprises.com` mappe vers `api.greffio.willentreprises.com`.  
**Préparation miroir (code, avant infra) :** étendre la détection hostname :

```javascript
// greffio.app → même API que willentreprises (phase miroir)
if (['greffio.willentreprises.com', 'www.greffio.willentreprises.com', 'greffio.app', 'www.greffio.app'].includes(hostname)) {
  return PRODUCTION_API_BASE; // ou api.greffio.app en phase B
}
```

**Préparation migration :** `appUrl` dérivé de `window.location.origin` sur le web (évite deux builds).

### 4.5 Fichiers avec domaine en dur (audit repo)

| Fichier | Action phase miroir |
|---------|---------------------|
| `public/sitemap.xml` | Ne pas exposer `greffio.app` au crawl (ou sitemap séparé noindex) |
| `src/components/seo/SeoHead.jsx` | Canonical dynamique selon `window.location.hostname` |
| `server/config/mollieUrls.js` | Inchangé en miroir |
| `server/config/publisher.js` | Inchangé ou `PUBLISHER_WEBSITE` dual |
| `capacitor.config.remote.json` | Inchangé en miroir |
| `public/.well-known/assetlinks.json` | Ajouter `greffio.app` en **duplicata** (les deux domaines) |
| `public/.well-known/apple-app-site-association` | Idem |
| `scripts/patch-well-known.js` | Patcher pour les deux hosts |
| Docs / QA / releases | Références secondaires |

Commande d’audit avant toute action :

```bash
rg -n "greffio\.willentreprises|api\.greffio" --glob '!node_modules' --glob '!dist' --glob '!staging-deploy'
```

---

## 5. PHASE 0 — Prérequis (William / admin)

### 5.1 Checklist domaine

- [ ] Vérifier disponibilité et **enregistrer `greffio.app`** (registrar au choix : Hostinger recommandé si DNS unifié).
- [ ] Activer **DNSSEC** si disponible (optionnel).
- [ ] Décider : `greffio.app` apex vs `www.greffio.app` (recommandé : **apex** `greffio.app`, www → 301 apex).
- [ ] Réserver la date de bascule migration (phase B) — pas avant **2 semaines de miroir stable**.

### 5.2 Sauvegardes avant toute modification

```powershell
# Backend VPS
pwsh -File scripts/deploy-backend-vps.ps1   # crée backup horodaté /opt/greffio-backup-*

# Export .env VPS (local sécurisé, hors git)
plink root@187.127.232.210 "cat /opt/greffio/.env" > backup-greffio-env-YYYYMMDD.txt

# Snapshot Hostinger : noter version build + archive dist courante
```

### 5.3 Baseline santé (copier les résultats dans un fichier `migration-baseline-YYYYMMDD.txt`)

```bash
curl -fsS https://greffio.willentreprises.com/health
curl -fsS https://api.greffio.willentreprises.com/api/health
curl -fsS https://api.greffio.willentreprises.com/api/ready
curl -fsS https://greffio.willentreprises.com/api/mollie/status
```

---

## 6. PHASE A — Duplication miroir (plan d’actions)

> **Ordre strict.** Ne pas sauter d’étape. Temps estimé : **1 journée infra + ½ journée code + 1 journée tests**.

---

### Étape A.1 — DNS `greffio.app`

**Où :** hPanel Hostinger → Domaine `greffio.app` → DNS

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| **A** | `@` | `147.79.119.94` | 14400 |
| **A** | `@` | `77.37.50.129` | 14400 |
| **A** | `www` | `147.79.119.94` | 14400 |
| **A** | `api` | `187.127.232.210` | 14400 |

> Utiliser les IP **affichées par Hostinger** pour le site Greffio si différentes (Sites web → Greffio → Domaines).

**Vérification (attendre propagation 5 min – 2 h) :**

```bash
nslookup greffio.app 8.8.8.8
nslookup www.greffio.app 8.8.8.8
nslookup api.greffio.app 8.8.8.8
```

---

### Étape A.2 — Hostinger : rattacher `greffio.app` au site Greffio

**Où :** hPanel → Sites web → application Node Greffio → **Domaines**

1. [ ] Ajouter `greffio.app`
2. [ ] Ajouter `www.greffio.app` (redirection vers apex si proposé)
3. [ ] Attendre certificat SSL **Let’s Encrypt** automatique (statut « Actif »)
4. [ ] **Ne pas** retirer `greffio.willentreprises.com`

**Vérification :**

```bash
curl -fsSI https://greffio.app/health | head -5
curl -fsSI https://greffio.willentreprises.com/health | head -5
# Les deux doivent répondre 200 JSON ok
```

---

### Étape A.3 — VPS Nginx : alias API `api.greffio.app`

**Où :** SSH `root@187.127.232.210`

1. [ ] Sauvegarder le vhost actuel :

```bash
cp /etc/nginx/sites-enabled/api.greffio.willentreprises.com \
   /etc/nginx/sites-enabled/api.greffio.willentreprises.com.bak-$(date +%Y%m%d)
```

2. [ ] Dupliquer le server block ou ajouter `server_name` :

```nginx
server_name api.greffio.willentreprises.com api.greffio.app;
```

3. [ ] Étendre le certificat Let’s Encrypt :

```bash
certbot certonly --nginx -d api.greffio.willentreprises.com -d api.greffio.app
# ou certbot --expand selon install existante
nginx -t && systemctl reload nginx
```

4. [ ] **Phase miroir :** les deux noms API restent valides.

**Vérification :**

```bash
curl -fsS https://api.greffio.app/api/health
curl -fsS https://api.greffio.willentreprises.com/api/health
```

---

### Étape A.4 — Code : support multi-domaine (PR dédiée, sans bascule canonique)

**Branche suggérée :** `feat/greffio-app-mirror`

#### A.4.1 CORS (`server/index.js`)

```javascript
const allowedOrigins = [
  'https://greffio.willentreprises.com',
  'https://www.greffio.willentreprises.com',
  'https://greffio.app',
  'https://www.greffio.app',
  'https://localhost',
  // ... existants
];
```

#### A.4.2 Runtime frontend (`src/config/runtime.js`)

- Étendre `resolveApiBaseUrl()` pour `greffio.app` (voir §4.4).
- Option miroir : `appUrl: typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_APP_URL || '...')`

#### A.4.3 SEO miroir (`src/components/seo/SeoHead.jsx`)

- Si `hostname === 'greffio.app'` → `<meta name="robots" content="noindex, follow" />` **OU** canonical vers `https://greffio.willentreprises.com` + même path.
- Ne pas soumettre `greffio.app` à Google tant que miroir.

#### A.4.4 App Links / Universal Links

Mettre à jour `public/.well-known/assetlinks.json` :

```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.greffio.app",
    "sha256_cert_fingerprints": ["…"]
  }
}
```

Ajouter un second objet `relation` identique — Android accepte plusieurs apps entries ; pour **plusieurs domaines**, dupliquer le bloc `relation` avec les mêmes fingerprints (vérifier doc Google Digital Asset Links : utiliser **plusieurs fichiers** ou inclure les deux domaines servis au même path).

**Sur les deux domaines**, le fichier doit être accessible :

```bash
curl -fsS https://greffio.willentreprises.com/.well-known/assetlinks.json
curl -fsS https://greffio.app/.well-known/assetlinks.json
```

#### A.4.5 Capacitor (`capacitor.config.remote.json`)

Phase miroir — ajouter dans `allowNavigation` :

```json
"greffio.app",
"*.greffio.app",
"api.greffio.app"
```

**Ne pas** changer `server.url` tant que le miroir n’est pas validé (l’app Play Store continue sur willentreprises).

#### A.4.6 Routes app context (`server/routes/appContextRoutes.js`)

Exposer les deux origines si le mobile lit cette config.

**Tests locaux avant merge :**

```bash
npm run lint
npm run build
npm run test:statutes
```

---

### Étape A.5 — Déploiement miroir (sans changer APP_URL canonique)

#### Backend VPS

```powershell
$env:GREFFIO_VPS_PASSWORD = '…'
pwsh -File scripts/deploy-backend-vps.ps1
```

**Ne pas modifier** `APP_URL` dans `.env` VPS en phase miroir.

#### Frontend Hostinger

```powershell
npm run build
# zip dist → deploy (script interne ou Hostinger Git)
node tmp/deploy-static-hostinger.mjs greffio.willentreprises.com dist_YYYYMMDD.zip
```

Le **même `dist/`** est servi sur les deux domaines Hostinger une fois `greffio.app` rattaché.

---

### Étape A.6 — Fournisseurs tiers (miroir = lecture seule ou ajouts)

| Fournisseur | Phase miroir | Action |
|-------------|--------------|--------|
| **Mollie** | Ne pas changer URLs dashboard | Tester paiement depuis `greffio.app` (callback passe par proxy frontend identique) |
| **reCAPTCHA** | Console Google | Ajouter `greffio.app` et `www.greffio.app` aux domaines autorisés |
| **Google OAuth** (si actif) | Cloud Console | Origines JavaScript + redirect URIs pour `greffio.app` |
| **Didit** | Dashboard | Ajouter callback URL `https://greffio.app/documents?...` en **autorisé** (garder l’ancien) |
| **ONLYOFFICE** | `.env` VPS | Phase miroir : `GREFFIO_API_URL` reste willentreprises ; vérifier éditeur depuis `greffio.app` |
| **Brevo** | — | Liens e-mails restent willentreprises (OK) |
| **Search Console** | — | **Ne pas** ajouter `greffio.app` en miroir (ou propriété séparée en noindex) |

---

### Étape A.7 — Plan de tests miroir (checklist complète)

Cocher après déploiement. Tester **sur les deux domaines** sauf mention contraire.

#### Accès & TLS

- [ ] `https://greffio.app/` — 200, pas d’erreur mixed content
- [ ] `https://www.greffio.app/` — 301 vers apex
- [ ] `https://greffio.willentreprises.com/` — inchangé 200
- [ ] Certificats valides (cadenas navigateur)

#### Auth & session

- [ ] Inscription nouveau compte sur `greffio.app`
- [ ] Login + MFA TOTP sur `greffio.app`
- [ ] Logout / refresh token
- [ ] Vérifier : session **non** partagée si on ouvre willentreprises dans un autre onglet (comportement attendu)

#### Parcours métier P0

- [ ] Questionnaire création SAS → dossier créé
- [ ] Génération statuts PDF
- [ ] Liste souscripteurs + signature
- [ ] Paiement Mollie (sandbox ou petit montant réel)
- [ ] Upload document + ONLYOFFICE (si configuré)
- [ ] Assistant complétion documentaire `/assistant-documents`
- [ ] Espace ops `/ops` (compte admin)

#### API & CORS

```bash
# Preflight simulé (depuis navigateur DevTools sur greffio.app → POST /api/auth/login)
# Attendu : pas d'erreur CORS_ORIGIN_FORBIDDEN
```

- [ ] WebSocket `/api/ws/` si utilisé (notifications)

#### Mobile (sans release)

- [ ] App Android existante → toujours willentreprises (non régression)
- [ ] `adb shell am start -a android.intent.action.VIEW -d "https://greffio.app/dashboard"` — ouverture navigateur ou app selon assetlinks

#### SEO miroir

- [ ] View-source `greffio.app` : `noindex` ou canonical vers willentreprises
- [ ] `greffio.willentreprises.com/sitemap.xml` inchangé

**Critère de sortie phase miroir :** 7 jours sans incident P0/P1 + validation William pour lancer phase B.

---

## 7. PHASE B — Migration intégrale (canonique `greffio.app`)

> À exécuter **uniquement** après validation phase miroir. Fenêtre recommandée : **mardi–jeudi 9h–11h** (hors pic).

---

### Étape B.1 — Communication

- [ ] Prévenir l’équipe ops (Nobatène, Ibtissam)
- [ ] Préparer message clients (optionnel) : nouvelle URL favori
- [ ] Status page interne si incident

---

### Étape B.2 — Basculer variables canoniques

#### VPS `/opt/greffio/.env`

```env
APP_URL=https://greffio.app
GREFFIO_APP_URL=https://greffio.app
API_PUBLIC_URL=https://api.greffio.app
GREFFIO_API_URL=https://api.greffio.app
```

```bash
pm2 restart greffio-api
```

#### Hostinger (variables build)

```env
VITE_APP_URL=https://greffio.app
VITE_API_BASE_URL=https://api.greffio.app
```

Rebuild + redeploy frontend.

---

### Étape B.3 — Mollie (critique)

Mettre à jour le dashboard Mollie :

| Paramètre | Nouvelle URL |
|-----------|--------------|
| Site web | `https://greffio.app` |
| Redirect | `https://greffio.app/api/mollie/callback` |
| Webhook principal | `https://api.greffio.app/api/webhooks/mollie` |
| Webhook fallback | `https://greffio.app/api/webhooks/mollie` |

Mettre à jour `server/config/mollieUrls.js` et redéployer.

**Tests :**

```bash
curl -s https://greffio.app/api/mollie/status
curl -sI https://greffio.app/api/mollie/callback
curl -sI -X POST https://api.greffio.app/api/webhooks/mollie
```

---

### Étape B.4 — Redirections 301 (ancien → nouveau)

#### Hostinger / Node (`server/hostinger-frontend.js`)

Ajouter middleware **avant** static :

```javascript
const LEGACY_HOSTS = new Set(['greffio.willentreprises.com', 'www.greffio.willentreprises.com']);
app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (LEGACY_HOSTS.has(host)) {
    return res.redirect(301, `https://greffio.app${req.originalUrl}`);
  }
  return next();
});
```

#### Nginx API (optionnel mais recommandé)

Rediriger `api.greffio.willentreprises.com` → `api.greffio.app` en 301 (ou garder les deux actifs 6 mois).

---

### Étape B.5 — SEO & Search Console

- [ ] Nouvelle propriété `greffio.app` dans Google Search Console
- [ ] Soumettre `https://greffio.app/sitemap.xml` (mettre à jour toutes les URLs du sitemap)
- [ ] Outil de changement d’adresse (si disponible) willentreprises → greffio.app
- [ ] Retirer `noindex` sur `greffio.app`
- [ ] Mettre à jour `SeoHead.jsx`, `public/sitemap.xml`, Open Graph

---

### Étape B.6 — Mobile

1. [ ] `capacitor.config.remote.json` → `server.url`: `https://greffio.app/?nativeApp=1`
2. [ ] Nouvelle release Android (AAB) — **obligatoire** pour utilisateurs Play Store
3. [ ] Vérifier assetlinks sur `greffio.app`
4. [ ] Play Console → App Links → tester

---

### Étape B.7 — ONLYOFFICE / Didit / Signatures

- [ ] ONLYOFFICE : callback JWT vers `api.greffio.app`
- [ ] Didit : URL de retour canonique `greffio.app`
- [ ] Signaturit / signature interne : vérifier liens e-mails post-bascule

---

### Étape B.8 — Tests post-migration (24 h)

Répéter **toute** la checklist §A.7 sur `greffio.app` + vérifier :

- [ ] `https://greffio.willentreprises.com/dashboard` → 301 → `https://greffio.app/dashboard`
- [ ] E-mail transactionnel (lien reset password) pointe vers `greffio.app`
- [ ] Paiement réel bout en bout

---

## 8. PHASE C — Décommission (J+90 minimum)

- [ ] Maintenir redirections 301 willentreprises **≥ 12 mois**
- [ ] Retirer `greffio.willentreprises.com` du panel Hostinger (seulement après analytics stable sur greffio.app)
- [ ] Retirer anciennes origines CORS si plus utilisées
- [ ] Archiver ce runbook avec date de clôture

---

## 9. Rollback

### Rollback rapide (phase B ratée)

1. Restaurer `.env` VPS avec URLs willentreprises (backup §5.2)
2. `pm2 restart greffio-api`
3. Redéployer dernier `dist` Hostinger connu bon
4. Revenir URLs Mollie dashboard vers willentreprises
5. Désactiver middleware 301 si déployé

**Temps estimé rollback :** 15–30 minutes.

### Rollback phase miroir

1. Retirer `greffio.app` du site Hostinger (optionnel)
2. Laisser DNS ou le couper
3. Revert PR CORS/runtime si nécessaire

---

## 10. Matrice des responsabilités

| Tâche | William | Dev / Cursor | Hostinger hPanel | VPS SSH |
|-------|---------|--------------|------------------|---------|
| Achat `greffio.app` | ✓ | | | |
| DNS greffio.app | | | ✓ | |
| Domaine sur site Node | | | ✓ | |
| Nginx api.greffio.app | | | | ✓ |
| Code CORS / runtime | | ✓ | | |
| Deploy backend | | ✓ | | ✓ |
| Deploy frontend | | ✓ | ✓ | |
| Mollie dashboard | ✓ | assist | | |
| reCAPTCHA / Google | ✓ | assist | | |
| Tests métier | ✓ | ✓ | | |
| Go / no-go phase B | ✓ | | | |

---

## 11. Calendrier suggéré

| Semaine | Action |
|---------|--------|
| S0 | Phase 0 + achat domaine + PR code miroir |
| S1 | Phase A infra (DNS, SSL, deploy) + tests internes |
| S2–S3 | Miroir en production, usage équipe uniquement |
| S4 | Go/no-go → Phase B (migration intégrale) |
| S4+3 mois | Phase C décommission progressive |

---

## 12. Références internes

- `docs/runbooks/HOSTINGER_OPS.md`
- `docs/runbooks/DNS_GREFFIO_RESTORE.md`
- `FRONTEND_HOSTINGER_GIT_DEPLOY.md`
- `docs/MOLLIE_SITE_REVIEW_CHECKLIST.md`
- `scripts/deploy-backend-vps.ps1`
- `scripts/diagnose-dns-greffio.ps1`

---

## 13. Journal d’exécution (à remplir lors de l’application)

| Date | Phase | Étape | Opérateur | Résultat | Notes |
|------|-------|-------|-----------|----------|-------|
| | | | | | |

---

*Document généré pour Greffio — William Establishments. Ne pas committer de secrets dans ce journal.*
