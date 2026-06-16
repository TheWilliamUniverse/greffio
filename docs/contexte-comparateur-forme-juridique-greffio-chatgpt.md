# Contexte Greffio – Comparateur de forme juridique (brief ChatGPT / Cursor)

> **Usage** : document de référence **exhaustif** pour concevoir un questionnaire comparateur de formes juridiques sur Greffio, avant rédaction du contenu métier par ChatGPT.
>
> **Code source de vérité** : le repo `TheWilliamUniverse/greffio` prime sur ce document en cas de divergence.
>
> **Contrainte produit** : ne pas modifier l’identité globale (landing hero, palette, header/footer public, tokens CSS globaux) – voir `.cursor/rules/preserve-brand-identity.mdc`.

---

## 1. Objectif du livrable

Créer un **comparateur / questionnaire guidé** permettant à un entrepreneur de :

1. Répondre à des questions sur son **projet** (solo/plusieurs, activité, patrimoine, levée de fonds, réglementé, etc.)
2. Obtenir **1 à 3 formes juridiques recommandées** avec justification claire
3. Voir le **niveau de disponibilité Greffio** (disponible maintenant / bientôt / sur devis)
4. Accéder au **parcours suivant** : simulateur statuts gratuits, questionnaire dossier, ou contact devis

**Différence avec le simulateur actuel** (`/simulateur`) :

| Outil | Rôle actuel |
|-------|-------------|
| `/simulateur?type=statuts` | Parcours complet création (coordonnées → forme → questionnaire → synthèse → offres) |
| **Nouveau comparateur** (à créer) | Outil **secondaire**, plus court, orienté **choix de forme** sans engager tout le wizard |
| Section `#outils-estimateurs` sur `/ressources` | Liens + mini-calculs inline (charges, ACRE, nom…) – le comparateur forme y est **mentionné** mais renvoie encore vers `/simulateur` |

---

## 2. Emplacement proposé dans le site

### 2.1 Page hôte recommandée

**Option A (recommandée)** – page secondaire dédiée :

- **URL** : `/ressources/comparateur-forme-juridique`
- **Entrées** :
  - Carte dans `ResourceEstimatorsSection` (`src/components/resources/ResourceEstimatorsSection.jsx`) – remplacer le lien actuel `/simulateur?type=statuts`
  - Ancre depuis `/ressources#outils-estimateurs`
  - Lien depuis `/services`, `/tarifs`, SEO pages création entreprise
- **Route React** : à ajouter dans `src/App.jsx` à côté de `/ressources/guides/:slug`
- **Header** : même pattern que `ResourcesPage` (logo + CTA « Démarrer ») **ou** hero compact sans dupliquer la landing

**Option B** – section full-width dans `/ressources` (moins isolée, plus longue page)

### 2.2 Shell mobile navigateur

Sur viewport `< 768px`, les routes publiques passent par `MobileWebShell` (`src/mobile/MobileWebShell.jsx`) :

- Header sticky « Simulation » / titre page
- Bottom nav : Accueil · Simuler · Services · Tarifs · Compte
- **Exigence** : comparateur **mobile-first** (champs pleine largeur, pas de scroll horizontal, barre d’action sticky en bas)
- Classes utilitaires déjà en place pour simulateur : `.simulator-mobile`, `.simulator-field-stack`, `--bottom-nav-height-web: 4.75rem`

### 2.3 Routes voisines (CTA de sortie)

| Destination | Quand |
|-------------|-------|
| `/simulateur?type=statuts&formality=sas` | Forme choisie + génération statuts gratuite |
| `/questionnaire?fromComparator=1` | Utilisateur connecté, dossier réel |
| `/signup?service=creation` | Non connecté, veut créer un compte |
| `/contact?service=…&form=…&mode=devis` | Forme `MANUAL_QUOTE` |
| `/paiement?offer=Formalité` | Passage direct offre payante (rare) |

---

## 3. Identité visuelle & design system (à respecter)

### 3.1 ADN de marque

- **Positionnement** : formalités d’entreprise, ton **institutionnel · guidé · rassurant**
- **Éditeur** : William Establishments
- **Prod** : `https://greffio.willentreprises.com`

### 3.2 Tokens CSS (`src/index.css`)

| Token | Valeur / usage |
|-------|----------------|
| `--primary` / `--greffio-blue` | Bleu institutionnel `#1e4d8c` (HSL 214 72% 32%) |
| `--greffio-blue-900` | Texte titres `#0a1220` |
| `--we-bg` | Fond pages outil `#f6f8fc` |
| `--we-border` | Bordures `#c5d2e6` |
| `--greffio-mint` | Succès / validation |
| `--greffio-citron` | Mise en avant douce (hero ressources) |
| `--greffio-coral` | Alerte chaleureuse |
| `--radius` | 8px (composants shadcn) |
| Marketing `.we-card` | coins ~22px (landing – ne pas imposer partout dans l’outil) |

**Typographie** : Inter (corps), Plus Jakarta Sans (titres h1–h6).

### 3.3 Composants UI à réutiliser (ne pas réinventer)

| Composant | Fichier | Usage comparateur |
|-----------|---------|-------------------|
| `Button` | `@/components/ui/button.jsx` | CTA primaire / outline |
| `Input`, `Label` | `@/components/ui/input.jsx` | Champs questionnaire |
| `ProgressiveStepChips` | `@/components/ProgressiveStepChips.jsx` | Étapes (variant `compact` sur mobile) |
| `WizardNavButtons` | `@/components/WizardNavButtons.jsx` | Retour / Continuer sticky |
| `QuestionSelect`, `SegmentedChoice` | `@/components/questionnaire/*` | Choix unique |
| `ProgressCircle` | `@/components/questionnaire/ProgressCircle.jsx` | Avancement % |
| `QuestionSectionHint` | `@/components/questionnaire/QuestionSectionHint.jsx` | Encadré pédagogique |
| `SimulatorJourneyCard` | `@/components/simulator/SimulatorJourneyCard.jsx` | Cartes sélection (mobile) |

### 3.4 Patterns layout existants

**Page ressources** (`ResourcesPage.jsx`) :

- `max-w-7xl mx-auto px-4 py-10`
- Cartes : `rounded-xl border border-border bg-white p-5 shadow-elevation-sm`
- Section estimateurs : `#outils-estimateurs` avec grille `md:grid-cols-2 xl:grid-cols-3`

**Simulateur mobile** (`FormalityWizardPage.jsx`, `presentation="mobile"`) :

- Fond `--we-bg`
- En-tête étape : barre progression + puces compactes
- Carte question : `rounded-2xl border bg-muted p-3.5`
- Champs : `h-12 w-full rounded-xl border-2 border-[#d4e2f5]`
- Barre fixe bas : `WizardNavButtons variant="mobile"`

**Ombres** : `shadow-elevation-sm`, `shadow-elevation-md`

### 3.5 Interdit sans demande explicite

- Refonte hero landing
- Nouvelle palette globale
- Header / footer public marketing
- Emojis dans le livrable juridique
- Texte type « Greffio garantit que X forme est la meilleure » (voir disclaimers §10)

---

## 4. Architecture technique Greffio (intégration)

### 4.1 Fichiers sources de données métier

| Fichier | Contenu |
|---------|---------|
| `src/config/catalog.js` | `LEGAL_STRUCTURES`, `COMPANY_FORM_CATALOG`, `getFormAvailability()` |
| `src/config/businessCatalog.js` | Réexport catalog |
| `src/utils/formalityEngine.js` | Profils forme (`getFormProfile`), sections questionnaire statuts |
| `src/utils/formalityMapping.js` | Mapping démarche → forme / journey |
| `src/config/pricingPlans.js` | Tarifs + FAQ légales |
| `src/config/resourceServices.js` | `LEGACY_ESTIMATORS`, catalog ressources |

### 4.2 Modèle `COMPANY_FORM_CATALOG` (structure d’une entrée)

```js
{
  key: 'sas',              // identifiant technique unique
  label: 'SAS',            // libellé affiché
  family: 'Formes les plus courantes',  // catégorie UI
  templateKey: 'SAS',      // clé moteur statuts / PDF
  hasStatutes: true,       // statuts générables ?
  description: '…',        // pitch court
  governance: 'Président, DG optionnel…',  // organe dirigeant
  rank: 1,                 // ordre d’affichage dans la famille
}
```

### 4.3 Disponibilité produit (`getFormAvailability`)

| Statut | Constante | UX |
|--------|-----------|-----|
| Disponible | `AVAILABLE_NOW` | CTA « Générer mes statuts » / « Créer mon dossier » |
| Bientôt | `COMING_SOON` | Badge « Bientôt » + email ou liste d’attente |
| Sur devis | `MANUAL_QUOTE` | CTA « Demander un devis » → `/contact?mode=devis` |

**Clés `AVAILABLE_NOW`** (aujourd’hui) :

`sas`, `sasu`, `sarl`, `eurl`, `sci`, `micro`, `auto-entrepreneur`, `ei`, `modification`, `transfert-siege`, `changement-dirigeant`

**Clés `COMING_SOON`** :

`sa`, `association-1901`, `holding`, `filiale`, `franchise`, `joint-venture`, `gaec`, `earl`, `scea`

**Toutes les autres** → `MANUAL_QUOTE` par défaut.

### 4.4 Statuts PDF – formes réellement générées (backend)

**5 formes** avec moteur statuts complet (27 articles SAS pour SAS/SASU) :

| Forme | Template | Titres |
|-------|----------|--------|
| SAS | `renderWilliamSas2026.js` | Actions |
| SASU | idem + adaptations unipersonnelles | Actions |
| SARL | `williamAdaptations.js` | Parts sociales |
| EURL | idem | Parts sociales |
| SCI | idem | Parts sociales + clause immobilière |

**Sans statuts auto** : micro-entreprise, EI, association (statuts associatifs partiels), SA, formes spécialisées non branchées.

Référence détaillée : `docs/contexte-generation-greffio-chatgpt.md` §1–§2.

### 4.5 Profils moteur (`getFormProfile` dans `formalityEngine.js`)

Valeurs retournées selon label : `INDIVIDUAL`, `SASU`, `SAS`, `SARL`, `EURL`, `SA`, `SCI`, `SEL`, `ASSOCIATION`, `COOPERATIVE`, `AGRICULTURAL`, `GIE`, `DEFAULT`, etc.

Utile pour **adapter les questions** du comparateur (ex. pas de question « capital social » pour micro/EI).

---

## 5. Catalogue des familles juridiques (UI)

Source : `LEGAL_STRUCTURES` + regroupement `COMPANY_FORM_CATALOG`.

| Famille UI | Exemples de formes |
|------------|-------------------|
| Formes les plus courantes | SAS, SASU, SARL, EURL, SA, SCI, Micro-entreprise, EI, Association loi 1901 |
| Entrepreneurs individuels | EI, Micro-entreprise, Auto-entrepreneur |
| Sociétés commerciales classiques | EURL, SARL, SASU, SAS, SA, SNC, SCS, SCA… |
| Sociétés civiles et immobilières | SCI, SCPI, SCP, SCM, Société civile… |
| Professions libérales et santé | Cabinet libéral, SEL, SELARL, SELAS… |
| Associations, fondations | Association 1901, Fondation, Fonds de dotation |
| Coopératives et ESS | SCOP, SCIC, ESUS, JEI… |
| Agricole | GAEC, EARL, SCEA… |
| Public, mixte | SEM, EPIC… |
| Groupes, montages | Holding, Filiale, Franchise, GIE… |
| Situations atypiques | Société de fait, tacite… |

**Formes « top 9 »** (famille « Formes les plus courantes », rank 1–9) – cœur du comparateur :

| key | label | hasStatutes | Disponibilité Greffio |
|-----|-------|-------------|------------------------|
| sas | SAS | oui | AVAILABLE_NOW |
| sasu | SASU | oui | AVAILABLE_NOW |
| sarl | SARL | oui | AVAILABLE_NOW |
| eurl | EURL | oui | AVAILABLE_NOW |
| sa | SA | oui | COMING_SOON |
| sci | SCI | oui | AVAILABLE_NOW |
| micro | Micro-entreprise | non | AVAILABLE_NOW |
| ei | Entreprise individuelle (EI) | non | AVAILABLE_NOW |
| association-1901 | Association loi 1901 | oui | COMING_SOON |

Descriptions et gouvernance complètes : voir `src/config/catalog.js` lignes 146–223.

---

## 6. Axes de comparaison métier (à enrichir par ChatGPT)

Le comparateur doit scorer / filtrer sur des **critères compréhensibles** (pas jargon seul).

### 6.1 Questions profil projet (suggestions)

| # | Thème | Exemples de réponses |
|---|-------|---------------------|
| 1 | Nombre de fondateurs | Seul · 2 associés · 3+ · Ouvert à investisseurs |
| 2 | Nature d’activité | Commerce · Services / conseil · Tech / startup · Immobilier · Libéral réglementé · Association / ESS |
| 3 | Chiffre d’affaires visé (12 mois) | < 77k · 77k–500k · > 500k · Je ne sais pas |
| 4 | Besoin de lever des fonds | Non · Possible · Oui, VC / BA |
| 5 | Protection du patrimoine personnel | Prioritaire · Modérée · Peu concerné |
| 6 | Régime social dirigeant | Assimilé salarié (SAS) · TNS (SARL) · Micro · Indifférent |
| 7 | Complexité acceptée | Minimum · Standard · Gouvernance avancée |
| 8 | Immobilier dans le projet | Non · Oui (SCI) · Mixte |
| 9 | Activité réglementée (ordre) | Non · Oui (SEL…) |
| 10 | Calendrier | Immédiat · Ce mois · Je compare |

*(Aligner avec les questions déjà posées dans le simulateur étape « Projet » : calendrier, demandeur PP/PM, etc.)*

### 6.2 Grille comparative (colonnes résultat)

Pour chaque forme recommandée, afficher :

| Colonne | Exemple |
|---------|---------|
| Forme | SASU |
| Pourquoi | Associé unique, flexibilité statutaire, assimilé salarié |
| Responsabilité | Limitée au apport |
| Fiscalité (indicatif) | IS – **non conseil fiscal personnalisé** |
| Social dirigeant | Assimilé salarié |
| Capital minimum | 1 € symbolique |
| Greffio | Disponible · Statuts PDF 27 art. |
| Prix indicatif Greffio | 0€ statuts / 149€ formalité |
| CTA | « Générer mes statuts » |

### 6.3 Matrice indicative (base ChatGPT – à valider juridiquement)

| Critère | SASU / SAS | SARL / EURL | EI / Micro | SCI |
|---------|------------|-------------|------------|-----|
| Associés | 1 (SASU) ou plusieurs | 1 (EURL) ou plusieurs | 1 | 2+ en pratique |
| Flexibilité statutaire | Très haute | Moyenne | N/A | Civile |
| Social dirigeant | Assimilé salarié | TNS (gérant) | Micro / TNS | Gérant |
| Levée de fonds | Adaptée | Plus lourde | Non | Non |
| Immobilier | Possible | Possible | Limité | **Typique** |
| Statuts Greffio | Oui | Oui | Non | Oui |

---

## 7. Parcours utilisateur cible (wireflow)

```mermaid
flowchart TD
  A[Entrée /ressources/comparateur-forme-juridique] --> B[Intro + disclaimer]
  B --> C[Questionnaire 8-12 étapes]
  C --> D[Calcul recommandations]
  D --> E{Résultat}
  E -->|Forme AVAILABLE_NOW| F[CTA simulateur ou questionnaire]
  E -->|COMING_SOON| G[Badge + notifier]
  E -->|MANUAL_QUOTE| H[CTA contact devis]
  F --> I[/simulateur?formality=…]
  F --> J[/signup ou /questionnaire]
```

**Principes UX** :

- Une question principale par écran sur mobile
- Progression visible (barre + « 3/10 »)
- Possibilité de **revenir en arrière** sans perdre les réponses
- Sauvegarde locale optionnelle : `saveProjectDraft()` pattern (`src/utils/localStorage.js`)
- Résultat **partageable** (URL avec query hash ou localStorage – pas de données sensibles en URL)

---

## 8. Tarification & offres (affichage comparateur)

Source : `src/config/pricingPlans.js`, `PaymentPage.jsx` offers.

| Offre | Prix | Lien |
|-------|------|------|
| Statuts gratuits / Starter | 0€ | `/simulateur?type=statuts` |
| Formalité | 149€ HT | `/paiement?offer=Formalité` |
| Jeune entrepreneur | 70€ (< 26 ans) | `/paiement?offer=jeune-entrepreneur` |
| Dossier Standard | 99€ HT | legacy |
| Premium équipe | 199€ HT | legacy |
| Cabinet | Sur devis | `/contact?sujet=cabinet-partenaire` |

**Disclaimer obligatoire** (`PRICING_DISCLAIMER`) :

> Les tarifs affichés concernent la prestation Greffio. Les frais légaux (greffe, annonce légale, RCS, etc.) sont indiqués avant validation et restent à la charge du client.

Estimation frais légaux inline ressources : société commerciale ~250€, civile ~180€ (`ResourceEstimatorsSection`).

---

## 9. Disclaimers légaux (obligatoires dans l’UI)

Reprendre / adapter depuis :

- `PRICING_FAQ` – Greffio n’est pas un service officiel, ne remplace pas avocat/EC/notaire
- `formalityEngine.js` – clause « Absence de transfert de responsabilité »
- `MANUAL_QUOTE_LOCK_COPY` (FormalityWizardPage) – formalités sur devis

**Formulation type résultat** :

> Cette recommandation est une aide à la décision basée sur vos réponses. Elle ne constitue pas un conseil juridique, fiscal ou social personnalisé. Le choix final vous appartient.

---

## 10. Contenu & ton rédactionnel

| OK | Éviter |
|----|--------|
| Phrases courtes, tutoiement ou vouvoiement cohérent avec le site (vouvoiement actuel) | Jargon greffe non expliqué |
| « En pratique », « souvent », « à vérifier selon votre situation » | Promesses absolues |
| Badges Disponible / Bientôt / Sur devis | Notation « meilleure forme » sans nuance |
| Liens vers guides SEO (`/creation-entreprise`, glossaire) | Copier-coller code des articles de loi entiers |

---

## 11. SEO & métadonnées (page secondaire)

| Champ | Proposition |
|-------|-------------|
| Title | Comparateur de forme juridique – SAS, SARL, EI, SCI \| Greffio |
| Description | Comparez SASU, SAS, SARL, EURL, micro-entreprise et SCI selon votre projet. Recommandation guidée, sans engagement. |
| Canonical | `https://greffio.willentreprises.com/ressources/comparateur-forme-juridique` |
| Schema | `WebApplication` ou `FAQPage` si FAQ en bas |

S’inscrire dans la stratégie existante : `docs/contexte-seo-greffio-chatgpt.md`.

---

## 12. Accessibilité & mobile (checklist implémentation)

- [ ] Champs `font-size: 16px` minimum sur mobile (évite zoom iOS – déjà dans `index.css`)
- [ ] `min-w-0`, `w-full`, `box-border` sur inputs
- [ ] Pas de `min-w-max` sur conteneurs principaux (cause scroll horizontal)
- [ ] Barre sticky au-dessus du bottom nav web
- [ ] Focus visible, labels associés, `aria-label` sur navigation étapes
- [ ] Contraste texte `--foreground` sur `--background`

---

## 13. État actuel du repo (ne pas dupliquer)

| Élément | Statut |
|---------|--------|
| Lien « Simulateur de choix de forme juridique » | Pointe vers `/simulateur?type=statuts` – **à remplacer** |
| Wizard complet forme | `FormalityWizardPage` étapes 0–3 + questionnaire |
| Comparateurs charges / ACRE / nom / mentions | Modules `compareModules` dans simulateur (`?type=charges`, etc.) |
| Mini-select « Famille juridique » ressources | Estimation coût only, pas vrai comparateur |
| Moteur scoring forme | **N’existe pas encore** – à créer (`legalFormComparatorEngine.js` ou similaire) |

---

## 14. Structure de fichiers suggérée (implémentation Cursor)

```
src/
  pages/LegalFormComparatorPage.jsx       # Page principale
  components/comparator/
    LegalFormComparatorIntro.jsx
    LegalFormQuestionStep.jsx
    LegalFormResultPanel.jsx
    LegalFormComparisonTable.jsx
  config/legalFormComparator.js         # Questions + règles scoring (data)
  utils/legalFormComparatorEngine.js    # computeRecommendations(answers)
docs/
  contexte-comparateur-forme-juridique-greffio-chatgpt.md  # ce fichier
```

**Tests suggérés** : `legalFormComparatorEngine.test.js` – cas solo tech → SASU ; immobilier → SCI ; commerce familial → SARL.

---

## 15. Payload ChatGPT attendu (prochaine étape)

Quand l’utilisateur enverra ses indications ChatGPT, fusionner avec ce document pour produire :

1. **Liste finale des questions** (libellés FR, type de champ, options)
2. **Règles de scoring** (poids, exclusions, tie-break)
3. **Textes « Pourquoi cette forme »** par forme × profil
4. **Copy UI** (titres, sous-titres, CTAs, disclaimers)
5. **FAQ bas de page** (5–8 questions)

---

## 16. Références internes

| Document | Sujet |
|----------|-------|
| `docs/contexte-generation-greffio-chatgpt.md` | Statuts, formalités, pipeline PDF |
| `docs/contexte-integrations-greffio-chatgpt.md` | APIs, paiements |
| `docs/audit-branding-greffio.md` | Design system détaillé |
| `docs/contexte-landing-mobile-audit-chatgpt.md` | Mobile web shell |
| `src/config/catalog.js` | Données formes (source brute) |

---

## 17. Notes travaux en cours (hors comparateur)

- Correctif **simulateur mobile** (zoom / champs pleine largeur) : modifié localement, **à commit + push** avant prod
- **Google Pay** B2C : déployé backend `d8682c4` ; CAWL en aval
- Bouton Power app mobile : déconnexion réelle mais libellé « Mettre en veille » – clarification UX à prévoir

---

*Document généré pour alimenter ChatGPT / Cursor – Greffio / William Establishments – juin 2026.*
