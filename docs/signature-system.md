# Système de signature Greffio

## Provider par défaut

`greffio_internal` – signature électronique simple renforcée (SES).

SignWell : legacy, désactivé sauf `GREFFIO_SIGNATURE_PROVIDER=signwell` + clé API.

Yousign / Signaturit : prévus via abstraction provider (roadmap).

## Flux public `/signature/:token`

1. Ouverture lien → audit `link_opened`
2. Preview PDF + accusé de lecture
3. Adoption signature + consentement versionné (`greffio-ses-fr-v1.0`)
4. OTP email si `GREFFIO_SIGNATURE_REQUIRE_OTP=true`
5. Finalisation → estampillage PDF + certificat de preuve + timeline dossier
6. Téléchargement document signé + certificat

## Routes API

| Route | Rôle |
|-------|------|
| `GET /api/signature/public/:token` | Session publique |
| `GET /api/signature/public/:token/pdf` | Preview PDF |
| `POST /api/signature/public/:token/otp/send` | Envoi OTP |
| `POST /api/signature/public/:token/otp/verify` | Validation OTP |
| `POST /api/signature/public/:token/sign` | Finalisation |
| `GET /api/signature/public/:token/signed-document` | PDF signé |
| `GET /api/signature/public/:token/proof-certificate` | Certificat preuve |

## Tables

- `signature_requests` – demande + token hash + hashes SHA256
- `signatures` – enregistrement final
- `signature_audit_events` – audit trail structuré
- `signature_otps` – OTP hashés (jamais en clair)

## Migration

`server/migrations/024_signature_reinforced.sql`

## Variables d'environnement

```env
GREFFIO_SIGNATURE_PROVIDER=internal
GREFFIO_SIGNATURE_REQUIRE_OTP=false
GREFFIO_SIGNATURE_TOKEN_TTL_HOURS=72
```

## Fichiers clés

- `server/services/signature/finalizeInternalSignature.js`
- `server/services/signature/generateProofCertificatePdf.js`
- `server/routes/signaturePublicRoutes.js`
- `src/pages/SignaturePublicPage.jsx`
- `src/components/signature/SignatureOtpStep.jsx`

## Plan complet ChatGPT

Voir `docs/PLAN_SIGNATURE_ELECTRONIQUE_GREFFIO.md` (référence stratégique).
