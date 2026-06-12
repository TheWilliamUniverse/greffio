# Greffio

Plateforme SaaS de formalités d'entreprise (création, modification, suivi dossier, documents, paiement, opérations).

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Process: PM2
- Reverse proxy: Nginx
- DB: Supabase Postgres (fallback SQLite local dev)
- Paiement B2C: Google Pay (CAWL en aval) · B2B: GoCardless

## URL cibles

- Frontend: `https://greffio.willentreprises.com`
- API: `https://api.greffio.willentreprises.com`

## Lancement local

```bash
npm install
npm run dev
npm run dev:api
```

## Déploiement

- Frontend Hostinger Git Deploy: `FRONTEND_HOSTINGER_GIT_DEPLOY.md`
- Backend VPS setup: `BACKEND_VPS_SETUP.md`
- Runbook global: `RUNBOOK_DEPLOYMENT.md`

## Assistant Greffio (backend)

Greffio expose un endpoint serveur pour Assistant Greffio (propulse par ChatGPT):

- `POST /api/assistant` (auth requise)

Configuration backend (`.env` VPS):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1-mini
```

Important:

- Ne jamais exposer `OPENAI_API_KEY` au frontend.
- Regenerer toute cle API ayant ete partagee en clair.

## Stockage documents (Supabase)

Greffio supporte deux drivers:

- `DOCUMENT_STORAGE_DRIVER=local` (dev/local)
- `DOCUMENT_STORAGE_DRIVER=supabase` (prod recommande)

Variables backend:

```env
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=greffio-documents
DOCUMENT_STORAGE_DRIVER=supabase
```

Comportement:

- Upload document vers Supabase Storage si configure.
- Fallback local automatique si indisponible (pas de blocage dossier).
- Download via URL signee pour les objets Supabase.

## Exploitation VPS (workflow recommande)

Script de deploiement:

- `scripts/vps-deploy.sh`

Exemple:

```bash
ssh root@<vps>
cd /opt/greffio
chmod +x scripts/vps-deploy.sh
APP_DIR=/opt/greffio PM2_NAME=greffio-api BRANCH=main scripts/vps-deploy.sh
```

Ce script fait:

1. sync git sur `main`
2. `npm ci --omit=dev`
3. migrations Postgres
4. restart PM2 avec `--update-env`
5. healthcheck local API

## Sécurité

- Ne jamais commit les secrets.
- Garder `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PAY_API_KEY`, `CAWL_API_KEY`, `JWT_SECRET`, `DATABASE_URL` côté backend uniquement.
