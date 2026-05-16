# Deployment Workflow (VPS Unique)

Ce document definit le flux unique de deploiement production Greffio (VPS + PM2 + rollback).

## 1) Prerequis serveur

- Dossier applicatif Git: `/opt/greffio` (clone propre)
- Node/npm installes
- PM2 installe globalement
- Variables sensibles uniquement dans `/opt/greffio/.env` (jamais en Git)

## 2) Bootstrap PM2 versionne

```bash
mkdir -p /var/log/greffio
cd /opt/greffio
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## 3) Deploiement standard (reproductible)

```bash
cd /opt/greffio
bash scripts/vps-deploy.sh
```

Le script fait:
- backup de securite du code courant
- `git fetch` + `reset` sur la branche cible
- `npm ci --omit=dev`
- migrations DB
- restart PM2
- checks `/api/health` et `/api/ready`

## 4) Rollback rapide

Le script enregistre la release precedente dans `/opt/greffio/.deploy`.

```bash
cd /opt/greffio
bash scripts/vps-deploy.sh rollback
```

## 5) Nginx health/readiness

Verifier que `location /api/` precede le fallback frontend et que:
- `GET /api/health` retourne `200`
- `GET /api/ready` retourne `200` (ou `503` si dependance critique absente)

## 6) Rotation des logs PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 30
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 save
```

## 7) Migration storage local -> Supabase (dry-run d abord)

```bash
cd /opt/greffio
npm run storage:migrate:dry
npm run storage:migrate
```

Utiliser d abord le dry-run, puis execution reelle.
