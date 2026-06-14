# Checklist QA – Release Android Greffio (Capacitor)

> Application : `com.greffio.app`  
> Stack : React `dist` + Capacitor Android  
> Version de référence : `1.2.8` / `versionCode=261510007`

Cette checklist couvre la préparation d’un AAB Play Store et la validation manuelle sur appareil réel ou Play Internal Testing.

---

## 1. Build et versioning

| Étape | Commande / action | OK |
|-------|-------------------|-----|
| Build web | `npm run build` | ☐ |
| Sync Capacitor | `npm run mobile:build` ou `npx cap sync android` | ☐ |
| Bump `versionCode` | `android/release-version.properties` (strictement croissant vs Play Console) | ☐ |
| Cohérence `versionName` | Même fichier + `android/app/build.gradle` | ☐ |
| API serveur | `server/config/appVersion.js` – `latestVersionCode`, `minimumRequiredVersionCode` | ☐ |
| AAB release | `cd android && ./gradlew bundleRelease` | ☐ |
| APK debug local (optionnel) | `./gradlew assembleDebug` + `adb install -r app/build/outputs/apk/debug/app-debug.apk` | ☐ |

**Règle actuelle** : l’app Play Store est remote-first. Un fix React/CSS est
visible après déploiement web + smoke test dans l’app réelle. Rebuild AAB
uniquement pour changement natif (Capacitor, Android, permissions, plugins,
icônes, splash, versionCode/versionName, deep links).

### Web remote only

| Étape | OK |
|-------|-----|
| `npm run build` | ☐ |
| Déployer le bundle web Hostinger | ☐ |
| Smoke app réelle : dashboard, questionnaire, documents, paiement | ☐ |
| Vérifier `/api/app-version` si popup update modifiée | ☐ |

### AAB requis

| Cas | OK |
|-----|-----|
| Plugin Capacitor ou permission Android | ☐ |
| Icône, splash, manifest, deep links | ☐ |
| FileOpener/PDF natif, biométrie, push | ☐ |
| `versionCode` / publication Play Console | ☐ |

---

## 2. AppUpdateGate

| Test | Attendu | OK |
|------|---------|-----|
| MAJ optionnelle | Modale avec « Mettre à jour » + « Plus tard » | ☐ |
| Snooze optionnelle | « Plus tard » masque la modale (délai configuré) | ☐ |
| MAJ obligatoire | Modale bloquante, pas de contournement | ☐ |
| Offline au démarrage | Pas de blocage erroné si `/api/app-version` inaccessible | ☐ |
| Compte app | Version + build affichés | ☐ |

---

## 3. Cold start et auth

| Test | OK |
|------|-----|
| Install fraîche / update depuis version précédente | ☐ |
| Splash + premier rendu | ☐ |
| Login | ☐ |
| Biométrie activée / refusée | ☐ |
| Fermeture complète puis réouverture | ☐ |
| `BiometricUnlockScreen` au resume | ☐ |
| Fallback reconnexion si échec biométrie | ☐ |

---

## 4. Shell natif et navigation

| Test | OK |
|------|-----|
| Bottom nav 5 onglets + FAB `Nouveau` | ☐ |
| 5e onglet = `Compte` ; `Messages` via drawer ☰ | ☐ |
| Drawer groupé (Mon activité / Pilotage / Créer / Compte) | ☐ |
| Drawer se ferme à la navigation | ☐ |
| Safe-area top bar + bottom nav | ☐ |

### Back button Android (ordre overlays)

1. Dialog veille → 2. Sheet compte → 3. Notifications → 4. Recherche → 5. Choix dossier → 6. Signature sheet → 7. Drawer → 8. Historique → 9. Minimiser sur route racine

| Test | OK |
|------|-----|
| Chaque overlay se ferme au back (voir ordre ci-dessus) | ☐ |
| `/dashboard` sans overlay → back minimise l’app | ☐ |
| Logs dev back (DEV only) visibles dans la console | ☐ |

---

## 5. Routes critiques (shell natif)

Vérifier shell actif + pas de header desktop résiduel :

| Route | OK |
|-------|-----|
| `/dashboard` | ☐ |
| `/dossiers` | ☐ |
| `/dossier/:id` | ☐ |
| `/documents` | ☐ |
| `/team` | ☐ |
| `/chat` | ☐ |
| `/analytics` | ☐ |
| `/questionnaire` | ☐ |
| `/simulateur` | ☐ |
| `/signature/...` | ☐ |
| `/paiement` | ☐ |
| `/mobile/account` | ☐ |
| `/profil` | ☐ |
| `/settings` | ☐ |
| `/tarifs` | ☐ |
| `/contact` | ☐ |

---

## 6. Deep links

```bash
adb shell am start -a android.intent.action.VIEW -d "https://greffio.willentreprises.com/dashboard" com.greffio.app
adb shell am start -a android.intent.action.VIEW -d "https://greffio.willentreprises.com/documents" com.greffio.app
adb shell am start -a android.intent.action.VIEW -d "https://greffio.willentreprises.com/dossier/TEST_ID" com.greffio.app
```

| Test | OK |
|------|-----|
| Bonne route ouverte | ☐ |
| Shell actif si attendu | ☐ |
| Auth guard propre | ☐ |
| Back cohérent après deep link | ☐ |

---

## 7. Offline / mode avion

| Test | OK |
|------|-----|
| Bannière : « Connexion indisponible. Vos informations seront rechargées… » | ☐ |
| Navigation cockpit en mode avion sans crash | ☐ |
| Action critique offline expliquée ou désactivée | ☐ |
| Retour réseau → toast « Connexion rétablie… » | ☐ |
| Pas d’erreur technique brute | ☐ |

---

## 8. Permissions

### Push (Android 13+)

| Test | OK |
|------|-----|
| Pre-permission Greffio avant prompt OS | ☐ |
| Refus OS → copy « Notifications désactivées… » | ☐ |
| App utilisable sans push | ☐ |
| Cloche in-app toujours accessible | ☐ |

### Caméra

| Test | OK |
|------|-----|
| Pre-permission avant scan | ☐ |
| Refus → « Caméra désactivée. Vous pouvez importer… » | ☐ |
| Fallback import fichier | ☐ |

---

## 9. Documents signables (Mixte)

Pages : non-condamnation, souscripteurs, pouvoirs, procuration.

| Test | OK |
|------|-----|
| Pas de sidebar desktop dans l’app | ☐ |
| Dernier champ visible clavier ouvert | ☐ |
| CTA sticky visible au-dessus du clavier | ☐ |
| Signature tactile fluide | ☐ |
| Back ferme bottom sheet signature | ☐ |
| Succès : feedback + haptic | ☐ |
| Erreur réseau lisible | ☐ |

---

## 10. Compte app premium

| Élément | OK |
|---------|-----|
| Version app | ☐ |
| Build / versionCode | ☐ |
| État notifications | ☐ |
| État biométrie | ☐ |
| Mettre en veille | ☐ |
| Aide / support | ☐ |
| `MobileNativeStatusCenter` (connexion, sync) | ☐ |

---

## 11. Paiement

| Test | OK |
|------|-----|
| `/paiement` dans le shell | ☐ |
| Retour provider / deep link | ☐ |
| Erreur réseau | ☐ |
| Back avant paiement | ☐ |

---

## 12. Play Internal Testing

| Étape | OK |
|-------|-----|
| AAB uploadé Play Console | ☐ |
| Notes de release rédigées | ☐ |
| Install depuis piste Internal Testing | ☐ |
| Re-test cold start + signature + offline sur build Play | ☐ |

---

## 13. Notes de release (modèle)

```
Améliorations de stabilité et d’expérience mobile :
- navigation Android plus fiable (back button, overlays) ;
- meilleure gestion hors connexion ;
- amélioration des documents signables (clavier, CTA sticky) ;
- retours visuels et haptiques sur les actions importantes ;
- écran Compte enrichi (version, sécurité, notifications).
```

---

## 14. Typologie des changements (rappel)

- **Natif Android** : back button, permissions, offline banner, AppUpdateGate, haptics, biométrie, deep links.
- **Web embarqué Capacitor** : pages React dans `dist`, layout mobile des éditeurs, tarifs mobile navigateur.
- **Mixte** : signature + clavier, paiement, CTA sticky.

---

## Definition of Done release

- [ ] Tous les P0 validés sur appareil réel
- [ ] `versionCode` > version Play publiée
- [ ] `server/config/appVersion.js` aligné
- [ ] Play Internal Testing validé
- [ ] Aucune régression drawer / bottom nav / FAB
- [ ] AAB copié dans `releases/android/` + entrée `manifest.json`

---

## 15. Brouillons fantômes (« Projet Greffio »)

| Test | Attendu | OK |
|------|---------|-----|
| Compte avec brouillon placeholder (nom « Projet Greffio », parcours non finalisé) | Bandeau « Brouillon non entamé » + bouton supprimer | ☐ |
| Suppression unitaire | Dossier en corbeille 72 h, disparaît de la liste | ☐ |
| « Nettoyer les brouillons vides » (mobile + desktop) | Tous les placeholders supprimés | ☐ |
| Ouverture `/questionnaire` sans action | Aucun nouveau dossier créé automatiquement | ☐ |
| Dossier réel (ex. dénomination « TRUE POWER ») | Pas de bouton suppression placeholder | ☐ |
| Après suppression, reconnexion | Le brouillon fantôme ne revient pas | ☐ |

**Backend** : `POST /api/dossiers/purge-placeholders`, statuts early pipeline (`questionnaire_completed` inclus).

---

## 16. Archivage Git des AAB

| Étape | Action | OK |
|-------|--------|-----|
| Nommage | `releases/android/greffio-{versionName}-{versionCode}.aab` | ☐ |
| Manifest | `releases/android/manifest.json` (SHA256, taille, commit) | ☐ |
| Notes | `releases/MOBILE_RELEASE_{version}.md` | ☐ |
| `.gitignore` | `!releases/android/**` actif (AAB versionnés) | ☐ |

```powershell
Copy-Item android\app\build\outputs\bundle\release\app-release.aab releases\android\greffio-X.Y.Z-CODE.aab
Get-FileHash releases\android\greffio-X.Y.Z-CODE.aab -Algorithm SHA256
```

