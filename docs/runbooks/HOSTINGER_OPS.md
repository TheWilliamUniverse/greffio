# Runbook Hostinger — Greffio

Frontend SPA : `greffio.willentreprises.com` (Node app `npm run hostinger:start`).

## Variables

| Variable | Usage |
|----------|--------|
| `HOSTINGER_API_TOKEN` | Token API hPanel (déploiement script, DNS) |
| `HOSTINGER_DEPLOY_DOMAIN` | Domaine cible (défaut `greffio.willentreprises.com`) |
| `HOSTINGER_VERIFY_URL` | URL post-déploiement (défaut `/health`) |
| `VITE_API_BASE_URL` | Build frontend → API prod |
| `VITE_APP_URL` | URL publique app |

Ne jamais committer le token.

## Déploiement recommandé (Git)

```bash
git push origin main
```

Hostinger rebuild : `npm run hostinger:build` puis `hostinger:start`.

Voir `README_DEPLOY_HOSTINGER.md` et `FRONTEND_HOSTINGER_GIT_DEPLOY.md`.

## Déploiement archive (secours API)

```powershell
npm run build
# zipper dist/ → dist_YYYYMMDD.zip
$env:HOSTINGER_API_TOKEN = '…'   # depuis Desktop\SECRET
node scripts/hostinger-deploy-static.mjs greffio.willentreprises.com dist_YYYYMMDD.zip
```

Le script : résout le site → upload TUS → `deploy` → vérifie `https://greffio…/health`.

## Santé & DNS

```powershell
node scripts/hostinger-health-check.mjs willentreprises.com
pwsh -File scripts/diagnose-dns-greffio.ps1
```

## Endpoints Hostinger API utilisés

| Endpoint | Rôle |
|----------|------|
| `GET /api/hosting/v1/websites?domain=` | Résoudre `username` |
| `POST /api/hosting/v1/files/upload-urls` | Credentials upload TUS |
| `POST …/websites/{domain}/deploy` | Déclencher déploiement |
| `GET /api/dns/v1/zones/{domain}` | Lire enregistrements DNS |
| `GET /api/domains/v1/portfolio` | Portfolio domaines |

Non implémenté côté Greffio (ROI faible) : SSL provisioning automatique, création sous-domaines.

## Proxy Mollie frontend

`server/hostinger-frontend.js` proxifie `/api/mollie/*` et webhooks vers l’API VPS — ne pas retirer sans revue Mollie.

## Incidents DNS

`docs/runbooks/DNS_GREFFIO_RESTORE.md`, `docs/contexte-incident-dns-greffio-chatgpt.md`.
