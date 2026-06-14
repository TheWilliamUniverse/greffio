# Greffio Android – release 1.2.15 (shell remote OTA)

- **versionName** : `1.2.15`
- **versionCode** : `261510014`
- **package** : `com.greffio.app`
- **Canal Play** : **production** (pas test ouvert / pas bêta fermée)
- **Mode Capacitor** : **remote** (`server.url` → site live)

> Première release « shell remote » : l’UI charge `https://greffio.willentreprises.com/?nativeApp=1`. Les petites évolutions web se déploient sans resoumettre d’AAB (comme Shopfun).

## Notes de version (Play Console – fr-FR)

```
• Application connectée au site Greffio en direct – mises à jour automatiques sans réinstaller
• Connexion sécurisée corrigée : ouverture dans le navigateur et retour automatique dans l'app
• PDF pouvoirs formalités : mise en page professionnelle, signature et lieu rehaussés
• Commandes documents (Kbis, etc.) : confirmation par email uniquement après paiement
• Stabilité générale et corrections diverses
```

## Build (mode remote obligatoire pour cette release)

```bash
npm run mobile:build:remote
cd android && .\gradlew.bat bundleRelease
copy android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-1.2.15-261510014.aab
```

## AAB

`releases/android/greffio-1.2.15-261510014.aab`

- **SHA256** : `EC158E6175A2B76A53951F4397AF5EAE2F39B40522E79B174CB212F15ACACC98`
- **Taille** : 10 012 354 octets
- **Build** : 13 juin 2026

Mettre à jour sur le VPS (ou via déploiement backend) :

```
APP_LATEST_VERSION_CODE=261510014
APP_LATEST_VERSION_NAME=1.2.15
```

## Important ops

- Après cette release, **prioriser le déploiement web** (Hostinger) pour les changements UI mobile.
- Un nouvel AAB n’est requis que pour : plugins Capacitor, permissions Android, icône, splash, `versionCode`, ou changement de `server.url`.
