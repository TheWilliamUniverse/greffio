# Greffio Android – release 1.2.17 (shell remote + FileOpener)

- **versionName** : `1.2.17`
- **versionCode** : `261510016`
- **Mode Capacitor** : **remote** (`server.url` → site live)

> Cette release ajoute le plugin natif **FileOpener** pour « Ouvrir » / « Télécharger » des PDF depuis le coffre documentaire. Le rendu PDF et les logos footer sont livrés via le déploiement web Hostinger.

## Notes de release (Play Console – fr-FR)

```
• Coffre documentaire : aperçu PDF plus net, ouverture et enregistrement via le menu système
• Ouvrir un PDF dans une autre application (lecteur natif Android)
• Logos paiement footer corrigés (Mastercard, American Express)
• Corrections de textes et polish mobile
```

## Build AAB

```bash
npm run mobile:build:remote
cd android && .\gradlew.bat bundleRelease
copy android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-1.2.17-261510016.aab
```

## Déploiement web (obligatoire avec cette release)

```bash
npm run build
node tmp/deploy-static-hostinger.mjs
```
