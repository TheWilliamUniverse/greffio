# Mollie Connect – configuration Greffio (partenaires)

**Référence :** [Mollie Connect – Onboarding customers](https://docs.mollie.com/docs/connect-platforms-onboarding-customers)

## État actuel du code

| Composant | Statut |
|-----------|--------|
| Paiements Mollie (API key) | ✅ `server/mollie.js`, webhooks, checkout |
| OAuth Connect | 🟡 Scaffold `server/routes/mollieConnectRoutes.js` |
| Persistance tokens sous-comptes | ❌ À implémenter (table chiffrée) |
| UI ops onboarding | ❌ Page `/ops/integrations` à brancher |

## Variables VPS (`.env` – ne jamais committer)

```env
MOLLIE_API_KEY=live_...
MOLLIE_PROFILE_ID=pfl_...
MOLLIE_OAUTH_CLIENT_ID=app_...
MOLLIE_OAUTH_CLIENT_SECRET=...
MOLLIE_CONNECT_REDIRECT_URI=https://api.greffio.willentreprises.com/api/mollie/connect/callback
MOLLIE_CALLBACK_URL=https://greffio.willentreprises.com/api/mollie/callback
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
```

## Dashboard Mollie (manuel)

1. **Developers → Your apps** : créer une application OAuth « Greffio Platform ».
2. **Redirect URI** : `https://api.greffie.willentreprises.com/api/mollie/connect/callback`
3. **Scopes** : `onboarding.read`, `onboarding.write`, `payments.read`, `payments.write`, `profiles.read`, `organizations.read`
4. **Website / profil marchand** : voir `docs/MOLLIE_SITE_REVIEW_CHECKLIST.md`
5. **Webhooks paiement** : `https://api.greffio.willentreprises.com/api/webhooks/mollie` (hook actif requis)

## Endpoints Greffio ajoutés

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/mollie/connect/status` | ADMIN/OPS – diagnostic |
| GET | `/api/mollie/connect/authorize` | ADMIN/OPS – URL OAuth |
| GET | `/api/mollie/connect/callback` | Public – échange code → tokens |

## Prochaines étapes recommandées

1. Table `mollie_connect_accounts` (organization_id, refresh_token chiffré, profile_id, status).
2. CSRF state persistant pour le callback OAuth.
3. Appel `POST /v2/clients` + lien onboarding hosted Mollie pour chaque partenaire.
4. Routage paiement vers le `profileId` du sous-compte connecté (`organizationId` dans metadata Mollie).

## Test rapide post-déploiement

```bash
curl -s -H "Authorization: Bearer <ops_jwt>" https://api.greffio.willentreprises.com/api/mollie/connect/status
curl -s https://greffio.willentreprises.com/api/mollie/status
```
