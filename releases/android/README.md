# Archivage AAB Android — Greffio

Ce dossier contient les **AAB signés** archivés dans Git pour traçabilité release.

| Fichier | versionName | versionCode | Commit |
|---------|-------------|-------------|--------|
| `greffio-1.2.7-261510006.aab` | 1.2.7 | 261510006 | `b591034`+ |

Voir `manifest.json` pour SHA256 et notes. Les fiches release Markdown sont dans `releases/MOBILE_RELEASE_*.md`.

**Build local :**

```bash
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
Copy-Item app/build/outputs/bundle/release/app-release.aab releases/android/greffio-{version}-{code}.aab
```
