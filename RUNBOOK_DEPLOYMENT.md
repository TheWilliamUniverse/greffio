# Greffio Deployment Runbook

This runbook gives a clear production update process for both backend and frontend.

## 1) Backend update (VPS) - no ZIP required

Backend runs on:
- `api.greffio.willentreprises.com`
- VPS Ubuntu
- `pm2` process: `greffio-api`
- Nginx reverse proxy

Preferred update flow:

```bash
ssh root@187.127.232.210
cd /opt/greffio
# if using git:
git pull
npm ci --omit=dev
npm run db:migrate
npm run db:check
pm2 restart greffio-api --update-env
pm2 logs greffio-api --lines 100
curl http://127.0.0.1:8787/api/health
```

Automated safer flow (recommended):

```bash
ssh root@187.127.232.210
cd /opt/greffio
chmod +x scripts/vps-deploy.sh
APP_DIR=/opt/greffio PM2_NAME=greffio-api BRANCH=main scripts/vps-deploy.sh
```

Current fallback flow (without git clone on VPS):
- upload changed files to `/opt/greffio`
- restart PM2 as above

## 2) Frontend update - depends on hosting mode

Frontend public URL:
- `https://greffio.willentreprises.com`

### Mode A (current likely): Hostinger manual upload
- Yes, still needs a ZIP upload for each UI change.

Build and package:

```bash
npm run build
# then upload `dist/` content according to Hostinger setup
```

### Mode B (recommended): Git-based or CI/CD deploy
- No manual ZIP.
- Push to GitHub branch and let pipeline deploy automatically.

## 3) Mobile (Capacitor Android) updates

If app loads live website URL:
- web/content updates do NOT require new `.aab`

New `.aab` needed only for native changes (permissions, plugins, app icon, splash, versionCode, etc).

## 4) Production checks after each deploy

Backend checks:

```bash
curl https://api.greffio.willentreprises.com/api/health
```

Frontend checks:
- Open `https://greffio.willentreprises.com`
- Test login, questionnaire, mandate, payment entry points

Critical checks:
- signup/login works
- dossier creation works
- dossier transitions work
- documents status API works
- payment create endpoint responds

## 5) Secrets and safety

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
- Keep backend secrets only in VPS `.env`
- Restart backend with `--update-env` after changing env vars
- Set `DOCUMENT_STORAGE_DRIVER=supabase` on VPS to store uploaded docs in Supabase Storage.
- Keep `DOCUMENT_STORAGE_DRIVER=local` for local dev.

## 6) Internal Greffio account

Promote the William Establishments account to an internal Greffio role from the backend host only:

```bash
cd /opt/greffio
INTERNAL_USER_ROLE=ADMIN npm run ops:promote-william
```

If the account does not exist yet, create it explicitly with a temporary strong password:

```bash
INTERNAL_USER_PASSWORD='replace-with-a-strong-temporary-password' INTERNAL_USER_ROLE=ADMIN npm run ops:promote-william
```

## 7) What is already accessible

- VPS SSH access: available
- Backend deploy/restart: available
- Supabase Postgres connectivity via `DATABASE_URL`: configured
- Google Pay + CAWL sur backend : variables configurées

## 8) What is still needed for full admin automation

- Real `SUPABASE_SERVICE_ROLE_KEY` (backend-only) if server-side Supabase admin APIs are required.
- DNS for `api.greffio.willentreprises.com` must point to VPS for final HTTPS API domain cutover.
