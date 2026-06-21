# Greffio iOS — build EAS / Expo

Les apps Android restent sur **Capacitor**. iOS passe par un shell **Expo + WebView** (`mobile-expo/`), buildé dans le cloud avec **EAS Build** (pas de Mac requis).

## Structure

```
mobile-expo/
  App.tsx          # WebView → greffio.willentreprises.com/?nativeApp=1
  app.config.ts    # bundle com.greffio.app
  eas.json         # profils preview (TestFlight interne) / production (App Store)
```

## Étapes (une fois)

```powershell
cd mobile-expo
npm install
npx eas login
npx eas init
```

Copier le `projectId` affiché dans `app.config.ts` → `extra.eas.projectId`.

Configurer Apple dans App Store Connect :

- Créer l’app iOS `com.greffio.app` (si pas déjà fait)
- Compléter `eas.json` → `submit.production.ios` (appleId, ascAppId, appleTeamId)

## Lancer un build iOS

```powershell
# Depuis la racine Greffio
npm run mobile:ios:eas:preview

# Ou App Store
npm run mobile:ios:eas:production
```

Premier build : EAS propose de créer les certificats Apple (répondre oui).

CI (non-interactif) :

```powershell
$env:EXPO_TOKEN = "<token expo.dev>"
cd mobile-expo
eas build --platform ios --profile preview --non-interactive
```

## Distribution

| Canal | Profil EAS | Usage |
|-------|------------|--------|
| TestFlight interne | `preview` | bêta équipe / clients |
| App Store | `production` | publication publique |

Après build : lien `.ipa` / install TestFlight dans le dashboard expo.dev.

## Shopfun

Même setup dans `ShopWX_Shopfun/shopwx/mobile-expo/` (`com.shopfun.app`).

## Prérequis obligatoires

- Compte **Apple Developer** (99 €/an)
- Compte **Expo** (gratuit ; builds EAS facturés selon plan)

Sans Apple Developer, seule la **PWA Safari** reste disponible (`/telechargement-app`).
