# Greffio – Contexte landing & cockpit mobile (audit design ChatGPT)

> **Usage** : joindre ce fichier à ChatGPT avec le **prompt §7** pour obtenir un audit UX/UI mobile actionnable.
>
> **Repo** : `TheWilliamUniverse/greffio` – identité desktop figée (`LandingPage.jsx`, tokens CSS). Ne pas proposer de refonte globale de marque.

---

## 1. Surfaces concernées

| Surface | Fichier principal | URL exemple |
|---------|-------------------|-------------|
| Landing mobile web | `src/mobile/MobileLandingPage.jsx` | `/` (viewport &lt;768px) |
| Accueil cockpit mobile | `src/mobile/MobileHomePage.jsx` | `/dashboard` |
| Détail dossier mobile | `src/mobile/MobileDossierDetailPage.jsx` | `/dossier/:id` |
| Documents mobile | `src/mobile/MobileDocumentsPage.jsx` | `/documents` |
| Shell web mobile | `src/mobile/MobileWebShell.jsx` | header + bottom nav |
| Shell app native | `src/mobile/MobileAppShell.jsx` | Capacitor Android |

Détection : `src/utils/platform.js` (`isMobileBrowserViewport`, `isCapacitorNative`).

---

## 2. Architecture navigation mobile authentifiée

```
MobileWebShell / MobileAppShell
├── Header sticky (titre route, recherche, avatar, bouton veille ⏻)
├── Drawer latéral (hamburger) → MobileSidebarDrawer = parité Sidebar desktop
├── Contenu page (padding safe-area + bottom nav)
└── Bottom nav 5 items : Accueil | Dossiers | Nouveau (+) | Documents | Messages
```

**Entrées conditionnelles** : `*Entry.jsx` bascule mobile/desktop (`DashboardEntry`, `DocumentsEntry`, etc.).

---

## 3. Landing mobile – contenu actuel

`MobileLandingPage.jsx` (sections principales) :

1. Hero – titre Greffio, sous-titre formalités, CTA « Générer mes statuts » + « Accéder au dashboard »
2. Grille 6 services (`LEGAL_SERVICES`) + lien `/services`
3. Plateforme – 4 cartes valeur
4. Parcours – étapes + blocs « comment ça marche »
5. Recherche entreprise – `CompanyLookupCard` SIREN/SIRET
6. Bandeau indépendance Greffio
7. Tarifs – `LandingPricingSection` (hover desktop, cartes empilées mobile)
8. App Android – `GooglePlayStoreLink`
9. FAQ (3 items) + footer légal
10. `MobilePublicBottomNav` – visiteur non connecté

**Écarts vs desktop** (à auditer) :

- Pas de visuel hero animé droite
- Navbar simplifiée (pas de dropdown Services/Ressources)
- FAQ réduite vs desktop
- Footer moins dense

---

## 4. Cockpit mobile – état UX (juin 2026)

### Accueil (`MobileHomePage`)

- Salutation + carte « Action requise » (dossier principal, CTA continuer)
- Grille 2×2 : Dossiers, Documents, Messages, Compte
- Bloc scanner natif (Capacitor) si dossier actif
- ~~Bandeau « Menu ☰ drawer »~~ **supprimé**

### Documents en ligne (`MobileOnlineDocumentsPanel`)

Trois formulaires signables : non-condamnation, liste souscripteurs, pouvoirs formalités.

**Statuts affichés** (badge + hint) selon API dossier :

| Statut API | Badge client | Hint |
|------------|--------------|------|
| REQUESTED | À fournir | Remplissage auto + signature |
| UPLOADED / GENERATED / PENDING_REVIEW | Déposé / En vérification | Envoyé – en cours de vérification |
| VALID / VALIDATED / SIGNED | Validé | Validé – document enregistré |
| INVALID / REJECTED | À corriger | À corriger puis renvoyer |

Utilitaire : `src/utils/onlineDocumentStatus.js`.

### Bouton veille / déconnexion

- Icône **Power (⏻)** dans le header (pas flèche LogOut)
- Dialog « Mettre en veille ? » avant logout
- Sheet compte : action « Mettre en veille »

### Choix dossier documents

- Overlay plein écran (style reconnexion idle) si plusieurs dossiers – `DossierVaultPickerOverlay`

---

## 5. Design tokens & contraintes

- Couleur primaire : `--greffio-blue`, `--greffio-blue-900`
- Cartes : `rounded-3xl`, bordures `border-border/70`, ombres légères
- Touch targets : min ~44px (`h-11`, `min-h-[56px]`)
- Typo : Plus Jakarta / Inter (via `index.css`)
- **Interdit** sans demande explicite : refonte landing desktop, palette globale, header public

---

## 6. Fichiers clés à citer dans l’audit

```
src/mobile/MobileLandingPage.jsx
src/mobile/MobileHomePage.jsx
src/mobile/MobileDossierDetailPage.jsx
src/mobile/MobileDocumentsPage.jsx
src/mobile/ui/MobileOnlineDocumentsPanel.jsx
src/mobile/ui/MobileCockpitHeaderActions.jsx
src/components/MobileSidebarDrawer.jsx
src/config/mobileNavigation.js
src/components/WebMobileBottomNav.jsx
docs/contexte-audit-mobile-greffio-chatgpt.md  (audit technique complet)
```

---

## 7. Prompt à copier-coller dans ChatGPT

```
Tu es un expert UX/UI mobile (iOS/Android patterns, accessibilité WCAG, SaaS B2C).

Contexte : Greffio est une plateforme française de formalités d'entreprise (statuts, greffe, documents). Je t'attache le fichier « contexte-landing-mobile-audit-chatgpt.md » du repo Greffio.

Mission :
1. Auditer la landing mobile ET le cockpit client mobile (accueil, dossier, documents, navigation).
2. Compare mentalement avec une landing SaaS premium (clarté, hiérarchie, confiance juridique) SANS proposer de refonte de la charte couleur Greffio (bleu marine validé).
3. Liste les problèmes par sévérité : P0 (bloquant UX), P1 (friction), P2 (polish).
4. Pour chaque point : écran concerné, problème observé, recommandation concrète (composant, copy, spacing), effort S/M/L.
5. Propose 5 quick wins implémentables en <1 jour dev.
6. Propose 3 améliorations « wow » compatibles mobile (micro-interactions, empty states, onboarding) sans toucher à la landing desktop.

Format de réponse :
- Résumé exécutif (5 lignes)
- Tableau priorités
- Wireframes textuels si utile (ASCII)
- Checklist QA mobile (320px, 390px, safe-area, thumb zone)

Contraintes :
- Bottom nav 5 onglets + FAB central « Nouveau » conservés
- Drawer latéral pour assistant/pilotage/statuts/paramètres
- Identité Greffio figée
- App native Capacitor Android en scope
```

---

*Dernière mise à jour : juin 2026 – post statuts documents en ligne + bouton veille ⏻.*
