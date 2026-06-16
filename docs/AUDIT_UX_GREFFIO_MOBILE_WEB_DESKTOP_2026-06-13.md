# Audit UX & Produit Greffio – Mobile App · Site Mobile · Desktop

| Métadonnée | Valeur |
|------------|--------|
| **Date** | 13 juin 2026 |
| **Périmètre** | Application native Android (Capacitor), site web mobile (<768 px), expérience desktop (≥768 px navigateur), parité fonctionnelle route par route |
| **Codebase** | `c:\Users\klano\Desktop\Application SaaS créée\Greffio SaaS` – frontend `src/`, routes `App.jsx`, mobile `src/mobile/` |
| **URLs production** | Site `https://greffio.willentreprises.com` · API `https://api.greffio.willentreprises.com` |
| **Version Android référence** | 1.2.15 (`261510014`) – mode shell remote OTA (`capacitor.config.remote.json`) |
| **Méthodologie** | Lecture statique du code source, inventaire routes/composants, analyse `platform.js`, shells, entries, navigation, auth, paiement, document completion, e2e Playwright, Lighthouse CI, docs release `releases/MOBILE_RELEASE_*`, docs internes `docs/MOBILE_NAVIGATION_*`, `docs/UI_UX_AUDIT_*`, `docs/PAYMENT_TERMINAL_*` |
| **Contrainte identité** | Identité globale Greffio figée (landing hero, palette, navbar publique, footer marketing) – audit distingue corrections locales vs refontes transversales |

### Légende de sévérité

| Niveau | Définition |
|--------|------------|
| **P0 – Critique** | Bloque un parcours métier, perte de données, sécurité, rejet store, ou régression production visible |
| **P1 – Important** | Dégradation UX significative, parité fonctionnelle manquante, friction répétée, dette qui empire |
| **P2 – Secondaire** | Polish, cohérence, optimisation, dette technique sans impact immédiat utilisateur |

---

## 1. Synthèse exécutive

Greffio opère sur **trois surfaces distinctes** partageant un même bundle React/Vite, avec un routage conditionnel sophistique (`src/utils/platform.js`, `src/App.jsx`). L’architecture mobile est **mature** : shells dédiés (`MobileAppShell`, `MobileWebShell`), pattern `*Entry.jsx` pour bifurquer desktop/mobile, drawer groupé (`MOBILE_DRAWER_NAV_GROUPS`), bottom navigation 5 onglets, biométrie native, push FCM, offline cache dossiers, cold start natif.

**Forces principales :**
- Parité cockpit large entre desktop sidebar et mobile drawer (boutique, complétion PDF, pilotage, assistant).
- Release 1.2.15 : stratégie **shell remote OTA** – UI web déployée sans resoumettre AAB pour chaque correction UX.
- Document completion récent intégré dans navigation et recherche site (`/assistant-documents`).
- Publisher légal centralisé (`src/config/publisher.js`, `PublisherLegalBlock.jsx`).
- Tests e2e anti page blanche sur routes publiques + smoke mobile cockpit.

**Faiblesses structurantes :**
- **Fragmentation layout** : ~15 features en double (page desktop + `Mobile*Page`) + pages partagées avec Sidebar conditionnelle (profil, settings, éditeurs documents) → dérive visuelle.
- **Parité bottom nav native vs web** : 5e onglet = **Compte** (native) vs **Messages** (web mobile) – choix produit documenté mais source de confusion.
- **Ops cockpit** (`/ops/*`) **hors shell mobile** → layout desktop compressé sur téléphone (P1).
- **Amazon Pay** retiré du terminal UI actuel (`GreffioPaymentTerminal.jsx` = Google Pay + carte) alors que backend et doc paiement mentionnent encore Amazon Pay production – alignement à clarifier.
- **Google Pay en TEST** côté API prod (doc navigation mobile) – badge visible utilisateur.
- **iOS non démarré** ; plan release mentionne bundle local mais prod Android = remote.
- **Couverture e2e authentifiée quasi nulle** – smoke `#root` visible seulement.
- **Tablet 768–1024 px** : layout desktop sans shell mobile (intentionnel `isTabletViewport`) – peut étirer formulaires.

**Score UX estimé (audit code, non utilisateur) :**

| Surface | Score | Commentaire |
|---------|-------|-------------|
| Desktop authentifié | 6,5/10 | Sidebar riche, dashboard complet, mais densité et doubles patterns |
| Mobile web cockpit | 6/10 | Shell cohérent, drawer bon, profil/settings encore desktop-adapté |
| App native Android | 7/10 | Différenciation réelle (biométrie, push, back, offline), remote OTA |
| Marketing / SEO | 7,5/10 | Landing mobile dédiée, SEO hubs – footer public partiel hors landing |
| Ops mobile | 3/10 | Non optimisé mobile |

---

## 2. Cartographie des surfaces

### 2.1 Diagramme texte – flux de layout

```
Requête HTTP / deep link Capacitor
         │
         ▼
    App.jsx → Layout
         │
    ┌────┴────────────────────────────────────────────┐
    │ isCapacitorNative() && shouldUseMobileShell()?   │
    │   OUI → MobileAppShell (bottom nav native)       │
    │   NON → isMobileBrowserViewport() (<768px)       │
    │         && shouldUseMobileWebShell()?            │
    │           OUI → MobileWebShell                   │
    │           NON → children seuls                   │
    └────────────────────────────────────────────────┘
         │
    Header.jsx ?  (masqué si route dans hideHeaderRoutes
                   OU shell mobile actif OU ops)
         │
    Routes → *Entry.jsx OU pages directes
```

### 2.2 Table comparative des shells

| Critère | Desktop (≥768 px web) | Mobile web (<768 px) | App native Capacitor |
|---------|----------------------|----------------------|----------------------|
| **Détection** | `isDesktopBrowserViewport()` | `isMobileBrowserViewport()` | `isCapacitorNative()` |
| **Shell** | Aucun – Header + Sidebar par page | `MobileWebShell.jsx` | `MobileAppShell.jsx` |
| **Header cockpit** | `Header.jsx` (masqué cockpit) | `MobileWebHeader.jsx` | `MobileWebHeader.jsx` |
| **Nav principale** | `Sidebar.jsx` (md:flex) | Bottom `WebMobileBottomNav` + drawer ☰ | Bottom nav native + drawer ☰ |
| **Nav publique** | Navbar landing / pages SEO | `MobilePublicBottomNav` | `MobilePublicBottomNav` |
| **5e onglet auth** | – | Messages → `/team` | Compte → `/mobile/account` |
| **Exclusions shell** | – | `/ops`, `/signature/`, `/callback` | idem |
| **Biométrie** | Non | Non | `BiometricSessionContext` |
| **Idle lock 30 min** | `IdleSessionGuard` | Oui | **Désactivé** (natif) |
| **Push** | Non | Non | `MobilePushRegistration` |
| **Offline banner** | Non | Partiel (pages mobile) | `MobileNativeOfflineBanner` |
| **Back Android** | Navigateur | Navigateur | `CapApp.backButton` → overlay / history / minimize |
| **OTA UI** | Déploiement web immédiat | Idem | Shell remote → idem sans AAB |

### 2.3 Fichiers pivot

| Fichier | Rôle |
|---------|------|
| `src/App.jsx` | Toutes routes, choix shell, `hideHeaderRoutes`, lazy ops |
| `src/utils/platform.js` | Breakpoints 768/1024, exclusions shell, auth routes natives |
| `src/config/mobileNavigation.js` | Tabs web/native, drawer groups, active state |
| `src/mobile/MobileAppShell.jsx` | Shell natif complet |
| `src/mobile/MobileWebShell.jsx` | Shell navigateur mobile |
| `src/components/Sidebar.jsx` | Nav desktop authentifié |
| `src/components/MobileSidebarDrawer.jsx` | Drawer partagé web mobile + natif |
| `src/components/WebMobileBottomNav.jsx` | Bottom nav web authentifié |
| `src/mobile/entries/*.jsx` | Pattern Entry desktop vs mobile |

---

## 3. App mobile native (Capacitor)

### 3.1 Configuration et stratégie de release

| Élément | Détail | Fichier |
|---------|--------|---------|
| Package | `com.greffio.app` | `capacitor.config.remote.json` |
| Mode prod 1.2.15 | **Remote** : `server.url` → `https://greffio.willentreprises.com/?nativeApp=1` | `capacitor.config.remote.json` |
| Plan historique | Bundle local `webDir: dist` | `MOBILE_RELEASE_PLAN.md`, `capacitor.config.json` |
| iOS | Non démarré (pas de `ios/`) | `MOBILE_RELEASE_PLAN.md` |
| Version API prod (doc 13/06) | `1.2.9` / `261510008` – écart vs release 1.2.15 | `docs/MOBILE_NAVIGATION_ETAT_PRODUCTION_2026-06-13.md` |

**Finding – Écart version API vs AAB**
- **WHAT** : `AppUpdateGate` / `GreffioVersionCard` peuvent afficher version obsolète si VPS non mis à jour (`APP_LATEST_VERSION_CODE=261510014`).
- **WHERE** : `releases/MOBILE_RELEASE_1.2.15.md`, API `/api/app-version`
- **WHY** : Utilisateurs voient « mise à jour disponible » incorrectement ou ne voient pas la bonne version.
- **RECOMMENDATION** : Aligner VPS à chaque release AAB ; automatiser dans pipeline deploy.
- **Priorité** : P1

**Finding – Pivot remote vs plan bundle local**
- **WHAT** : Doc plan dit bundle local prod ; release 1.2.15 = remote OTA.
- **WHERE** : `MOBILE_RELEASE_PLAN.md` vs `releases/MOBILE_RELEASE_1.2.15.md`
- **WHY** : Équipe peut builder mauvais mode ; dépendance réseau pour première paint.
- **RECOMMENDATION** : Mettre à jour `MOBILE_RELEASE_PLAN.md` ; documenter fallback offline first launch.
- **Priorité** : P2

### 3.2 Navigation, header, bottom tabs, drawer

**Bottom navigation native** (`MOBILE_AUTH_TABS_NATIVE` dans `mobileNavigation.js`, rendu `MobileAppShell.jsx`) :

| Onglet | Route | Icône |
|--------|-------|-------|
| Accueil | `/dashboard` | home |
| Dossiers | `/dossiers` | folders |
| Nouveau | `QUESTIONNAIRE_NEW_PATH` (questionnaire) | plus (CTA primaire) |
| Documents | `/documents` | files |
| Compte | `/mobile/account` | user |

**Masquage bottom nav** : routes `/paiement`, `/signature/*`, écrans auth (`NATIVE_AUTH_ROUTE_PREFIXES`).

**Drawer ☰** : `MobileSidebarDrawer` – groupes Mon activité / Pilotage / Créer / Compte. Hint : « l’onglet Compte remplace Messages sur l’app ».

**Header** : `MobileWebHeader` + `MobileStickyHeaderGroup` ; menu ☰ si authentifié.

**Finding – Messages non en bottom tab native**
- **WHAT** : Accès messages via drawer ou page Compte (`MobileAccountPage` lien `/team`), pas onglet direct.
- **WHERE** : `mobileNavigation.js`, `MobileAccountPage.jsx`
- **WHY** : Friction vs web mobile où Messages est onglet 5 ; utilisateurs habitués WhatsApp-style tabs.
- **RECOMMENDATION** : A/B test ou badge messages sur onglet Compte ; coachmark déjà partiel (`MobileNavCoachmarks`).
- **Priorité** : P2

**Finding – Coachmarks et onboarding**
- **WHAT** : `MobileCockpitOnboarding`, `MobileNavCoachmarks` présents sur accueil mobile.
- **WHERE** : `src/mobile/ui/MobileCockpitOnboarding.jsx`, `MobileNavCoachmarks.jsx`
- **WHY** : Positif – réduit découverte drawer.
- **RECOMMENDATION** : Mesurer completion onboarding ; lier à analytics.
- **Priorité** : P2 (amélioration)

### 3.3 Parité fonctionnelle vs desktop

| Fonction desktop Sidebar | Native bottom tab | Drawer | Notes |
|--------------------------|-------------------|--------|-------|
| Tableau de bord | ✅ Accueil | ✅ | `MobileHomePage` vs `DashboardPage` |
| Nouvelle démarche | ✅ Nouveau (questionnaire) | ✅ Créer | |
| Dossiers | ✅ | ✅ | |
| Documents | ✅ | ✅ | |
| Compléter PDF | ❌ | ✅ | Drawer seul – pas tab |
| Boutique | ❌ | ✅ | |
| Équipe & clients | ❌ (Compte → Messages) | ✅ | |
| Cockpit Ops | ❌ | ❌ (sauf lien interne Interfaces) | Ops hors shell |
| Interfaces | ❌ | ✅ (interne) | |
| Pilotage | ❌ | ✅ | |
| Assistant | ❌ | ✅ | `/chat` |
| Statuts | ❌ | ✅ Pilotage | Absent Sidebar desktop principal |
| Profil / Settings | via Compte | ✅ Compte | |
| Analytics | ❌ | ✅ Pilotage | |

**Finding – Statuts dans drawer mobile mais absent Sidebar desktop**
- **WHAT** : `MOBILE_DRAWER_NAV_GROUPS` inclut `/statuts` ; `Sidebar.jsx` n’a pas entrée Statuts.
- **WHERE** : `mobileNavigation.js` vs `Sidebar.jsx`
- **WHY** : Parité inverse – desktop users ne voient Statuts au même niveau.
- **RECOMMENDATION** : Ajouter Statuts au Sidebar desktop (Pilotage section) OU documenter que statuts = parcours questionnaire.
- **Priorité** : P2

### 3.4 Auth & onboarding

| Mécanisme | Fichier | Comportement |
|-----------|---------|--------------|
| `ProtectedRoute` | `src/components/ProtectedRoute.jsx` | Redirect `/login`, splash boot, roles ops |
| Cold start | `NativeAppBootstrap.jsx` | Welcome 1er lancement → `/app/welcome` ; connecté → `/dashboard` |
| Post-login natif | `nativeColdStart.js` | Toujours `/dashboard` (pas deep link dossier auto) |
| Login natif | `LoginPage.jsx` | Délègue `NativeWebLoginPage` ; OAuth browser handoff |
| Deep link auth | `MobileAppShell` `appUrlOpen` | `nativeWebAuth.js` callback |
| Biométrie | `BiometricSessionContext.jsx` | Lock screen après cold start si activé |
| MFA | `LoginPage.jsx` | TOTP, email, recovery ; captcha si web risky |

**Finding – Post-login toujours dashboard**
- **WHAT** : `resolveNativePostLoginPath` retourne fixe `/dashboard` ; `resolveNativeDossierContinuePath` existe mais non utilisé au cold start connecté.
- **WHERE** : `src/utils/nativeColdStart.js`, `NativeAppBootstrap.jsx`
- **WHY** : Utilisateur avec action urgente sur dossier doit naviguer manuellement.
- **RECOMMENDATION** : Option produit : carte action accueil mobile déjà présente (`MobileHomePage`) – suffisant si CTA clair ; sinon post-login intelligent via `resolveNativeDossierContinuePath`.
- **Priorité** : P2

**Finding – Idle session désactivée sur natif**
- **WHAT** : `IdleSessionGuard` : `guardEnabled = isAuthenticated && !isCapacitorNative()`.
- **WHERE** : `IdleSessionGuard.jsx`
- **WHY** : Sécurité compensée par biométrie – cohérent ; mais session JWT longue sur app partagée.
- **RECOMMENDATION** : Documenter ; option « verrouiller au quit » via biométrie.
- **Priorité** : P2

### 3.5 Offline, push, permissions

| Feature | Implémentation | Fichier |
|---------|----------------|---------|
| Cache dossiers RO | `loadDossiersSnapshot`, `cacheDossiersSnapshot` | `mobileOffline.js`, `MobileHomePage` |
| Offline banner | `OfflineDataBanner`, `MobileNativeOfflineBanner` | multiple |
| Push FCM | `PushNotifications` + `registerPushToken` | `MobilePushRegistration.jsx` |
| Permission orchestrator | Caméra, etc. | `NativePermissionOrchestrator.jsx` |
| Scan → PDF | `MobileDocumentScanner`, `documentPdf.js` | mobile |

**Finding – Push prompt timing**
- **WHAT** : Push demandé après `isNativePushPromptReady()` + localStorage `greffio.mobile.pushPromptSeen`.
- **WHERE** : `MobilePushRegistration.jsx`
- **WHY** : Bon pattern – évite prompt au premier pixel.
- **RECOMMENDATION** : Lier prompt à première action dossier (contexte métier).
- **Priorité** : P2

### 3.6 Points forts

1. Shell natif couvre **toutes routes sauf ops/signature** (`shouldUseMobileShell` simplifié vs `MOBILE_SHELL_PREFIXES` deprecated).
2. Gestion **back Android** avec stack overlays (`MobileShellOverlayContext`).
3. **Haptics** sur CTA Nouveau (`triggerMobileHaptic`).
4. **AppUpdateGate** natif seulement – logique correcte.
5. Release notes 1.2.15 : auth browser fix, PDF pouvoirs formalités, email confirmation ressources.

### 3.7 Faiblesses / bugs potentiels

| ID | Finding | Priorité |
|----|---------|----------|
| N-01 | Ops `/ops/*` sur téléphone = layout desktop illisible | P1 |
| N-02 | `ProfilePage` / `SettingsPage` gardent import Sidebar (hidden md) – layout `we-bg` hétérogène | P1 |
| N-03 | Google Pay TEST en prod API – utilisateurs voient badge test | P1 |
| N-04 | Dépendance réseau shell remote – pas de UI offline first launch | P2 |
| N-05 | `google-services.json` requis FCM – erreurs silencieuses `registrationError` | P2 |
| N-06 | Tablette native rare mais width = phone Capacitor → shell mobile toujours | P2 |

### 3.8 Priorités P0/P1/P2 (native)

| Priorité | Action |
|----------|--------|
| **P0** | Aucun bloquant code identifié – surveiller auth handoff post-déploiement web |
| **P1** | Aligner version API VPS ; Google Pay LIVE ou masquer ; UX ops mobile ou bloquer accès |
| **P2** | Post-login intelligent ; badge messages ; doc remote OTA ; iOS planning |

---

## 4. Site web mobile (<768px)

### 4.1 MobileWebShell vs desktop Header

**Activation** : `shouldUseMobileWebShell(pathname)` – width < 768, non Capacitor, pas exclusion ops/signature/callback.

**Structure** (`MobileWebShell.jsx`) :
- Landing `/` : pas de header sticky shell (contenu landing gère sa nav).
- Authentifié : drawer + header titre dynamique (`resolveMobileShellTitle`) + `WebMobileBottomNav`.
- Public : `MobilePublicBottomNav` (Accueil, Simuler, Services, Tarifs, Compte).

**Header desktop masqué** quand shell actif (`App.jsx` `shouldHideHeader`).

**Finding – Double navigation publique landing**
- **WHAT** : `MobileLandingPage` a sa propre nav + `MobilePublicBottomNav` du shell.
- **WHERE** : `LandingPage.jsx` (`md:hidden` → `MobileLandingPage`), `MobileWebShell`
- **WHY** : Risque zones cliquables redondantes – généralement géré par design landing.
- **RECOMMENDATION** : Audit visuel landing mobile seulement.
- **Priorité** : P2

### 4.2 Parité avec app native

| Aspect | Web mobile | App native | Écart |
|--------|------------|------------|-------|
| Drawer groups | Identique `mobileNavigation.js` | Identique | – |
| 5e onglet | Messages `/team` | Compte `/mobile/account` | **Oui** |
| Biométrie | Non | Oui | Attendu |
| Push | Non | Oui | Attendu |
| Offline banner natif | Non | Oui | |
| Coachmarks | Partiel | Oui | |
| Scan document | Limité web | Capacitor camera | |

**Finding – Web mobile pas de `MobilePushRegistration`**
- **WHAT** : Notifications web non implémentées (pas de Web Push).
- **WHERE** : absence dans `MobileWebShell`
- **WHY** : Gap vs app native pour relances.
- **RECOMMENDATION** : Web Push V2 ou PWA prompt « installer l’app ».
- **Priorité** : P2

### 4.3 UX flows clés mobile web

| Flow | Entry / Page | Mobile UX |
|------|--------------|-----------|
| Inscription | `SignupPage` | Shell mobile, auth plein écran |
| Login + MFA | `LoginPage` | `mobileAuth` styles ; captcha si risky |
| Simulateur | `FormalityWizardEntry` | `FormalityWizardPage presentation=mobile` |
| Questionnaire | `QuestionnaireEntry` | Wrapper padding bottom nav |
| Paiement | `PaymentEntry` → `MobilePaymentPage` | Bottom nav masquée ; terminal accordéon |
| Dashboard | `DashboardEntry` → `MobileHomePage` | Cockpit orienté action |
| Dossier detail | `DossierDetailEntry` | `MobileDossierDetailPage` |
| Complétion PDF | `DocumentCompletionEntry` | `MobileDocumentCompletionPage` |
| Tarifs / Services | `PricingEntry`, `ServicesEntry` | `MobilePricingPage`, `MobileServicesPage` |

**Finding – Questionnaire sur mobile web sans e2e contenu**
- **WHAT** : e2e vérifie `#root` visible, pas complétion steps.
- **WHERE** : `e2e/mobile-cockpit.spec.js`
- **WHY** : Régressions wizard possibles non détectées.
- **RECOMMENDATION** : e2e authentifié fixture user + 2 steps questionnaire.
- **Priorité** : P1

---

## 5. Desktop / PC

### 5.1 Sidebar, Header, layout

**Header** (`Header.jsx`) : logo, bandeau « Espace client connecté », lien Équipe (md+), notifications (count=0 hardcodé), menu profil.

**Sidebar** (`Sidebar.jsx`) : 12+ entrées, badge count dossiers, section ops pour `isInternalUser`, footer « Équipe Greffio assignée ».

**Layout type** : `flex` + `Sidebar` + `main` – pattern répété dans chaque page (`DashboardPage`, `DocumentsPage`, etc.).

**Finding – Notifications factices**
- **WHAT** : `notificationCount = 0` constant dans Header.
- **WHERE** : `Header.jsx` ligne 21
- **WHY** : Cloche sans valeur – fausse affordance.
- **RECOMMENDATION** : Brancher sur hub messages ou masquer jusqu’à implémentation.
- **Priorité** : P2

**Finding – Dashboard desktop riche vs mobile simplifié**
- **WHAT** : `DashboardPage` : multi-dossier, documents actifs, alertes login MFA, progress – `MobileHomePage` : focus 1 dossier + quick links.
- **WHERE** : `DashboardPage.jsx`, `MobileHomePage.jsx`
- **WHY** : Parité fonctionnelle OK mais densité info desktop >> mobile.
- **RECOMMENDATION** : Mobile « voir tous dossiers » toujours visible ; option switch dossier actif sur mobile.
- **Priorité** : P2

### 5.2 Workflows métier desktop

| Workflow | Routes | Composants clés |
|----------|--------|-----------------|
| Création dossier | `/simulateur`, `/questionnaire` | `FormalityWizardPage` (~1771 lignes) |
| Suivi dossier | `/dossiers`, `/dossier/:id` | `DossiersPage`, `DossierDetailPage` |
| Documents coffre | `/documents` | `DocumentsPage` |
| Éditeurs signables | `/dossier/:id/declaration-non-condamnation`, `liste-souscripteurs`, `pouvoirs-formalites` | pages avec `PdfPreviewPanel`, SignWell |
| Statuts | `/statuts` | `StatutesPage` lazy, 27 articles William |
| Boutique ressources | `/boutique` | `ClientShopPage` + drawer trigger mobile tablet |
| Paiement | `/paiement` | `PaymentPage` + `GreffioPaymentTerminal` |
| Ops | `/ops/*` | `OpsShell` lazy, sidebar ops séparée |
| Complétion PDF | `/assistant-documents` | `DocumentCompletionPage` + Sidebar |

**Finding – FormalityWizard monolithique**
- **WHAT** : Fichier très long, mobile + desktop dans même composant.
- **WHERE** : `FormalityWizardPage.jsx`
- **WHY** : Maintenance UX difficile ; bugs mobile/desktop corrélés.
- **RECOMMENDATION** : Split steps en sous-composants (sans refonte visuelle landing).
- **Priorité** : P1

**Finding – ClientShop hybride mobile**
- **WHAT** : `ClientShopPage` utilise `MobileSidebarTrigger` + drawer – pas `MobileShopPage` dédié.
- **WHERE** : `ClientShopPage.jsx`
- **WHY** : Sur mobile web shell, drawer shell déjà présent – double trigger possible tablet md breakpoint.
- **RECOMMENDATION** : Unifier trigger avec shell overlay context.
- **Priorité** : P2

---

## 6. Parité fonctionnelle – matrice route par route

Légende : **D** Desktop layout · **M** Mobile page dédiée · **S** Shared page + adaptations · **E** Entry switch · **–** Non applicable / redirect

| Route | D | M web | M native | Entry | Sidebar | Bottom tab web | Bottom tab native | Drawer | Notes |
|-------|---|-------|----------|-------|---------|----------------|-----------------|--------|-------|
| `/` | Landing md+ | `MobileLandingPage` | idem | – | – | Public | Public | Public | SEO `SeoHead` |
| `/tarifs` | `PricingPage` | `MobilePricingPage` | E | – | Public | Public | Public | |
| `/login` | `LoginPage` | S shell | S auth fullscreen | – | – | – | – | Auth |
| `/signup` | `SignupPage` | S | S | – | – | – | – | |
| `/dashboard` | `DashboardPage` | `MobileHomePage` | E | ✅ | ✅ web | ✅ | ✅ | |
| `/dossiers` | `DossiersPage` | `MobileDossiersPage` | E | ✅ | ✅ | ✅ | ✅ | |
| `/dossier/:id` | `DossierDetailPage` | `MobileDossierDetailPage` | E | – | – | – | – | Sous-route dossiers |
| `/documents` | `DocumentsPage` | `MobileDocumentsPage` | E | ✅ | ✅ | ✅ | ✅ | |
| `/assistant-documents` | `DocumentCompletionPage` | `MobileDocumentCompletionPage` | E | ✅ | – | – | ✅ | Nouveau 2026-06 |
| `/boutique` | `ClientShopPage` | S + drawer | S | – | – | – | ✅ | |
| `/team` | `TeamPage`? | `MobileTeamPage` | E | ✅ | ✅ web | – | ✅ | |
| `/chat` | `ChatIAPage` lazy | `MobileChatPage` | E | ✅ | – | – | ✅ | |
| `/analytics` | lazy | `MobileAnalyticsPage` | E | ✅ | – | – | ✅ | |
| `/statuts` | `StatutesPage` lazy | S `presentation=mobile` | E | ❌ | – | – | ✅ | |
| `/profil` | `ProfilePage` | S `mobileShell` | S | – | – | – | ✅ | Sidebar hidden mobile |
| `/settings` | `SettingsPage` | S | S | – | – | – | ✅ | |
| `/mobile/account` | – | `MobileAccountPage` | natif | – | – | – | ✅ natif | Pas desktop |
| `/mobile/search` | – | `MobileSearchPage` | ✅ | – | – | – | – | Assistant search |
| `/simulateur` | `FormalityWizardPage` | S mobile pres. | E | – | Public | Public | Public | |
| `/questionnaire` | `QuestionnairePage` | S + pad | E | – | – | – | – | Protected |
| `/paiement` | `PaymentPage` | `MobilePaymentPage` | E | – | – | hidden | hidden | |
| `/ops/*` | OpsShell lazy | D compressé | D | – | – | – | – | **Hors shell** |
| `/interfaces` | `InterfacesPage` | D | D | ✅ int. | – | – | ✅ int. | |
| `/dossier/:id/declaration-non-condamnation` | lazy page | S native no sidebar | S | – | – | – | – | |
| `/dossier/:id/liste-souscripteurs` | S | S mobile overlays | S | – | – | – | – | |
| `/dossier/:id/pouvoirs-formalites` | S | S | S | – | – | – | – | |
| `/signature/:token` | public | hors shell | hors shell | – | – | – | – | |
| `/ressources/*` | pages | shell partiel | shell | – | – | – | – | |
| `/guides`, `/glossaire`, `/faq` | SEO | shell si <768 | shell | – | – | – | – | |
| `/a-propos` | `AboutPage` | shell | shell | – | – | – | – | Nouveau |
| `/contact` | `ContactPage` | shell | shell | – | – | – | Public drawer | |
| SEO pillars | `SeoPages` | shell | shell | – | – | – | – | Nombreuses routes |

---

## 7. Complétion documentaire & features récentes

### 7.1 Architecture feature

| Couche | Fichiers |
|--------|----------|
| Route | `App.jsx` `/assistant-documents` → `DocumentCompletionEntry` |
| Mobile | `MobileDocumentCompletionPage.jsx` |
| Desktop | `features/document-completion/components/DocumentCompletionPage.jsx` |
| API / server | `server/features/documentCompletion/*` (parse PDF, detect fields, export) |
| Recherche | `siteSearchIndex.js` entrée « Compléter un PDF » |
| Navigation | `mobileNavigation.js` drawer « Compléter un PDF » |
| Sidebar desktop | `Sidebar.jsx` ligne 59 |

### 7.2 Parcours UX

1. Upload via `DocumentUploadDropzone`
2. Polling `useDocumentAnalysisStatus` – `DocumentAnalysisProgress`
3. Résultat `DocumentCompletionResult` + download `useDocumentCompletionDownload`
4. Reset « Importer un autre document »

**Finding – Pas de rattachement dossier**
- **WHAT** : Feature standalone – pas de lien vers dossier/formalité en cours.
- **WHERE** : `MobileDocumentCompletionPage.jsx`, `DocumentCompletionPage.jsx`
- **WHY** : Utilisateur peut ne pas relier PDF complété au bon dossier Greffio.
- **RECOMMENDATION** : CTA « Ajouter au dossier » post-export ; param `?dossierId=`.
- **Priorité** : P1

**Finding – Desktop Sidebar sur feature récente**
- **WHAT** : Layout desktop classique avec Sidebar – cohérent avec reste app.
- **WHERE** : `DocumentCompletionPage.jsx`
- **WHY** : OK desktop ; mobile bien dédié.
- **RECOMMENDATION** : – 
- **Priorité** : –

### 7.3 Publisher légal & About

| Élément | Fichier |
|---------|---------|
| Config centralisée | `src/config/publisher.js` – WILLIAM ESTABLISHMENTS, RCS Nice, SIRET, disclaimer |
| Composant bloc | `PublisherLegalBlock.jsx` |
| Pages | `AboutPage.jsx`, `PrivacyPolicyPage`, `ContactPage` (modifiés git status) |
| Login | `PUBLISHER_LEGAL_NAME` dans `LoginPage.jsx` |

**Finding – Cohérence légale améliorée**
- **WHAT** : Single source of truth publisher – réduit risque mentions obsolètes.
- **WHY** : Conformité Amazon Pay / stores / RGPD.
- **RECOMMENDATION** : Déployer sur toutes pages légales restantes sans bloc.
- **Priorité** : P2

### 7.4 Amazon Pay contexte

- Doc `PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` : Amazon Pay production activé backend.
- Bundle prod (doc navigation) : chaîne `Amazon Pay` encore présente au 13/06 matin.
- **Code actuel** `GreffioPaymentTerminal.jsx` : **uniquement Google Pay + carte** – pas de `AmazonPayCheckoutPanel`.
- **WHY it matters** : Divergence doc/code ; vérification Seller Central peut exiger UI stable.

**RECOMMENDATION** : Décision produit explicite – réintégrer Amazon Pay dans terminal OU retirer backend + doc + API config. **Priorité P1** (paiement).

---

## 8. Performance & technique

### 8.1 Lazy loading

| Module | Pattern | Fichier |
|--------|---------|---------|
| Ops pages | `lazy()` + `withSuspense` | `lazyPages.jsx` |
| Chat desktop | `LazyChatIAPage` | `ChatEntry.jsx` |
| Analytics desktop | `LazyAnalyticsPage` | `AnalyticsEntry.jsx` |
| Statuts | lazy mobile/desktop | `StatutsEntry.jsx` |
| Non-conviction | lazy | `App.jsx` |

**Finding – Pas de lazy sur routes client fréquentes**
- **WHAT** : Dashboard, Dossiers, Documents importés statiquement dans entries/pages.
- **WHY** : Bundle initial ~1,95 Mo prod (doc navigation).
- **RECOMMENDATION** : Route-based code splitting entries ; mesurer avec `vite build --analyze`.
- **Priorité** : P2

### 8.2 Bundle & Capacitor remote

- Shell remote : premier load = full web app depuis CDN Hostinger.
- `AppUpdateGate` : vérifie version native vs API – pas cache busting web.

### 8.3 Lighthouse CI

| Config | URLs | Seuils |
|--------|------|--------|
| `lighthouserc.cjs` | simulateur, login, questionnaire | perf ≥0.85 warn, a11y ≥0.9 |
| `lighthouserc.mobile.cjs` | simulateur, questionnaire | perf ≥0.8, mobile 390×844 |

**Finding – Pas de Lighthouse dashboard authentifié**
- **RECOMMENDATION** : Preview auth cookie fixture ou pages publiques seulement documentées.
- **Priorité** : P2

### 8.4 React Query invalidation

- `useRouteQueryInvalidation` dans `AppRoutes` – bon pour fraîcheur données navigation.

---

## 9. Accessibilité & i18n

### 9.1 Points positifs mobile

| Composant | Pattern |
|-----------|---------|
| `MobileSidebarDrawer` | `role="dialog"`, `aria-modal`, Escape, focus trap partiel |
| `WebMobileBottomNav` | `aria-label="Navigation cockpit mobile"` |
| `MobilePublicBottomNav` | `aria-label="Navigation mobile publique"` |
| `MobileNativeOfflineBanner` | `role="status"`, `aria-live="polite"` |
| `MobileWebHeader` | `aria-label="Accueil Greffio"` |
| Bottom links | `min-h-[44px]` web nav – touch target OK |
| `MobileCockpitOnboarding` | `aria-labelledby`, bouton fermer labelé |

### 9.2 Lacunes

| Finding | WHERE | RECOMMENDATION | Priorité |
|---------|-------|--------------|----------|
| Bottom nav native sans `aria-label` sur `<nav>` | `MobileAppShell.jsx` | Ajouter aria-label comme web | P2 |
| Header notifications sans état | `MobileCockpitHeaderActions` | `aria-disabled` ou hide | P2 |
| Focus return après fermeture drawer | `MobileSidebarDrawer` | focus trap complet | P2 |
| Langue | UI française uniquement | i18n non structuré | P2 |
| `useReducedMotion` landing desktop | `LandingPage` | Étendre mobile animations `MobileAnimatedSection` | P2 |

---

## 10. Sécurité & conformité (côté UX)

| Mécanisme | UX impact | Fichier |
|-----------|-----------|---------|
| MFA login | Steps OTP, recovery | `LoginPage.jsx` |
| Captcha Turnstile | Après 2 échecs web | `SecurityChallengeWidget` |
| Biometric unlock | Fullscreen lock | `BiometricUnlockScreen` |
| Cookie consent | `CookieConsentBanner` | masqué natif ? vérifier `CookieConsentBanner` |
| Session idle web | Overlay lock + logout 30 min | `IdleSessionGuard` |
| Credentials unlock | `/credentials-unlock` | ops recovery |
| Suppression compte | `/suppression-compte` | `mobileStore.legal` |
| Deep links | allowNavigation Capacitor | `capacitor.config.remote.json` |

**Finding – Cookie banner sur mobile shell**
- **WHERE** : `CookieConsentBanner.jsx` uses `isCapacitorNative`
- **RECOMMENDATION** : Vérifier conformité CNIL app native (peut différer web).
- **Priorité** : P1 (legal)

---

## 11. Contenu, copy, légal

| Zone | État |
|------|------|
| Drawer hints | « Messages, pilotage… via menu ☰ » – clair |
| Mobile home CTA | Orienté action métier – bon |
| Payment terminal | Copy « Terminal Greffio », modes accordéon |
| Ops vs client | Disclaimer publisher sur login |
| Footer public | `GreffioUltraFooter` landing + SEO – **pas** login/contact/tarifs |
| Search index | 25+ entrées incl. assistant PDF, à propos |

**Finding – Footer légal incomplet hors landing**
- **WHERE** : `docs/UI_UX_AUDIT_2026-06-13.md` section 1.4
- **RECOMMENDATION** : Footer minimal légal (mentions, confidentialité) sans refonte charte.
- **Priorité** : P2

---

## 12. Roadmap d'amélioration (30/60/90 jours)

### 30 jours (stabilisation & parité)

1. Aligner API `app-version` avec release 1.2.15+ sur VPS.
2. Décision Amazon Pay : UI ou retrait backend – synchroniser `GreffioPaymentTerminal`.
3. Google Pay : passage LIVE ou masquer mode TEST en prod.
4. Document completion : lien dossier + analytics event upload/export.
5. e2e authentifié : login fixture + dashboard + 1 parcours paiement mock.
6. Ops mobile : message « utiliser desktop » ou shell simplifié lecture seule.

### 60 jours (UX cockpit)

1. Unifier `ProfilePage` / `SettingsPage` layout mobile sans Sidebar ghost.
2. Statuts entrée Sidebar desktop.
3. Badge messages sur onglet Compte native + web option.
4. Code splitting entries principales.
5. `FormalityWizardPage` modularisation (steps).
6. Web Push ou renforcement CTA install app.

### 90 jours (scale & iOS)

1. Préparation iOS TestFlight (bundle id, APNs, asset links).
2. Évaluer bundle local vs remote pour iOS (Apple review cache).
3. Dashboard mobile multi-dossier switcher.
4. Lighthouse dashboard + perf budget CI.
5. Footer légal transversal pages publiques secondaires.
6. Matrice parité automatisée (test routes × viewport).

---

## 13. Backlog priorisé

| ID | Titre | Effort | Impact | Owner suggéré | Priorité |
|----|-------|--------|--------|---------------|----------|
| B-01 | Aligner version API / Play | S | H | Ops / Backend | P1 |
| B-02 | Amazon Pay décision produit + code | M | H | Produit + Frontend | P1 |
| B-03 | Google Pay LIVE prod | M | H | Backend + Produit | P1 |
| B-04 | Document completion → dossier | M | M | Produit + Fullstack | P1 |
| B-05 | e2e auth parcours critiques | M | H | QA / Eng | P1 |
| B-06 | Ops mobile guard ou mini-shell | L | M | Ops + Frontend | P1 |
| B-07 | Cookie / CNIL app native | S | H | Legal + Frontend | P1 |
| B-08 | Modulariser FormalityWizard | L | M | Frontend | P1 |
| B-09 | Profil/Settings sans Sidebar mobile | M | M | Frontend | P2 |
| B-10 | Statuts dans Sidebar desktop | S | L | Frontend | P2 |
| B-11 | Code splitting cockpit | M | M | Frontend | P2 |
| B-12 | Footer légal pages publiques | S | M | Frontend | P2 |
| B-13 | aria-label nav native | S | L | Frontend | P2 |
| B-14 | iOS fondations Capacitor | XL | H | Mobile | P2 |
| B-15 | Web Push notifications | L | M | Fullstack | P2 |
| B-16 | Post-login dossier intelligent | S | M | Produit | P2 |
| B-17 | MAJ MOBILE_RELEASE_PLAN remote | S | L | Mobile lead | P2 |
| B-18 | Notifications Header branchées | M | L | Fullstack | P2 |

Effort : S <1j · M 1–3j · L 1–2 sem · XL >2 sem

---

## 14. Métriques & KPIs à suivre

| KPI | Surface | Source |
|-----|---------|--------|
| Taux conversion signup → premier dossier | Tous | Analytics produit |
| Time to first action mobile vs desktop | Web / native | Event `cockpit_cta_click` |
| Taux activation drawer (☰) vs bottom tabs | Mobile | Event navigation |
| Completion questionnaire mobile vs desktop | Wizard | Step events |
| Taux succès paiement par PSP | Paiement | API payments |
| Google Pay vs carte split | Paiement | Terminal events |
| Crash rate Android | Native | Play Console |
| Cold start → dashboard bounce | Native | `NativeAppBootstrap` timing |
| Biometric opt-in rate | Native | Settings |
| Push opt-in rate | Native | `MobilePushRegistration` |
| Offline banner impressions | Native | `MobileNativeOfflineBanner` |
| Lighthouse perf score simulateur | Web | CI |
| e2e pass rate mobile viewport | QA | Playwright |
| Parité : sessions ops sur mobile | Ops | Logs route `/ops` width |

---

## 15. Annexes

### 15.1 Routes `App.jsx` (extrait structuré)

**Publiques** : `/`, `/tarifs`, `/services`, `/simulateur`, SEO pillars/guides/glossaire/faq, `/login`, `/signup`, `/contact`, `/a-propos`, `/app`, `/mentions-legales`, `/confidentialite`, `/cookies`, `/suppression-*`, `/ressources/*`, `/paiement`, `/signature/:token`, `/callback`.

**Authentifiées client** : `/dashboard`, `/dossiers`, `/dossier/:id`, `/documents`, `/assistant-documents`, `/boutique`, `/team`, `/chat`, `/analytics`, `/statuts`, `/profil`, `/settings`, `/mobile/search`, `/mobile/account`, éditeurs dossier.

**Ops** : `/ops/cockpit`, `/ops/dossiers`, `/ops/documents`, `/ops/relances`, `/ops/depot`, `/ops/qualite`, `/ops/equipe`, `/ops/audit`, `/ops/settings`, `/ops-observability`.

### 15.2 Entries pattern (`src/mobile/entries/`)

| Entry | Switch mobile |
|-------|---------------|
| `DashboardEntry` | `MobileHomePage` |
| `DossiersEntry` | `MobileDossiersPage` |
| `DossierDetailEntry` | `MobileDossierDetailPage` |
| `DocumentsEntry` | `MobileDocumentsPage` |
| `DocumentCompletionEntry` | `MobileDocumentCompletionPage` |
| `TeamEntry` | `MobileTeamPage` |
| `ChatEntry` | `MobileChatPage` |
| `AnalyticsEntry` | `MobileAnalyticsPage` |
| `PaymentEntry` | `MobilePaymentPage` |
| `PricingEntry` | `MobilePricingPage` |
| `ServicesEntry` | `MobileServicesPage` |
| `FormalityWizardEntry` | `presentation` prop |
| `QuestionnaireEntry` | padding wrapper |
| `StatutsEntry` | `presentation=mobile` |
| `ProfileEntry` | `ProfilePage` direct |
| `SettingsEntry` | `SettingsPage` direct |

### 15.3 Composants mobile UI (`src/mobile/ui/`)

`MobilePageContainer`, `MobilePageSkeleton`, `MobileAnimatedSection`, `MobileStickyHeaderGroup`, `MobileCockpitOnboarding`, `MobileNavCoachmarks`, `MobilePermissionPrompt`, `MobileSignableDocumentShell`, `MobileDossierTimeline`, `MobileEmptyState`, `MobileStickyFormActions`, `MobileConnectedStrip`, `MobileDocumentCard`, `MobileCockpitSearchDialog`, `MobileCockpitHeaderActions`, `MobileNativeStatusCenter`.

### 15.4 Tests e2e

| Fichier | Couverture |
|---------|------------|
| `e2e/no-white-page.spec.js` | 17 routes publiques + mobile landing nav |
| `e2e/mobile-cockpit.spec.js` | Smoke 390px routes publiques, landscape, tablet 820px |
| `e2e/mobile-cockpit-entries.spec.js` | Landing, login, app, simulateur, chat, statuts |
| `e2e/mobile-nouveau-entry.spec.js` | (parcours nouveau – vérifier localement) |

### 15.5 Releases mobile référencées

| Version | versionCode | Notes |
|---------|-------------|-------|
| 1.2.9 | 261510008 | Simulateur, auth stable, uploads |
| 1.2.15 | 261510014 | **Shell remote OTA**, auth browser fix, PDF pouvoirs |

### 15.6 Documents internes liés

- `docs/MOBILE_NAVIGATION_ETAT_PRODUCTION_2026-06-13.md`
- `docs/UI_UX_AUDIT_2026-06-13.md`
- `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md`
- `MOBILE_RELEASE_PLAN.md`
- `releases/MOBILE_RELEASE_1.2.15.md`
- `docs/runbooks/AMAZON_PAY_VERIFICATION_LEGAL_GREFFIO.md`

---

*Audit généré par exploration codebase le 13 juin 2026. Aucune modification de code applicatif – livrable documentation uniquement.*
