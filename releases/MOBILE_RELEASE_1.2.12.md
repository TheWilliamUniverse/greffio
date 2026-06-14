# Greffio Android – release 1.2.12

- **versionName** : `1.2.12`
- **versionCode** : `261510011`
- **package** : `com.greffio.app`

> Correctifs connexion native, identité auth alignée site, validation au tap sur les choix.

## Notes de version (Play Console – fr-FR)

```
• Connexion corrigée – plus de déconnexion après login, captcha natif contourné
• Écran de connexion aligné sur le site Greffio (bandeau bleu, sans barre du bas)
• Simulateur et questionnaire : touchez votre réponse pour avancer (sans bouton Valider)
• MFA : code à 6 chiffres validé automatiquement
• Accueil app simplifié – « Me connecter » en priorité, mêmes identifiants que le site
• Biométrie : plus de blocage juste après une connexion mot de passe
```

## Build

```bash
npm run build
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
```

## AAB

`releases/android/greffio-1.2.12-261510011.aab`

- **SHA256** : `529E722A827CD5AF34F977F5026E86DD900E03AC8337FB7D9DE3134174ABE127`
- **Taille** : 10 007 275 octets
- **Build** : 13 juin 2026
