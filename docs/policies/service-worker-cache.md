# Politique Service Worker Greffio

## Périmètre autorisé (cache)
- `/manifest.webmanifest`
- `/icons/greffio-icon.svg`
- `/icons/greffio-maskable.svg`

## Interdit (network-only)
- Toutes routes `/api/*`
- Tous fichiers `/assets/*` (hash Vite – servis avec cache immutable via Hostinger)
- Navigations HTML (`mode: navigate`) – network-first

## Version
- Nom de cache : `greffio-shell-v2`
- Incrémenter à chaque changement de stratégie SW

## Deploy CDN / Hostinger
- `index.html` : `Cache-Control: no-store`
- `sw.js` : `Cache-Control: no-store` (via règle HTML ou fichier racine)
- `/assets/*` : `max-age=31536000, immutable`

Implémentation : `public/sw.js`, `server/hostinger-frontend.js`.
