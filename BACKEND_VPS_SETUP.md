# Backend VPS Setup (No ZIP)

## Service topology

- API domain: `api.greffio.willentreprises.com`
- Runtime: Node.js + Express
- Process manager: PM2 (`greffio-api`)
- Reverse proxy: Nginx
- Database: Supabase Postgres

## Production env (`/opt/greffio/.env`)

Server-only variables:

```env
NODE_ENV=production
PORT=8787
APP_URL=https://greffio.willentreprises.com
API_BASE_URL=https://api.greffio.willentreprises.com

DATABASE_URL=postgresql://...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...

JWT_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

GOOGLE_PAY_API_KEY=
GOOGLE_PAY_MERCHANT_ID=
GOOGLE_PAY_MERCHANT_NAME=Greffio
GOOGLE_PAY_ENVIRONMENT=PRODUCTION
GOOGLE_PAY_GATEWAY=cawl

CAWL_API_BASE_URL=
CAWL_API_KEY=
CAWL_WEBHOOK_SECRET=
```

Never expose backend secrets in frontend vars.

## Database connectivity test

From `/opt/greffio`:

```bash
set -a && . ./.env && set +a
node pgcheck.mjs
```

Expected output:

```txt
postgres ok
```

## Nginx vhost

Expected server block:

```nginx
server {
    listen 80;
    server_name api.greffio.willentreprises.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host api.greffio.willentreprises.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload:

```bash
nginx -t
systemctl reload nginx
```

## SSL

When DNS points API domain to VPS:

```bash
certbot --nginx -d api.greffio.willentreprises.com
```

Then:

```bash
curl https://api.greffio.willentreprises.com/api/health
```

## Deploy flow (backend)

No ZIP deployment required:

```bash
cd /opt/greffio
git pull origin main
npm install --omit=dev
pm2 restart greffio-api --update-env
pm2 save
curl -f http://127.0.0.1:8787/api/health
```
