# Greffio Android – release 1.2.16 (shell remote OTA)

- **versionName** : `1.2.16` (web) / shell AAB inchangé `1.2.15` si pas de resoumission Play
- **versionCode** : `261510015` (si nouvel AAB) ou `261510014` (shell existant)
- **Mode Capacitor** : **remote** (`server.url` → site live)

> Cette release est **principalement web** : moteur documentaire, ops, paiements. Déployer `dist/` sur Hostinger. Un nouvel AAB n’est requis que si vous soumettez un `versionCode` supérieur à Play.

## Notes de version (Play Console – fr-FR)

```
• Coffre documentaire : statuts clarifiés, motifs de refus visibles, aperçu PDF depuis le dossier
• Uploads jusqu’à 20 Mo – images converties en PDF sur desktop
• Pilotage Ops : validation et rejet des pièces depuis le tableau de bord
• Signatures : parcours Greffio interne mis en avant (SignWell si configuré)
• Logos paiement Mollie / CB / Visa et polish footer
• Checklists modification d’entreprise enrichies
```

## Build AAB (optionnel – changements web seuls)

```bash
npm run mobile:build:remote
# Optionnel : bump android/release-version.properties puis
cd android && .\gradlew.bat bundleRelease
copy android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-1.2.16-261510015.aab
```
