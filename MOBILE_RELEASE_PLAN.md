# Plan de release mobile Greffio

> Android prod → TestFlight iOS → prod iOS  
> App remote-first en production · AAB ponctuel pour le natif · Une seule app multi-rôles

---

## 1. Décisions produit (validées)

| Sujet | Décision |
|-------|----------|
| Nom stores | **Greffio** |
| Sous-titre Play | Formalités d'entreprise simplifiées |
| Sous-titre App Store | Formalités entreprise |
| Package / Bundle ID | `com.greffio.app` |
| Mode app | **Remote-first** en production (`capacitor.config.remote.json`) ; AAB publié quand le shell natif change |
| Entité Apple | William Establishments (Organization) |
| Push V1 | FCM (Android) + APNs (iOS), pas OneSignal |
| Biométrie | Déverrouillage local après login, jamais mot de passe en clair |
| Scan docs | Photo / galerie / fichier → **conversion PDF obligatoire** → upload |
| Offline V1 | Brouillon questionnaire, cache dossiers RO, PDF déjà téléchargés |
| Deep links | `greffio.willentreprises.com` (+ futur `app.greffio…`) |
| OPS | Même app, rôles distincts (pas d'app séparée V1) |
| Légal | `/confidentialite`, `/suppression-compte`, `/cookies` · `support@willentreprises.com` |

---

## 2. Différenciation mobile vs site web

L'app **ne doit pas** ressembler à une WebView du site. Innovations V1 :

1. **Bottom navigation 5 onglets** (Accueil, Dossiers, Assistant, Documents, Compte)
2. **Accueil opérationnel** : prochaine action, recherche instantanée, scan → PDF natif
3. **Assistant / recherche intelligente** via API backend (`POST /api/mobile/search`), IA côté serveur uniquement
4. **Centre de notifications** (cloche header) – push branchés ensuite
5. **Conversion PDF automatique** à la capture (jsPDF + compression raisonnable)
6. **Cache offline minimal** avec indication « données hors ligne »

Référence design : Qonto, Linear, Stripe – fond clair, cartes arrondies, typographie nette.

---

## 3. Architecture technique actuelle

```
src/mobile/
  MobileAppShell.jsx      # Bottom nav + deep links
  MobileTopBar.jsx        # Logo + cloche notifications
  MobileHomePage.jsx      # Accueil mobile
  MobileSearchPage.jsx    # Assistant / recherche
  MobileAccountPage.jsx   # Compte
  MobileDocumentScanner.jsx
  DashboardEntry.jsx      # Switch dashboard web / mobile

src/config/mobileStore.js # Métadonnées stores + tabs
src/utils/platform.js     # isCapacitorNative(), shouldUseMobileShell()
src/utils/documentPdf.js  # Conversion image → PDF
src/utils/mobileOffline.js

server/utils/mobileSearch.js
POST /api/mobile/search   # Recherche locale + actions (IA à brancher)
```

Capacitor : `webDir: dist` · `@capacitor/app`, `camera`, `filesystem`, `preferences`

---

## 4. Ordre d'implémentation exact

### Phase A – Fondations (en cours / fait)

- [x] `capacitor.config.json` → bundle local
- [x] `capacitor.config.dev.json` → URL live pour dev
- [x] Shell mobile + routes `/mobile/search`, `/mobile/account`
- [x] Masquer Sidebar / Header web sur natif
- [x] Conversion PDF + scanner Capacitor
- [x] Route backend recherche mobile
- [x] Deep links Android manifest + `.well-known`
- [ ] Remplacer SHA256 dans `public/.well-known/assetlinks.json`
- [ ] Remplacer Team ID dans `apple-app-site-association`
- [ ] Brancher brouillon offline dans `QuestionnairePage`

### Phase B – Android production

1. Vérifier Play Console : test ouvert vs production
2. Configurer secrets GitHub (voir §6)
3. Si changement natif : `npm run mobile:build:remote` → AAB signé
4. Upload Play (internal → open → production)
5. Si changement web seul : déployer le bundle web Hostinger + smoke app réelle
6. Vérifier pages légales publiques (sans login)

### Phase C – iOS TestFlight

1. `npx cap add ios` (si absent)
2. Créer app App Store Connect : Greffio, `com.greffio.app`
3. Certificats + provisioning (Organization)
4. Associated Domains : `applinks:greffio.willentreprises.com`
5. Archive Xcode → TestFlight
6. Tests internes équipe William Establishments

### Phase D – Fonctions natives (ordre recommandé)

1. **Deep links** – Universal Links + App Links (fait côté config, tester E2E)
2. **Auth / session + biométrie** – `@capacitor-community/biometric-auth` ou équivalent + `@capacitor/preferences` / Keychain
3. **Upload documents natif** – scanner PDF (fait), recadrage optionnel V1.1
4. **Push notifications** – FCM + `@capacitor/push-notifications`, APNs key App Store Connect
5. **Cache / offline** – brouillon questionnaire, meta PDF téléchargés

### Phase E – Enrichissement produit

1. Recherche backend enrichie (documents, factures, statuts)
2. Couche IA serveur (OpenAI **uniquement backend**, filtrage par userId/rôle)
3. Notifications push réelles (remplacer sample dans `MobileTopBar`)
4. Actions rapides depuis résultats recherche

### Phase F – iOS production

1. Métadonnées App Store (captures, description, âge, export compliance)
2. Review Apple (voir §8 risques)
3. Release progressive

---

## 5. Commandes

```bash
# Build web remote + sync Android (mode prod actuel)
npm run mobile:build:remote

# Build bundled seulement si une release locale embarquée est explicitement voulue
npm run mobile:build

# Dev avec bundle local
npm run build && npx cap sync android && npx cap open android

# Dev live (charger le site distant)
# Copier capacitor.config.dev.json → capacitor.config.json, puis cap sync

# Tests backend recherche
npm run dev:api
# POST /api/mobile/search { "query": "où en est mon dossier" }

# Empreinte SHA256 clé upload (pour assetlinks.json)
keytool -list -v -keystore release.keystore -alias YOUR_ALIAS
```

---

## 6. Secrets GitHub / ops

### Android (CI `mobile-artifacts.yml`)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Keystore upload encodé base64 |
| `ANDROID_KEYSTORE_PATH` | ex. `release.keystore` |
| `ANDROID_STORE_PASSWORD` | Mot de passe keystore |
| `ANDROID_KEY_ALIAS` | Alias clé |
| `ANDROID_KEY_PASSWORD` | Mot de passe clé |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Compte service Play Console |
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.greffio.app` |

### iOS (à configurer)

| Secret | Description |
|--------|-------------|
| `APP_STORE_CONNECT_KEY_ID` | Clé API ASC |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Clé privée .p8 |
| Certificats / profiles | Gérés Xcode ou fastlane match |

### Push V1

| Secret | Plateforme |
|--------|------------|
| `FCM_SERVER_KEY` / service account | Android |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY` | iOS |

### Backend

| Variable | Usage |
|----------|-------|
| `OPENAI_API_KEY` | IA recherche – **serveur uniquement** |
| `API_BASE_URL` | `https://api.greffio.willentreprises.com` |

---

## 7. Fichiers à modifier par fonctionnalité

| Fonctionnalité | Fichiers |
|----------------|----------|
| Deep links | `AndroidManifest.xml`, `public/.well-known/*`, iOS entitlements |
| Biométrie | Nouveau `src/mobile/BiometricUnlockGate.jsx`, `SettingsPage`, plugin Capacitor |
| Push | `server/` routes enregistrement token, `MobileTopBar`, `@capacitor/push-notifications` |
| Scan PDF | `src/utils/documentPdf.js`, `MobileDocumentScanner.jsx` |
| Offline | `mobileOffline.js`, `QuestionnairePage.jsx`, `DocumentsPage.jsx` |
| IA recherche | `server/utils/mobileSearch.js`, route assistant existante |
| Stores metadata | `src/config/mobileStore.js`, Play Console, App Store Connect |

---

## 8. Risques de rejet store

### Google Play

- **Politique de confidentialité** : URL publique obligatoire → vérifier `/confidentialite`
- **Suppression de compte** : `/suppression-compte` accessible sans login
- **Permissions caméra** : justifier dans la fiche (envoi documents)
- **Données sensibles** : pas de mot de passe stocké, biométrie = déverrouillage local
- **Target API** : respecter niveau API minimum Play

### Apple

- **4.2 Minimum Functionality** : l'app doit apporter une UX native (shell mobile, scan PDF, assistant) – pas une simple WebView
- **5.1.1 Données** : politique confidentialité + usage caméra / notifications
- **Organization** : D-U-N-S / validation légale William Establishments
- **Sign in with Apple** : non requis si login email propre existe
- **Push** : demander permission au bon moment, pas au premier lancement

---

## 9. Timeline indicative

| Semaine | Objectif |
|---------|----------|
| S1 | Valider build AAB, secrets signing, test ouvert Play |
| S1–S2 | App Store Connect + projet iOS Capacitor |
| S2 | TestFlight build 1 (shell + auth + deep links) |
| S2–S3 | Biométrie + push + offline brouillon |
| S3 | Android production publique |
| S3–S4 | TestFlight stabilisation + prod iOS |

---

## 10. Checklist pré-publication

- [ ] `npm run build` sans erreur
- [ ] AAB signé uploadé Play
- [ ] `assetlinks.json` avec vraie empreinte SHA256
- [ ] Pages légales OK : confidentialité, cookies, suppression compte
- [ ] Email support visible : `support@willentreprises.com`
- [ ] Test deep link email « Voir mon dossier »
- [ ] Test scan photo → PDF → upload dossier
- [ ] Test offline cache dossiers
- [ ] TestFlight ≥ 1 build validé équipe
- [ ] Push test sur Android + iOS

---

## 11. Support

- Support : support@willentreprises.com
- Domaine : greffio.willentreprises.com
- API : api.greffio.willentreprises.com
