# Greffio – État navigation mobile, drawer et production

**Date :** 13 juin 2026  
**Périmètre :** barre latérale mobile (drawer ☰), shell site web mobile, app Android Capacitor, alignement production  
**URLs vérifiées :**
- Site : `https://greffio.willentreprises.com`
- API : `https://api.greffio.willentreprises.com`

**Documents liés :**
- `docs/qa-android-release-checklist.md`
- `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md`
- `docs/UI_UX_AUDIT_2026-06-13.md`
- `releases/MOBILE_RELEASE_1.2.9.md`

---

## 1. Résumé exécutif

| Question | Réponse |
|----------|---------|
| Le drawer ☰ groupé est-il en production web ? | **Oui** – vérifié dans le bundle JS déployé |
| Les modifs site web mobile (shell, bottom nav, entries) sont-elles en prod ? | **Oui** – bundle `index-DXWQJ50I.js` du 13/06/2026 |
| Le drawer est-il dans l’app Android 1.2.9 ? | **Oui** – inclus dans l’AAB archivé (build 08/06) |
| Le terminal paiement accordéon est-il partout ? | **Web prod : oui** · **AAB 1.2.9 : non** (build antérieur au déploiement paiement) |
| Le code paiement est-il commité sur Git ? | **Non** – `GreffioPaymentTerminal.jsx` et refactors associés sont locaux |
| iOS | **Non démarré** – pas de dossier `ios/` |

**Conclusion :** la navigation mobile (drawer latéral + shell web mobile) est **opérationnelle en production**. L’écart principal concerne le **paiement accordéon** : présent sur le site déployé, absent de l’AAB Android 1.2.9 tant qu’un rebuild n’est pas fait.

---

## 2. Vérification production (13 juin 2026)

### 2.1 Bundle frontend déployé

| Élément | Valeur |
|---------|--------|
| Domaine | `greffio.willentreprises.com` |
| Script principal | `/assets/index-DXWQJ50I.js` |
| Taille bundle | ~1,95 Mo |
| Archive déploiement | `dist_20260613_001500.zip` (cf. `PAYMENT_TERMINAL_MODIFICATIONS`) |
| Méthode | MCP Hostinger `hosting_deployStaticWebsite` |

### 2.2 Marqueurs détectés dans le bundle production

Analyse par recherche de chaînes dans `index-DXWQJ50I.js` :

| Marqueur | Statut | Interprétation |
|----------|--------|----------------|
| `Mon activité` | ✅ Présent | Groupes drawer déployés |
| `Pilotage` | ✅ Présent | Groupe drawer Pilotage |
| `Tableau de bord` | ✅ Présent | Entrées drawer |
| `Assistant Greffio` | ✅ Présent | Entrée drawer |
| `Nouvelle démarche` | ✅ Présent | Groupe Créer |
| `/boutique` | ✅ Présent | Boutique dans drawer (commit `c928531`) |
| `Messages, pilotage` | ✅ Présent | Hint drawer ☰ |
| `onglet Compte remplace` | ✅ Présent | Hint spécifique app native |
| `MobileSidebarDrawer` | ✅ Présent | Composant drawer embarqué |
| `MobileWebShell` | ✅ Présent | Shell navigateur mobile |
| `MobileAppShell` | ✅ Présent | Shell app native (même bundle) |
| `WebMobileBottomNav` | ✅ Présent | Bottom nav web mobile |
| `Navigation cockpit mobile` | ✅ Présent | Aria-label bottom nav |
| `GreffioPaymentTerminal` | ✅ Présent | Terminal accordéon paiement |
| `Amazon Pay` | ✅ Présent | Mode paiement |
| `Mode test Google` | ✅ Présent | Badge Google Pay TEST |
| `WalletPaymentTerminal` | ❌ Absent | Ancien terminal retiré du build déployé |
| Onglets `Accueil`, `Dossiers`, `Documents`, `Messages`, `Compte` | ✅ Présents | Bottom nav web + native |

> Les noms de fonctions minifiés (`buildMobileDrawerNavGroups`, `shouldUseMobileWebShell`) n’apparaissent pas en clair dans le bundle – comportement normal après build Vite.

### 2.3 API production

```bash
curl -sS https://api.greffio.willentreprises.com/api/app-version
```

| Champ | Valeur prod |
|-------|-------------|
| `latestVersionName` | `1.2.9` |
| `latestVersionCode` | `261510008` |
| `minimumRequiredVersionCode` | `261422041` |

```bash
curl -sS https://api.greffio.willentreprises.com/api/payments/amazon-pay/config
# → enabled: true, sandbox: false (LIVE)

curl -sS https://api.greffio.willentreprises.com/api/payments/google-pay/config
# → enabled: true, environment: TEST, readyForPayment: true
```

---

## 3. Architecture – trois surfaces

```
┌─────────────────────────────────────────────────────────────────┐
│ DESKTOP (≥ 768 px navigateur)                                    │
│ Header.jsx + Sidebar.jsx (sidebar desktop classique)               │
│ Pages src/pages/*                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MOBILE WEB (< 768 px navigateur, non Capacitor)                  │
│ MobileWebShell → MobileWebHeader + drawer ☰ + WebMobileBottomNav│
│ Entries *Entry.jsx → Mobile*Page.jsx si viewport mobile            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ APP ANDROID NATIF (Capacitor, com.greffio.app)                   │
│ MobileAppShell → MobileTopBar + drawer ☰ + bottom nav native    │
│ Mêmes Entries → Mobile*Page.jsx (isCapacitorNative() = true)     │
│ + biométrie, offline banner, push, back button Android           │
└─────────────────────────────────────────────────────────────────┘
```

### Point d’entrée routing (`src/App.jsx`)

```javascript
// Layout – choix du shell
const content = shouldUseMobileShell(location.pathname)
  ? <MobileAppShell>{children}</MobileAppShell>
  : <MobileWebShell>{children}</MobileWebShell>;
```

- **Natif** : `shouldUseMobileShell()` → `MobileAppShell` sur les routes cockpit listées dans `MOBILE_SHELL_PREFIXES`
- **Mobile web** : `shouldUseMobileWebShell()` → `MobileWebShell` si `< 768px` et route non exclue (`/ops`, `/signature/`, etc.)
- **Desktop** : les deux shells retournent `children` sans wrapper → Header + Sidebar desktop

---

## 4. Drawer latéral (`MobileSidebarDrawer`)

### 4.1 Composant unique partagé

| Fichier | Rôle |
|---------|------|
| `src/components/MobileSidebarDrawer.jsx` | Drawer latéral (web mobile + app native) |
| `src/config/mobileNavigation.js` | Source unique des groupes et onglets |
| `src/mobile/MobileAuthenticatedNav.jsx` | Bouton ☰ (`MobileMenuButton`) |

Le drawer **n’est pas** la `Sidebar.jsx` desktop. C’est un panneau latéral fixe (88 % largeur, max 320 px) ouvert via le bouton menu du header mobile.

### 4.2 Structure des groupes (drawer authentifié)

Source : `MOBILE_DRAWER_NAV_GROUPS` dans `mobileNavigation.js`

| Groupe | Entrées |
|--------|---------|
| **Mon activité** | Tableau de bord, Dossiers, Documents, Boutique, Messages |
| **Pilotage** | Assistant Greffio, Pilotage, Statuts (+ Interfaces si utilisateur interne) |
| **Créer** | Nouvelle démarche |
| **Compte** | Mon profil, Paramètres, Aide / support |

**CTA bas de drawer :** « Démarrer une nouvelle formalité accompagnée » → `QUESTIONNAIRE_NEW_PATH`

**Hint contextuel :**
- Web mobile : « Messages, pilotage et statuts sont accessibles via ce menu ☰ »
- App native : « … – l’onglet Compte remplace Messages sur l’app. »

### 4.3 Comportement

| Comportement | Détail |
|--------------|--------|
| Ouverture | Bouton ☰ dans `MobileWebHeader` (web) ou `MobileTopBar` (native) |
| Fermeture | Overlay, bouton X, touche Escape, navigation (changement de route) |
| Scroll body | Bloqué (`overflow: hidden`) tant que le drawer est ouvert |
| Back Android | Ferme le drawer en priorité (ordre overlays dans QA checklist) |

### 4.4 Historique Git drawer (commits clés)

| Commit | Date | Contenu |
|--------|------|---------|
| `d4b5d63` | – | responsive mobile + bottom nav + drawer cockpit |
| `bdaa2e6` | – | drawer centralisé |
| `6ddb4d8` | – | parité cockpit, entries, release 1.2.6 |
| `4b9ab18` | – | audit UX, signature sticky, offline natif |
| `c928531` | juin 2026 | ajout Boutique dans drawer |

**État Git au 13/06 :** aucune modification locale en attente sur `MobileSidebarDrawer.jsx`, `MobileWebShell.jsx`, `MobileAppShell.jsx`, `mobileNavigation.js`.

---

## 5. Comparaison web mobile vs app native

### 5.1 Bottom navigation

| Position | Site web mobile (`MOBILE_AUTH_TABS_WEB`) | App native (`MOBILE_AUTH_TABS_NATIVE`) |
|----------|------------------------------------------|----------------------------------------|
| 1 | Accueil → `/dashboard` | Accueil → `/dashboard` |
| 2 | Dossiers → `/dossiers` | Dossiers → `/dossiers` |
| 3 | **Nouveau** (FAB) → questionnaire | **Nouveau** (FAB) → questionnaire |
| 4 | Documents → `/documents` | Documents → `/documents` |
| 5 | **Messages** → `/team` | **Compte** → `/mobile/account` |

**Conséquence :** sur l’app native, Messages n’est pas un onglet direct – il est dans le drawer ☰. Sur le site mobile, Messages est le 5e onglet.

### 5.2 Headers

| Surface | Composant | Particularités |
|---------|-----------|----------------|
| Web mobile | `MobileWebHeader.jsx` | Titre de page + actions cockpit |
| App native | `MobileTopBar.jsx` | Logo Greffio + cloche notifications + menu ☰ |

### 5.3 Exclusivités app native

| Feature | Fichier |
|---------|---------|
| Bannière offline | `MobileNativeOfflineBanner.jsx` |
| Push FCM | `MobilePushRegistration.jsx` |
| Back button Android | `MobileAppShell.jsx` (listener Capacitor) |
| Haptics FAB Nouveau | `triggerMobileHaptic` |
| Biométrie | `BiometricUnlockScreen.jsx` |
| AppUpdateGate | `AppUpdateGate.jsx` |

---

## 6. Matrice d’inclusion par surface

| Fonctionnalité | Code source (Git) | Prod web (`index-DXWQJ50I.js`) | AAB Android 1.2.9 | Notes |
|----------------|-------------------|-------------------------------|-------------------|-------|
| Drawer ☰ groupé | ✅ Commité | ✅ Déployé | ✅ Inclus (build 08/06) | Même composant |
| Bottom nav web 5 onglets | ✅ Commité | ✅ Déployé | N/A (navigateur) | – |
| Bottom nav native (Compte) | ✅ Commité | N/A | ✅ Inclus | 5e onglet = Compte |
| Entries mobile (`*Entry.jsx`) | ✅ Commité | ✅ Déployé | ✅ Inclus | 12 entries |
| Boutique dans drawer | ✅ `c928531` | ✅ Déployé | ✅ Si AAB post-commit | Commit avant build 1.2.9 |
| Simulateur mobile navigateur | ✅ `2a68991` | ✅ Déployé | ✅ (via entry) | Layout compact champs |
| Terminal `GreffioPaymentTerminal` | ⚠️ Local non commité | ✅ Déployé 13/06 | ❌ Probablement absent | AAB buildé 08/06 |
| Amazon Pay live | ✅ Backend commité | ✅ | ✅ (API runtime) | Config via API |
| Google Pay TEST | ✅ | ✅ Badge visible | ✅ | `environment: TEST` |
| Brouillons fantômes / purge | ✅ Commité | ✅ (si bundle à jour) | ✅ | API + UI |
| UX tablette 768–1024 px | ⚠️ Partiel | Sidebar desktop | N/A | Gap audit MO3 |

---

## 7. Pages mobile – pattern Entry

Chaque route cockpit majeure passe par un **Entry** qui bascule automatiquement :

```javascript
// Exemple : src/mobile/entries/DossiersEntry.jsx
isCapacitorNative() || isMobileBrowserViewport()
  ? <MobileDossiersPage />
  : <DossiersPage />
```

### Liste des entries

| Entry | Route(s) | Page mobile | Page desktop |
|-------|----------|-------------|--------------|
| `DashboardEntry` | `/dashboard` | `MobileHomePage` | `HomePage` / dashboard |
| `DossiersEntry` | `/dossiers` | `MobileDossiersPage` | `DossiersPage` |
| `DossierDetailEntry` | `/dossier/:id` | `MobileDossierDetailPage` | `DossierDetailPage` |
| `DocumentsEntry` | `/documents` | `MobileDocumentsPage` | `DocumentsPage` |
| `TeamEntry` | `/team` | `MobileTeamPage` | `TeamPage` |
| `ChatEntry` | `/chat` | `MobileChatPage` | `ChatPage` |
| `AnalyticsEntry` | `/analytics` | `MobileAnalyticsPage` | `AnalyticsPage` |
| `PaymentEntry` | `/paiement` | `MobilePaymentPage` | `PaymentPage` |
| `ProfileEntry` | `/profil` | variante mobile | `ProfilePage` |
| `SettingsEntry` | `/settings` | variante mobile | `SettingsPage` |
| `QuestionnaireEntry` | `/questionnaire`, `/statuts-gratuits` | variante mobile | desktop |
| `StatutsEntry` | `/statuts` | variante mobile | desktop |
| `FormalityWizardEntry` | `/simulateur` | `presentation="mobile"` | desktop |

Routes cockpit **sans entry dédiée** mais couvertes par le shell : `/boutique`, `/mobile/account`, `/mobile/search`, `/tarifs`, `/contact`.

---

## 8. Breakpoints et exclusions

### 8.1 Breakpoints (`src/utils/platform.js`)

| Constante | Valeur | Effet |
|-----------|--------|-------|
| `MOBILE_BREAKPOINT` | 768 px | Seuil mobile web |
| `TABLET_BREAKPOINT` | 1024 px | Tablette = layout desktop |

### 8.2 Routes exclues du shell mobile web

Préfixes dans `MOBILE_WEB_SHELL_EXCLUDED_PREFIXES` :
- `/ops`, `/ops-legacy`, `/ops-observability`
- `/signature/` (pages signables plein écran)

### 8.3 Routes avec shell natif Android

Préfixes dans `MOBILE_SHELL_PREFIXES` : `/dashboard`, `/dossiers`, `/dossier`, `/documents`, `/mobile`, `/chat`, `/profil`, `/settings`, `/questionnaire`, `/team`, `/analytics`, `/statuts`, `/simulateur`, `/signature`, `/paiement`, `/tarifs`, `/contact`, etc.

Sur ces routes en natif : **Header desktop masqué**, shell `MobileAppShell` actif.

---

## 9. Écarts connus et dette

### 9.1 Écart web prod ↔ AAB 1.2.9 (paiement)

| | Web prod (13/06) | AAB 1.2.9 (08/06) |
|--|------------------|-------------------|
| `GreffioPaymentTerminal` | ✅ | ❌ (build antérieur) |
| `WalletPaymentTerminal` | ❌ retiré | ⚠️ possiblement encore présent |
| Panels Amazon/Google Pay refondus | ✅ | ⚠️ version antérieure |

**Action :** rebuild `1.2.10` après commit du lot paiement.

### 9.2 Écart Git ↔ production (paiement)

Fichiers modifiés localement, **non commités** au 13/06 :

```
src/components/payments/GreffioPaymentTerminal.jsx   (nouveau, untracked)
src/components/payments/AmazonPayCheckoutPanel.jsx   (modifié)
src/components/payments/GooglePayCheckoutPanel.jsx   (modifié)
src/components/payments/WalletPaymentTerminal.jsx    (modifié)
src/hooks/useGooglePay.js                            (modifié)
src/mobile/MobilePaymentPage.jsx                     (modifié)
src/pages/PaymentPage.jsx                            (modifié)
server/services/googlePayService.js                (modifié)
```

Le site production reflète le **build local déployé**, pas nécessairement `main` sur GitHub.

### 9.3 Finitions UX (audit 13/06 – non bloquantes)

| ID | Sujet | Priorité | Statut |
|----|-------|----------|--------|
| MO3 | Découvrabilité entrées secondaires | 🟠 | Partiellement couvert par drawer groupé |
| – | Tablette 768–1024 : sidebar desktop | 🟠 | Non traité |
| – | Badges dossiers harmonisés | 🟡 | Non traité |
| P1-11 | Drawer « Plus » enrichi | P1 | Groupes actuels = première itération |

---

## 10. Android – release 1.2.9

| Champ | Valeur |
|-------|--------|
| `versionName` | `1.2.9` |
| `versionCode` | `261510008` |
| Package | `com.greffio.app` |
| AAB | `releases/android/greffio-1.2.9-261510008.aab` |
| SHA256 | `CBC79D67828454C08C8723D11F0B54A9AA2E41E4ADC7AB2C1476CEF433F35AA1` |
| Date build | 2026-06-08 |
| Notes | Repackage 1.2.8 – voir `releases/MOBILE_RELEASE_1.2.9.md` |

**Inclus dans 1.2.9 :** drawer groupé, shell natif, biométrie, offline, scanner PDF, entries mobile, parcours simulateur/questionnaire récents (commits ≤ 08/06).

**Probablement absent de 1.2.9 :** terminal paiement accordéon du 13/06.

---

## 11. Checklist validation manuelle

### 11.1 Site web mobile (navigateur < 768 px, connecté)

- [ ] Ouvrir `https://greffio.willentreprises.com/dashboard` sur téléphone ou DevTools mobile
- [ ] Vérifier absence du header desktop classique
- [ ] Vérifier bottom nav 5 onglets : Accueil, Dossiers, Nouveau, Documents, **Messages**
- [ ] Appuyer sur ☰ → drawer avec groupes Mon activité / Pilotage / Créer / Compte
- [ ] Vérifier entrée **Boutique** dans Mon activité
- [ ] Naviguer vers Assistant, Pilotage, Statuts via drawer
- [ ] Fermer drawer par overlay ou navigation
- [ ] `/paiement` → terminal accordéon visible, Amazon Pay par défaut, badge Google TEST

### 11.2 App Android (build Play ou AAB 1.2.9)

- [ ] Cold start + login
- [ ] Bottom nav : 5e onglet = **Compte** (pas Messages)
- [ ] Drawer ☰ : hint « l’onglet Compte remplace Messages »
- [ ] Messages accessible via drawer
- [ ] Back button ferme drawer avant navigation
- [ ] `/paiement` : vérifier si terminal accordéon ou ancienne UI (attendu : ancienne UI sur 1.2.9)

### 11.3 Tablette (768–1024 px)

- [ ] Comportement actuel : sidebar desktop (pas drawer mobile)
- [ ] Documenter si acceptable ou si lot UX tablette requis

---

## 12. Commandes de re-vérification

### Bundle production

```bash
# Hash du script principal
curl -sS "https://greffio.willentreprises.com/" | grep -o 'assets/index-[^"]*\.js'

# Marqueurs drawer + paiement
node -e "
const https=require('https');
https.get('https://greffio.willentreprises.com/assets/index-DXWQJ50I.js',r=>{
  let d=''; r.on('data',c=>d+=c);
  r.on('end',()=>{
    ['Mon activité','GreffioPaymentTerminal','MobileSidebarDrawer','WebMobileBottomNav']
      .forEach(m=>console.log((d.includes(m)?'OK':'KO')+': '+m));
  });
});
"
```

### API

```bash
curl -sS https://api.greffio.willentreprises.com/api/app-version
curl -sS https://api.greffio.willentreprises.com/api/payments/amazon-pay/config
curl -sS https://api.greffio.willentreprises.com/api/payments/google-pay/config
```

### Build local + Android

```bash
npm run build
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
```

---

## 13. Prochaines actions recommandées

| Priorité | Action | Effet |
|----------|--------|-------|
| P0 | Committer le lot `GreffioPaymentTerminal` + panels paiement | Aligner Git ↔ prod |
| P0 | Rebuild AAB `1.2.10` / `261510009` | Parité paiement app Android |
| P1 | QA manuelle checklist §11 sur appareil réel | Confirmer drawer + navigation |
| P1 | Play Internal Testing avec nouveau AAB si paiement validé | Release Android à jour |
| P2 | Lot UX tablette (drawer ou breakpoint `lg`) | Fermer gap audit MO3 |
| P2 | Google Pay PRODUCTION (CAWL + merchant IDs) | Paiement live complet |

---

## 14. Fichiers source – index rapide

| Fichier | Rôle |
|---------|------|
| `src/App.jsx` | Choix shell, routes, masquage Header desktop |
| `src/utils/platform.js` | `isCapacitorNative`, `shouldUseMobileWebShell`, `shouldUseMobileShell` |
| `src/config/mobileNavigation.js` | Groupes drawer, onglets web/native |
| `src/components/MobileSidebarDrawer.jsx` | Drawer latéral partagé |
| `src/mobile/MobileWebShell.jsx` | Shell navigateur mobile |
| `src/mobile/MobileAppShell.jsx` | Shell app Android |
| `src/mobile/MobileWebHeader.jsx` | Header web mobile |
| `src/mobile/MobileTopBar.jsx` | Header app native |
| `src/components/WebMobileBottomNav.jsx` | Bottom nav web mobile |
| `src/mobile/entries/*.jsx` | Bascule desktop ↔ mobile |
| `src/components/payments/GreffioPaymentTerminal.jsx` | Terminal accordéon (local) |
| `server/config/appVersion.js` | Version API mobile |
| `android/release-version.properties` | versionCode / versionName Android |

---

*Document généré le 13 juin 2026 – vérification production effectuée par analyse du bundle `index-DXWQJ50I.js` et des endpoints API.*
