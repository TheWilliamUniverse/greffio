# Greffio Android – release 1.2.18 (icône + PDF + questionnaire)

- **versionName** : `1.2.18`
- **versionCode** : `261510017`
- **Mode Capacitor** : **remote** (`server.url` → site live)

> Release native : icône launcher Greffio, FileProvider/FileOpener pour PDF. Le questionnaire à deux niveaux, le paiement mobile et les corrections UI sont livrés via le bundle web Hostinger.

## Notes de release (Play Console – fr-FR)

```
• Icône Greffio affichée correctement sur l’écran d’accueil
• Documents PDF : ouverture dans une autre application et enregistrement local
• Questionnaire création : choix de forme juridique plus clair (catégories + Autres)
• Paiement : interface mobile optimisée et logo Mollie complet
• Corrections de navigation dans le questionnaire
```

## Build AAB

```bash
npm run mobile:build:remote
cd android && .\gradlew.bat bundleRelease
copy android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-1.2.18-261510017.aab
```

## Déploiement web (obligatoire avec cette release)

```bash
npm run build
node tmp/run-hostinger-static-deploy.mjs dist_YYYYMMDD_HHMMSS.zip
```
