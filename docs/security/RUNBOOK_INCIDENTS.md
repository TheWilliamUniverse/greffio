# Runbook incidents sécurité – Greffio

Document opérationnel pour WILLIAM ESTABLISHMENTS / équipe ops. Pas de secrets dans ce fichier.

## Signaux d’alerte (logs PM2 / structured logs)

| Signal | Log / métrique | Action immédiate |
|---|---|---|
| Saturation API | Pics `GLOBAL_RATE_LIMIT_HIT`, `429` | Voir §1 |
| Brute-force | Pics `AUTH_RATE_LIMIT_HIT`, `suspicious_login_attempt` | Voir §2 |
| Contact spam | Pics `CONTACT_RATE_LIMIT_HIT` | Voir §3 |
| Upload bombing | Pics `UPLOAD_RATE_LIMIT_HIT`, CPU/RAM VPS | Voir §4 |
| Webhook suspect | Erreurs signature webhook | Voir §5 |
| Fuite potentielle | Accès anormal S3, IDOR signalé | Voir §6 |

---

## 1. DDoS / saturation API

**Symptômes** : latence élevée, `502/503`, PM2 restart, health lent.

1. Confirmer : `curl https://api.greffio.willentreprises.com/api/health`
2. Consulter logs : `pm2 logs greffio-api --lines 200` – chercher `GLOBAL_RATE_LIMIT_HIT`
3. Si attaque évidente : activer/réduire `GLOBAL_RATE_LIMIT_MAX` (ex. 150) dans `/opt/greffio/.env`, `pm2 restart greffio-api`
4. Couche edge : activer mode « Under Attack » ou règles WAF Cloudflare si disponible
5. Nginx : appliquer snippets `docs/security/NGINX_HARDENING_GREFFIO.md` si pas encore fait
6. Rollback sécurité : remettre variables rate limit précédentes, reload PM2

**Ne pas** : couper l’auth refresh ni les webhooks paiement sans analyse.

---

## 2. Credential stuffing / brute-force login

**Symptômes** : nombreux `401` sur `/api/auth/login`, emails `suspicious_login_attempt`.

1. Vérifier pics `AUTH_RATE_LIMIT_HIT` et IP sources (logs structurés, pas d’email complet en log)
2. Activer Turnstile progressif :
   - `TURNSTILE_ENABLED=true`
   - `TURNSTILE_RISKY_LOGIN=true`
   - `TURNSTILE_ENFORCE_LOGIN=true` si attaque massive
   - Frontend : `VITE_TURNSTILE_ENABLED=true` + clés site
3. `pm2 restart greffio-api` + redéployer frontend si variables Vite changent
4. Informer les comptes internes (OPS/ADMIN) de vérifier MFA
5. Rollback : `TURNSTILE_ENFORCE_LOGIN=false`, garder risky mode

**Message utilisateur** (déjà en place) : générique, pas de révélation compte inexistant.

---

## 3. Spam formulaire contact

**Symptômes** : pics `CONTACT_RATE_LIMIT_HIT`, inbox support saturée.

1. `TURNSTILE_ENFORCE_CONTACT=true`
2. Réduire `STRICT_PUBLIC_RATE_LIMIT_MAX` temporairement (ex. 20)
3. Filtrer domaines jetables côté process métier si récurrent (P1)
4. Rollback : remettre seuils par défaut après 24–48 h

---

## 4. Upload bombing

**Symptômes** : CPU/RAM hauts, pics `UPLOAD_RATE_LIMIT_HIT`, disque S3/local.

1. Vérifier route `/api/dossiers/:id/documents` dans logs ops
2. Réduire `uploadLimiter` via redéploiement si nécessaire (code) ou bloquer IP au WAF
3. Vérifier taille max PDF (multer) et driver S3
4. Rollback : restaurer limite upload d’origine

---

## 5. Webhook suspect

**Symptômes** : échecs vérification signature GoCardless/CAWL/Resend/SignWell.

1. **Ne pas** désactiver les webhooks en prod sans backup manuel des paiements
2. Vérifier secrets webhook dans `.env` VPS (rotation si fuite suspectée)
3. Rejouer un événement test depuis console PSP si disponible
4. Logs : chercher erreurs routes `webhookRoutes.js` / handlers dédiés

---

## 6. Fuite potentielle de données

**Symptômes** : accès dossier non autorisé signalé, URL signée partagée, fuite credential.

1. Isoler : rotation `JWT_SECRET`, clés S3, webhooks, Turnstile si concernées
2. Révoquer sessions : redémarrage API invalide les access tokens courts ; forcer reset password comptes ciblés
3. Audit Supabase : accès `service_role`, logs API 403/401
4. Notification DPO / RGPD si données personnelles exposées (procédure interne)
5. Documenter chronologie dans ticket interne

---

## 7. Rollback déploiement sécurité

1. `git checkout <commit-stable>` sur VPS ou redeploy pipeline précédent
2. Restaurer `.env` backup
3. `pm2 restart greffio-api`
4. Tests : health, login, upload PDF, paiement test, contact

---

## Checklist post-incident

- [ ] Cause identifiée (pas seulement symptôme)
- [ ] Seuils rate limit documentés
- [ ] Turnstile : état final (enforce vs risky) noté
- [ ] Pas de PII dans les logs d’incident exportés
- [ ] Prochaine étape P1/P2 planifiée (Redis lockout, Sentry, CSP enforce)
