# Deploy Frontend Hostinger (Auto via GitHub)

Objectif: ne plus utiliser les ZIP manuels pour chaque mise à jour frontend.

## 1) Prérequis

- Repo GitHub connecté à Hostinger
- Branche de déploiement: `main`
- Projet Node.js Web App configuré

## 2) Configuration Hostinger recommandée (import Git)

- Type d'app: `Node.js App` (pas site statique ZIP)
- Framework preset: si la détection échoue, choisir `Other`
- Node version: `20.x`
- Root directory: `./`
- Install command: `npm ci`
- Build command: `npm run hostinger:build`
- Start command: `npm run hostinger:start`
- Output directory (si demandé): `dist`

Pourquoi cette config: le repo contient frontend + backend + mobile. Le script `hostinger:start` sert uniquement le build frontend React (`dist`) en mode SPA, ce qui contourne les faux négatifs de détection framework Hostinger.

## 3) Variables d'environnement frontend

Ajouter dans Hostinger:

```env
VITE_API_BASE_URL=https://api.greffio.willentreprises.com
VITE_APP_URL=https://greffio.willentreprises.com
```

## 4) Variables à ne jamais mettre côté frontend

- `GOOGLE_PAY_API_KEY` (backend)
- `JWT_SECRET`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`

## 5) Flux de déploiement

```txt
git push origin main
-> Hostinger déclenche le build
-> lancement de `hostinger:start`
-> publication de la version frontend
```

Après activation de ce flux, plus besoin d'upload ZIP manuel pour le frontend.
