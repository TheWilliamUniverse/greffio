# Contexte incident DNS – greffio.willentreprises.com (référence ChatGPT)

> **Usage** : coller ce fichier dans ChatGPT pour **diagnostiquer et résoudre** l’erreur Chrome `DNS_PROBE_FINISHED_NXDOMAIN` sur Greffio.
>
> **Code source de vérité** : repo `TheWilliamUniverse/greffio`. Ne pas inventer d’IP ou d’URL sans les vérifier.
>
> **Dernière investigation** : 2026-06-08 (diagnostic Cursor + tests live DNS/HTTP)

---

## 1. Symptôme utilisateur

- Navigateur (Chrome, Windows) : **« Ce site est inaccessible »**
- Code : **`DNS_PROBE_FINISHED_NXDOMAIN`**
- URL concernée : `https://greffio.willentreprises.com`
- URL API liée : `https://api.greffio.willentreprises.com`

L’utilisateur voit une page blanche / erreur DNS – **pas** une erreur applicative React (502, 503, CORS, etc.).

---

## 2. Architecture DNS attendue (état cible)

| FQDN | Rôle | Hébergement | IP / cible |
|------|------|-------------|------------|
| `willentreprises.com` | Site racine William | Hostinger | IPs Hostinger (variables) |
| `greffio.willentreprises.com` | Frontend SPA React (Vite) | Hostinger Node app (`hostinger:start`) | IPs Hostinger du site Greffio |
| `api.greffio.willentreprises.com` | API Express (PM2 `greffio-api`) | VPS Ubuntu `187.127.232.210` | A record → VPS |

**Nameservers actuels** (après retrait Cloudflare, reset Hostinger) :
- `ns1.dns-parking.com`
- `ns2.dns-parking.com`

> Ces NS « parking » sont **normaux** chez Hostinger après reset. Les enregistrements se gèrent dans hPanel → DNS.

**Frontend** : déployé par git push `main` → Hostinger rebuild (`npm run hostinger:build` + `hostinger:start`).

**Backend** : tarball SCP → `/opt/greffio` sur VPS. Health : `http://127.0.0.1:8787/api/health`.

---

## 3. Chronologie de l’incident

| Date | Événement |
|------|-----------|
| Avant juin 2026 | DNS géré chez **Cloudflare** (NS `mimi.ns.cloudflare.com`, `tate.ns.cloudflare.com`) |
| Incident | Suppression enregistrements Cloudflare → **NXDOMAIN global** sur `greffio.*` et `api.greffio.*` |
| Correctif infra | Nginx VPS corrigé (script `configure-nginx-vps.ps1` avait cassé `limit_req_zone`) |
| Décision user | Table rase Cloudflare → DNS **100 % Hostinger** + reCAPTCHA Google (plus Turnstile) |
| Import BIND | Fichier fourni avec IP `147.79.116.56` – **IP incorrecte** pour le frontend Greffio |
| 2026-06-08 ~15h | Enregistrements ajoutés/corrigés côté Hostinger ; authoritative DNS OK |

---

## 4. Diagnostic technique (2026-06-08) – RÉSULTATS CLÉS

### 4.1 DNS authoritative (source de vérité)

Interroger le NS autoritaire :

```powershell
nslookup greffio.willentreprises.com ns1.dns-parking.com
nslookup api.greffio.willentreprises.com ns1.dns-parking.com
```

**Résultat au moment du diagnostic** :

| FQDN | Statut | Valeurs |
|------|--------|---------|
| `greffio.willentreprises.com` | **OK** | `147.79.119.94`, `77.37.50.129` (+ AAAA IPv6 Hostinger) |
| `api.greffio.willentreprises.com` | **OK** | `187.127.232.210` |
| SOA serial | `2026060801` | TTL default 600 s |

→ **Les enregistrements DNS sont corrects sur les serveurs autoritaires Hostinger.**

### 4.2 DNS public (Google 8.8.8.8)

```powershell
nslookup greffio.willentreprises.com 8.8.8.8
nslookup api.greffio.willentreprises.com 8.8.8.8
```

**Résultat** : les deux FQDN résolvent correctement (propagation Google OK).

### 4.3 DNS local utilisateur (CAUSE du symptôme persistant)

```powershell
nslookup greffio.willentreprises.com
# Sans argument = DNS par défaut Windows
```

**Résultat observé** :
- Serveur DNS utilisé : **`192.168.11.254`** (box / routeur Free ou équivalent)
- Réponse : **`Non-existent domain`** (NXDOMAIN)

Même après `ipconfig /flushdns`, le routeur renvoie encore NXDOMAIN alors que 8.8.8.8 répond correctement.

**Conclusion** : ce n’est plus un problème d’enregistrements manquants chez Hostinger, mais un **cache DNS négatif** (ou résolveur amont lent) sur le **routeur / FAI**.

### 4.4 Tests HTTP (bypass DNS local)

```powershell
curl -sS --resolve greffio.willentreprises.com:443:147.79.119.94 -o NUL -w "%{http_code}" https://greffio.willentreprises.com/
curl -sS --resolve api.greffio.willentreprises.com:443:187.127.232.210 https://api.greffio.willentreprises.com/api/health
```

**Résultat** :
- Frontend Greffio : **HTTP 200**
- API health : **`{"ok":true,"service":"greffio-api",...}`**

→ **L’application fonctionne** dès que le DNS résout. Le blocage est **résolution DNS côté client**, pas code Greffio.

---

## 5. Erreurs commises pendant la résolution (leçons)

| Erreur | Impact | Correction |
|--------|--------|------------|
| IP frontend `147.79.116.56` dans le BIND | Mauvaise cible si importée seule | Utiliser les IP **affichées par Hostinger** pour le site Greffio : `147.79.119.94` + `77.37.50.129` |
| Suppression Cloudflare sans recréer les 2 A records | NXDOMAIN global plusieurs heures | Toujours recréer `greffio` ET `api.greffio` avant de couper l’ancien DNS |
| Tester uniquement avec le DNS du routeur | Faux négatif alors que 8.8.8.8 fonctionne | Toujours comparer : DNS local / 8.8.8.8 / NS autoritaire |
| Confondre NXDOMAIN et panne applicative | Perte de temps sur le code | `NXDOMAIN` = couche DNS uniquement |

---

## 6. Fichiers BIND corrigés (import Hostinger)

Chemin repo :
- `docs/runbooks/greffio-dns-import-hostinger-minimal.txt`
- `docs/runbooks/greffio-dns-import-hostinger.bind.txt`

Contenu validé (2026-06-08) :

```bind
$ORIGIN willentreprises.com.
$TTL 14400

greffio         IN      A       147.79.119.94
greffio         IN      A       77.37.50.129
api.greffio     IN      A       187.127.232.210
```

**Import hPanel** : ne **pas** cocher « Remplacez les enregistrements DNS existants » (préserver MX, TXT SPF/DKIM, etc.).

---

## 7. Plan de résolution – ordre strict

### Étape A – Vérifier que Hostinger a bien les enregistrements

hPanel → Noms de domaine → `willentreprises.com` → DNS :

| Type | Nom | Pointe vers |
|------|-----|-------------|
| A | `greffio` | `147.79.119.94` (et/ou `77.37.50.129`) |
| A | `api.greffio` | `187.127.232.210` |

Alternative : Sites web → application Greffio → Domaines → connecter `greffio.willentreprises.com` (Hostinger crée parfois les records automatiquement).

### Étape B – Vérifier propagation (3 résolveurs)

```powershell
nslookup greffio.willentreprises.com ns1.dns-parking.com
nslookup greffio.willentreprises.com 8.8.8.8
nslookup greffio.willentreprises.com 1.1.1.1
nslookup api.greffio.willentreprises.com 8.8.8.8
```

Si **autoritaire + 8.8.8.8 OK** mais **DNS local NXDOMAIN** → passer à l’étape C.

### Étape C – Débloquer immédiatement la machine de l’utilisateur

**Option 1 (recommandée)** – Changer DNS Windows :

1. Paramètres → Réseau → Wi-Fi → Propriétés du réseau
2. Modifier DNS → **Manuel**
3. IPv4 : DNS préféré `8.8.8.8`, alternatif `1.1.1.1`
4. `ipconfig /flushdns`
5. Redémarrer Chrome (ou navigation privée)

**Option 2** – Redémarrer la box / attendre 2–24 h (cache NXDOMAIN du FAI).

**Option 3** – Tester sur 4G (hors réseau box) pour confirmer.

### Étape D – Valider le site

```powershell
curl -I https://greffio.willentreprises.com
curl https://api.greffio.willentreprises.com/api/health
```

Navigateur : `https://greffio.willentreprises.com` en navigation privée.

### Étape E – Si NXDOMAIN persiste PARTOUT (même 8.8.8.8)

Alors seulement :
1. Re-vérifier hPanel (enregistrements supprimés ?)
2. Vérifier que le domaine n’a pas été repointé vers d’autres NS (Cloudflare résiduel ?)
3. Contacter support Hostinger avec SOA serial `2026060801`

---

## 8. Ce qui n’est PAS la cause

| Exclu | Preuve |
|-------|--------|
| Bug React / build frontend | HTTP 200 avec `--resolve` |
| API VPS down | `curl` health OK sur `187.127.232.210` |
| reCAPTCHA / sécurité P0/P1 | N’affecte pas la résolution DNS |
| Nginx cassé | Corrigé ; API répond en HTTPS |
| Certificat SSL | Erreur serait `ERR_CERT_*`, pas NXDOMAIN |

---

## 9. Variables & scripts utiles

| Élément | Valeur |
|---------|--------|
| VPS IP API | `187.127.232.210` |
| PM2 process | `greffio-api` |
| Chemin API | `/opt/greffio` |
| Deploy backend | `pwsh -File scripts/deploy-backend-vps.ps1` |
| Runbook DNS | `docs/runbooks/DNS_GREFFIO_RESTORE.md` |
| Smoke prod | `pwsh -File scripts/smoke-prod-greffio.ps1` |

**Frontend Hostinger env** :
```env
VITE_API_BASE_URL=https://api.greffio.willentreprises.com
VITE_APP_URL=https://greffio.willentreprises.com
```

---

## 10. Questions pour ChatGPT (raisonnement attendu)

Utiliser ce contexte pour répondre **sans supposer** :

1. **Pourquoi l’utilisateur voit encore NXDOMAIN alors que 8.8.8.8 résout ?**  
   → Expliquer cache DNS négatif routeur/FAI vs propagation normale.

2. **Faut-il remettre Cloudflare ?**  
   → Non obligatoire si Hostinger DNS est correct ; Cloudflare ajoute proxy/WAF mais n’est pas requis pour Greffio.

3. **L’IP `147.79.116.56` du premier BIND était-elle fausse ?**  
   → Oui pour ce tenant ; les IP Hostinger Greffio actuelles sont `147.79.119.94` / `77.37.50.129`.

4. **Sous-domaine `api.greffio` (3e niveau) est-il supporté ?**  
   → Oui chez Hostinger (A record nom `api.greffio` confirmé en authoritative).

5. **Checklist « site de nouveau en ligne »** pour l’utilisateur non technique ?

6. **Comment éviter la récidive** si on change encore de DNS provider ?

7. **Mobile / Play Store** : deep links `greffio.willentreprises.com` – impact si DNS down ?

---

## 11. Checklist utilisateur (copier-coller)

```
[ ] hPanel : A greffio → 147.79.119.94 (+ 77.37.50.129 si doublon Hostinger)
[ ] hPanel : A api.greffio → 187.127.232.210
[ ] nslookup greffio.willentreprises.com 8.8.8.8 → renvoie une IP (pas NXDOMAIN)
[ ] nslookup api.greffio.willentreprises.com 8.8.8.8 → 187.127.232.210
[ ] Windows : DNS manuel 8.8.8.8 + 1.1.1.1
[ ] ipconfig /flushdns
[ ] Chrome navigation privée → https://greffio.willentreprises.com charge
[ ] https://api.greffio.willentreprises.com/api/health → {"ok":true}
```

---

## 12. État au moment de la rédaction

| Composant | Statut |
|-----------|--------|
| DNS authoritative Hostinger | **OK** |
| DNS Google 8.8.8.8 | **OK** |
| DNS box utilisateur (192.168.11.254) | **NXDOMAIN (cache)** |
| Frontend HTTPS | **OK** (test `--resolve`) |
| API HTTPS | **OK** |
| Action user immédiate | Changer DNS Windows + flush cache |

---

*Document généré pour investigation incident DNS Greffio – à mettre à jour si les IP Hostinger changent (vérifier via nslookup authoritative).*
