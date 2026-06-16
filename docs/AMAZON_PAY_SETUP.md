# Amazon Pay – DÉSACTIVÉ (retrait juin 2026, voir docs/runbooks/AMAZON_PAY_RETRAIT_COMPLET_GREFFIO.md)
# Réactivation : restaurer depuis Git + docs/AMAZON_PAY_SETUP.md

# Amazon Pay Greffio

## Seller Central – Paramètres d'intégration

### Allowed return URL

```text
https://greffio.willentreprises.com/paiement/amazon-pay/retour
```

### JavaScript origin (Integration Central)

```text
https://greffio.willentreprises.com/
```

### URL IPN (notifications instantanées)

Dans **Paramètres > Paramètres d'intégration > Paramètres des notifications instantanées**, cliquer **Modifier** et renseigner :

```text
https://api.greffio.willentreprises.com/api/webhooks/amazon-pay
```

- HTTPS obligatoire en production
- L'endpoint répond `200 OK` immédiatement
- Les IPN `CHARGE` déclenchent une relecture serveur via l'API Amazon Pay
- La confirmation SNS initiale est acceptée automatiquement

## Variables serveur

Ne jamais exposer ces valeurs côté frontend. Elles doivent être configurées sur le VPS / Hostinger / environnement backend.

```bash
AMAZON_PAY_SANDBOX=false
AMAZON_PAY_MERCHANT_ID=<Merchant ID Amazon Pay>
AMAZON_PAY_CLIENT_ID=<Client ID / Store ID Amazon Pay>
AMAZON_PAY_STORE_ID=<Client ID si aucun Store ID séparé>
AMAZON_PAY_PUBLIC_KEY_ID=<Public Key ID Amazon Pay>
AMAZON_PAY_PRIVATE_KEY_PATH=/secure/path/AmazonPay_LIVE-....pem
AMAZON_PAY_ACCESS_KEY=<Access key>
AMAZON_PAY_SECRET_KEY=<Secret key>
AMAZON_PAY_LWA_SECRET_KEY=<LWA secret key>
AMAZON_PAY_STORE_NAME=Greffio
AMAZON_PAY_LEDGER_CURRENCY=EUR
AMAZON_PAY_CHECKOUT_LANGUAGE=fr_FR
AMAZON_PAY_SCRIPT_URL=https://static-eu.payments-amazon.com/checkout.js
```

La clé privée `.pem` doit rester hors dépôt Git. Copier le fichier sur le serveur avec des permissions restreintes, puis pointer `AMAZON_PAY_PRIVATE_KEY_PATH` vers ce fichier.

## Identité Greffio

Le payload Amazon Pay signé côté serveur utilise `merchantStoreName: Greffio` et une note acheteur `Paiement Greffio ...`.
