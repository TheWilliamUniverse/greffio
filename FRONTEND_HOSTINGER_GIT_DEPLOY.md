# Frontend Deployment on Hostinger without ZIP

This config removes manual ZIP uploads for frontend updates.

## Goal

Deploy `greffio.willentreprises.com` from GitHub automatically.

## Prerequisites

- Project code pushed to GitHub (`main` branch)
- Hostinger supports Git deploy or Node.js web app build + publish

## Hostinger app settings

- Repository: `TheWilliamUniverse/greffio`
- Branch: `main`
- Root directory: `./`
- Node version: `20.x`
- If framework auto-detection fails, set framework to `Other`
- Install command: `npm ci`
- Build command: `npm run hostinger:build`
- Start command: `npm run hostinger:start`
- Output directory (if required by UI): `dist`

This repository is a monorepo-like setup (frontend + backend + mobile).
Using `hostinger:start` guarantees Hostinger runs a valid Node entrypoint and serves the Vite build reliably.

## Frontend environment variables

Set only public variables:

```env
VITE_API_BASE_URL=https://api.greffio.willentreprises.com
VITE_APP_URL=https://greffio.willentreprises.com
```

## Never expose these in frontend

Do NOT put in Hostinger frontend env:

- `GOOGLE_PAY_API_KEY` (backend VPS uniquement)
- `JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`

## Deploy flow

1. Commit and push changes to GitHub
2. Hostinger pulls latest commit
3. Hostinger builds `dist`
4. New frontend is published automatically

No ZIP required in this mode.
