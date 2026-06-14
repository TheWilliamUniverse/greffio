# Greffio Android – release 1.2.7

- **versionName** : `1.2.7`
- **versionCode** : `261510006`
- **package** : `com.greffio.app`

## Notes de version (Play Console – fr-FR)

```
Stabilité et expérience mobile :
• Retour Android plus fiable (overlays, signature, drawer)
• Documents signables optimisés (clavier, CTA visible)
• Mode hors connexion clarifié
• Écran Compte enrichi (version, sécurité, notifications)
• Tarifs mobile : lecture « En clair » améliorée
• Suppression des brouillons vides (ex. Projet Greffio)
```

## Notes ultra-courtes (≤ 500 car.)

```
Navigation Android, signature, offline, compte enrichi, tarifs mobile, nettoyage brouillons vides.
```

## Artefact archivé (Git)

- AAB : `releases/android/greffio-1.2.7-261510006.aab`
- SHA256 : `EF08ACDB39FEF3CDB07014DF27AB85D3BF19C38F6741A819919144B2EA6694B4`
- Taille : ~9,5 Mo
- Manifest : `releases/android/manifest.json`

## Checklist Play Console

1. Uploader l’AAB sur Internal Testing ou production.
2. Vérifier `versionCode` > releases Play existantes.
3. Coller les notes fr-FR ci-dessus.
4. Valider `/api/app-version` → `1.2.7` / `261510006`.

## QA

Voir `docs/qa-android-release-checklist.md`
