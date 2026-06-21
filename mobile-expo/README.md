# Greffio iOS — Expo + EAS

Shell natif iOS (WebView) chargé sur `https://greffio.willentreprises.com/?nativeApp=1`, aligné sur l’app Android Capacitor remote-first.

## Prérequis

1. Compte [Expo](https://expo.dev) (`eas login`)
2. Compte **Apple Developer** (99 €/an) pour TestFlight / App Store
3. Node 20+

## Installation

```bash
cd mobile-expo
npm install
eas login
eas init   # crée le projectId Expo → copier dans app.config.ts (extra.eas.projectId)
```

## Build iOS (EAS cloud)

```powershell
# TestFlight / distribution interne
npm run eas:build:ios:preview

# App Store
npm run eas:build:ios:production
```

Premier build : EAS demandera les identifiants Apple (recommandé : laisser EAS gérer les certificats).

Variables utiles (CI) :

```powershell
$env:EXPO_TOKEN = "..."   # token expo.dev → Settings → Access Tokens
eas build --platform ios --profile preview --non-interactive
```

## Soumission App Store

Compléter `eas.json` → `submit.production.ios` (appleId, ascAppId, appleTeamId), puis :

```bash
npm run eas:submit:ios
```

## Bundle ID

`com.greffio.app` (identique Android / Play Store)

## Notes

- L’app charge le site en production ; déployer le frontend avant de tester une build iOS.
- Deep link auth : `com.greffio.app://auth/callback` intercepté dans la WebView.
- Alternative sans build : PWA Safari → « Sur l’écran d’accueil ».
