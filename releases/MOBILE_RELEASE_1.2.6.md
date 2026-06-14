# Greffio Android – release 1.2.6

- **versionName** : `1.2.6`
- **versionCode** : `261510005`
- **package** : `com.greffio.app`

## Notes de version (Play Console – fr-FR)

```
Greffio 1.2.6 – cockpit mobile premium

• Header cockpit : sheet compte (profil, paramètres), pastille connectée, recherche dossiers/documents, confirmation déconnexion, ombre au scroll
• Landing mobile animée, drawer latéral web + app, pages Documents et Messages dédiées
• Didit + 3 documents en ligne (non-condamnation, souscripteurs, pouvoirs)
• Assistant, pilotage, statuts et questionnaire optimisés mobile
• Back Android : fermeture drawer, recherche, sheet compte et dialogues
```

## Notes ultra-courtes (≤ 500 car.)

```
Header cockpit premium, drawer, docs Didit, assistant & statuts mobile, stabilité 1.2.6.
```

## Commits inclus

- `89505b1` – Didit, docs en ligne, header cockpit v1.2.6
- `c2b799f` – polish header (sheet, recherche API, ombre scroll, back Android)

## Artefact

- AAB : `artifacts/playstore/app-release-1.2.6-261510005.aab`
- Build Gradle : `android/app/build/outputs/bundle/release/app-release.aab`
- Bureau : `%USERPROFILE%\Downloads\app-release-1.2.6-261510005.aab`
- Taille : ~9,9 Mo
- SHA256 : `30195995514AEAA6A72D670C49BB4ABD3C0A0A1E379A5E44A54DF75B88135F76`

## Checklist Play Console

1. Uploader l’AAB sur la piste souhaitée (production ou test ouvert).
2. Vérifier `versionCode` strictement supérieur aux releases existantes.
3. Coller les notes fr-FR ci-dessus.
4. Valider `/api/app-version` → `1.2.6` / `261510005` en production.
