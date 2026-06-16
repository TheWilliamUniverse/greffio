# Contexte Greffio – Génération statutaire & formalités (référence ChatGPT)

> **Usage** : coller ce fichier (ou des sections) dans une conversation ChatGPT pour qu’il comprenne **concrètement** comment Greffio produit les statuts, quelles données client déclenchent quels textes, et quelles formalités existent sur la plateforme.
>
> **Référence qualité statuts SAS** : style « TRUE POWER v1 » – document aéré, juridique, cohérent mathématiquement, sans marketing, sans emoji, sans référence dossier interne en version finale.
>
> **Code source de vérité** : le moteur Greffio (`server/statuts/`, `server/utils/statutesDataMapper.js`) prime sur ce document en cas de divergence.

**Alignement landing ↔ dashboard** : le simulateur (`buildSimulatorStatutesPreview` → `draftStatutesDocument`) et le dashboard dossier (`POST /api/dossiers/:id/statutes/generate`) doivent produire **le même texte à données équivalentes**. Pas de preview « raccourcie » côté landing. Voir `docs/contexte-integrations-greffio-chatgpt.md` §4.

---

## 1. Vue d’ensemble Greffio

Greffio est une plateforme SaaS de formalités d’entreprise (création, modification, établissements, gestion, documents). Le parcours client passe par :

1. **Choix de la formalité** (27 démarches – voir §3)
2. **Questionnaire** (`/questionnaire` connecté ou simulateur `/simulateur`)
3. **Constitution du dossier** (pièces, paiement, validation Greffio)
4. **Génération documentaire** (statuts PDF/ODT, liste souscripteurs, pouvoirs, etc.)
5. **Dépôt guichet unique / instruction greffe**

**Seules 5 formes produisent des statuts aujourd’hui** : SAS, SASU, SARL, EURL, SCI.  
**Pas de statuts** : micro-entreprise, EI, et toutes les formalités sur société déjà existante (sauf si elles impliquent une refonte statutaire – non automatisée en création complète).

---

## 2. Pipeline de génération des statuts (étapes techniques)

```
Questionnaire client
    ↓
statutesDataMapper.js / mapQuestionnaireToStatutsData.js
    ↓  (normalisation siège, associés, capital, dirigeants, greffe…)
mapStatutesDataToRenderContext.js
    ↓  deriveStatutsCapitalModel + validateStatutsCapitalModel
renderWilliamSas2026.js  (SAS/SASU)  OU  williamAdaptations.js (SARL/EURL/SCI)
    ↓  blocs structurés (préambule, 27 articles SAS, annexes)
adaptToLegacyDocument.js
    ↓  document legacy (cover, blocks, signatures, annexes)
assertValidGeneratedStatuts + validateGeneratedStatutsText
    ↓  blocage si incohérence
PDF (statutesPdf.js) / ODT-DOCX (statutesOfficeExport.js)
```

### 2.1 Tenants (pourquoi cette architecture)

| Principe | Conséquence |
|----------|-------------|
| **Une source capital** (`deriveStatutsCapital.js`) | Art. 5, 7, 7.5 et annexe 1 utilisent les mêmes montants |
| **Validation avant export** | Capital ≠ actions × nominal → **pas de PDF** |
| **Template William 2026 (27 art.)** | SAS complet ; SASU = adaptations post-rendu |
| **SARL/EURL/SCI = parts sociales** | Moteur « William parts », pas le JSON SAS 2026 |
| **Couche juridique + couche documentaire** | Le texte doit être correct **et** lisible (14 pt, paragraphes séparés, signatures avant annexes) |

### 2.2 Aboutissants (livrables)

| Livrable | Contenu |
|----------|---------|
| **Statuts PDF** | Page de garde, corps 27 articles (SAS), signatures, 3 annexes |
| **Statuts ODT/DOCX** | Même logique, export client |
| **Annexe 1** | Répartition capital (tableau) |
| **Annexe 2** | Actes société en formation |
| **Annexe 3** | Pouvoirs formalités (doublon conceptuel avec doc séparé `formality_powers`) |
| **Liste souscripteurs** | PDF éditable séparé |
| **Pouvoirs formalités** | PDF éditable séparé |

---

## 3. Catalogue des formalités Greffio (27 démarches)

### 3.1 Création (`category: creation`)

| Clé | Libellé | Statuts auto ? | Forme juridique |
|-----|---------|----------------|-----------------|
| `creation_societe` | Créer une société | Oui si forme supportée | Choix libre (SAS, SASU, SARL…) |
| `creation_sasu` | Créer une SASU | Oui | SASU |
| `creation_sas` | Créer une SAS | Oui | SAS |
| `creation_sarl` | Créer une SARL | Oui | SARL |
| `creation_eurl` | Créer une EURL | Oui | EURL |
| `creation_sci` | Créer une SCI | Oui | SCI |
| `micro_entreprise` | Micro-entreprise | **Non** | MICRO |
| `entreprise_individuelle` | EI | **Non** | EI |

### 3.2 Établissements & siège (`etablissements`)

| Clé | Libellé | Statuts ? |
|-----|---------|-----------|
| `etablissement_secondaire_creation` | Créer établissement secondaire | Non (formalité greffe) |
| `etablissement_creation` | Ajouter un établissement | Non |
| `etablissement_fermeture` | Fermer un établissement | Non |
| `etablissement_transfert` | Transférer un établissement | Non |
| `transfert_siege` | Transférer le siège social | Non (PV/statuts modificatifs hors moteur création) |

### 3.3 Modifications (`modifications` + `gestion`)

| Clé | Libellé |
|-----|---------|
| `changement_dirigeant` | Changer de dirigeant |
| `changement_denomination` | Changer dénomination |
| `modification_activite` | Modifier l’activité |
| `modification_objet_social` | Modifier objet social |
| `augmentation_capital` | Augmenter capital |
| `reduction_capital` | Réduire capital |
| `beneficiaires_effectifs_modification` | Modifier BE |
| `depot_comptes_annuels` | Dépôt comptes annuels |
| `mise_en_sommeil` | Mise en sommeil |
| `reprise_activite` | Reprise activité |
| `dissolution_liquidation_radiation` | Dissolution / liquidation / radiation |

### 3.4 Autres (`autres`)

| Clé | Libellé |
|-----|---------|
| `societe_etrangere_france` | Société étrangère en France |
| `correction_regularisation` | Régularisation formalité rejetée |
| `obtention_kbis_documents` | Kbis / documents officiels |

### 3.5 Parcours questionnaire connecté (étapes UI)

`contact` → `demarche` → `forme` → `entreprise` → `gouvernance` → `beneficiaires` → `recap` → `validation`

**Familles UI (4 cartes)** : Création · Établissements & siège · Modifications · Documents & régularisation

---

## 4. Moteurs statutaires par forme juridique

| Forme | Moteur | Articles | Titres |
|-------|--------|----------|--------|
| **SAS** | `renderWilliamSas2026.js` + template JSON 27 art. | 27 | Actions |
| **SASU** | Idem + `sasuAdaptations.js` (suppr. art. 17–18, libellés « associé unique ») | 25 | Actions |
| **SARL** | `williamAdaptations.js` → `buildWilliamSarlDocument` | 25 | Parts sociales, **gérant** |
| **EURL** | `buildWilliamEurlDocument` | 24 | Associé unique, parts |
| **SCI** | `buildWilliamSciDocument` | 25 | Parts + clause immobilière |

**Templates legacy** (`server/legal/statutes/templates/*.template.js`) : **non utilisés** en production.

---

## 5. Matrice des choix client → variantes de texte statutaire

### 5.1 Identité société → Articles 1–3, couverture

| Donnée client | Variable interne | Texte généré |
|---------------|------------------|--------------|
| Dénomination | `denomination` | Art. 1, couverture, annexes |
| Sigle (optionnel) | `sigle` | Art. 1 « et de sigle … » |
| Siège complet | `seat.*` | Art. 3 « Le siège social est fixé au … » |
| Domiciliation | `domiciliation` | Art. 3 « chez [domiciliataire] » |
| Greffe / ville RCS | `greffe`, `resolveGreffeCity` | Couverture, art. 26–27, tribunal |
| **Immatriculée** | `isRegistered: true` | Couverture : « Immatriculée au RCS de [ville] » |
| **En cours** | `isRegistered: false` (défaut création) | « En cours d'immatriculation au RCS de [ville] » |
| Référence dossier GF-xxx | `reference` | **Exclure** du document final signable |
| Durée | `duree` (défaut 99) | Art. 4 |

### 5.2 Capital → Articles 5, 7, Annexe 1

| Donnée | Défaut dossier | Variante texte |
|--------|----------------|----------------|
| `capital` | ex. 10 000 € | Art. 5 « fixé à la somme de … » |
| `nombreTitres` | ex. 1 000 | « divisé en X actions de Y euros » |
| **Règle absolue** | – | `capital = nombreTitres × valeurNominale` – sinon **erreur** |
| `capitalType: Variable` | Fixe | Art. 5 + clauses L.231-1 à L.231-8 + min/max |
| `liberationCapital` | **50 %** (questionnaire) / 100 % (simulateur) | Voir §5.4 |
| `apportsNature: Non` | – | « **Il n'y a aucun apport en nature.** » |
| `apportsNature: Oui` + montant | – | « Les apports en nature sont chiffrés à X euros » + détail par associé |
| `exerciceFin` | 31 décembre | Art. 5 clôture |
| `premierExerciceFin` | 31/12 année en cours | « premier exercice clôturé le … » |

### 5.3 Associés → Préambule, art. 5–7, 6, signatures

#### A. Nombre d’associés

| Cas | Préambule | Définitions | Signatures |
|-----|-----------|-------------|------------|
| **SAS multi** | « LES SOUSSIGNÉS : » + ET entre associés | « Associé(s) : … » | Bloc signatures + « Lu et approuvé » |
| **SASU / EURL** | « L'ASSOCIÉ UNIQUE : » | « Associé unique : … » | Idem unipersonnel |

#### B. Personne physique

**Template préambule :**
```
{civilité} {Prénom} {NOM}, demeurant {adresse}, né le {date}, de nationalité {nationalité}{qualification mineur}.
```

| Variante | Qualification |
|----------|---------------|
| Majeur | rien de plus |
| Mineur émancipé | « , mineur émancipé » |
| Mineur non émancipé | « , mineur non émancipé » + ligne « Représenté(e) légalement par … » + art. 6 étendu + art. 7 art. 382 CC |

**Règles typographiques :** civilité Monsieur/Madame ; **nom de famille en MAJUSCULES**.

#### C. Personne morale associée

**Template préambule (Greffio) :**
```
{DENOMINATION}, {forme} au capital de {capital PM}, immatriculée au RCS de {ville} sous le numéro {SIREN}, dont le siège social est situé {adresse}, représentée par {représentant}, agissant en qualité de {Président|Directeur Général}, dûment habilitée aux fins des présentes.
```

| Donnée requise | Si absente |
|----------------|------------|
| `representativeName` | Validation / placeholder |
| `representativeQuality` | Président ou Directeur Général uniquement |
| `capitalSocial` (PM) | Capital propre de la PM, **pas** celui de la société en formation |

#### D. Répartition capital (art. 5)

Par associé, un paragraphe :
```
{NOM} : {X}% des actions, soit {N} actions.
```

### 5.4 Libération des apports numéraires (art. 7) – **cas de figure**

**Taux global unique** pour tous les associés (`liberationCapital`).

| Taux | Ligne 7.x par associé | Art. 7.4 | Art. 7.5 |
|------|----------------------|----------|----------|
| **100 %** | « Apport en numéraire de X euros, **entièrement libérés** lors de la constitution. » | Présent (modèle William) | Somme = **100 % du capital** |
| **50 %** | « … **libéré à hauteur de 50 %** …, **soit Y euros**. » | Présent | Somme = **50 % du capital** |
| **20 %** | « … libéré à hauteur de 20 % …, soit Y euros. » | Présent | Somme = **20 % du capital** |
| **Autre** (questionnaire) | Si non numérique → **fallback 50 %** ⚠️ | Présent | Recalculé |

**Exemple TRUE POWER (capital 10 000 €, 50 %)** :
- WE : 7 500 € souscrit → 3 750 € libérés
- William ABDOU : 2 500 € → 1 250 € libérés
- **7.5** : « La somme de **5 000 euros** … déposée … »

**Interdit :**
```
Apport de 7 500 €, libéré à hauteur de 100 %, soit 3 750 €.
```

**Non supporté aujourd’hui :** taux de libération **différent par associé** (sauf montants explicites cohérents avec le taux global).

### 5.5 Dirigeants → Articles 8–9

| Cas | Art. 8 |
|-----|--------|
| Président = personne physique | « Le Président est {NOM}. » |
| Président = PM | « Le Président est {PM}, **représentée par** {rep}, **en qualité de** {qualité}. » |
| Directeur général renseigné | « Le Directeur Général est {NOM}. » |
| Pas de DG | Art. 9 : paragraphe pouvoirs DG **supprimé** |

**Interdit :** mineur non émancipé comme dirigeant.

### 5.6 Clauses statutaires optionnelles (template + personnalisation)

Champs simulateur avancé (`formalityEngine.js`) – impact principalement preview / clauses template :

| Champ | Impact |
|-------|--------|
| `clauseInalienabilite` + durée | Art. 14 |
| `clausePreemption` | Art. 15 |
| `clauseAgrement` | Art. 16 |
| `clauseExclusion` | Art. 17 (SAS multi uniquement) |
| Quorum / majorités custom | Art. 11 |
| `mediationArbitrage` | Art. 25–26 |

**SASU :** articles **17** (exclusion) et **18** (sortie conjointe) **supprimés** automatiquement.

### 5.7 Article 6 – mineurs

| Situation | Texte |
|-----------|-------|
| Aucun mineur | « Les associés exercent leurs droits dans les conditions prévues par la loi et par les présents statuts. » |
| Mineur émancipé | 2 paragraphes pleine capacité + obligations |
| Mineur non émancipé | 3 paragraphes représentation légale + art. 382 CC |

### 5.8 Signatures & annexes (ordre document)

```
… Article 27 …

SIGNATURES
Établi à {ville} le {date},
En {N} exemplaires originaux.
…

Annexe 1 – Répartition du capital
Annexe 2 – État des actes …
Annexe 3 – Pouvoirs pour formalités
```

**Annexe 2 – variantes :**
- Défaut : liste à puces (compte bancaire, bail, contrats…)
- Si `actsInFormation[]` renseigné : tableau date / nature / partie / montant

---

## 6. Structure fixe SAS William 2026 (27 articles)

```
PAGE DE TITRE
LES SOUSSIGNÉS
DISPOSITIONS PRÉLIMINAIRES (Définitions, Objet du présent acte)
IL A ÉTÉ CONVENU ET DÉCIDÉ CE QUI SUIT :

TITRE I – FORMATION (art. 1–7)
TITRE II – ADMINISTRATION (art. 8–10)
TITRE III – DÉCISIONS COLLECTIVES (art. 11–12)
TITRE IV – ACTIONS & TITRES (art. 13–18)  ← 17–18 absents en SASU
TITRE V – FONCTIONNEMENT INTERNE (art. 19–21)
TITRE VI – RÉSULTATS & FIN DE VIE (art. 22–24)
TITRE VII – LITIGES (art. 25–26)
TITRE VIII – DISPOSITIONS DIVERSES (art. 27)

SIGNATURES
Annexe 1 / 2 / 3
```

---

## 7. Pièces dossier par type de formalité

### 7.1 Création société (SAS/SASU/SARL/EURL/SCI)

| Pièce | Obligatoire | Condition |
|-------|-------------|-----------|
| Pièce d'identité | Oui | – |
| Justificatif domicile | Oui | – |
| Justificatif siège | Oui | – |
| **Statuts signés** | Oui | Générés Greffio |
| Liste souscripteurs | Oui | Générée |
| Pouvoirs formalités | Oui | Générés |
| Attestation dépôt capital | Non | Si libération partielle |
| Annonce légale | Non | – |
| Déclaration BE | Non | – |
| Non-condamnation dirigeant | Non | – |
| Ordonnance émancipation | Non | Si associé mineur émancipé |
| Autorisation parentale | Non | Si associé mineur non émancipé |

### 7.2 EI / micro-entreprise

**Exclus :** statuts, capital, associés, liste souscripteurs, pouvoirs, BE, attestation capital.

### 7.3 Formalités modification / établissement

Pas de génération statuts complète automatisée ; dossier = pièces greffe + formulaires selon démarche (PV, JAL, etc.) – **hors scope moteur statuts création**.

---

## 8. Règles de validation (blocage génération)

### 8.1 Capital (`deriveStatutsCapital.js`)

- `capitalTotal = shareCount × nominalValue`
- `Σ actions associés = shareCount`
- `Σ souscriptions = capitalTotal`
- `releasedAmount = subscribed × liberationPercent` (par associé)
- `Σ libéré = montant art. 7.5`

**Codes erreur :** `STATUTES_CAPITAL_INCONSISTENT`, `STATUTES_TEXT_VALIDATION_FAILED`, `STATUTES_VALIDATION_FAILED`

### 8.2 Texte généré

- Pas de « X actions de 1 euro » si nominal ≠ 1 €
- Pas de « actes préparatoires à compléter »
- Pas de texte parasite échantillon (William ABDOU / Ibtissam…)
- SASU = exactement **1** associé
- Mineur non émancipé → représentants légaux obligatoires
- PM → représentant + qualité signataire

### 8.3 Ce que ChatGPT ne doit **jamais** inventer

- Numéro RCS, SIREN, adresses, dates de naissance
- Montants capital / libération non fournis
- Qualité de représentant non choisie
- Référence dossier interne (GF-xxxxx) dans version finale
- Contradiction mathématique (ex. 1 000 × 1 € = 10 000 €)

---

## 9. Typographie & mise en page (couche documentaire)

| Élément | Règle |
|---------|-------|
| Format | A4, marges 2 cm |
| Couverture | 18 pt, centré, aéré |
| Corps | 14 pt, interligne ~140 % |
| Gras | Dénomination, noms associés/dirigeants, montants, % capital, titres, SIGNATURES |
| Souligné | Sous-sections 7.1, 7.2, 7.4, 7.5, 27.1–27.4 |
| Listes exclusion art. 17 | Tirets « - … ; » |
| Annexes actes | Puces « • … ; » |
| Pagination cible SAS | ~16–20 pages (contenu standard) |

---

## 10. Scénarios types à maîtriser (checklist ChatGPT)

### Création SAS – 2 associés (1 PM + 1 PP mineur émancipé)

- [ ] Couverture « en cours d'immatriculation »
- [ ] PM en tête des soussignés, capital PM distinct
- [ ] Civilité + NOM majuscules PP
- [ ] Art. 6 mineur émancipé
- [ ] Art. 7 libération 50 % cohérente + 7.5 = 50 % capital
- [ ] Président PM avec représentant art. 8
- [ ] Signatures avant annexes

### Création SASU – associé unique, capital 1 000 €, 100 % libéré

- [ ] 25 articles (pas 17–18)
- [ ] « Associé unique » partout
- [ ] Art. 7 « entièrement libérés »
- [ ] 7.5 = 1 000 €

### Création SARL – 3 associés, gérant, parts sociales

- [ ] Moteur parts (pas actions)
- [ ] Libellés gérant / parts (pas Président SAS)
- [ ] 25 articles

### Création EI

- [ ] **Pas de statuts Greffio** – orienter vers formalité EI

### Transfert siège / changement dirigeant

- [ ] **Pas de statuts complets** – PV modificatif / formalité greffe

---

## 11. Fichiers code à consulter

| Sujet | Fichier |
|-------|---------|
| Catalogue démarches | `src/lib/questionnaireFlow.js` |
| Champs simulateur | `src/utils/formalityEngine.js` |
| Mapping questionnaire → statuts | `server/utils/statutesDataMapper.js` |
| Contexte rendu | `server/statuts/mappers/mapStatutesDataToRenderContext.js` |
| Calcul capital | `server/statuts/shared/deriveStatutsCapital.js` |
| Rendu SAS 2026 | `server/statuts/renderers/renderWilliamSas2026.js` |
| Adaptations SASU | `server/statuts/adapters/sasuAdaptations.js` |
| SARL/EURL/SCI | `server/legal/statutes/reference/williamAdaptations.js` |
| Validation | `server/statuts/validators/validateGeneratedStatuts.js` |
| PDF | `server/pdf/statutesPdf.js` |
| ODT/DOCX | `src/utils/statutesOfficeExport.js` |
| Annexes | `server/legal/statutes/shared/annexes.js` |
| Règles formalité | `server/domain/formalities.js` |
| Mineurs | `server/utils/minorAssociateRules.js` |
| Tests référence | `server/statuts/tests/williamStatutes.test.js` |

---

## 12. Prompt système suggéré (extrait pour ChatGPT)

```
Tu rédiges ou contrôles des statuts Greffio (SAS/SASU/SARL/EURL/SCI).
Utilise uniquement les données fournies. Valide capital = actions × nominal.
Libération 100 % → « entièrement libérés » ; < 100 % → taux + montant + art. 7.4 + 7.5 cohérent.
Apports nature = 0 → « Il n'y a aucun apport en nature ».
Noms de famille en MAJUSCULES. Civilités Monsieur/Madame.
PM associée : représentant + qualité dans le préambule et art. 8 si Président.
Pas de référence dossier interne. Signatures avant annexes. Style TRUE POWER v1 : aéré, 14 pt, formel.
Si incohérence : signaler la variable manquante ou le calcul erroné – ne pas inventer.
```

---

*Document généré pour Greffio SaaS – à maintenir synchronisé avec le moteur `server/statuts/`.*
