# Contexte Greffio – Intégrations API (référence ChatGPT / Cursor)

> **Usage** : document de référence pour les intégrations externes Greffio. **Ne jamais exposer de secrets dans le frontend versionné.**

---

## 1. Paiements B2C – Google Pay → CAWL

| Étape | Composant | Rôle |
|-------|-----------|------|
| 1 | `GooglePayCheckoutPanel` | Bouton Google Pay (web + mobile) |
| 2 | `POST /api/payments/google-pay` | Réception token Google Pay |
| 3 | `googlePayService.js` | Stockage paiement `provider: cawl`, `method: google_pay` |
| 4 | CAWL (à brancher) | Capture réelle du token |

### Variables d'environnement

```env
# Serveur
GOOGLE_PAY_API_KEY=          # Clé Google Cloud (Payments / Pay API)
GOOGLE_PAY_MERCHANT_ID=      # Console Google Pay Business
GOOGLE_PAY_MERCHANT_NAME=Greffio
GOOGLE_PAY_ENVIRONMENT=TEST  # ou PRODUCTION
GOOGLE_PAY_GATEWAY=cawl
GOOGLE_PAY_GATEWAY_MERCHANT_ID=

# Frontend (Vite)
VITE_GOOGLE_PAY_ENABLED=true
VITE_GOOGLE_PAY_MERCHANT_ID=
VITE_GOOGLE_PAY_ENVIRONMENT=TEST
VITE_GOOGLE_PAY_MERCHANT_NAME=Greffio

# CAWL (capture en aval)
CAWL_API_BASE_URL=
CAWL_API_KEY=
CAWL_MERCHANT_ID=
CAWL_WEBHOOK_SECRET=
```

### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/payments/google-pay/config` | Config publique merchant |
| POST | `/api/payments/google-pay` | Traitement paiement Google Pay |
| POST | `/api/webhooks/cawl` | Webhook confirmation CAWL |

**Mollie est retiré** du stack Greffio (plus de clés, webhooks ni mentions UI).

---

## 2. Paiements B2B – GoCardless

Prélèvement SEPA pour comptes professionnels. Inchangé.

```env
GOCARDLESS_ACCESS_TOKEN=
GOCARDLESS_WEBHOOK_SECRET=
```

---

## 3. Autres intégrations

| Service | Usage |
|---------|-------|
| Didit | Vérification identité |
| SignWell | Signature électronique |
| Brevo / Resend | Emails |
| reCAPTCHA | Anti-bot |
| AWS S3 | Documents |

Voir aussi `docs/contexte-generation-greffio-chatgpt.md` et `docs/contexte-securite-greffio-chatgpt.md`.

---

## 4. Déploiement VPS

Après mise à jour des variables sur le VPS (`/opt/greffio/.env`) :

```powershell
npm run build
pwsh -File scripts/deploy-backend-vps.ps1
```

Frontend Hostinger : push `main` → déploiement git automatique.
