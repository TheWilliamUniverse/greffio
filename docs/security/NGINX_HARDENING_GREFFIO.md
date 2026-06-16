# Durcissement Nginx – Greffio API (VPS)

Snippets réversibles à appliquer sur le VPS derrière Certbot/HTTPS. Ne pas remplacer la configuration existante sans sauvegarde.

## Emplacement typique

- Site API : `/etc/nginx/sites-available/greffio-api` (ou équivalent)
- Tester : `sudo nginx -t`
- Recharger : `sudo systemctl reload nginx`

## 1. Zones rate limit (http block)

```nginx
limit_req_zone $binary_remote_addr zone=greffio_api_global:20m rate=30r/s;
limit_req_zone $binary_remote_addr zone=greffio_api_auth:10m rate=5r/m;
limit_conn_zone $binary_remote_addr zone=greffio_conn:10m;
```

## 2. Bloc server API (extrait)

```nginx
server {
    listen 443 ssl http2;
    server_name api.greffio.willentreprises.com;

    # ... certificats Certbot ...

    client_max_body_size 12m;
    client_body_timeout 15s;
    client_header_timeout 15s;
    keepalive_timeout 20s;
    send_timeout 20s;

    limit_conn greffio_conn 40;

    location /api/health {
        limit_req zone=greffio_api_global burst=20 nodelay;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 10s;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
    }

    location /api/auth/ {
        limit_req zone=greffio_api_auth burst=10 nodelay;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 30s;
    }

    location /api/ {
        limit_req zone=greffio_api_global burst=60 nodelay;
        proxy_pass http://127.0.0.1:8787;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## 3. Headers de sécurité (optionnel côté Nginx)

Express/Helmet gère déjà la majorité des en-têtes. Ajouter côté Nginx seulement si besoin edge :

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 4. Tests après déploiement

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -sS https://api.greffio.willentreprises.com/api/health
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://api.greffio.willentreprises.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword1"}'
```

## 5. Rollback

1. Restaurer le fichier `.bak` créé avant modification.
2. `sudo nginx -t && sudo systemctl reload nginx`
3. Vérifier login + upload PDF depuis l’app.

## Limites

- Nginx complète Express ; ne pas doubler des seuils trop agressifs.
- Les webhooks PSP doivent conserver des timeouts plus longs si nécessaire.
