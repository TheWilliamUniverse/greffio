# Greffio – Fichier contexte sécurité pour Cursor

## Objectif du fichier

Ce document sert de **contexte long, précis, complet et directement exploitable par Cursor** pour renforcer la sécurité de Greffio face aux attaques informatiques, abus automatisés, saturation applicative, brute-force, credential stuffing, scraping, upload bombing, fuites de données, erreurs de configuration, failles d'autorisation et incidents de production.

Il ne s'agit pas d'un document marketing. Il ne faut pas modifier l'identité visuelle du site, la landing page, la palette, le ton de marque ou l'expérience utilisateur globale. Les protections doivent être intégrées de manière **sobre, invisible autant que possible, professionnelle et cohérente avec une plateforme SaaS française de formalités d'entreprise**.

La règle générale est : **sécurité forte, friction minimale, transparence maîtrisée**.

---

## 0. Résumé exécutif pour Cursor

Tu dois renforcer Greffio sans refaire l'architecture ni changer l'identité du produit.

Les priorités sont :

1. Mettre une protection anti-DDoS et anti-abus à plusieurs couches : edge/CDN/WAF, Nginx, Express, base de données, observabilité.
2. Ajouter un **rate limit global** sur `/api/*`, en plus des rate limits spécifiques existants.
3. Durcir Nginx : `limit_req`, `limit_conn`, timeouts anti-slowloris, taille upload, headers, logs.
4. Remplacer les compteurs mémoire sensibles par du stockage persistant ou distribué quand nécessaire.
5. Ajouter une protection anti-bot progressive sur les formulaires exposés : login, signup, reset password, contact, endpoints publics coûteux.
6. Préférer **Cloudflare Turnstile** à reCAPTCHA pour préserver l'identité, l'accessibilité, la confidentialité et la fluidité UX, sauf contrainte contraire.
7. Ne pas afficher de CAPTCHA partout. Utiliser un mode invisible/managed ou déclenchement adaptatif selon le risque.
8. Renforcer la protection brute-force et credential stuffing : lockout progressif par compte, IP, email, device, et alertes.
9. Auditer les routes sensibles pour IDOR et absence de `requireAuth`.
10. Ajouter des logs d'audit utiles mais sans PII excessive.
11. Ajouter des tests automatisés sécurité : rate limit, auth, IDOR, upload, headers, CORS, brute-force.
12. Préparer un runbook d'incident : attaque DDoS, fuite de secret, brute-force massif, upload bombing, indisponibilité API.

---

## 1. Contexte produit et périmètre

### 1.1 Produit concerné

Greffio est une plateforme SaaS française de formalités d'entreprise : création, modification, documents, statuts, paiement, signature, dépôt et accompagnement administratif.

Le produit manipule des données sensibles : identité, coordonnées, documents, dossiers d'entreprise, pièces potentiellement confidentielles, informations de paiement ou de mandat, statuts, justificatifs et échanges utilisateurs.

La sécurité doit donc être pensée comme un pilier produit, pas comme un simple ajout technique.

### 1.2 Surfaces connues

| Surface | Description | Niveau de sensibilité |
|---|---|---|
| Frontend web | SPA/PWA Greffio servie par Hostinger | Moyen |
| API backend | Express derrière Nginx sur VPS | Très élevé |
| App Android | Capacitor, bundle web embarqué | Élevé |
| Supabase/PostgreSQL | Données métiers et comptes | Très élevé |
| AWS S3 | Documents clients | Très élevé |
| Paiements / PSP | GoCardless, CAWL, Google Pay | Très élevé |
| Emails | Resend/Brevo ou équivalent | Élevé |
| Webhooks | Paiement, signature, email | Très élevé |
| Assistant IA / OpenAI | Surface d'abus et de coût | Élevé |

### 1.3 Contraintes non négociables

Cursor doit respecter les contraintes suivantes :

- Ne jamais demander, afficher, committer ou déduire des secrets.
- Ne jamais toucher aux fichiers `.env` réels.
- Ne jamais déplacer des secrets côté frontend.
- Ne pas changer l'identité visuelle globale.
- Ne pas changer la marque, le ton, la palette, la landing ou le header public pour des raisons de sécurité sauf nécessité extrême.
- Ne pas ajouter de popup agressive ou CAPTCHA visible partout.
- Ne pas inventer d'endpoints ou de services externes inexistants.
- Ne pas casser l'auth résiliente existante.
- Ne pas dégrader l'expérience utilisateur légitime.
- Ne pas exposer plus d'informations dans les messages d'erreur.
- Ne pas logger de PII complète, tokens, URLs signées, headers secrets ou payloads documents.

---

## 2. Modèle de menace prioritaire

### 2.1 Menaces P0

Ces menaces doivent être traitées en priorité.

#### T1 – Saturation API / DDoS applicatif

Un attaquant ou botnet envoie un volume élevé de requêtes sur :

- `/api/health`
- `/api/ready`
- endpoints publics
- endpoints de recherche société/SIREN
- endpoints d'assistant IA
- endpoints auth
- endpoints upload
- routes coûteuses de génération ou preview documents

Risque : CPU/RAM saturés, PM2 instable, Nginx débordé, base Supabase sollicitée inutilement, coût OpenAI ou fournisseurs externes.

#### T2 – Brute-force login / credential stuffing

Un attaquant teste des combinaisons email/mot de passe volées.

Risque : compromission de comptes clients, accès dossiers, fuite documents, réputation atteinte.

#### T3 – Upload bombing

Un attaquant envoie de nombreux fichiers PDF volumineux ou malformés.

Risque : CPU parsing PDF saturé, stockage disque temporaire, mémoire, crash parser, coûts S3.

#### T4 – IDOR / accès horizontal aux dossiers

Un utilisateur connecté tente d'accéder aux dossiers d'un autre utilisateur via ID manipulé.

Risque : fuite de documents et données client.

#### T5 – Fuite de secrets ou mauvaise configuration prod

Risque : compromission JWT, S3, PSP, OpenAI, webhooks, base de données.

#### T6 – Webhooks forgés

Un attaquant appelle un endpoint webhook pour changer un statut métier.

Risque : paiement marqué à tort, signature validée à tort, email ou dossier manipulé.

---

## 3. Position claire sur CAPTCHA / reCAPTCHA / Turnstile

### 3.1 Faut-il un CAPTCHA sur Greffio ?

Oui, **mais pas sous forme de CAPTCHA visible partout**.

Greffio devrait ajouter une protection anti-bot progressive, idéalement invisible ou adaptative, sur les actions exposées qui coûtent cher ou exposent l'authentification.

La bonne approche :

1. Pas de CAPTCHA sur la simple navigation publique.
2. Pas de CAPTCHA systématique sur toutes les requêtes API.
3. Protection anti-bot sur les formulaires et actions sensibles.
4. Challenge uniquement quand le risque est élevé ou après plusieurs échecs.
5. UX invisible ou quasi invisible par défaut.

### 3.2 Recommandation principale

Recommandation : **Cloudflare Turnstile en mode Managed ou Invisible**, plutôt que Google reCAPTCHA, sauf contrainte commerciale ou technique spécifique.

Pourquoi :

- Expérience plus discrète.
- Moins de friction visuelle.
- Plus cohérent avec une identité premium.
- Meilleure acceptabilité utilisateur.
- Intégration possible sans modifier le design global.
- Possibilité d'utiliser Managed Mode, Invisible Mode ou Non-interactive Mode.
- Bon compromis pour login, signup, reset password, contact, assistant et endpoints publics coûteux.

### 3.3 Pourquoi éviter reCAPTCHA par défaut

reCAPTCHA peut fonctionner, mais il est moins idéal pour Greffio si l'objectif est une expérience premium, sobre et française.

Points de vigilance :

- Dépendance forte à Google.
- Expérience parfois plus intrusive.
- Questions de confidentialité et perception utilisateur.
- Tarification et modèles Google Cloud à bien surveiller.
- Risque de friction plus visible sur mobile.

### 3.4 Où placer Turnstile

Priorité P0/P1 :

| Zone | Protection recommandée | Mode |
|---|---|---|
| Login | Après 2-3 échecs ou risque élevé | Managed/Invisible |
| Signup | Toujours ou selon score risque | Managed |
| Reset password | Toujours | Managed/Invisible |
| Contact public | Toujours, discret | Managed/Invisible |
| Assistant IA public | Selon volume/IP/session | Managed/Invisible |
| Recherche SIREN publique | Selon fréquence | Invisible + rate limit |
| Upload documents | Pas CAPTCHA si utilisateur authentifié normal, mais risk check si abus | Adaptatif |

### 3.5 Où ne pas le placer

Ne pas mettre de CAPTCHA :

- sur toutes les pages publiques ;
- sur le dashboard à chaque navigation ;
- sur chaque appel API authentifié normal ;
- sur le checkout/paiement si un PSP ou flow sécurisé gère déjà les contrôles, sauf abus manifeste ;
- sur les pages légales ;
- sur les assets statiques.

### 3.6 UX recommandée

Le widget doit être intégré sobrement :

- petite zone discrète sous le formulaire si visible ;
- texte clair : `Protection anti-abus activée` ;
- pas de wording anxiogène ;
- pas de popup ;
- pas de rupture de palette ;
- pas de badge énorme ;
- message d'erreur calme : `La vérification de sécurité a expiré. Réessayez.`

### 3.7 Architecture de validation Turnstile

Flux :

```text
Client React
  -> obtient token Turnstile
  -> envoie token avec action sensible
Backend Express
  -> vérifie token auprès de Turnstile server-side
  -> contrôle hostname/action/remote IP si disponible
  -> refuse si token absent/invalide/expiré
  -> applique aussi rate limit et validation métier
```

Important :

- La validation doit être **côté serveur**.
- Le secret Turnstile reste dans `.env` backend uniquement.
- Le site key public peut être côté frontend.
- Le token est à usage court.
- Ne jamais considérer Turnstile comme protection unique.

Variables proposées :

```env
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ENABLED=true
TURNSTILE_REQUIRED_ON_AUTH=true
TURNSTILE_REQUIRED_ON_CONTACT=true
TURNSTILE_REQUIRED_ON_ASSISTANT=false
TURNSTILE_FAIL_OPEN=false
```

`TURNSTILE_FAIL_OPEN=false` est recommandé en production sur login/reset/contact. En revanche, pour éviter de bloquer tous les utilisateurs lors d'un incident fournisseur, prévoir un mode emergency configurable par variable d'environnement et runbook.

---

## 4. Architecture cible de défense en profondeur

### 4.1 Schéma cible

```text
[Utilisateur légitime / bot / attaquant]
              |
              v
[DNS / CDN / WAF / Bot protection]
  - cache statique
  - règles WAF
  - rate limit edge
  - challenge adaptatif
  - blocage pays/IP si attaque
              |
              v
[Nginx VPS]
  - TLS strict
  - limit_req
  - limit_conn
  - timeouts anti-slowloris
  - body size caps
  - logs enrichis
              |
              v
[Express API]
  - Helmet/CORS
  - global API limiter
  - route-specific limiters
  - auth limiter par IP + email + compte
  - Turnstile verification
  - Zod validation
  - audit logs
              |
              v
[Services internes]
  - DB Supabase avec RLS
  - S3 IAM least privilege
  - PSP webhooks verified
  - email provider
  - OpenAI quotas/cost controls
              |
              v
[Monitoring / Alerting]
  - 401/403/429 spikes
  - CPU/RAM/disk
  - p95 latency
  - failed webhooks
  - failed uploads
  - auth failures
```

### 4.2 Principe de sécurité

Aucune couche ne suffit seule.

- Le WAF réduit le bruit.
- Nginx protège le VPS.
- Express protège la logique applicative.
- La DB protège les données.
- Les logs permettent de détecter.
- Les runbooks permettent de réagir.

---

## 5. Mesures P0 – À implémenter en premier

## P0.1 – Rate limit global sur `/api/*`

### Problème

Des endpoints non protégés spécifiquement peuvent être saturés.

### Objectif

Ajouter une limite globale raisonnable sur toutes les routes API, sans casser les routes déjà limitées plus finement.

### Recommandation

Ajouter un middleware global avant les routes API :

- fenêtre : 1 minute ;
- max par IP : 300 requêtes/minute en production pour commencer ;
- ignorer éventuellement `/api/health` ou lui mettre un limiter séparé très strict ;
- réponse JSON standard ;
- log d'événement 429 structuré.

### Exemple conceptuel

```js
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez dans un instant.' },
});

app.use('/api', globalApiLimiter);
```

### Critères d'acceptation

- Une rafale de requêtes sur endpoint public reçoit 429.
- Les routes login/upload/payment conservent leurs limites spécifiques plus strictes.
- Les tests ne sont pas cassés en dev/test.
- Les logs permettent de voir IP, route, userId si connu, user-agent tronqué.

---

## P0.2 – Durcissement Nginx anti-saturation

### Problème

Express ne doit pas être la première et seule barrière.

### Objectif

Limiter les connexions et requêtes au niveau Nginx.

### Mesures recommandées

Dans le contexte `http` Nginx :

```nginx
limit_req_zone $binary_remote_addr zone=api_per_ip:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_per_ip:10m rate=2r/s;
limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;
```

Dans le serveur API :

```nginx
client_max_body_size 12m;
client_body_timeout 10s;
client_header_timeout 10s;
send_timeout 15s;
keepalive_timeout 15s;
reset_timedout_connection on;
server_tokens off;

location /api/auth/ {
  limit_req zone=auth_per_ip burst=10 nodelay;
  limit_conn conn_per_ip 10;
  proxy_pass http://127.0.0.1:8787;
}

location /api/ {
  limit_req zone=api_per_ip burst=40 nodelay;
  limit_conn conn_per_ip 30;
  proxy_pass http://127.0.0.1:8787;
}
```

### Notes

Les valeurs doivent être adaptées après observation du trafic réel. Commencer prudent, monitorer, puis ajuster.

### Critères d'acceptation

- Nginx refuse les rafales excessives avant Express.
- Les uploads légitimes fonctionnent.
- Les timeouts ne cassent pas les connexions mobiles normales.
- `nginx -t` est validé avant reload.

---

## P0.3 – WAF/CDN devant front et API

### Problème

Un VPS unique ne doit pas absorber directement tout trafic hostile.

### Objectif

Mettre une couche edge capable de filtrer, challenger et bloquer avant le VPS.

### Options

1. Cloudflare avec WAF, rate limiting, bot rules et Turnstile.
2. Protection Hostinger si suffisante.
3. Service spécialisé anti-DDoS si croissance forte.

### Recommandation

Cloudflare est la piste la plus cohérente pour combiner :

- DNS proxy ;
- WAF rules ;
- rate limiting edge ;
- bot fight/challenges ;
- Turnstile ;
- analytics ;
- règles d'urgence.

### Règles edge à créer

- Challenge ou block sur user-agents vides/suspects.
- Rate limit `/api/auth/*`.
- Rate limit `/api/forms/*`.
- Rate limit `/api/assistant/*`.
- Rate limit `/api/company-search*`.
- Bloquer méthodes HTTP inattendues.
- Bloquer pays uniquement en mode attaque et avec prudence.
- Bypass pour monitoring healthcheck autorisé si IP stable.

### Critères d'acceptation

- Le trafic API passe par l'edge.
- L'IP réelle reste disponible via `CF-Connecting-IP` ou équivalent.
- Express `trust proxy` est correctement configuré.
- Les logs distinguent IP edge / IP client.
- Un mode “under attack” est documenté.

---

## P0.4 – Turnstile sur contact, reset password, signup, login risqué

### Problème

Les formulaires publics sont des surfaces classiques de spam, brute-force et enumeration.

### Objectif

Ajouter une vérification anti-bot sobre, sans casser l'identité visuelle.

### Priorité d'intégration

1. Contact public.
2. Reset password.
3. Signup.
4. Login après échecs ou comportement suspect.
5. Assistant IA public selon coût/abus.

### Fichiers probables

- `src/pages/...` ou composants formulaire auth/contact.
- `server/index.js` ou routes auth/forms.
- `server/security/turnstile.js` à créer.
- `.env.example` à compléter avec noms de variables, sans secrets.

### Critères d'acceptation

- Les formulaires protégés refusent un token absent/invalide en prod.
- Le message d'erreur reste sobre.
- Le design n'est pas altéré.
- Le site fonctionne en dev avec `TURNSTILE_ENABLED=false`.
- La politique de confidentialité mentionne le fournisseur si nécessaire.

---

## P0.5 – Lockout progressif persistant par compte

### Problème

Le compteur actuel en mémoire process disparaît au restart et ne protège pas bien contre multi-instances.

### Objectif

Ajouter une protection persistante contre credential stuffing.

### Modèle recommandé

Table ou store : `auth_attempts` / `security_events`.

Champs :

- id ;
- email hashé ou normalisé ;
- ip hashée ou partiellement masquée ;
- user_agent_hash ;
- success/failure ;
- reason ;
- created_at ;
- lock_until ;
- risk_score.

### Politique

- 5 échecs sur un compte en 15 min : délai progressif.
- 10 échecs : lock temporaire 15 min.
- Échecs massifs depuis une IP : IP cooldown.
- Ne jamais révéler si l'email existe.

### Message utilisateur

```text
Si ces identifiants correspondent à un compte, vous pourrez réessayer dans quelques instants ou utiliser la récupération de mot de passe.
```

### Critères d'acceptation

- Redémarrage PM2 ne réinitialise pas les compteurs critiques.
- Les comptes admin/ops sont protégés plus fortement.
- Les logs alertent en cas de pic d'échecs.

---

## P0.6 – MFA obligatoire pour rôles internes

### Problème

Les comptes internes donnent accès à des données sensibles.

### Objectif

Imposer MFA aux rôles : `ADMIN`, `OPS`, `FORMALISTE`.

### Comportement attendu

- Si rôle interne et MFA non configuré : forcer enrollment avant accès dashboard ops.
- Si MFA pending : bloquer toutes routes métier sensibles.
- Recovery codes obligatoires.
- Email de notification à l'activation/désactivation MFA.

### Critères d'acceptation

- Un compte `ADMIN` sans MFA ne peut pas accéder aux routes ops.
- Un token MFA pending ne passe pas `requireAuth` métier.
- Les tests auth couvrent le cas.

---

## P0.7 – Vérification stricte de tous les webhooks

### Problème

Des commentaires indiquent possiblement une vérification HMAC à venir sur certains handlers.

### Objectif

Auditer tous les webhooks et refuser tout webhook non signé ou non vérifiable.

### Actions

- Inventorier tous les endpoints `/api/webhooks/*`.
- Vérifier signature provider.
- Vérifier timestamp si disponible.
- Empêcher replay via idempotency/event id.
- Logguer sans payload sensible.
- Répondre 2xx seulement si événement traité ou ignoré idempotemment.

### Critères d'acceptation

- Un webhook sans signature valide est rejeté.
- Un webhook dupliqué ne retrigger pas une action métier.
- Aucun statut paiement/signature ne dépend d'un payload non vérifié.

---

## P0.8 – Audit IDOR automatisé

### Problème

Les routes dossiers/documents doivent toujours vérifier le propriétaire.

### Objectif

Créer des tests automatisés pour empêcher accès horizontal.

### Tests nécessaires

- User A crée/possède dossier A.
- User B tente `GET /api/dossiers/A`.
- User B tente document de A.
- User B tente update statut ou upload sur A.
- User B tente URL signée si non autorisé.

Résultat attendu : 403 ou 404 générique.

### Critères d'acceptation

- Les tests échouent si une route oublie `userId`.
- Les erreurs ne révèlent pas l'existence du dossier.

---

## P0.9 – Protection upload bombing

### Problème

PDF 10 Mo x 30/10min peut suffire à saturer l'analyse PDF.

### Objectif

Limiter les abus sans gêner l'utilisateur légitime.

### Mesures

- Conserver limite taille fichier.
- Ajouter limite par utilisateur authentifié.
- Ajouter limite par dossier.
- Ajouter limite cumulative journalière.
- Mettre analyse PDF en job async si coûteuse.
- Timeout strict parser PDF.
- Refuser PDF trop complexe ou suspect.
- Nettoyer fichiers temporaires.

### Critères d'acceptation

- Un utilisateur ne peut pas envoyer 100 fichiers en boucle.
- Un PDF malformé ne crash pas le process.
- Les erreurs sont propres et non techniques.

---

## P0.10 – Logs d'audit minimum viables

### Problème

Il faut pouvoir comprendre une attaque ou fuite après coup.

### Objectif

Logger les événements sécurité utiles sans exposer de données sensibles.

### Événements à journaliser

- login success/failure ;
- MFA challenge success/failure ;
- reset password request ;
- account lockout ;
- accès dossier ;
- téléchargement document ;
- upload document ;
- génération URL signée ;
- action ops/admin ;
- webhook rejeté ;
- rate limit déclenché ;
- Turnstile failure ;
- changement email/mot de passe/MFA.

### Données à éviter

- mot de passe ;
- token ;
- refresh token ;
- secret ;
- document brut ;
- payload complet webhook ;
- email complet si hash suffisant ;
- URL signée S3 complète.

### Critères d'acceptation

- Les logs permettent de reconstituer une chronologie.
- Les logs ne contiennent pas de secret.
- Les logs sont exploitables par alerting.

---

## 6. Mesures P1 – Renforcement sérieux sur 1 à 3 mois

## P1.1 – Rate limit distribué Redis ou Supabase

### Objectif

Remplacer les limites mémoire par un store partagé.

### Pourquoi

Si PM2 redémarre ou si plusieurs instances sont ajoutées, les compteurs mémoire perdent en efficacité.

### Recommandation

- Redis managé si possible.
- Sinon Supabase pour certains compteurs persistants à faible volume.
- Conserver express-rate-limit mais avec store adapté.

---

## P1.2 – CSP stricte

### Objectif

Réduire fortement le risque XSS.

### Politique progressive

Commencer par `Content-Security-Policy-Report-Only`, analyser, puis passer en enforcement.

Exemple cible à adapter :

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.greffio.willentreprises.com https://*.supabase.co;
  frame-src https://challenges.cloudflare.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

À ajuster selon SignWell, PSP, analytics, S3, etc.

---

## P1.3 – Permissions-Policy

Ajouter :

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
```

Adapter si une fonctionnalité légitime nécessite caméra ou paiement browser API.

---

## P1.4 – Security headers complets

Vérifier :

- `Strict-Transport-Security` ;
- `X-Content-Type-Options: nosniff` ;
- `X-Frame-Options` ou CSP `frame-ancestors`; 
- `Referrer-Policy: strict-origin-when-cross-origin` ;
- `Cross-Origin-Opener-Policy` si compatible ;
- `Cache-Control: no-store` sur API ;
- pas de stack trace prod.

---

## P1.5 – Secrets scanning CI

### Objectif

Éviter qu'une clé soit committée.

### Actions

- Ajouter `gitleaks` ou équivalent en CI.
- Ajouter `npm audit` ou outil SCA.
- Bloquer PR en cas de secret critique.
- Documenter rotation si secret leak.

---

## P1.6 – Sentry front/back sans PII

### Objectif

Détecter les erreurs rapidement.

### Contraintes

- Scrubbing PII.
- Pas de tokens.
- Pas d'URL signée.
- Pas de payload document.
- Environnements séparés staging/prod.

---

## P1.7 – Alertes sécurité

Créer des alertes sur :

- pic 401 ;
- pic 403 ;
- pic 429 ;
- pic 500 ;
- échecs login massifs ;
- webhook invalides ;
- uploads échoués ;
- CPU > 85 % ;
- RAM > 85 % ;
- disque > 80 % ;
- latence API p95 anormale ;
- coût OpenAI/assistant anormal.

---

## P1.8 – Protection assistant IA

### Risques

- coût excessif ;
- spam ;
- prompt injection ;
- abus volumétrique ;
- fuite de données si contexte mal filtré.

### Mesures

- Rate limit par IP et par compte.
- Quota journalier.
- Maximum tokens.
- Refus d'actions sensibles sans auth.
- Ne jamais injecter documents client sans autorisation stricte.
- Logs sans contenu sensible.
- Turnstile si endpoint public.

---

## P1.9 – S3 hardening

### Actions

- Bucket non public.
- Accès uniquement via IAM minimal.
- URLs signées TTL court.
- Pas de listing bucket.
- Chiffrement activé.
- Lifecycle pour fichiers temporaires.
- Logs accès si possible.
- Rotation clés IAM.

---

## P1.10 – Backup et restauration testée

### Objectif

Une sauvegarde non testée n'est pas une sauvegarde.

### Actions

- Backups DB automatiques.
- Export chiffré.
- Test restore trimestriel.
- Sauvegarde config Nginx.
- Sauvegarde `.env` via coffre sécurisé, pas dans repo.
- Documentation RTO/RPO.

---

## 7. Mesures P2 – Maturité sécurité long terme

### P2.1 – SIEM léger

Centraliser les logs dans un outil consultable : Grafana Loki, Datadog, Better Stack, ELK ou autre.

### P2.2 – OWASP ZAP en CI

Scanner staging régulièrement.

### P2.3 – Nuclei templates défensifs

Scanner ses propres endpoints avec templates sûrs.

### P2.4 – Play Integrity API Android

Détecter environnements Android compromis, sans bloquer abusivement les utilisateurs.

### P2.5 – Certificate pinning optionnel

À considérer uniquement si l'équipe accepte la complexité opérationnelle.

### P2.6 – Bug bounty privé

À envisager quand la surface est stabilisée.

### P2.7 – Second VPS / haute disponibilité

Préparer architecture multi-instance si trafic et budget le justifient.

---

## 8. Plan d'action Cursor par lots

## Lot 1 – Sécurité applicative immédiate

### Objectif

Réduire les risques d'abus simples sans dépendance infra lourde.

### Actions

1. Ajouter `globalApiLimiter` sur `/api/*`.
2. Ajouter logs 429 structurés.
3. Vérifier que tous les limiters existants sont appliqués avant routes sensibles.
4. Ajouter tests sur rate limit auth/contact/assistant.
5. Ajouter `.env.example` variables de sécurité manquantes.

### Fichiers probables

- `server/index.js`
- `server/utils/structuredLog.js`
- `tests/security-rate-limit.test.js`
- `.env.example`

### Vérifications

- `npm test`
- tests manuels curl rafales
- vérifier réponses JSON
- vérifier que dev n'est pas pénalisé

---

## Lot 2 – Turnstile sobre

### Objectif

Ajouter anti-bot discret sur actions publiques.

### Actions

1. Créer `server/security/turnstile.js`.
2. Ajouter middleware `requireTurnstile({ action })`.
3. Intégrer au contact.
4. Intégrer au reset password.
5. Intégrer au signup.
6. Intégrer au login seulement après risque élevé ou via flag.
7. Ajouter composant frontend minimal.
8. Mettre à jour politique confidentialité si fournisseur activé.

### Fichiers probables

- `server/security/turnstile.js`
- `server/routes/auth*.js`
- `server/routes/forms*.js`
- `src/components/security/TurnstileWidget.jsx`
- pages auth/contact
- `.env.example`

### Vérifications

- token absent refusé en prod mode.
- token invalide refusé.
- dev peut désactiver via env.
- design sobre.

---

## Lot 3 – Auth brute-force durable

### Objectif

Passer de mémoire process à persistance.

### Actions

1. Créer table migration sécurité.
2. Normaliser email.
3. Enregistrer échecs/succès.
4. Ajouter lockout progressif.
5. Ajouter tests.
6. Ne jamais révéler existence du compte.

### Fichiers probables

- `supabase/migrations/*security_auth_attempts*.sql`
- `server/authStore.js`
- `server/routes/auth*.js`
- `server/security/authRisk.js`
- `tests/auth-bruteforce.test.js`

---

## Lot 4 – Nginx hardening documenté

### Objectif

Donner à l'ops un fichier prêt à appliquer.

### Actions

1. Créer `docs/security/NGINX_HARDENING_GREFFIO.md`.
2. Ajouter snippets `limit_req`, `limit_conn`, timeouts.
3. Ajouter procédure `nginx -t` puis reload.
4. Ajouter rollback.
5. Ajouter valeurs initiales prudentes.

---

## Lot 5 – Webhook audit

### Objectif

S'assurer qu'aucun webhook ne modifie un état sans signature.

### Actions

1. Lister endpoints webhooks.
2. Vérifier chaque provider.
3. Ajouter tests signature invalide.
4. Ajouter idempotency anti-replay.
5. Documenter statut.

---

## Lot 6 – IDOR tests

### Objectif

Empêcher régression d'autorisation.

### Actions

1. Créer fixtures user A/user B.
2. Tester lecture dossier croisée.
3. Tester documents croisés.
4. Tester ops réservés.
5. Tester MFA pending.

---

## Lot 7 – Runbooks incident

### Objectif

Préparer la réaction en cas d'attaque.

### Documents à créer

- `docs/security/RUNBOOK_DDOS.md`
- `docs/security/RUNBOOK_CREDENTIAL_STUFFING.md`
- `docs/security/RUNBOOK_SECRET_LEAK.md`
- `docs/security/RUNBOOK_UPLOAD_BOMBING.md`
- `docs/security/RUNBOOK_WEBHOOK_ABUSE.md`

---

## 9. Runbook incident – attaque DDoS en cours

### Symptômes

- API lente ou indisponible.
- CPU/RAM VPS élevés.
- Pic 429/499/502/504.
- Beaucoup de requêtes depuis IPs/user-agents suspects.
- PM2 redémarre.
- Supabase ou OpenAI subissent un pic.

### Réponse immédiate

1. Ne pas paniquer, ne pas modifier secrets.
2. Vérifier health API.
3. Vérifier PM2 : CPU, RAM, restarts.
4. Vérifier logs Nginx : top IP, top routes.
5. Activer mode WAF/Under Attack si disponible.
6. Augmenter temporairement restrictions `/api/auth`, `/api/assistant`, `/api/company-search`.
7. Bloquer IPs évidentes à l'edge, pas seulement sur VPS.
8. Réduire ou désactiver temporairement endpoints coûteux publics.
9. Afficher page maintenance si nécessaire.
10. Documenter heure début/fin, impact, mesures.

### Commandes utiles à documenter

```bash
pm2 status
pm2 logs greffio-api --lines 100
sudo tail -n 200 /var/log/nginx/access.log
sudo tail -n 200 /var/log/nginx/error.log
sudo nginx -t
sudo systemctl reload nginx
```

### Après incident

- Export logs.
- Identifier routes ciblées.
- Ajouter règle WAF durable.
- Ajuster rate limits.
- Rédiger post-mortem.

---

## 10. Runbook – credential stuffing

### Symptômes

- Pic login failures.
- Beaucoup d'emails différents.
- IPs multiples.
- User-agent automatisé.
- Demandes reset password massives.

### Réponse

1. Activer Turnstile obligatoire sur login.
2. Réduire auth limiter temporairement.
3. Activer lockout progressif.
4. Forcer MFA pour rôles internes.
5. Bloquer IPs ou ASN suspects via WAF.
6. Surveiller login success après nombreux échecs.
7. Prévenir utilisateurs si compromission confirmée.

---

## 11. Runbook – fuite de secret

### Réponse immédiate

1. Identifier le secret exposé.
2. Révoquer/rotater immédiatement chez le fournisseur.
3. Remplacer dans `.env` prod via accès sécurisé.
4. Redémarrer PM2 si nécessaire.
5. Invalider sessions si JWT/refresh concerné.
6. Vérifier logs d'utilisation anormale.
7. Purger secret du git history si committé.
8. Ajouter règle gitleaks.
9. Documenter incident.

---

## 12. Checklists techniques

### Checklist sécurité Express

- [ ] `helmet` activé.
- [ ] CORS strict prod.
- [ ] `trust proxy` correctement configuré.
- [ ] API `no-store`.
- [ ] Global API rate limit.
- [ ] Limiters spécifiques auth/upload/payment/assistant.
- [ ] JSON body size limitée.
- [ ] Erreurs prod sans stack trace.
- [ ] Validation Zod sur entrées.
- [ ] Webhooks signés.
- [ ] Logs PII-safe.

### Checklist Nginx

- [ ] TLS valide.
- [ ] `server_tokens off`.
- [ ] `limit_req` API.
- [ ] `limit_conn`.
- [ ] timeouts anti-slowloris.
- [ ] `client_max_body_size` cohérent.
- [ ] logs activés.
- [ ] reload testé.
- [ ] rollback documenté.

### Checklist anti-bot

- [ ] Turnstile ou équivalent sur contact.
- [ ] Turnstile sur reset password.
- [ ] Turnstile sur signup.
- [ ] Login challenge adaptatif.
- [ ] Assistant protégé par quota.
- [ ] Recherche publique protégée par rate limit.
- [ ] Messages sobres.
- [ ] Politique confidentialité mise à jour.

### Checklist données

- [ ] S3 non public.
- [ ] URLs signées courtes.
- [ ] RLS Supabase validée.
- [ ] Tests IDOR.
- [ ] Pas de PII dans logs.
- [ ] Backups testés.
- [ ] Suppression compte/document maîtrisée.

---

## 13. Critères de succès mesurables

### Sécurité

- 0 secret dans le repo.
- 0 route dossier sensible sans auth/ownership check.
- 100 % webhooks critiques vérifiés.
- MFA obligatoire pour rôles internes.
- Aucun statut sensible modifiable depuis client seul.

### Résilience

- API répond sous attaque légère avec 429 contrôlés.
- Nginx absorbe les rafales simples.
- PM2 ne redémarre pas sous upload malformé.
- Healthcheck externe stable.

### UX

- Pas de CAPTCHA visible sur navigation normale.
- Challenge uniquement sur actions sensibles ou comportement suspect.
- Formulaires restent sobres et cohérents.
- Messages d'erreur clairs sans anxiété.

### Observabilité

- Alertes sur pic 401/403/429/500.
- Alertes CPU/RAM/disque.
- Logs exploitables en incident.
- Post-mortem possible avec timeline.

---

## 14. Messages utilisateur recommandés

### Rate limit

```text
Trop de tentatives ont été détectées. Réessayez dans quelques instants.
```

### CAPTCHA expiré

```text
La vérification de sécurité a expiré. Merci de réessayer.
```

### Login échoué

```text
Identifiants invalides ou tentative temporairement limitée. Vérifiez vos informations ou réessayez plus tard.
```

### Upload refusé

```text
Ce document ne peut pas être traité. Vérifiez le format PDF et réessayez.
```

### Maintenance attaque

```text
Greffio applique actuellement une protection renforcée. Certains accès peuvent être temporairement ralentis. Vos données restent protégées.
```

---

## 15. Anti-patterns interdits

Cursor ne doit pas :

- Ajouter reCAPTCHA visible partout sans réflexion.
- Ajouter une popup de sécurité intrusive.
- Modifier l'identité visuelle de Greffio.
- Ajouter du rouge anxiogène ou des messages alarmistes.
- Révéler si un email existe au login/reset.
- Logger des mots de passe ou tokens.
- Mettre un secret dans `VITE_*`.
- Désactiver CORS pour résoudre un bug.
- Passer `Access-Control-Allow-Origin: *` en prod.
- Marquer un paiement/signature validé sans webhook vérifié.
- Faire confiance à un `userId` envoyé par le client.
- Supprimer les protections existantes pour faciliter un test.
- Ajouter un fournisseur externe sans documentation RGPD/confidentialité.
- Bloquer tous les pays non-FR par défaut sans preuve.
- Faire des règles si strictes qu'elles cassent les utilisateurs mobiles.

---

## 16. Prompt maître à coller dans Cursor

```text
Tu es Cursor, assistant de développement senior spécialisé en sécurité applicative, Node.js/Express, React, Nginx, anti-abus, anti-DDoS, SaaS français et protection de données sensibles.

Lis intégralement le fichier `GREFFIO_SECURITY_CONTEXT_CURSOR_GUARDS.md` avant toute modification.

Contexte : Greffio est une plateforme SaaS française de formalités d'entreprise. Elle manipule des données sensibles, documents, dossiers clients, auth, webhooks, paiement, signature et intégrations tierces.

Mission : proposer puis implémenter progressivement des garde-fous de sécurité contre DDoS, brute-force, credential stuffing, spam, scraping, upload bombing, IDOR, fuite de secrets, webhooks forgés et erreurs de configuration.

Contraintes absolues :
- Ne modifie pas l'identité visuelle globale de Greffio.
- N'ajoute pas de CAPTCHA visible partout.
- Préfère une protection anti-bot invisible/adaptative, idéalement Cloudflare Turnstile.
- Ne demande jamais de secrets.
- Ne mets jamais de secret dans le frontend, dans Git ou dans `.env.example` avec une vraie valeur.
- Ne désactive pas CORS, Helmet, auth, MFA ou rate limits existants.
- Ne fais pas confiance aux IDs envoyés par le client.
- Ne révèle pas si un email existe.
- Ne loggue jamais tokens, mots de passe, documents, payloads sensibles ou URLs signées complètes.
- Toute protection doit être compatible avec l'UX premium sobre de Greffio.

Ordre de travail recommandé :
1. Audit du repo : routes publiques, routes auth, routes upload, webhooks, middlewares globaux.
2. Lot P0.1 : ajouter ou vérifier un rate limit global `/api/*`.
3. Lot P0.2 : préparer documentation Nginx hardening.
4. Lot P0.3 : ajouter Turnstile de manière sobre sur contact/reset/signup/login risqué.
5. Lot P0.4 : renforcer brute-force avec lockout progressif persistant.
6. Lot P0.5 : auditer webhooks et IDOR.
7. Lot P1 : CSP, logs d'audit, Sentry sans PII, alertes, tests sécurité.

Avant de coder, fournis :
- fichiers concernés ;
- changements prévus ;
- risques ;
- ordre d'intervention ;
- tests manuels et automatisés ;
- rollback.

Quand tu codes :
- fais des changements petits, propres, testables ;
- ajoute des tests quand possible ;
- respecte Node ESM/Express existant ;
- garde les messages utilisateur sobres ;
- mets les flags en variables d'environnement ;
- documente les étapes infra sans supposer accès direct au VPS.

À la fin de chaque lot, fournis :
1. Résumé.
2. Fichiers modifiés.
3. Tests effectués.
4. Points de vigilance.
5. Prochaine étape recommandée.

Commence par analyser le repo et proposer le premier lot P0 le plus sûr : rate limit global API + préparation anti-bot Turnstile sans changement visuel majeur.
```

---

## 17. Variables d'environnement à prévoir

Ne jamais remplir avec de vraies valeurs dans le repo.

```env
# Anti-bot
TURNSTILE_ENABLED=false
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_FAIL_OPEN=false
TURNSTILE_REQUIRED_ON_CONTACT=true
TURNSTILE_REQUIRED_ON_SIGNUP=true
TURNSTILE_REQUIRED_ON_RESET_PASSWORD=true
TURNSTILE_REQUIRED_ON_LOGIN_RISKY=true

# Rate limiting
GLOBAL_API_RATE_LIMIT_WINDOW_MS=60000
GLOBAL_API_RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=30
UPLOAD_RATE_LIMIT_WINDOW_MS=600000
UPLOAD_RATE_LIMIT_MAX=30
ASSISTANT_RATE_LIMIT_WINDOW_MS=600000
ASSISTANT_RATE_LIMIT_MAX=60

# Security monitoring
SECURITY_ALERTS_ENABLED=true
SECURITY_ALERT_EMAIL=
SENTRY_DSN_BACKEND=
SENTRY_DSN_FRONTEND=

# Emergency mode
SECURITY_UNDER_ATTACK_MODE=false
DISABLE_PUBLIC_ASSISTANT_TEMPORARILY=false
STRICT_AUTH_CHALLENGE_MODE=false
```

---

## 18. Notes finales pour Cursor

La bonne sécurité Greffio ne doit pas se voir partout. Elle doit être ressentie par l'utilisateur comme une plateforme fiable, stable, calme et professionnelle.

Le meilleur résultat est :

- les bots sont ralentis ;
- les attaques simples sont bloquées ;
- les attaques sérieuses sont détectées vite ;
- les utilisateurs légitimes ne sont presque jamais gênés ;
- l'identité Greffio reste intacte ;
- l'équipe peut réagir avec un runbook clair ;
- chaque mesure est testable, documentée et réversible.

