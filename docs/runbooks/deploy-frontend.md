# Déploiement frontend Greffio

## Prérequis

- Node 20+, accès repo Greffio
- `VITE_API_BASE_URL=https://api.greffio.willentreprises.com` (build prod)
- `HOSTINGER_API_TOKEN` pour déploiement archive (optionnel)

## Build local

```bash
npm ci
npm run build
npm run verify:prod   # smoke prod après déploiement
```

Le build génère `dist/` et `public/version.json` (version depuis `server/config/appVersion.js`).

## Déploiement Git Hostinger (recommandé)

```bash
git push origin main
```

Hostinger exécute `npm run hostinger:build` puis `hostinger:start`. Voir `HOSTINGER_OPS.md`.

## Déploiement archive (secours)

```powershell
npm run build
Compress-Archive -Path dist\* -DestinationPath dist-deploy.zip
$env:HOSTINGER_API_TOKEN = '…'
npm run deploy:hostinger -- greffio.willentreprises.com dist-deploy.zip
```

## Vérification post-déploiement

```bash
npm run verify:prod
```

Attendu : homepage 200, `/api/health` 200, `/api/app-version` avec version publiée Play Store.
