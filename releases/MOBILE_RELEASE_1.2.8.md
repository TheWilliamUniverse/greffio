# Greffio Android — release 1.2.8

- **versionName** : `1.2.8`
- **versionCode** : `261510007`
- **package** : `com.greffio.app`

## Notes de version (Play Console — fr-FR)

```
Parcours mobile et dossiers :
• Simulateur / questionnaire : interface directe, barre d’action sticky, moins de scroll
• Reprendre vs Nouveau dossier : parcours distincts et explicites
• Suppression dossier : bouton en bas de l’onglet Actions (corbeille 72 h)
• Auth stable pendant les mises à jour — plus de « session invalide » intempestif
• Upload documents : messages d’erreur clairs, scanner PDF natif
• Validation → statuts reliés au bon dossier ; purge auto des brouillons fantômes
• Version et nouveautés visibles dans le profil / compte
```

## Notes ultra-courtes (≤ 500 car.)

```
Simulateur fluide, auth stable, uploads clairs, reprise/nouveau dossier, statuts reliés, version visible.
```

## Artefact archivé (Git)

- AAB : `releases/android/greffio-1.2.8-261510007.aab`
- SHA256 : `210E32C4DBC4EF708230158FC4B55E306B2CA8B213BD9A37C912864016A4B655`
- Taille : ~9,5 Mo
- Manifest : `releases/android/manifest.json`

## Checklist Play Console

1. Uploader l’AAB sur Internal Testing ou production.
2. Vérifier `versionCode` > releases Play existantes.
3. Coller les notes fr-FR ci-dessus.
4. Valider `/api/app-version` → `1.2.8` / `261510007`.

## QA

Voir `docs/qa-android-release-checklist.md`
