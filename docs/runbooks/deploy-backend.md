# Déploiement backend Greffio (API VPS)

## Cible

- API : `https://api.greffio.willentreprises.com`
- Version courante : `server/config/appVersion.js` → `GET /api/app-version`

## Prérequis VPS

- Node 20+, PM2 ou systemd
- `.env` avec `DATABASE_URL`, `JWT_SECRET`, secrets Mollie/Signwell/S3
- Migrations : `npm run db:migrate`

## Déploiement depuis poste local

```powershell
pwsh -File scripts/deploy-backend-vps.ps1
# ou synchronisation complète :
pwsh -File scripts/vps-full-deploy.ps1
```

## Vérification

```bash
curl -s https://api.greffio.willentreprises.com/api/health
curl -s https://api.greffio.willentreprises.com/api/app-version
npm run verify:prod
```

## Rollback

1. Revenir au commit/tag précédent sur le VPS
2. `npm ci && npm run db:migrate` (si migration incluse)
3. Redémarrer le process Node (`pm2 restart greffio-api` ou équivalent)
4. `npm run verify:prod`

## Cron & ops

- Relances dossiers : `npm run ops:send-dossier-reminders`
- Setup cron VPS : `npm run ops:setup-vps-cron`
