# Contexte IA – Captures Play Store & mockup iPhone 17 Pro

> Document de briefing pour assistants IA (ChatGPT, Cursor, etc.) travaillant sur les assets Google Play de **Greffio**. Lire ce fichier avant toute modification.

---

## 1. Objectif

Ces assets servent à la **publication de l’app Android Greffio sur Google Play Console** (fiche **fr-FR**).

Ils doivent :

- Respecter les contraintes Play Console (dimensions, ratio, taille fichier).
- Présenter des **écrans fictifs mais crédibles** du parcours Greffio (pas de données personnelles réelles).
- Pour le téléphone : afficher l’UI dans un **mockup iPhone 17 Pro** sur fond blanc (choix esthétique marketing, l’app reste Android).
- Rester conformes légalement : Greffio est un **service privé indépendant** – pas de logos État, INPI, Infogreffe ou tiers non autorisés.

Références complémentaires :

- Spécifications : [`docs/play-store/assets-spec.md`](./assets-spec.md)
- Checklist publication : [`docs/play-store/checklist-publication.md`](./checklist-publication.md)

---

## 2. Architecture

```
assets/play-store/
├── icon-512.png                          # Icône (générée)
├── feature-graphic-1024x500.png          # Bannière (générée)
├── screenshots/
│   ├── phone/                            # 1080×1920 – mockup iPhone
│   ├── tablet-7/                         # 1440×2560 – plein écran
│   ├── tablet-10/                        # 2880×5120 – plein écran
│   ├── chromebook/                       # 1920×1080
│   └── android-xr/                       # 1920×1080
└── source/
    ├── greffio-wordmark-official.svg
    ├── feature-graphic-source.html
    ├── icon-source.svg
    └── phone/
        ├── 01-accueil-greffio.html … 06-suivi-dossier.html
        ├── play-store-shared.css         # Styles tablet + phone (tout-en-un)
        └── fragments/
            ├── bottom-nav-public.html
            └── bottom-nav-auth.html

scripts/
├── generate-play-store-screenshots.js    # npm run screenshots:playstore
└── generate-play-store-assets.js         # npm run assets:playstore (icône + bannière)
```

### Flux de génération (captures)

1. Playwright (Chromium headless) lit les HTML source dans `assets/play-store/source/phone/`.
2. Le script **injecte** :
   - le fragment de navigation (`<!-- BOTTOM_NAV -->`) ;
   - le CSS inline depuis `play-store-shared.css` ;
   - le wordmark SVG inline depuis `greffio-wordmark-official.svg`.
3. Selon le groupe cible :
   - **phone** → enveloppe `capture-phone` + coque iPhone (`wrapPhoneDeviceHtml`) ;
   - **tablet-7 / tablet-10** → classe `capture-tablet` uniquement ;
   - **chromebook / android-xr** → fallback template ou route live si sources indisponibles.
4. Screenshot PNG écrit dans `assets/play-store/screenshots/<groupe>/`.
5. Validation automatique (ratio 9:16 ou 16:9, tailles min/max, poids max 8 Mo).

Variables d’environnement utiles :

| Variable | Défaut | Effet |
|----------|--------|-------|
| `PLAYSTORE_USE_SITE_SOURCES` | `1` (activé) | Utilise les HTML source statiques ; mettre `0` pour tenter les routes live |
| `PLAYSTORE_BASE_URL` | `http://127.0.0.1:3000` | URL de fallback si sources HTML échouent |

> **Note :** `play-store-phone-narrow.css` n’existe pas en fichier séparé. Tous les styles phone sont dans `play-store-shared.css` (section `body.capture-phone`).

---

## 3. Mockup iPhone 17 Pro (phone uniquement)

Le mockup est appliqué **uniquement** aux captures `phone/`. Implémenté en CSS + injection HTML dans `generate-play-store-screenshots.js`.

### Dimensions

| Élément | Valeur |
|---------|--------|
| Canvas final PNG | **1080 × 1920 px** (fond blanc `#ffffff`) |
| Coque externe (`.iphone-device`) | **812 × 1756 px** |
| Bezel uniforme | **4 px** |
| Écran interne Greffio (`.screen`) | **804 × 1748 px** (402 × 874 pt @2×) |
| Dynamic Island | **158 × 38 px**, centrée en haut |
| Home indicator | barre 134 × 5 px en bas de l’écran |
| Coins coque | rayon externe 54 px, interne 50 px |

### Éléments chrome

- **Dynamic Island** noire avec capteur (`.di-sensor`) – injectée dans la status bar au rendu phone.
- **Boutons latéraux** : volume haut/bas (gauche), power (droite) – spans décoratifs, pas interactifs.
- **Pas de logo Apple** – interdit explicitement.
- **Fond blanc** autour du device (pas de dégradé sur le canvas phone).
- **Status icons masquées** en mode phone (seule l’heure « 9:41 » reste à gauche).

### Références design

Commentaire source CSS : style inspiré **Behance / Dribbble / iOS 17** – rendu générique « iPhone Pro », pas une reproduction pixel-perfect d’Apple.

### UI Greffio à l’intérieur

L’UI interne est **redimensionnée nativement** pour 804 px de large (pas de `transform: scale`). Overrides dans `body.capture-phone .…` (typo, paddings, trims par scène).

---

## 4. Tablette vs téléphone

| Mode | Classe body | Coque iPhone | Viewport logique Playwright | Sortie PNG |
|------|-------------|--------------|----------------------------|------------|
| **phone** | `capture-phone` | Oui | 1080 × 1920, `deviceScaleFactor` calculé | 1080 × 1920 |
| **tablet-7** | `capture-tablet` | Non | 1080 × 1920 → scale ×1.333 | 1440 × 2560 |
| **tablet-10** | `capture-tablet` | Non | 1080 × 1920 → scale ×2.667 | 2880 × 5120 |

### Différences visuelles clés

**Phone (`capture-phone`)**

- Mockup centré sur fond blanc.
- Dynamic Island à la place des trois dots status.
- Status icons (`status-dot`) **cachées**.

**Tablette (`capture-tablet`)**

- Plein écran 1080 × 1920 logique, **sans coque**.
- Status bar : heure à gauche, **trois dots centrés** (`.capture-tablet .status-icons { position: absolute; left: 50%; transform: translateX(-50%) }`).
- Typographie et espacements « tablette » (variables `:root` par défaut).

> **Règle importante :** les modifications phone (mockup, trims scène) ne doivent **pas** altérer le rendu tablette. Les overrides phone sont toujours préfixés `body.capture-phone`.

---

## 5. Contenu Greffio – 6 scènes

Chaque scène = 1 HTML source + 1 PNG de sortie. Données fictives : **Nova Atelier SAS**, SIREN `123 456 789`.

| # | Fichier source | PNG | Nav | Onglet actif | Route réelle |
|---|----------------|-----|-----|--------------|--------------|
| 01 | `01-accueil-greffio.html` | `01-accueil-greffio.png` | **publique** | `accueil` | `/` |
| 02 | `02-recherche-siren-siret.html` | `02-recherche-siren-siret.png` | **publique** | `simuler` | `/simulateur` |
| 03 | `03-questionnaire-progressif.html` | `03-questionnaire-progressif.png` | **auth** | `new` | `/questionnaire` |
| 04 | `04-dashboard-dossier.html` | `04-dashboard-dossier.png` | **auth** | `home` | `/dashboard` |
| 05 | `05-documents.html` | `05-documents.png` | **auth** | `documents` | `/documents` |
| 06 | `06-suivi-dossier.html` | `06-suivi-dossier.png` | **auth** | `dossiers` | `/dossiers` |

### Navigation

- **Publique** (`bottom-nav-public.html`) – calquée sur `MobilePublicBottomNav.jsx` : Accueil, Simuler, Services, Tarifs, Compte.
- **Auth / cockpit** (`bottom-nav-auth.html`) – calquée sur `MobileAppShell.jsx` : Accueil, Dossiers, Nouveau (+), Documents, Compte.

L’onglet actif est défini dans `SCENES` du script JS (`activeNavTab`) et appliqué via `data-tab` dans les fragments.

### Structure HTML obligatoire

Chaque scène doit contenir :

```html
<link rel="stylesheet" href="./play-store-shared.css" />
<!-- … contenu … -->
<!-- BOTTOM_NAV -->
```

Classes utiles sur `<main class="screen scene-…">` :

- `scene-accueil`, `scene-recherche`, `scene-questionnaire`, `scene-dashboard`, `scene-documents`, `scene-suivi`

Ces classes activent des **trims phone** (masquer éléments, ajuster typo) dans le CSS.

### Viewport source HTML

Les HTML déclarent `width=1080, height=1920` – c’est le **canvas logique tablette/default**. En mode phone, le CSS redefinit `--capture-logical-width/height` à 804 × 1748 à l’intérieur de la coque.

---

## 6. Règles de modification

### Ne pas casser

| Zone | Interdit sans demande explicite |
|------|--------------------------------|
| **Identité Greffio** | Palette (`--primary`, `--brand`, etc.), wordmark officiel, landing globale, tokens CSS globaux du site |
| **Rendu tablette** | Ne pas déplacer les dots centrés ; ne pas ajouter la coque iPhone aux tablettes |
| **Contraintes Play Console** | Phone 1080×1920, ratio 9:16, ≤ 8 Mo, min 4 captures phone |
| **Conformité légale** | Pas de mention « service officiel », pas de logos tiers/État, pas de vraies données perso |
| **Placeholder nav** | Supprimer ou renommer `<!-- BOTTOM_NAV -->` casse le script |
| **Logo Apple** | Ne jamais ajouter |

### Modifications sûres

- Texte/copy **local** à une scène (titres, labels, données fictives).
- Trims layout phone via `body.capture-phone .scene-…` dans `play-store-shared.css`.
- Ajout/retrait d’éléments dans les HTML source (en respectant le overflow hidden).
- Ajustement des fragments nav si l’app mobile évolue (garder `data-tab` cohérent avec le script).

### Après toute modification

1. Regénérer : `npm run screenshots:playstore`
2. Vérifier la console : lignes `[OK]` pour chaque PNG
3. Ouvrir visuellement les PNG phone (mockup centré, fond blanc, pas de clipping)
4. Si changement icône/bannière : `npm run assets:playstore`

---

## 7. Commandes

```bash
# Captures (6 scènes × 5 groupes = 30 PNG)
npm run screenshots:playstore

# Icône 512×512 + feature graphic 1024×500
npm run assets:playstore

# Vidéo promo (hors scope mockup phone)
npm run video:playstore
```

Prérequis : Playwright installé (`npx playwright install chromium` si première exécution).

---

## 8. Instructions pour l’IA

Quand l’utilisateur demande un changement sur les captures Play Store :

### Checklist

- [ ] Identifier **quelle(s) scène(s)** (01–06) et **quel format** (phone seulement ? tablette aussi ?).
- [ ] Lire le HTML source + les règles CSS `body.capture-phone .scene-…` existantes.
- [ ] Modifier le **minimum** : HTML pour le contenu, CSS pour le layout phone/tablet.
- [ ] Conserver `<!-- BOTTOM_NAV -->` et le lien CSS `./play-store-shared.css`.
- [ ] Si nav change : mettre à jour le fragment + `activeNavTab` dans `generate-play-store-screenshots.js` si nécessaire.
- [ ] **Ne pas toucher** au rendu tablette si la demande concerne le mockup phone.
- [ ] Regénérer avec `npm run screenshots:playstore`.
- [ ] Confirmer : phone = **1080×1920**, fond blanc, mockup centré, Dynamic Island visible.
- [ ] Vérifier absence de secrets / données réelles dans le rendu.
- [ ] Signaler les PNG modifiés dans `assets/play-store/screenshots/phone/`.

### Cas fréquents

| Demande | Où agir |
|---------|---------|
| Changer un titre ou CTA | HTML scène concernée |
| Masquer un élément qui déborde (phone) | `play-store-shared.css` → `body.capture-phone .scene-…` |
| Changer l’onglet nav actif | `SCENES[].activeNavTab` dans le script JS |
| Ajuster la coque iPhone | CSS `body.capture-phone .iphone-*` + `wrapPhoneDeviceHtml` si structure HTML |
| Nouvelle scène (07) | HTML + entrée `SCENES` + fragment nav + regénération |

### Anti-patterns

- Modifier `LandingPage.jsx` ou l’identité globale pour ajuster une capture → **non**, rester dans `assets/play-store/source/phone/`.
- Utiliser un screenshot live du site (`PLAYSTORE_USE_SITE_SOURCES=0`) comme source principale → les HTML statiques sont la source de vérité.
- Créer un second fichier CSS phone → tout est centralisé dans `play-store-shared.css`.

---

## 9. Fichiers de sortie

### Captures téléphone (prioritaires Play Console)

```
assets/play-store/screenshots/phone/
├── 01-accueil-greffio.png
├── 02-recherche-siren-siret.png
├── 03-questionnaire-progressif.png
├── 04-dashboard-dossier.png
├── 05-documents.png
└── 06-suivi-dossier.png
```

### Autres groupes (même noms de fichiers)

```
assets/play-store/screenshots/tablet-7/
assets/play-store/screenshots/tablet-10/
assets/play-store/screenshots/chromebook/
assets/play-store/screenshots/android-xr/
```

### Autres assets Play Store

```
assets/play-store/icon-512.png
assets/play-store/feature-graphic-1024x500.png
```

---

## Fichiers clés à lire en premier

1. [`scripts/generate-play-store-screenshots.js`](../../scripts/generate-play-store-screenshots.js) – logique SCENES, injection nav, coque iPhone
2. [`assets/play-store/source/phone/play-store-shared.css`](../../assets/play-store/source/phone/play-store-shared.css) – styles tablet + phone + trims scène
3. [`assets/play-store/source/phone/01-accueil-greffio.html`](../../assets/play-store/source/phone/01-accueil-greffio.html) – modèle de structure HTML
4. [`docs/play-store/assets-spec.md`](./assets-spec.md) – contraintes Google Play
