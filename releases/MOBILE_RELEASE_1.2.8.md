# Greffio Android — release 1.2.8

- **versionName** : `1.2.8`
- **versionCode** : `261510007`
- **package** : `com.greffio.app`

## Notes de version (Play Console — fr-FR)

```
Parcours mobile et dossiers :
• Simulateur / questionnaire : interface plus directe, cartes cliquables, moins de scroll
• Nouveau dossier : démarrage propre sans reprise d’un ancien parcours
• Suppression dossier : bouton en bas de l’onglet Actions (corbeille 72 h)
• Emails : « dossier créé » uniquement après validation ; relance si démarche entamée
• Corrections layout dashboard et upload documents
```

## Notes ultra-courtes (≤ 500 car.)

```
Simulateur mobile fluide, nouveau dossier fiable, suppression depuis Actions, emails et uploads corrigés.
```

## Artefact archivé (Git)

- AAB : `releases/android/greffio-1.2.8-261510007.aab`
- SHA256 : `74098A7E8523DAF382E9B5F8E1671FCA08D5447B0C375ACF1E67860303802BFF`
- Taille : ~9,5 Mo
- Manifest : `releases/android/manifest.json`

## Checklist Play Console

1. Uploader l’AAB sur Internal Testing ou production.
2. Vérifier `versionCode` > releases Play existantes.
3. Coller les notes fr-FR ci-dessus.
4. Valider `/api/app-version` → `1.2.8` / `261510007`.

## QA

Voir `docs/qa-android-release-checklist.md`
