# Greffio Android - release 1.2.19 (P0/P1 mobile + web prod)

> **Statut : non publiée sur le Play Store** (AAB préparé localement). Ne pas annoncer via `/api/app-version` tant que le porteur n'a pas confirmé la publication.

- **versionName** : `1.2.19`
- **versionCode** : `261510018`
- **Mode Capacitor** : **remote** (`server.url` → site live)

> Release native légère : shell Capacitor inchangé côté binaire. Les correctifs P0/P1 (signature, paiement Mollie, questionnaire pas-à-pas, safe-area, PDF/statuts, documents signés, inscription progressive) sont livrés via le bundle web déjà en production.

## Notes de release (Play Console - fr-FR)

```
• Signature mobile dédiée (parcours SignWell adapté)
• Paiement : vérification fiable après retour Mollie
• Questionnaire pas-à-pas avec reprise douce (soft-continue)
• Formulaires : respect des safe-area sur mobile
• Statuts et PDF : ouverture via le lecteur système
• Documents signés lisibles, procuration améliorée
• Inscription progressive
```

## Build AAB

```bash
npm run mobile:build:remote
cd android && .\gradlew.bat bundleRelease
copy android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-1.2.19-261510018.aab
```

## Déploiement web

Déjà déployé (phases 1+2) avant cette release — pas de redéploiement web requis pour ce versionCode.

## API app-version

Ne pas annoncer tant que la version n'est pas sur le Play Store. Après publication confirmée :
1. Monter `PUBLISHED_VERSION_CODE` / `PUBLISHED_VERSION_NAME` dans `server/config/appVersion.js` ;
2. Mettre à jour le changelog dans le même fichier ;
3. Déployer le VPS (`scripts/vps-full-deploy.ps1`).