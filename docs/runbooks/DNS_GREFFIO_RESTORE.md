# Runbook — Restaurer greffio.willentreprises.com (NXDOMAIN)

## Symptôme

Chrome affiche `DNS_PROBE_FINISHED_NXDOMAIN` sur `greffio.willentreprises.com`.

Ce n'est **pas** un bug applicatif React/Express : le nom de domaine n'existe plus dans le DNS public.

## Diagnostic rapide

```bash
nslookup greffio.willentreprises.com 8.8.8.8
nslookup api.greffio.willentreprises.com 8.8.8.8
```

Si les deux renvoient **Non-existent domain** → enregistrements DNS manquants chez Cloudflare.

Le domaine racine `willentreprises.com` utilise les nameservers Cloudflare (`mimi.ns.cloudflare.com`, `tate.ns.cloudflare.com`).

## État backend (VPS)

- API locale OK : `curl http://127.0.0.1:8787/api/health` sur `187.127.232.210`
- Nginx : vérifier `nginx -t` (ne pas réappliquer le script nginx cassé sans backup)

## Action corrective — Cloudflare DNS

Connexion : [Cloudflare Dashboard](https://dash.cloudflare.com) → zone `willentreprises.com` → **DNS** → **Records**.

### 1. API (obligatoire)

| Type | Nom | Contenu | Proxy |
|---|---|---|---|
| **A** | `api.greffio` | `187.127.232.210` | DNS only (gris) recommandé pour webhooks |

### 2. Frontend (obligatoire)

Récupérer la cible dans **Hostinger** → Sites → Greffio → Domaines / DNS :

- soit **CNAME** `greffio` → hostname Hostinger (ex. `xxxx.hostingersite.com`)
- soit **A** `greffio` → IP fournie par Hostinger pour l'hébergement Node

| Type | Nom | Contenu | Proxy |
|---|---|---|---|
| **CNAME** ou **A** | `greffio` | *(valeur Hostinger)* | Proxied (orange) possible |

Optionnel : même enregistrement pour `www.greffio` si utilisé.

## Vérification après propagation (5–30 min)

```bash
nslookup greffio.willentreprises.com 8.8.8.8
nslookup api.greffio.willentreprises.com 8.8.8.8
curl -I https://api.greffio.willentreprises.com/api/health
```

Puis ouvrir `https://greffio.willentreprises.com` en navigation privée.

## Ce qui a cassé Nginx (corrigé)

Le script `configure-nginx-vps.ps1` avait injecté des lignes `limit_req_zone` **sans** `$binary_remote_addr`. Correction appliquée sur le VPS le 2026-06-08.

Avant tout durcissement Nginx futur :

```bash
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
nginx -t && systemctl reload nginx
```

## Rollback si besoin

1. Restaurer les enregistrements DNS depuis l'historique Cloudflare (Audit log) si suppression récente.
2. Ne pas toucher au code Greffio pour ce type d'incident.
