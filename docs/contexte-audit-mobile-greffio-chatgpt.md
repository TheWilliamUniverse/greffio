# Contexte Greffio – Audit mobile web & application native (référence ChatGPT)

> **Usage** : coller ce fichier (ou des sections) dans une conversation ChatGPT pour qu’il **audite** l’expérience mobile Greffio (navigateur &lt;768px et app Android Capacitor), **cartographie les écarts** vs desktop, et propose un **plan d’actions** priorisé (immédiat / durable).
>
> **Code source de vérité** : le repo `TheWilliamUniverse/greffio` prime sur ce document en cas de divergence.
>
> **Identité visuelle** : la landing desktop (`LandingPage.jsx`) et le design system global sont **figés** – toute recommandation mobile doit enrichir localement sans refonte transversale (voir règle `.cursor/rules/preserve-brand-identity.mdc`).

---

## 1. Les trois surfaces Greffio

| Surface | Détection | Shell / layout | Navigation principale |
|---------|-----------|----------------|------------------------|
| **Desktop web** | `window.innerWidth >= 768` et pas Capacitor | `Header` + contenu page + `Sidebar` (`hidden md:flex`) | Sidebar fixe gauche |
| **Mobile navigateur** | `isMobileBrowserViewport()` – web, largeur &lt;768 | `MobileWebShell` (header sticky + bottom nav) | Bottom nav publique ou cockpit + **drawer latéral** (hamburger) si connecté |
| **App native Android** | `isCapacitorNative()` | `MobileAppShell` (top bar + bottom tabs) | 5 onglets `MOBILE_BOTTOM_TABS` + **drawer latéral** (hamburger) si connecté |

### 1.1 Point d’entrée routing (`App.jsx`)

```
Layout
  ├─ Header (caché si mobile shell actif ou routes sans header)
  └─ shouldUseMobileShell(path) ? MobileAppShell : MobileWebShell
       └─ children (Routes)
```

- **`shouldUseMobileWebShell(pathname)`** : vrai si web + viewport &lt;768 + route non exclue (`/ops`, `/signature/…`).
- **`shouldUseMobileShell(pathname)`** : vrai si Capacitor + préfixe dans `MOBILE_SHELL_PREFIXES`.

Fichier clé : `src/utils/platform.js`.

---

## 2. Cartographie fichiers mobile

### 2.1 Shells & navigation

| Fichier | Rôle |
|---------|------|
| `src/utils/platform.js` | Breakpoints, détection Capacitor, listes de routes shell |
| `src/mobile/MobileWebShell.jsx` | Enveloppe mobile navigateur : header, drawer, bottom nav, padding safe-area |
| `src/mobile/MobileAppShell.jsx` | Enveloppe app native : top bar, drawer, push, bottom tabs |
| `src/mobile/MobileWebHeader.jsx` | Header sticky web mobile (logo ou titre + hamburger si auth) |
| `src/mobile/MobileTopBar.jsx` | Header app native (logo, hamburger, cloche notifications) |
| `src/components/MobileSidebarDrawer.jsx` | **Drawer latéral** – miroir fonctionnel de `Sidebar.jsx` |
| `src/mobile/MobileAuthenticatedNav.jsx` | Wrapper drawer + `MobileMenuButton` |
| `src/components/WebMobileBottomNav.jsx` | Bottom nav cockpit **web mobile** (5 icônes) |
| `src/mobile/MobilePublicBottomNav.jsx` | Bottom nav **visiteur** web mobile |
| `src/config/mobileStore.js` | Métadonnées Play Store + `MOBILE_BOTTOM_TABS` app native |
| `src/components/Sidebar.jsx` | Sidebar desktop – **`return null` sur Capacitor** |

### 2.2 Pages mobile dédiées

| Fichier | Route(s) | Notes |
|---------|----------|-------|
| `src/mobile/MobileLandingPage.jsx` | `/` via `LandingPage.jsx` (`md:hidden`) | Version mobile de la landing |
| `src/mobile/MobileHomePage.jsx` | `/dashboard` via `DashboardEntry` | Accueil cockpit mobile |
| `src/mobile/MobileDossiersPage.jsx` | `/dossiers` via `DossiersEntry` | Liste dossiers |
| `src/mobile/MobileDossierDetailPage.jsx` | `/dossier/:id` via `DossierDetailEntry` | Détail dossier |
| `src/mobile/MobilePaymentPage.jsx` | `/paiement` via `PaymentEntry` | Paiement |
| `src/mobile/MobileSearchPage.jsx` | `/mobile/search` | Recherche rapide |
| `src/mobile/MobileChatPage.jsx` | `/chat` via `ChatEntry` | Assistant IA |
| `src/mobile/MobileDocumentsPage.jsx` | `/documents` via `DocumentsEntry` | Didit + docs en ligne |
| `src/mobile/MobileTeamPage.jsx` | `/team` via `TeamEntry` | Messages |
| `src/mobile/MobileAnalyticsPage.jsx` | `/analytics` via `AnalyticsEntry` | Pilotage |
| `src/mobile/MobileAccountPage.jsx` | `/mobile/account`, `/profil`, `/settings` | Compte |
| `src/mobile/BiometricUnlockScreen.jsx` | Gate biométrie native | Capacitor uniquement |

### 2.3 Entrées conditionnelles (`*Entry.jsx`)

Pattern : `isCapacitorNative() || isMobileBrowserViewport() ? MobileX : DesktopX`.

| Entry | Mobile | Desktop fallback |
|-------|--------|------------------|
| `DashboardEntry.jsx` | `MobileHomePage` | `HomePage` |
| `DossiersEntry.jsx` | `MobileDossiersPage` | page desktop |
| `DossierDetailEntry.jsx` | `MobileDossierDetailPage` | page desktop |
| `PaymentEntry.jsx` | `MobilePaymentPage` | page desktop |
| `DocumentsEntry.jsx` | `MobileDocumentsPage` | `DocumentsPage` |
| `TeamEntry.jsx` | `MobileTeamPage` | `TeamPage` |
| `ChatEntry.jsx` | `MobileChatPage` | `ChatIAPage` |
| `AnalyticsEntry.jsx` | `MobileAnalyticsPage` | `AnalyticsPage` |
| `StatutsEntry.jsx` | `StatutesPage` mobile | lazy desktop |
| `QuestionnaireEntry.jsx` | shell padding | `QuestionnairePage` |
| `ProfileEntry.jsx` | redirect `/mobile/account` | `ProfilePage` |
| `SettingsEntry.jsx` | redirect `/mobile/account` | `SettingsPage` |
| `FormalityWizardEntry.jsx` | `FormalityWizardPage presentation="mobile"` | desktop |

**Sans entry mobile** (layout desktop étiré sur mobile web / app) :

- `/interfaces` → `InterfacesPage` (ops)
- Pages publiques : `/services`, `/tarifs`, `/ressources`, landing services SEO, etc.

---

## 3. État des corrections récentes (session en cours)

### 3.1 Landing mobile navigateur – enrichie

`MobileLandingPage.jsx` alignée fonctionnellement sur la landing desktop :

- Hero + CTAs « Générer mes statuts » / « Accéder au dashboard »
- Catalogue 6 premiers services (`LEGAL_SERVICES`)
- Section plateforme, parcours (steps + howItWorks)
- Recherche SIREN/SIRET + `CompanyLookupCard`
- Bandeau service privé indépendant
- Tarifs (`LandingPricingSection`)
- Section app (`GooglePlayStoreLink`, lien `/app`)
- FAQ (3 items), footer légal étendu

### 3.2 Barre latérale app + web mobile – branchée

Avant : `Sidebar.jsx` invisible sur Capacitor ; drawer présent seulement sur certaines pages desktop.

Après :

- `MobileAppShell` : `MobileSidebarDrawer` + hamburger via `MobileTopBar.onMenuClick`
- `MobileWebShell` : drawer + hamburger via `MobileWebHeader.onMenuClick` (utilisateur connecté, hors landing)
- `MobileSidebarDrawer` : retrait de `md:hidden` sur le overlay pour compatibilité tablette native

### 3.3 Header cockpit mobile – premium (v1.2.6)

- `MobileAccountQuickSheet` : sheet compte calquée desktop (avatar, profil, paramètres, déconnexion)
- `MobileConnectedStrip` : « Connecté à l’équipe Greffio »
- `MobileCockpitSearchDialog` : API `/api/mobile/search` + types documents + site
- `MobileLogoutConfirmDialog` : confirmation avant déconnexion
- `MobileStickyHeaderGroup` : header + pastille sticky, ombre au scroll
- `MobileShellOverlayContext` : back Android ferme recherche, sheet, dialog logout

### 3.4 Parité routes cockpit – entries complètes

- `DocumentsEntry`, `TeamEntry`, `ChatEntry`, `AnalyticsEntry`, `StatutsEntry`, `QuestionnaireEntry`
- Bottom nav unifiée via `src/config/mobileNavigation.js` (web Messages / native Compte)
- `useMobileSafeBottomPadding` + alias `useWebMobileBottomNavPadding`
- `MOBILE_SHELL_PREFIXES` étendu (`/paiement`, `/tarifs`)
- Landing : sections tarifs/FAQ/footer lazy (`MobileLandingDeferredSections`)

### 3.6 Session juin 2026 – audit mobile complet (commit `4b9ab18`)

- **Landing mobile** : trust chips, micro-copy CTA, aperçu produit SASU, services groupés, FAQ étendue, bandeau tarifs sticky
- **Cockpit** : `MobilePageContainer`, carte état dossier, timeline, pills navigation, onboarding 3 cards, empty states premium
- **Documents** : `MobileDocumentCard` (badge + hint + CTA unique), overlay choix dossier explicite
- **Drawer** : groupes Mon activité / Pilotage / Créer / Compte + note Messages vs Compte natif
- **App native** : back Android overlay priority, `MobileNativeOfflineBanner`, pre-permissions caméra/push, `@capacitor/haptics`
- **Signature** : `MobileStickyFormActions` + clavier sur éditeurs documents et `SignatureAdoptPanel`
- **Contexte audit app native ChatGPT** : `docs/contexte-audit-app-mobile-chatgpt.md`

---

## 4. Matrice d’audit – ce que ChatGPT doit vérifier

### 4.1 Landing mobile vs desktop

| Section desktop (`LandingPage.jsx`) | Mobile (`MobileLandingPage.jsx`) | Écart restant |
|-------------------------------------|----------------------------------|---------------|
| Hero animé + visuel droite | Hero texte seul | Pas de visuel / motion (acceptable si identité figée) |
| Navbar dropdown complète | Header logo + Connexion | Pas de menu services / ressources en header |
| `#services` – grille complète | 6 services + lien « Tout voir » | Pas les 27 formalités inline |
| `#platform` | 4 cartes | OK fonctionnel |
| `#comment-ca-marche` | Steps + 4 blocs | OK |
| `#inpi-like-lookup` | Recherche SIREN | OK |
| Bandeau Greffio indépendant | OK | OK |
| `#pricing` | `LandingPricingSection` | Vérifier lisibilité petit écran |
| `#app-mobile` | Play Store + `/app` | OK |
| `#faq` | 3 Q/R | Desktop peut en avoir plus – comparer listes |
| Footer mentions | 6 liens | Desktop peut avoir colonnes supplémentaires |
| `MobilePublicBottomNav` | 5 onglets publics | Cohérent avec parcours visiteur |

**Checklist landing mobile**

- [ ] CTAs mènent aux bonnes routes (`/simulateur?type=statuts`, `/login`)
- [ ] Safe-area top/bottom (notch, barre nav)
- [ ] Pas de contenu masqué sous bottom nav
- [ ] Liens légaux accessibles sans scroll infini
- [ ] Performance LCP (hero, fonts)
- [ ] Accessibilité : contrastes, tailles touch ≥44px

### 4.2 Cockpit mobile web (utilisateur connecté)

| Fonction | Attendu | Risque actuel |
|----------|---------|---------------|
| Menu hamburger | Ouvre `MobileSidebarDrawer` | OK post-fix |
| Bottom nav | 5 items (`WebMobileBottomNav`) | Analytics, chat, profil **absents** de la bottom nav → accessibles via drawer |
| Pages sans entry mobile | Layout desktop compressé | OK pour cockpit client ; reste `/interfaces` (ops) |
| Padding bottom | `useMobileSafeBottomPadding` sur pages mobile | Hook implémenté + alias `useWebMobileBottomNavPadding` |
| Ops `/ops` | Exclu du mobile shell | Comportement voulu (desktop only) |

### 4.3 Application native Capacitor

| Fonction | Attendu | Risque actuel |
|----------|---------|---------------|
| Drawer latéral | Hamburger → `MobileSidebarDrawer` | OK post-fix |
| Bottom tabs | `MOBILE_AUTH_TABS_NATIVE` | Unifié avec web (Nouveau FAB) ; 5e onglet : Compte natif vs Messages web – documenté |
| Notifications | Cloche + sheet | OK |
| Biométrie | `BiometricSessionContext` | Tester unlock cold start |
| Deep links | `appUrlOpen` dans `MobileAppShell` | Tester liens `greffio.willentreprises.com` |
| Push | `MobilePushRegistration` | Permissions Android 13+ |
| Mise à jour forcée | `AppUpdateGate` | Version `server/config/appVersion.js` vs Play |
| Scanner documents | `MobileDocumentScanner` | Permissions caméra |
| Routes hors `MOBILE_SHELL_PREFIXES` | Pas de shell native | Header desktop peut réapparaître – incohérent |

**Checklist app native**

- [ ] Drawer : tous les liens `NAV_ITEMS` naviguent correctement
- [ ] Fermeture drawer à la navigation
- [ ] Bottom tab active state sur sous-routes
- [ ] Keyboard ne masque pas les champs (formulaires questionnaire)
- [x] Retour Android (back button) ferme drawer, recherche, sheet compte, logout dialog
- [ ] Offline / erreur réseau – messages clairs

---

## 5. Plan d’actions priorisé

### P0 – Immédiat (qualité perçue, blocants UX)

| # | Mesure | Fichiers | Effort |
|---|--------|----------|--------|
| P0-1 | **Déployer** landing mobile + drawer | ✅ Fait |
| P0-2 | QA drawer 10 routes auth | Manuel – checklist §4 |
| P0-3 | Padding bottom pages mobile | ✅ Hook + pages mobile |
| P0-4 | Back Android overlays | ✅ Fait |

### P1 – Court terme (parité fonctionnelle)

| # | Mesure | Fichiers | Effort |
|---|--------|----------|--------|
| P1-1 | Entries `/documents`, `/team`, `/chat`, `/analytics`, `/statuts`, `/questionnaire` | ✅ Fait |
| P1-2 | Harmoniser bottom nav | ✅ `mobileNavigation.js` |
| P1-3 | `useWebMobileBottomNavPadding` | ✅ Alias hook |
| P1-4 | Étendre `MOBILE_SHELL_PREFIXES` | ✅ `/paiement`, `/tarifs` |
| P1-5 | Landing accès Services / Ressources | Optionnel – lien « Tout voir » services |

### P2 – Durable (architecture & maintenance)

| # | Mesure | Description |
|---|--------|-------------|
| P2-1 | **Layout authentifié unifié** | Un seul composant `AuthenticatedMobileLayout` (drawer + header + bottom nav + padding) utilisé par web shell et app shell |
| P2-2 | **Matrice de routes** | Table CSV/MD : route → surface → composant → tests E2E |
| P2-3 | Tests Playwright mobile viewport | Parcours : landing → simulateur → login → dossier → message |
| P2-4 | Tests Capacitor | Appium ou Detox sur émulateur Android – drawer, tabs, push |
| P2-5 | Performance bundle | Code-split `MobileLandingPage`, lazy mobile entries |
| P2-6 | iOS | Préparer shell si `ios/` activé – safe-area, App Store metadata |
| P2-7 | Tablette 768–1024 | `isTabletViewport()` force desktop – documenter choix produit |

---

## 6. Divergence bottom navigation (détail pour audit)

### Web mobile authentifié (`WebMobileBottomNav`)

1. Accueil → `/dashboard`
2. Dossiers → `/dossiers`
3. **Nouveau** (FAB) → `/questionnaire`
4. Documents → `/documents`
5. Messages → `/team`

### App native (`MOBILE_AUTH_TABS_NATIVE` – `mobileNavigation.js`)

1. Accueil → `/dashboard`
2. Dossiers → `/dossiers`
3. **Nouveau** (FAB) → `/questionnaire`
4. Documents → `/documents`
5. Compte → `/mobile/account`

**Impact utilisateur** : le 5e onglet diffère du web (Messages). Assistant, pilotage et statuts via drawer ☰ ; bandeau explicatif sur `MobileHomePage`.

---

## 7. Routes & shells – référence rapide

### `MOBILE_SHELL_PREFIXES` (app native avec shell)

```
/dashboard, /dossiers, /dossier, /documents, /mobile,
/chat, /profil, /settings, /questionnaire, /team,
/analytics, /statuts, /interfaces, /simulateur, /signature
```

### Exclus du mobile web shell

```
/ops, /ops-legacy, /ops-observability, /signature/
```

### Landing split

```jsx
// LandingPage.jsx
<div className="md:hidden"><MobileLandingPage /></div>
<div className="hidden md:block">… desktop …</div>
```

---

## 8. Procédure d’audit recommandée pour ChatGPT

1. **Inventorier** : parcourir `src/mobile/`, `*Entry.jsx`, `platform.js`, shells.
2. **Comparer** : pour chaque route dans `App.jsx`, noter composant rendu en mobile web vs app vs desktop.
3. **Tester visuellement** (si accès au site) :
   - Chrome DevTools iPhone 14 – `/`, `/login`, `/dashboard`, `/dossiers`, `/documents`, `/team`
   - App Android 1.2.x – mêmes routes + drawer + notifications
4. **Lister écarts** par gravité : bloquant / gênant / cosmétique.
5. **Proposer PRs atomiques** : une PR = un thème (drawer, entries documents, bottom nav, padding).
6. **Ne pas proposer** de refonte landing desktop, palette globale, ou navbar desktop.

### Format de livrable attendu

```markdown
## Synthèse exécutive (5 lignes)

## Écarts P0 (à corriger cette semaine)
- …

## Écarts P1 (sprint suivant)
- …

## Écarts P2 (roadmap)
- …

## Matrice route × surface
| Route | Desktop | Mobile web | App | Problème | Action |

## Checklist QA validée / non validée
```

---

## 9. Build, déploiement & app Play Store

| Action | Commande / cible |
|--------|------------------|
| Build web | `npm run build` → Hostinger auto-deploy sur push `main` |
| Sync Capacitor | `npm run mobile:build` (build + `cap sync`) |
| AAB Android | `cd android && ./gradlew bundleRelease` |
| Version | `android/release-version.properties`, `server/config/appVersion.js` |
| Web embarqué app | `capacitor.config` → `webDir: dist` – **chaque fix web nécessite rebuild AAB** pour les utilisateurs app |

Dernière version connue : **1.2.6** (build `261510005`).

---

## 10. Liens documentation interne

| Document | Sujet |
|----------|-------|
| `docs/contexte-audit-app-mobile-chatgpt.md` | **Audit app native Capacitor Android** (prompt §8) |
| `docs/contexte-landing-mobile-audit-chatgpt.md` | Audit landing + cockpit mobile web |
| `docs/contexte-generation-greffio-chatgpt.md` | Statuts, formalités, pipeline PDF |
| `.cursor/rules/preserve-brand-identity.mdc` | Interdictions refonte identité |
| `src/config/mobileStore.js` | Métadonnées store & tabs native |

---

## 11. Questions produit ouvertes (pour arbitrage)

1. Bottom nav web et app doivent-elles être **identiques** ?
2. Faut-il des **pages mobile natives** pour Documents et Messages, ou optimiser les pages desktop responsive ?
3. La landing mobile doit-elle exposer le **menu services** complet ou le lien `/services` suffit-il ?
4. Tablette (768–1024) : rester desktop ou proposer shell mobile optionnel ?
5. iOS : priorité 2026 ou Android-only suffisant ?

---

*Document généré pour audit ChatGPT – Greffio mobile web & app native. Mettre à jour après chaque release mobile significative.*

**Audit app native dédié** → `docs/contexte-audit-app-mobile-chatgpt.md` (prompt §8).
