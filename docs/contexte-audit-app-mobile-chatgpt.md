# Greffio – Contexte audit application mobile native (Capacitor Android)

> **Usage** : joindre ce fichier à ChatGPT avec le **prompt §8** pour obtenir un audit UX/UI/QA de l’**app Android Greffio** (pas la landing desktop, pas le mobile web seul).
>
> **Repo** : `TheWilliamUniverse/greffio` – branche `main`, commit récent `4b9ab18` (audit mobile + signature sticky + offline + haptics).
>
> **Identité figée** : palette bleu marine, landing desktop, header public – ne pas proposer de refonte globale (`.cursor/rules/preserve-brand-identity.mdc`).

---

## 1. Périmètre de l’audit demandé

| In scope | Hors scope (sauf régression native) |
|----------|-----------------------------------|
| App **Capacitor Android** (`com.greffio.app`) | Landing **desktop** |
| Shell `MobileAppShell`, top bar, bottom tabs, drawer | Ops `/ops` (desktop only) |
| Pages cockpit rendues dans l’app (entries mobile) | Refonte charte / tokens CSS globaux |
| Permissions Android (caméra, push, biométrie) | iOS (non publié – préparer recommandations seulement) |
| Back button, safe-area, clavier, offline, deep links | Parité pixel-perfect avec desktop |
| Build AAB / version embarquée vs API `/api/app-version` | |

**Détection native** : `isCapacitorNative()` dans `src/utils/platform.js`.

**Important** : l’app embarque le build web (`capacitor.config.json` → `webDir: dist`). Tout fix front nécessite **`npm run mobile:build`** + rebuild AAB pour les utilisateurs Play Store.

---

## 2. Architecture app native

```
App.jsx
├── AppUpdateGate (MAJ Play Store via GET /api/app-version)
├── BiometricSessionProvider
│   └── BiometricUnlockScreen (cold start / retour app)
└── shouldUseMobileShell(path) ? MobileAppShell : (contenu sans shell)
         │
         ├── MobileNativeOfflineBanner (online/offline)
         ├── MobilePushRegistration (pre-permission + FCM)
         ├── MobileTopBar (☰ menu, logo, cloche notifications)
         ├── MobileSidebarDrawer (groupes navigation)
         ├── main (scroll + padding bottom nav)
         └── Bottom nav 5 onglets MOBILE_AUTH_TABS_NATIVE
```

### 2.1 Bottom navigation app (≠ web mobile)

| # | Label | Route | Icône |
|---|-------|-------|-------|
| 1 | Accueil | `/dashboard` | home |
| 2 | Dossiers | `/dossiers` | folders |
| 3 | **Nouveau** (FAB) | `/questionnaire` | plus |
| 4 | Documents | `/documents` | files |
| 5 | **Compte** | `/mobile/account` | user |

Source : `src/config/mobileNavigation.js` (`MOBILE_AUTH_TABS_NATIVE`).

**Différence web** : le 5e onglet web est **Messages** (`/team`) ; sur l’app c’est **Compte**. Messages, assistant, pilotage, statuts → **drawer ☰** (bandeau explicatif dans le drawer).

### 2.2 Drawer latéral (groupes)

| Groupe | Liens |
|--------|-------|
| Mon activité | Tableau de bord, Dossiers, Documents, Messages |
| Pilotage | Assistant Greffio, Pilotage, Statuts |
| Créer | Nouvelle démarche |
| Compte | Profil, Paramètres, Aide / support |

Fichier : `src/components/MobileSidebarDrawer.jsx` + `MOBILE_DRAWER_NAV_GROUPS`.

### 2.3 Back button Android – ordre overlay

Priorité implémentée dans `MobileShellOverlayContext.closeTopOverlay()` :

1. Dialog veille (logout confirm)
2. Sheet compte (`MobileAccountQuickSheet`)
3. Sheet notifications
4. Recherche cockpit (`MobileCockpitSearchDialog`)
5. Choix dossier documents (`vaultPickerOpen`)
6. Drawer ☰
7. Navigation historique (`navigate(-1)`) ou `CapApp.minimizeApp()`

Fichier : `src/mobile/MobileAppShell.jsx`.

---

## 3. Pages cockpit native (entries mobile)

| Route | Composant mobile | Notes app |
|-------|------------------|-----------|
| `/dashboard` | `MobileHomePage` | Carte action requise, timeline, onboarding 3 cards, scanner |
| `/dossiers` | `MobileDossiersPage` | Empty states premium |
| `/dossier/:id` | `MobileDossierDetailPage` | Carte état dossier, timeline, pills Résumé/Documents/Actions/Messages |
| `/documents` | `MobileDocumentsPage` | Cartes doc actionnables, overlay choix dossier, haptic CTA |
| `/team` | `MobileTeamPage` | Via drawer (pas bottom tab) |
| `/mobile/account` | `MobileAccountPage` | 5e onglet |
| `/chat`, `/mobile/search` | `MobileChatPage` / recherche | Via drawer |
| `/analytics` | `MobileAnalyticsPage` | Via drawer |
| `/questionnaire`, `/simulateur` | wizard mobile | FAB central |
| `/paiement`, `/tarifs` | entries mobile | Dans `MOBILE_SHELL_PREFIXES` |

**Layout** : `MobilePageContainer` + `--bottom-nav-height` + 24px extra (`src/mobile/ui/MobilePageContainer.jsx`).

---

## 4. Fonctionnalités natives récentes (à auditer post-implémentation)

### 4.1 Confiance & cockpit (livré audit mobile)

- Trust chips + micro-copy landing mobile (web embarqué dans l’app sur `/`)
- Documents : badge + hint + **CTA unique** (`MobileDocumentCard`, `onlineDocumentStatus.js`)
- Onboarding 3 cards swipeables (`MobileCockpitOnboarding`, localStorage)
- Empty states orientés action (`MobileEmptyState`)
- Recherche placeholder contextualisé (`MobileCockpitSearchDialog`)

### 4.2 Signature & clavier

- **`MobileStickyFormActions`** + **`useMobileKeyboardOffset`** (visual viewport)
- Pages : non-condamnation, liste souscripteurs, pouvoirs formalités, procuration
- **`SignatureAdoptPanel`** : scroll + footer sticky ; **`MobileSignatureOverlay`** bottom sheet
- Fichiers : `src/pages/NonConvictionDeclarationPage.jsx`, `SubscribersListPage.jsx`, `FormalityPowersPage.jsx`, `MandatePage.jsx`

### 4.3 Offline & permissions

| Feature | Fichier | Comportement |
|---------|---------|--------------|
| Bannière offline | `MobileNativeOfflineBanner.jsx` | App native only – « Connexion indisponible… » |
| Pre-permission push | `MobilePushRegistration.jsx` | Écran Greffio avant prompt Android 13+ |
| Pre-permission caméra | `MobileDocumentScanner.jsx` | Écran Greffio avant `@capacitor/camera` |
| Données cache | `OfflineDataBanner` + `mobileOffline.js` | Snapshot dossiers si API en échec |

### 4.4 Haptics Android

- Package `@capacitor/haptics`
- Utilitaire : `src/utils/mobileHaptics.js`
- Déclenché : FAB Nouveau, action document, signature confirmée

### 4.5 Sécurité session

- Bouton **veille ⏻** (Power) – dialog « session sécurisée »
- **Biométrie** : `BiometricSessionContext` + `BiometricUnlockScreen` (`@capgo/capacitor-native-biometric`)
- Verrouillage au retour app (`appStateChange`)

### 4.6 Mise à jour forcée

- `AppUpdateGate` → `GET /api/app-version` → `server/config/appVersion.js`
- Version courante build : **1.2.6** (`versionCode=261510005`, `android/release-version.properties`)
- Modale MAJ optionnelle / obligatoire selon `minimumRequiredVersionCode`

---

## 5. Permissions Android (`AndroidManifest.xml`)

- `INTERNET`, `CAMERA`, `POST_NOTIFICATIONS`
- `READ_MEDIA_*` retirées volontairement (Photo Picker / Capacitor Camera)
- `configChanges` inclut `keyboard` – vérifier comportement clavier vs `MobileStickyFormActions`

---

## 6. Routes & incohérences connues à auditer

### Routes **avec** shell native (`MOBILE_SHELL_PREFIXES`)

```
/dashboard, /dossiers, /dossier, /documents, /mobile, /chat, /profil,
/settings, /questionnaire, /statuts-gratuits, /team, /analytics, /statuts,
/interfaces, /simulateur, /signature, /paiement, /tarifs, /contact
```

### Routes **sans** shell (risque layout desktop dans l’app)

- Pages publiques longues si ouvertes in-app
- Éditeurs documents avec **Sidebar desktop** (`NonConvictionDeclarationPage`, etc.) – sticky CTA mobile ajouté mais layout global encore desktop
- `/ops` – exclu mobile web ; comportement app à confirmer

**Question produit pour l’audit** : faut-il un shell mobile minimal sur les éditeurs de documents signables ?

---

## 7. Checklist QA app Android (à valider / compléter)

### Viewports & safe-area

- [ ] 320 / 390 / 430 px – texte et CTA non tronqués
- [ ] Notch + barre gestuelle – header et bottom nav respectent `safe-area-inset`
- [ ] Dernier contenu jamais masqué sous bottom nav + FAB
- [ ] Orientation paysage – header + bottom nav utilisables

### Navigation

- [ ] Back ferme overlays dans l’ordre §2.3
- [ ] Drawer se ferme à la navigation
- [ ] 5e onglet Compte vs Messages web – utilisateur trouve Messages via drawer
- [ ] Deep link `greffio.willentreprises.com/...` ouvre la bonne route

### Formulaires & signature

- [ ] Clavier ne masque pas champs ni CTA sticky (éditeurs + `SignatureAdoptPanel`)
- [ ] Canvas signature tactile utilisable
- [ ] SignWell / signature interne – retour app après redirect

### Permissions

- [ ] Pre-écran caméra puis permission OS
- [ ] Pre-écran push puis permission Android 13+
- [ ] Refus permission – fallback gracieux (galerie, pas de crash)

### Réseau & offline

- [ ] Bannière offline visible en mode avion
- [ ] Retour réseau – rechargement données cockpit
- [ ] Snapshot offline dossiers (`OfflineDataBanner`) lisible

### Sécurité & cycle de vie

- [ ] Biométrie cold start
- [ ] Veille ⏻ → reconnexion
- [ ] AppUpdateGate – MAJ optionnelle et forcée
- [ ] Version embarquée AAB vs changelog API cohérents

### Polish

- [ ] Haptic sur FAB et signature (appareil compatible)
- [ ] Onboarding première connexion – pas de répétition gênante
- [ ] Contraste badges statuts (WCAG AA)

---

## 8. Prompt à copier-coller dans ChatGPT

```
Tu es un expert UX/UI mobile natif (Android Material, Capacitor, accessibilité WCAG) et QA d’applications SaaS B2C.

Contexte : Greffio est une application Android (Capacitor) de formalités d’entreprise (statuts, greffe, documents signables). Je t’attache le fichier « contexte-audit-app-mobile-chatgpt.md » du repo Greffio (commit main ~4b9ab18).

Mission – audit **application mobile native Android uniquement** :
1. Auditer l’expérience in-app : shell, bottom tabs, drawer, accueil, dossiers, documents, signature, compte, permissions, offline, back button, clavier, biométrie, MAJ Play Store.
2. Ignorer la refonte de la charte couleur Greffio (bleu marine validé) et la landing desktop.
3. Distinguer clairement : problèmes **natifs Android** vs problèmes **web embarqué** (layout desktop sur éditeurs documents).
4. Lister par sévérité P0 / P1 / P2 avec : écran, problème, recommandation concrète (fichier/composant/copy), effort S/M/L.
5. Proposer 5 quick wins < 1 jour dev **spécifiques app native**.
6. Proposer 3 améliorations premium compatibles Capacitor (sans refonte identité).
7. Donner une checklist QA Android complète (émulateur + appareil réel) et un plan de rebuild AAB si nécessaire.

Format de réponse :
- Résumé exécutif (5 lignes)
- Tableau priorités
- Matrice route × shell oui/non × problème
- Wireframes textuels ASCII si utile
- Plan test manuel (cold start, deep link, mode avion, signature, push refusée)
- Recommandations build/release (versionCode, cap sync, Play Console)

Contraintes produit figées :
- Bottom nav 5 onglets + FAB « Nouveau » conservés
- 5e onglet app = Compte (Messages via drawer)
- Drawer groupé Mon activité / Pilotage / Créer / Compte
- Identité Greffio figée
- iOS hors scope sauf notes préparatoires
```

---

## 9. Fichiers clés à citer dans l’audit

```
src/mobile/MobileAppShell.jsx
src/mobile/MobileTopBar.jsx
src/mobile/MobileNativeOfflineBanner.jsx
src/mobile/MobilePushRegistration.jsx
src/mobile/MobileDocumentScanner.jsx
src/mobile/ui/MobileStickyFormActions.jsx
src/mobile/ui/MobilePageContainer.jsx
src/mobile/ui/MobileCockpitOnboarding.jsx
src/mobile/context/MobileShellOverlayContext.jsx
src/components/MobileSidebarDrawer.jsx
src/config/mobileNavigation.js
src/config/mobileStore.js
src/context/BiometricSessionContext.jsx
src/mobile/BiometricUnlockScreen.jsx
src/components/AppUpdateGate.jsx
src/utils/platform.js
src/utils/mobileHaptics.js
server/config/appVersion.js
android/app/src/main/AndroidManifest.xml
capacitor.config.json
docs/contexte-audit-mobile-greffio-chatgpt.md   (référence technique web + app)
```

---

## 10. Build & release (référence audit)

| Étape | Commande |
|-------|----------|
| Build web embarqué | `npm run build` |
| Sync Capacitor | `npm run mobile:build` ou `npx cap sync android` |
| AAB release | `cd android && ./gradlew bundleRelease` |
| Version | `android/release-version.properties` + `server/config/appVersion.js` |
| Play Store | `com.greffio.app` |

**Rappel audit** : les utilisateurs app ne voient les fixes front qu’après publication d’un nouvel AAB (sauf contenu 100 % API).

---

## 11. État post-audit (juin 2026) – déjà livré, à valider en QA app

- [x] Audit mobile landing + cockpit (commit `4b9ab18`)
- [x] `MobilePageContainer` padding bottom nav
- [x] Back Android overlay priority
- [x] Documents actionnables + timeline dossier
- [x] Drawer structuré + note Messages/Compte
- [x] CTA sticky signature + clavier
- [x] Bannière offline native
- [x] Haptics + pre-permissions caméra/push
- [ ] QA manuelle app 1.2.6+ sur appareil physique (à faire par l’auditeur)
- [ ] Rebuild AAB incluant commit `4b9ab18` si pas encore publié sur Play

---

*Dernière mise à jour : juin 2026 – post audit mobile complet + signature sticky + offline + haptics (commit 4b9ab18).*
