# Mollie — architecture dual-app Greffio

**Référence :** [Mollie Connect for Platforms – Getting started](https://docs.mollie.com/docs/connect-platforms-getting-started)

## État actuel (2026-06-17)

| Composant | Statut |
|-----------|--------|
| Paiements Mollie (API key) | ✅ `server/mollie.js`, webhooks, checkout |
| App OAuth « Greffio » (B2C) | ✅ Callback + vars `MOLLIE_PAYMENT_OAUTH_*` |
| App OAuth « Connect for Partners » | ✅ Vars `MOLLIE_OAUTH_*` + routes Connect |
| OAuth Connect routes | ✅ `server/routes/mollieConnectRoutes.js` |
| CSRF state (callback Connect) | ✅ Table `mollie_connect_oauth_states` |
| Persistance tokens chiffrés | ✅ Table `mollie_connect_accounts` |
| UI ops `/ops/integrations` | ✅ Deux cartes B2C + Connect Partners |
| Sync VPS | ✅ `scripts/configure-mollie-connect-vps.ps1` (dual-app) |

## Deux applications OAuth Mollie (Dashboard)

Mollie ne permet pas de créer les apps via API publique. Greffio utilise **deux apps distinctes** :

| App Dashboard | Usage Greffio | Variables VPS | Client ID | Redirect URI |
|---------------|---------------|---------------|-----------|--------------|
| **Greffio** | Paiements B2C / factures ops | `MOLLIE_API_KEY`, `MOLLIE_PROFILE_ID`, `MOLLIE_CALLBACK_URL`, `MOLLIE_WEBHOOK_URL`, `MOLLIE_PAYMENT_OAUTH_*` | `app_cG7HLTRXYAX5To9UPoBxnFnJ` | `https://greffio.willentreprises.com/api/mollie/callback` |
| **Greffio Connect for Partners** | OAuth Connect plateforme (pros) | `MOLLIE_OAUTH_CLIENT_ID`, `MOLLIE_OAUTH_CLIENT_SECRET`, `MOLLIE_CONNECT_REDIRECT_URI` | `app_jDVb6uj8sBsYjkf8HJuzZmRS` | `https://api.greffio.willentreprises.com/api/mollie/connect/callback` |

**Important :** ne jamais mélanger les secrets OAuth entre les deux apps. Le checkout B2C utilise la **clé API live** (`MOLLIE_API_KEY`), pas le client secret OAuth Connect.

Source credentials locale : `Documents/GREFFIO MOLLIE API KEY.md` (prioritaire) ou `Desktop/GREFFIO MOLLIE API KEY.txt`.

## Variables VPS (`.env` – ne jamais committer)

```env
# --- Paiements B2C (app « Greffio ») ---
MOLLIE_API_KEY=live_...
MOLLIE_PROFILE_ID=pfl_...
MOLLIE_CALLBACK_URL=https://greffio.willentreprises.com/api/mollie/callback
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
MOLLIE_PAYMENT_OAUTH_CLIENT_ID=app_cG7HLTRXYAX5To9UPoBxnFnJ
MOLLIE_PAYMENT_OAUTH_CLIENT_SECRET=...

# --- Connect Partners (app « Greffio Connect for Partners ») ---
MOLLIE_OAUTH_CLIENT_ID=app_jDVb6uj8sBsYjkf8HJuzZmRS
MOLLIE_OAUTH_CLIENT_SECRET=...
MOLLIE_CONNECT_REDIRECT_URI=https://api.greffio.willentreprises.com/api/mollie/connect/callback
# MOLLIE_CONNECT_SCOPES=payments.read payments.write profiles.read profiles.write onboarding.read organizations.read
```

Sync VPS depuis credentials Desktop :

```powershell
pwsh -File scripts/configure-mollie-connect-vps.ps1
pwsh -File scripts/deploy-backend-vps.ps1
```

## Câblage technique

### Paiement B2C

1. Mollie redirige vers `https://greffio.willentreprises.com/api/mollie/callback` (proxy PHP → API).
2. Route API `GET /api/mollie/callback` (`server/routes/mollieRoutes.js`) récupère le statut via `MOLLIE_API_KEY` et redirige vers `/paiement/verification`.
3. Webhooks serveur-à-serveur : `https://api.greffio.willentreprises.com/api/webhooks/mollie`.

### Connect Partners

1. Ops clique « Connecter Mollie » sur `/ops/integrations` → `GET /api/mollie/connect/authorize`.
2. Mollie redirige vers `https://api.greffio.willentreprises.com/api/mollie/connect/callback`.
3. L’API échange le code avec `MOLLIE_OAUTH_*` (app Connect uniquement) et chiffre les tokens.

## Dashboard Mollie (vérifications manuelles)

### App « Greffio Connect for Partners »

1. **More → Developers → Your apps → Greffio Connect for Partners**
2. **Redirect URI** : `https://api.greffio.willentreprises.com/api/mollie/connect/callback`
3. **Scopes** : `payments.read`, `payments.write`, `profiles.read`, `profiles.write`, `onboarding.read`, `organizations.read`
4. Sync VPS : `scripts/configure-mollie-connect-vps.ps1`

### App « Greffio » (paiements B2C)

1. **Redirect URI** : `https://greffio.willentreprises.com/api/mollie/callback`
2. **Webhooks paiement** (compte plateforme) : `https://api.greffio.willentreprises.com/api/webhooks/mollie`
3. Clé API live + Profile ID dans `MOLLIE_API_KEY` / `MOLLIE_PROFILE_ID`

## Endpoints diagnostic

| Méthode | Route | Auth | Rôle |
|---------|-------|------|------|
| GET | `/api/mollie/status` | Public | Statut paiements B2C |
| GET | `/api/mollie/connect/status` | ADMIN/OPS | Statut Connect Partners |
| GET | `/api/mollie/connect/authorize` | ADMIN/OPS | URL OAuth + state CSRF |
| GET | `/api/mollie/connect/callback` | Public | Échange code → tokens chiffrés |

## Test rapide post-déploiement

```bash
curl -s https://api.greffio.willentreprises.com/api/mollie/status
curl -s -H "Authorization: Bearer <ops_jwt>" https://api.greffio.willentreprises.com/api/mollie/connect/status
```

Réponses attendues :

- `/api/mollie/status` : `{ "ok": true, "configured": true, "app": "Paiements Greffio (B2C)", "paymentOAuthClientId": "app_cG7...", "callbackUrl": "https://greffio.willentreprises.com/api/mollie/callback", ... }`
- `/api/mollie/connect/status` : `{ "ok": true, "configured": true, "app": "Connect Partners", "clientId": "app_jDVb...", "redirectUri": "https://api.greffio...", ... }`

UI ops : `https://greffio.willentreprises.com/ops/integrations` — deux cartes avec statuts respectifs.

## Prochaines étapes produit

1. `POST /v2/clients` + lien onboarding hosted pour chaque partenaire
2. Routage paiement vers le `profileId` du sous-compte connecté
