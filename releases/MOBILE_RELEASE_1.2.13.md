# Greffio Android – release 1.2.13

- **versionName** : `1.2.13`
- **versionCode** : `261510012`
- **package** : `com.greffio.app`

> Connexion native corrigée, tarifs/services mobile refondus, signature SES renforcée (backend VPS).

## Notes de version (Play Console – fr-FR)

```
• Connexion corrigée – écran login réactif, plus d'erreur au tap « Se connecter »
• Tarifs et services mobile refondus (navigation claire, style Qonto/Legalstart)
• Signature électronique : parcours public clarifié, téléchargement document signé
• Questionnaire et simulateur : validation au tap sur votre réponse
• MFA : code à 6 chiffres validé automatiquement
• Biométrie : moins de blocages juste après connexion mot de passe
• Stabilité générale et corrections diverses
```

## Build

```bash
npm run build
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
```

## AAB

`releases/android/greffio-1.2.13-261510012.aab`

- **SHA256** : `EA372D42EB9E6CB4B11567EF7C83BF2AEFD451FF6536B2B89DDE52BDED6E7379`
- **Taille** : 10 010 641 octets
- **Build** : 13 juin 2026
