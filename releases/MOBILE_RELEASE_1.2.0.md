# Greffio Android — release 1.2.0

- **versionName** : `1.2.0`
- **versionCode** : `26145200`
- **package** : `com.greffio.app`
- **API** : `https://api.greffio.willentreprises.com`
- **Web embarqué** : build Vite `dist` (statuts, bénéficiaires effectifs, push FCM, biométrie)

## Contenu principal

- Génération statuts William (27 articles, structure PDF corrigée)
- Sélection bénéficiaires effectifs depuis associés/dirigeants
- Libellés formalités complets (emails + UI)
- Module déclaration non-condamnation + signature
- Notifications push Android (FCM)

## Artefact

- AAB signé : `artifacts/playstore/app-release-1.2.0-26145200.aab`
- Build local : `android/app/build/outputs/bundle/release/app-release.aab`

## Play Console

Importer l’AAB sur la piste **internal** ou **production** (même clé upload `greffio-upload`).
