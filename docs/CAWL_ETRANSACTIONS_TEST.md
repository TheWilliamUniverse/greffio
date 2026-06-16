# CAWL – tests e-Transactions & Worldline Connect

Référence courte pour activer le paiement carte B2C Greffio. **Ne pas committer de secrets** – voir `.env` VPS ou back-office CAWL.

## Deux intégrations complémentaires

| Produit | Usage Greffio | Endpoint webhook |
|--------|----------------|------------------|
| **Up2pay e-Transactions** (hosted checkout HMAC) | Redirection carte `/api/payments/:id/cawl/checkout` | `POST\|GET /api/webhooks/cawl` |
| **Worldline Connect** (Payment API + webhooks signés) | Notifications API futures / back-office | `POST\|GET /api/webhooks/cawl/worldline` |

Les credentials du fichier back-office « Webhooks + API de paiement » (PSPID, webhook secret, API key ID) concernent **Worldline Connect**.  
Le checkout carte actuel utilise **PBX_SITE / PBX_RANG / PBX_IDENTIFIANT / CAWL_HMAC_KEY** depuis le back-office Vision e-Transactions.

## Variables d'environnement

```env
# Commun
CAWL_ENV=test
API_BASE_URL=https://api.greffio.willentreprises.com
APP_URL=https://greffio.willentreprises.com

# Worldline Connect (webhooks Payment API)
CAWL_PSPID=
CAWL_WEBHOOK_ID=
CAWL_WEBHOOK_SECRET=
CAWL_API_KEY_ID=

# e-Transactions hosted checkout (carte)
CAWL_PBX_SITE=
CAWL_PBX_RANG=
CAWL_PBX_IDENTIFIANT=
CAWL_HMAC_KEY=
CAWL_ETRANSACTIONS_CHECKOUT_PATH=/cgi/MYchoix_pagepaiement.cgi
CAWL_IPN_URL=https://api.greffio.willentreprises.com/api/webhooks/cawl
```

### Compte mutualisé Paybox recette (tests sans contrat dédié)

Document Verifone « Paramètres test » – **uniquement pour recette** :

| Variable | Valeur test mutualisée |
|----------|------------------------|
| `CAWL_PBX_SITE` | `1999888` |
| `CAWL_PBX_RANG` | `32` |
| `CAWL_PBX_IDENTIFIANT` | `110647233` |
| `CAWL_HMAC_KEY` | Clé hex 128 caractères documentée Paybox (onglet Informations back-office recette) |

Serveur recette : `recette-tpeweb.e-transactions.fr` (automatique si `CAWL_ENV=test`).

## Carte de test

| Champ | Valeur |
|-------|--------|
| Numéro | `1111222233334444` |
| CVV | `123` |
| Date | ex. `12/28` |

Source : `Readme.txt` de l'exemple PHP CAWL (`tmp/cawl-example/`).

## URLs à configurer côté CAWL

| Back-office | URL |
|-------------|-----|
| Worldline Connect → Webhooks | `https://api.greffio.willentreprises.com/api/webhooks/cawl/worldline` |
| Vision e-Transactions → IPN (`PBX_REPONDRE_A`) | `https://api.greffio.willentreprises.com/api/webhooks/cawl` |

## Flux checkout (e-Transactions)

1. `POST /api/payments` → `checkoutUrl` = `/api/payments/:id/cawl/checkout`
2. Page intermédiaire Greffio → POST auto-submit vers `recette-tpeweb.e-transactions.fr/cgi/MYchoix_pagepaiement.cgi`
3. Retour navigateur → `APP_URL/paiement/verification`
4. IPN serveur → `/api/webhooks/cawl` (réponse `OK`)

## Vérifications rapides

```bash
curl -fsS https://api.greffio.willentreprises.com/api/health
curl -s -o /dev/null -w "%{http_code}" -X POST https://api.greffio.willentreprises.com/api/webhooks/cawl/worldline
curl -s -o /dev/null -w "%{http_code}" -X POST https://api.greffio.willentreprises.com/api/webhooks/cawl
```

Attendu si configuré : `401` ou `400` sans payload valide – **pas** `503`.

## Tests unitaires

```bash
node --test server/payments/tests/cawlETransactions.test.js
node --test server/payments/tests/cawlWorldlineConnect.test.js
```

## Exemple PHP de référence

Extrait CAWL dans `tmp/cawl-example/exemple-integration.php_8ADqVo3/` :

- `formulaire_HMAC.php` – hosted checkout
- `Readme.txt` – carte test, FAQ IPN
- `testsign.php` – vérification signature IPN RSA
