# Greffio

Plateforme SaaS de formalités d'entreprise (création, modification, suivi dossier, documents, paiement, opérations).

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Process: PM2
- Reverse proxy: Nginx
- DB: Supabase Postgres (fallback SQLite local dev)
- Paiement: Mollie

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

## Sécurité

- Ne jamais commit les secrets.
- Garder `SUPABASE_SERVICE_ROLE_KEY`, `MOLLIE_API_KEY`, `JWT_SECRET`, `DATABASE_URL` côté backend uniquement.
