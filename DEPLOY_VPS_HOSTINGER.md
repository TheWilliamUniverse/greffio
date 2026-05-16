# Deployment Greffio API on Hostinger VPS

This guide deploys the backend API on Ubuntu VPS with Node.js, Nginx, and PM2.

## 1) Connect to VPS

```bash
ssh root@187.127.232.210
```

## 2) Install base packages

```bash
apt update && apt upgrade -y
apt install -y git curl nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

## 3) Prepare app folder

```bash
mkdir -p /opt/greffio && cd /opt/greffio
# then upload project code (git clone or scp)
```

## 4) Install backend dependencies

```bash
cd /opt/greffio
npm ci --omit=dev
npm run db:migrate
npm run db:check
```

## 5) Create production env

Create `/opt/greffio/.env`:

```env
PORT=8787
APP_URL=https://greffio.willentreprises.com
API_BASE_URL=https://api.greffio.willentreprises.com

MOLLIE_API_KEY=live_xxx
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/webhooks/mollie

JWT_SECRET=replace_with_min_64_chars_random_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

RESEND_API_KEY=re_xxx
FROM_EMAIL=notifications@greffio.fr
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code.

## 6) Start API with PM2

```bash
cd /opt/greffio
pm2 start "node server/index.js" --name greffio-api
pm2 save
pm2 startup
```

## 7) Configure Nginx reverse proxy

Create `/etc/nginx/sites-available/greffio-api.conf`:

```nginx
server {
  listen 80;
  server_name api.greffio.willentreprises.com;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/greffio-api.conf /etc/nginx/sites-enabled/greffio-api.conf
nginx -t
systemctl reload nginx
```

## 8) TLS with Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.greffio.willentreprises.com
```

## 9) Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 10) Health checks

```bash
curl https://api.greffio.willentreprises.com/api/health
curl https://api.greffio.willentreprises.com/api/ready
pm2 logs greffio-api
```

## 11) Mollie webhook setup

In backend env:
- `MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/webhooks/mollie`

In Mollie dashboard, ensure payment webhook points to:
- `https://api.greffio.willentreprises.com/webhooks/mollie`

## 12) Internal Greffio account

Run this only on the backend host, after `.env` is loaded and the database is reachable:

```bash
cd /opt/greffio
INTERNAL_USER_ROLE=ADMIN npm run ops:promote-william
```

If `william@willentreprises.com` does not exist yet, create it with a temporary strong password:

```bash
INTERNAL_USER_PASSWORD='replace-with-a-strong-temporary-password' INTERNAL_USER_ROLE=ADMIN npm run ops:promote-william
```

## 13) Recommended architecture

- Hostinger VPS: Node API + Nginx + PM2
- Supabase/Postgres: primary database (next migration step)
- Mollie: payments
- Resend: transactional emails
- Sentry: backend/frontend observability

