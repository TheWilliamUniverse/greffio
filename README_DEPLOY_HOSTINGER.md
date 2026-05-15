# Deploy Frontend Hostinger (Auto via GitHub)

Objectif: ne plus utiliser les ZIP manuels pour chaque mise à jour frontend.

## 1) Prérequis

- Repo GitHub connecté à Hostinger
- Branche de déploiement: `main`
- Projet Node.js Web App configuré

## 2) Configuration Hostinger recommandée

- Framework preset: `Vite`
- Node version: `22.x` (ou `20.x` si nécessaire)
- Root directory: `./`
- Build command: `npm install && npm run build`
- Output directory: `dist`

## 3) Variables d'environnement frontend

Ajouter dans Hostinger:

```env
VITE_API_BASE_URL=https://api.greffio.willentreprises.com
VITE_APP_URL=https://greffio.willentreprises.com
```

## 4) Variables à ne jamais mettre côté frontend

- `MOLLIE_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`

## 5) Flux de déploiement

```txt
git push origin main
-> Hostinger déclenche le build
-> publication du dossier dist
```

Après activation de ce flux, plus besoin d'upload ZIP manuel pour le frontend.
