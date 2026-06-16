# Runbook – Restaurer greffio.willentreprises.com (Hostinger DNS)

## Symptôme

Chrome affiche `DNS_PROBE_FINISHED_NXDOMAIN` sur `greffio.willentreprises.com`.

Ce n'est **pas** un bug React/Express : le sous-domaine `greffio` n'a **aucun enregistrement DNS**.

## État actuel (juin 2026, vérifié 2026-06-08)

- Cloudflare retiré – DNS géré chez **Hostinger**
- Nameservers : `ns1.dns-parking.com` / `ns2.dns-parking.com`
- **DNS authoritative + Google 8.8.8.8** : `greffio` et `api.greffio` résolvent correctement
- **DNS box/routeur local** (`192.168.11.254`) : peut encore renvoyer **NXDOMAIN** (cache négatif FAI)
- Frontend HTTPS : **200** (testé avec résolution forcée)
- API HTTPS : **health OK** sur `187.127.232.210`

> Contexte détaillé pour ChatGPT : `docs/contexte-incident-dns-greffio-chatgpt.md`  
> Script diagnostic local : `pwsh -File scripts/diagnose-dns-greffio.ps1`

## Action corrective – Hostinger hPanel

Connexion : [hPanel Hostinger](https://hpanel.hostinger.com) → **Noms de domaine** → `willentreprises.com` → **DNS / Serveurs de noms** → onglet **Enregistrements DNS**.

### 1. Frontend Greffio (obligatoire)

Dans **Sites web** → application Node Greffio → **Domaines**, vérifiez que `greffio.willentreprises.com` est bien connecté. Hostinger indique souvent la cible exacte.

Sinon, ajoutez manuellement :

| Type | Nom | Pointe vers | TTL |
|---|---|---|---|
| **A** | `greffio` | `147.79.119.94` | 14400 |
| **A** | `greffio` | `77.37.50.129` | 14400 |

> Si Hostinger affiche une autre IP ou un CNAME (`xxxx.hostingersite.com`), utilisez **leur** valeur.

### 2. API backend (obligatoire)

| Type | Nom | Pointe vers | TTL |
|---|---|---|---|
| **A** | `api.greffio` | `187.127.232.210` | 14400 |

### 3. SSL

- Frontend : certificat Hostinger (auto après propagation DNS)
- API : certificat Let's Encrypt sur le VPS (Nginx) – vérifier après propagation :

```bash
curl -I https://api.greffio.willentreprises.com/api/health
```

## Captcha – reCAPTCHA Google (plus de Cloudflare Turnstile)

Production configurée avec **reCAPTCHA v2** comme captcha principal :

- Clés dans `/opt/greffio/.env` sur le VPS (`RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`)
- `TURNSTILE_ENABLED=false`
- Script : `pwsh -File scripts/configure-security-vps.ps1`

Dans [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin), domaines autorisés :

- `greffio.willentreprises.com`
- `willentreprises.com`

## Vérification après propagation (5–30 min)

```powershell
nslookup greffio.willentreprises.com 8.8.8.8
nslookup api.greffio.willentreprises.com 8.8.8.8
```

Puis :

- `https://api.greffio.willentreprises.com/api/health`
- `https://greffio.willentreprises.com` (navigation privée)

## Ce qui n'est PAS la cause

- Le déploiement sécurité backend (rate limits, reCAPTCHA)
- Nginx VPS (corrigé le 2026-06-08, `nginx -t` OK)

## Rollback

1. Restaurer les enregistrements depuis l'historique Hostinger si suppression accidentelle.
2. Ne pas toucher au code applicatif pour un incident DNS pur.
