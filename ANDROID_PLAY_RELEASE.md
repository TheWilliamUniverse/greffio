# Release Google Play – Greffio Android

Package : `com.greffio.app`  
Nom store : **Greffio**  
Sous-titre : Formalités d'entreprise simplifiées

---

## 1. Secrets GitHub Actions (obligatoires pour AAB signé)

Configurer dans **Settings → Secrets and variables → Actions** :

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Fichier `.keystore` / `.jks` encodé en base64 |
| `ANDROID_KEYSTORE_PATH` | ex. `release.keystore` |
| `ANDROID_STORE_PASSWORD` | Mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | Alias de la clé upload |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé |
| `ANDROID_UPLOAD_KEY_SHA256` | Empreinte SHA-256 de la clé upload (App Links) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | JSON compte de service Play Console |
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.greffio.app` |
| `GOOGLE_PLAY_TRACK` | `internal`, `alpha`, `beta`, ou `production` (défaut : `internal`) |
| `GOOGLE_SERVICES_JSON_BASE64` | `google-services.json` Firebase encodé base64 (push FCM) |
| `FCM_SERVICE_ACCOUNT_JSON` | JSON compte de service Firebase (envoi push backend VPS) |

### Générer ANDROID_KEYSTORE_BASE64 (PowerShell)

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\chemin\vers\release.keystore"))
```

### Obtenir ANDROID_UPLOAD_KEY_SHA256

```powershell
keytool -list -v -keystore release.keystore -alias VOTRE_ALIAS
```

Copier la ligne **SHA256** (format `AA:BB:CC:...`).

---

## 2. Firebase / FCM (push Android)

1. Créer un projet Firebase
2. Ajouter une app Android `com.greffio.app`
3. Télécharger `google-services.json` → secret `GOOGLE_SERVICES_JSON_BASE64`
4. Compte de service Firebase → secret VPS `FCM_SERVICE_ACCOUNT_JSON`

---

## 3. Déclencher un build AAB

L’app Android de production est **remote-first**. Un changement React/CSS
simple doit d’abord être déployé côté web, puis testé dans l’app réelle.

Déclencher un AAB seulement si le changement touche le natif :
`android/**`, Capacitor, permissions, plugins, icônes, splash, deep links,
versionCode/versionName ou politique Play Store.

Push sur `main` ou **Actions → Mobile Artifacts → Run workflow** pour produire
un build signé.

Artifacts produits :
- `app-release-apk`
- `app-release-aab`

Si les secrets Play sont configurés, upload automatique sur la piste définie par `GOOGLE_PLAY_TRACK`.

---

## 4. App Links (deep links)

Le script `scripts/patch-well-known.js` injecte l'empreinte SHA256 avant build si `ANDROID_UPLOAD_KEY_SHA256` est défini.

Vérifier après déploiement frontend :
- https://greffio.willentreprises.com/.well-known/assetlinks.json

---

## 5. Checklist Play Console avant publication

- [ ] Politique confidentialité : https://greffio.willentreprises.com/confidentialite
- [ ] Suppression compte : https://greffio.willentreprises.com/suppression-compte
- [ ] Contact : support@willentreprises.com
- [ ] Captures d'écran + icône 512px
- [ ] Classification contenu + questionnaire sécurité des données
- [ ] Justification permission caméra (envoi documents PDF)
- [ ] Justification notifications push (alertes dossier)

---

## 6. Commandes locales

```bash
npm run mobile:build:remote
npx cap open android
```

Build release local (avec `android/keystore.properties`) :

```bash
cd android && ./gradlew bundleRelease
```

AAB : `android/app/build/outputs/bundle/release/app-release.aab`

---

## 7. iOS (en attente)

Préparer App Store Connect plus tard. Le fichier `apple-app-site-association` sera patché via secret `APPLE_TEAM_ID` quand iOS sera activé.
