# Mollie Connect – configuration Greffio (partenaires)

**Référence :** [Mollie Connect for Platforms – Getting started](https://docs.mollie.com/docs/connect-platforms-getting-started)

## État actuel (2026-06-17)

| Composant | Statut |
|-----------|--------|
| Paiements Mollie (API key) | ✅ `server/mollie.js`, webhooks, checkout |
| Application OAuth Mollie | ✅ **Existante** — « Greffio » (Dashboard → Developers → Your apps) |
| OAuth Connect routes | ✅ `server/routes/mollieConnectRoutes.js` |
| CSRF state (callback) | ✅ Table `mollie_connect_oauth_states` |
| Persistance tokens chiffrés | ✅ Table `mollie_connect_accounts` + `server/mollieConnectStore.js` |
| Refresh token | ✅ `refreshMollieConnectToken()` dans `mollieConnectService.js` |
| VPS env OAuth | ✅ `MOLLIE_OAUTH_CLIENT_ID`, `MOLLIE_OAUTH_CLIENT_SECRET`, `MOLLIE_CONNECT_REDIRECT_URI` |
| UI ops onboarding | ❌ Page `/ops/integrations` à brancher |

### Deux applications OAuth Mollie (Dashboard)

Mollie ne permet pas de créer les apps via API publique. Greffio utilise **deux apps distinctes** :

| App Dashboard | Usage Greffio | Client ID | Redirect URI |
|---------------|---------------|-----------|--------------|
| **Greffio** | Paiements B2C / factures ops (legacy callback) | `app_cG7HLTRXYAX5To9UPoBxnFnJ` | `https://greffio.willentreprises.com/api/mollie/callback` |
| **Greffio Connect for Partners** | OAuth Connect plateforme (`MOLLIE_OAUTH_*`) | `app_jDVb6uj8sBsYjkf8HJuzZmRS` | `https://api.greffio.willentreprises.com/api/mollie/connect/callback` |

Variables VPS `MOLLIE_OAUTH_CLIENT_ID` / `MOLLIE_OAUTH_CLIENT_SECRET` → app **Greffio Connect for Partners** uniquement.

Source credentials locale : `Documents/GREFFIO MOLLIE API KEY.md` (prioritaire) ou `Desktop/GREFFIO MOLLIE API KEY.txt`. Script : `scripts/configure-mollie-connect-vps.ps1` (parse le bloc Connect).

## Variables VPS (`.env` – ne jamais committer)

```env
MOLLIE_API_KEY=live_...
MOLLIE_PROFILE_ID=pfl_...
MOLLIE_OAUTH_CLIENT_ID=app_...
MOLLIE_OAUTH_CLIENT_SECRET=...
MOLLIE_CONNECT_REDIRECT_URI=https://api.greffio.willentreprises.com/api/mollie/connect/callback
MOLLIE_CALLBACK_URL=https://greffio.willentreprises.com/api/mollie/callback
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
# Optionnel — surcharge des scopes OAuth
# MOLLIE_CONNECT_SCOPES=payments.read payments.write profiles.read profiles.write onboarding.read organizations.read
```

Sync VPS depuis credentials Desktop :

```powershell
pwsh -File scripts/configure-mollie-connect-vps.ps1
pwsh -File scripts/vps-sync-from-local.ps1
```

## Dashboard Mollie (vérifications manuelles)

### App « Greffio Connect for Partners » (Connect OAuth)

1. **More → Developers → Your apps → Greffio Connect for Partners**
2. **Redirect URI** : `https://api.greffio.willentreprises.com/api/mollie/connect/callback` (doit correspondre exactement à `MOLLIE_CONNECT_REDIRECT_URI`)
3. **Scopes** (permissions) :
   - `payments.read`, `payments.write`
   - `profiles.read`, `profiles.write`
   - `onboarding.read`
   - `organizations.read`
4. Copier Client ID + Secret → sync VPS via `scripts/configure-mollie-connect-vps.ps1`

### App « Greffio » (paiements B2C)

1. Conserver la Redirect URI : `https://greffio.willentreprises.com/api/mollie/callback`
2. **Webhooks paiement** (compte plateforme) : `https://api.greffio.willentreprises.com/api/webhooks/mollie`
3. `MOLLIE_API_KEY` et `MOLLIE_PROFILE_ID` restent sur le compte plateforme (pas les vars OAuth Connect)

## Endpoints Greffio

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/mollie/connect/status` | ADMIN/OPS – diagnostic |
| GET | `/api/mollie/connect/authorize` | ADMIN/OPS – URL OAuth + state CSRF |
| GET | `/api/mollie/connect/callback` | Public – échange code → tokens chiffrés |

### Pattern URL authorize

```
https://www.mollie.com/oauth2/authorize
  ?client_id=app_...
  &redirect_uri=https%3A%2F%2Fapi.greffio.willentreprises.com%2Fapi%2Fmollie%2Fconnect%2Fcallback
  &response_type=code
  &scope=payments.read+payments.write+profiles.read+profiles.write+onboarding.read+organizations.read
  &state=<csrf_state_hex>
```

Obtenir l'URL complète (authentifié OPS) :

```bash
curl -s -H "Authorization: Bearer <ops_jwt>" \
  https://api.greffio.willentreprises.com/api/mollie/connect/authorize
```

## Schéma base (migration `028_mollie_connect.sql`)

- `mollie_connect_oauth_states` — state CSRF (15 min, usage unique)
- `mollie_connect_accounts` — `organization_id`, tokens AES-256-GCM chiffrés, `refresh_token`, statut

## Prochaines étapes

1. Brancher UI `/ops/integrations` (bouton « Connecter Mollie » → `/authorize`)
2. `POST /v2/clients` + lien onboarding hosted pour chaque partenaire
3. Routage paiement vers le `profileId` du sous-compte connecté

## Test rapide post-déploiement

```bash
curl -s -H "Authorization: Bearer <ops_jwt>" https://api.greffio.willentreprises.com/api/mollie/connect/status
curl -s https://api.greffio.willentreprises.com/api/mollie/status
```

Réponse attendue `/connect/status` : `{ "ok": true, "configured": true, "redirectUri": "https://api.greffio...", "clientId": "app_...", "scopes": "...", "connectedAccounts": 0 }`
