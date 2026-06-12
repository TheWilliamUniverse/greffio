# Amazon Pay Greffio

## URL autorisée

Allowed return URL:

```text
https://greffio.willentreprises.com/paiement/amazon-pay/retour
```

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
