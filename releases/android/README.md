# Archivage AAB Android – Greffio

Ce dossier contient les **AAB signés** archivés dans Git pour traçabilité release.

| Fichier | versionName | versionCode |
|---------|-------------|-------------|
| `greffio-1.2.0-26145200.aab` | 1.2.0 | 26145200 |
| `greffio-1.2.1-261510000.aab` | 1.2.1 | 261510000 |
| `greffio-1.2.2-261510001.aab` | 1.2.2 | 261510001 |
| `greffio-1.2.3-261510002.aab` | 1.2.3 | 261510002 |
| `greffio-1.2.4-261510003.aab` | 1.2.4 | 261510003 |
| `greffio-1.2.5-261510004.aab` | 1.2.5 | 261510004 |
| `greffio-1.2.6-261510005.aab` | 1.2.6 | 261510005 |
| `greffio-1.2.7-261510006.aab` | 1.2.7 | 261510006 |
| `greffio-1.2.8-261510007.aab` | 1.2.8 | 261510007 |
| `greffio-1.2.9-261510008.aab` | 1.2.9 | 261510008 |

Voir `manifest.json` pour SHA256 et notes. Les fiches release Markdown sont dans `releases/MOBILE_RELEASE_*.md`.

**Build local :**

```bash
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
Copy-Item app/build/outputs/bundle/release/app-release.aab releases/android/greffio-{version}-{code}.aab
```

**Biométrie Capacitor :** `@capgo/capacitor-native-biometric` est aligné sur Capacitor 8 (`peer: @capacitor/core >= 8`). L’API utilisée par `biometricAuth.js` (`isAvailable`, `verifyIdentity`, `setCredentials`, `getCredentials`, `deleteCredentials`) est inchangée entre 7.x et 8.x.
