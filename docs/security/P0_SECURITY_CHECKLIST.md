# Checklist tests – Lot P0 sécurité Greffio

## Prérequis local

```bash
npm run dev:api
npm run test:security
```

## Rate limit global

- [ ] 300+ requêtes `/api/health` en 1 min → `429` avec message « Trop de tentatives… »
- [ ] Requête authentifiée normale (dashboard) non bloquée en usage courant
- [ ] Webhooks `/webhooks/*` non soumis au global limiter Express

## Routes publiques strictes

- [ ] `/api/auth/login` : limite stricte + auth limiter cumulés sans message technique
- [ ] `/api/contact/appointment-request` : 429 sobre après abus

## Turnstile (après configuration clés)

Backend `.env` :

```
TURNSTILE_ENABLED=true
TURNSTILE_SECRET_KEY=...
TURNSTILE_RISKY_LOGIN=true
TURNSTILE_ENFORCE_CONTACT=true
```

Frontend build :

```
VITE_TURNSTILE_ENABLED=true
VITE_TURNSTILE_SITE_KEY=...
```

- [ ] Contact : widget visible, envoi OK avec token
- [ ] Signup : widget étape 4, création compte OK
- [ ] Login : pas de widget au 1er essai ; après 2 échecs, widget + token requis
- [ ] Forgot/reset password : widget si activé
- [ ] Sans clés : aucun widget, parcours inchangé

## Auth / brute-force

- [ ] Login échec : message générique (pas « compte inexistant »)
- [ ] Forgot password : même réponse si email inconnu
- [ ] 3+ échecs : email `suspicious_login_attempt` si compte existe

## Headers

- [ ] `Referrer-Policy` et `Permissions-Policy` présents sur réponse API
- [ ] `CSP_REPORT_ONLY=true` : en-tête report-only sans casser React

## Nginx (VPS)

- [ ] `nginx -t` OK après snippets
- [ ] Health + login + upload PDF OK post-reload

## Rollback

- [ ] Retirer `TURNSTILE_ENABLED` → parcours identique à avant
- [ ] Augmenter `GLOBAL_RATE_LIMIT_MAX` → 429 disparaît pour trafic légitime
