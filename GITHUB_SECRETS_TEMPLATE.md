# GitHub Secrets Template (Actions)

Configurer ces secrets dans **Settings > Secrets and variables > Actions**.

## Backend / VPS (`backend-deploy.yml`)

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `MFA_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `DOCUMENT_STORAGE_DRIVER`
- `GOOGLE_PAY_API_KEY`
- `GOOGLE_PAY_MERCHANT_ID`
- `CAWL_API_KEY`
- `CAWL_WEBHOOK_SECRET`
- `FCM_SERVICE_ACCOUNT_JSON` (push mobile Android – aussi sur le VPS via `.env`)

## Android / Google Play (`mobile-artifacts.yml`)

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PATH` (ex. `release.keystore`)
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_UPLOAD_KEY_SHA256` (App Links – voir `ANDROID_PLAY_RELEASE.md`)
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `GOOGLE_PLAY_PACKAGE_NAME` (`com.greffio.app`)
- `GOOGLE_PLAY_TRACK` (`internal` | `alpha` | `beta` | `production`)
- `GOOGLE_SERVICES_JSON_BASE64` (contenu de `google-services.json`)

## iOS (plus tard)

- `APPLE_TEAM_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY`

## Optionnels

- `INSEE_API_TOKEN`
- `PAPPERS_API_TOKEN`
- `SENTRY_DSN_BACKEND`
- `SENTRY_DSN_FRONTEND`

## Security hardening to enable

- GitHub Advanced Security: **Secret Scanning = ON**
- Push Protection: **ON**

Voir aussi : `ANDROID_PLAY_RELEASE.md`, `MOBILE_RELEASE_PLAN.md`
