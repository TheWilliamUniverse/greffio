# Audit site Greffio – web + mobile

**Date :** 14 juin 2026  
**Périmètre :** frontend React/Capacitor, API Express, intégration mobile Android, sécurité, paiement, auth  
**Méthode :** revue code statique, docs internes (13/06), analyse des flux critiques  
**Contrainte :** identité globale figée (landing, palette, navbar/footer publics)

---

## Synthèse exécutive

| Priorité | Domaine | État |
|----------|---------|------|
| **P0 corrigé** | Biométrie native au cold start | Bug race condition auth `loading` → gate contournée |
| **P0** | iOS natif | Non démarré – pas de dossier `ios/`, pas de compte Apple Developer |
| **P1** | Page secrète téléchargement | Implémentée `/telechargement-app` – voir sécurité ci-dessous |
| **P1** | Sync version Android prod | API `latestVersionName` peut laguer vs AAB local (1.2.15) |
| **P2** | Fragmentation UI espace client | Voir `docs/UI_UX_AUDIT_2026-06-13.md` |
| **P2** | Footer légal incomplet | Pages login/contact sans footer unifié |

---

## 1. Bugs / flux cassés

### 1.1 Biométrie – déverrouillage après fermeture app (CORRIGÉ)

**Symptôme :** utilisateur active Face ID / empreinte, ferme l’app, rouvre → pas de verrou ou déverrouillage inopérant.

**Cause racine :** dans `BiometricSessionContext`, tant que `AuthContext.loading === true`, le provider marquait `unlocked = true`. Au bootstrap, la session restait « déverrouillée » même avec biométrie activée.

**Correctif :** attendre la fin du bootstrap auth ; si biométrie activée, forcer `unlocked = false` et lancer `performUnlock()` automatiquement au cold start et au retour foreground (`appStateChange`).

**Fichiers :** `src/context/BiometricSessionContext.jsx`, `src/utils/biometricAuth.js` (inchangé – stockage Keychain OK).

### 1.2 Capacitor remote – cache stale possible

L’app Android charge `https://greffio.willentreprises.com/?nativeApp=1`. Un déploiement web peut être servi avant rebuild AAB Play Store → écarts UX (ex. terminal paiement accordéon, cf. `docs/MOBILE_NAVIGATION_ETAT_PRODUCTION_2026-06-13.md`).

**Recommandation :** publier AAB après chaque déploiement frontend majeur ; vérifier `AppUpdateGate` côté native.

### 1.3 Questionnaire / statuts

Fichier `src/pages/QuestionnairePage.jsx` non tracké git – risque de perte ou dérive locale.

---

## 2. Sécurité

### 2.1 Page secrète `/telechargement-app` (NOUVEAU)

| Mesure | Statut |
|--------|--------|
| `SeoHead noIndex` | ✅ |
| Absent sitemap / `siteSearchIndex` / nav publique | ✅ |
| Vérification code côté serveur | ✅ |
| Rate limit (10 req / 15 min) | ✅ |
| Code email → `ibtissam@willentreprises.com` (env `APP_DOWNLOAD_CODE_RECIPIENT`) | ✅ |
| Bypass admin `ADMIN_APP_DOWNLOAD_CODE` | ✅ |
| Session navigateur 24 h (`sessionStorage`) | ✅ |

**Risques résiduels :**
- Codes stockés en mémoire serveur (perdus au restart PM2) – acceptable pour usage interne.
- URL « secrète » = obscurité, pas authentification forte – ne pas diffuser.
- **Backend requis** pour les routes `/api/public/app-download/*` en production.

### 2.2 Auth / sessions

- Refresh token + MFA email/TOTP opérationnels.
- `IdleSessionGuard` actif sur web.
- Biométrie : refresh token dans Keychain natif (`@capgo/capacitor-native-biometric`) – bon modèle.
- Turnstile sur login risqué (web) ; désactivé en native – cohérent.

### 2.3 Credentials unlock

Flux `/credentials-unlock?token=` avec SMS – pattern solide (rate limit, consommation unique).

---

## 3. Mobile / Capacitor

| Élément | Android | iOS |
|---------|---------|-----|
| Shell Capacitor remote | ✅ 1.2.15 AAB | ❌ |
| Biométrie | ✅ (fix cold start) | N/A |
| Push notifications | ✅ enregistrement | N/A |
| Deep links auth | ✅ `appUrlOpen` | N/A |
| Back button Android | ✅ overlay → back → minimize | N/A |
| PWA Safari | ✅ alternative iPhone | ✅ |

**Gaps :**
- Pas de projet Xcode / provisioning profiles.
- TestFlight impossible sans Apple Developer Program.
- `NativePermissionOrchestrator` : prompt biométrie après onboarding – OK mais dépend session fraîche.

---

## 4. Paiement

- Terminal accordéon web déployé (juin 2026).
- Google Pay routes backend présentes.
- Amazon Pay retiré du frontend (grep vide) – aligné runbook retrait.
- **Vérifier** en prod : webhooks Stripe/Brevo paiement ressources après chaque release.

---

## 5. Navigation / auth routing

- Triple shell : desktop / `MobileWebShell` / `MobileAppShell` – complexité maintenue, drawer mobile OK en prod.
- Route ops `/ops-legacy` redirect – legacy propre.
- Login native : `NativeWebLoginPage` + handoff `/auth/app-bridge`.

---

## 6. Recommandations priorisées

### Immédiat (fait ou à déployer)
1. ✅ Fix biométrie cold start – rebuild AAB 1.2.16+ recommandé.
2. ✅ Page `/telechargement-app` + API – **déployer backend** avec env email.
3. Définir `ADMIN_APP_DOWNLOAD_CODE` en prod pour accès de secours.

### Court terme (P1)
4. Rebuild & publier AAB Android après fix biométrie.
5. Synchroniser `app-version` API avec manifest `releases/android/manifest.json`.
6. Committer `QuestionnairePage.jsx` ou retirer si obsolète.

### Moyen terme (P2)
7. Harmoniser espace client authentifié (sans toucher landing).
8. Footer légal minimal sur login/signup (pattern `PublicMinimalLegalFooter` déjà utilisé).
9. Démarrer dossier iOS + compte Apple Developer quand budget validé.

### Long terme (P3)
10. Réduire duplication desktop/mobile pages (entries pattern).
11. Tests E2E Capacitor (biométrie simulée, cold start).

---

## 7. URLs & accès

| Ressource | URL |
|-----------|-----|
| Site prod | https://greffio.willentreprises.com |
| API prod | https://api.greffio.willentreprises.com |
| Page téléchargement (secrète) | https://greffio.willentreprises.com/telechargement-app |
| App publique (non secrète) | https://greffio.willentreprises.com/app |
| Google Play | `com.greffio.app` |

**Code d’accès page secrète :** bouton « Recevoir un code » → email à `ibtissam@willentreprises.com`, ou saisie de `ADMIN_APP_DOWNLOAD_CODE` côté serveur.

---

## Documents liés

- `docs/UI_UX_AUDIT_2026-06-13.md`
- `docs/MOBILE_NAVIGATION_ETAT_PRODUCTION_2026-06-13.md`
- `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md`
- `releases/android/manifest.json`
