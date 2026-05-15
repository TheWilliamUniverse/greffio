# Greffio mobile

Greffio est prepare comme PWA installable et peut etre empaquete en application native avec Capacitor.

## PWA

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Icônes: `public/icons/`

## Android

1. Creer un compte Google Play Console.
2. Ajouter Capacitor Android: `npm install @capacitor/core @capacitor/cli @capacitor/android`.
3. Executer `npx cap add android`, puis `npm run build` et `npx cap sync android`.
4. Signer l'AAB avec la cle de production.
5. Publier l'asset link officiel avec l'empreinte SHA-256 de signature.

## iOS

1. Creer un compte Apple Developer.
2. Ajouter Capacitor iOS: `npm install @capacitor/core @capacitor/cli @capacitor/ios`.
3. Executer `npx cap add ios`, puis `npm run build` et `npx cap sync ios`.
4. Ouvrir Xcode, configurer bundle id, certificats, notifications et soumettre a App Store Connect.
