# Runbook – Débloquer la vérification Amazon Pay Greffio

> **Contexte** : mail Amazon Pay (juin 2026) indiquant que `http://greffio.willentreprises.com/` ne contient pas les informations correctes sur l’entité légale propriétaire du site – **notamment l’adresse**.
>
> **Objectif** : mettre le site et Seller Central en conformité, puis relancer la review via **Appeal**.
>
> **Entité concernée** : une seule entité par compte Amazon Payments → **WILLIAM ESTABLISHMENTS** (marque Greffio).

**Durée estimée** : 1 à 2 h (modifs site + déploiement + Seller Central + appeal)  
**Prérequis** : accès Seller Central Europe, accès déploiement Hostinger/VPS, KBIS ou extrait RCS à portée de main

---

## Table des matières

1. [Ce que demande Amazon (en clair)](#1-ce-que-demande-amazon-en-clair)
2. [Pourquoi Greffio a été refusé](#2-pourquoi-greffio-a-été-refusé)
3. [Les 3 chantiers à faire](#3-les-3-chantiers-à-faire)
4. [Chantier A – Seller Central : infos entreprise](#4-chantier-a--seller-central--infos-entreprise)
5. [Chantier B – Seller Central : URL du site](#5-chantier-b--seller-central--url-du-site)
6. [Chantier C – Site Greffio : 4 pages légales](#6-chantier-c--site-greffio--4-pages-légales)
7. [Bloc légal à afficher (texte canonique)](#7-bloc-légal-à-afficher-texte-canonique)
8. [Modifications code Greffio (Cursor)](#8-modifications-code-greffio-cursor)
9. [Déploiement et vérification publique](#9-déploiement-et-vérification-publique)
10. [Chantier D – Appeal Amazon Pay](#10-chantier-d--appeal-amazon-pay)
11. [Checklist finale](#11-checklist-finale)
12. [FAQ / erreurs fréquentes](#12-faq--erreurs-fréquentes)

---

## 1. Ce que demande Amazon (en clair)

Amazon Pay vérifie que **le site où tu encaisses** correspond à **l’entreprise déclarée** dans ton compte marchand.

Un reviewer (humain ou automatique) visite ton URL et cherche sur des pages publiques :

| Information exigée | Exemple Greffio |
|--------------------|-----------------|
| **Nom de l’entreprise** (raison sociale) | WILLIAM ESTABLISHMENTS |
| **Adresse** (siège social ou adresse légale) | 470 Promenade des Anglais, 06200 Nice *(à confirmer KBIS)* |
| **Numéro d’immatriculation** | RCS Nice 102 230 414 · SIRET 10223041400017 |

Sur **4 types de pages** :

| Page Amazon (EN) | Page Greffio | URL |
|------------------|--------------|-----|
| Terms and conditions | Mentions légales + CGU/CGV | `https://greffio.willentreprises.com/mentions-legales` |
| Privacy policy | Politique de confidentialité | `https://greffio.willentreprises.com/confidentialite` |
| Contact us | Contact | `https://greffio.willentreprises.com/contact` |
| About us | **À créer** – page À propos | `https://greffio.willentreprises.com/a-propos` *(proposé)* |

Tant que ces pages ne montrent pas **nom + adresse + immatriculation** de façon visible et cohérente, la vérification reste bloquée – **même si l’intégration technique Amazon Pay fonctionne**.

Le mail mentionne aussi la mise à jour de l’**URL dans Seller Central** : en pratique, s’assurer que l’origin JavaScript est bien `https://` (pas `http://`) et correspond au domaine live.

---

## 2. Pourquoi Greffio a été refusé

Audit du site au 13 juin 2026 :

| Page | Raison sociale | RCS / SIRET | Adresse postale |
|------|----------------|-------------|-----------------|
| `/mentions-legales` | ✅ WILLIAM ESTABLISHMENTS | ✅ | ❌ **absente** |
| `/confidentialite` | ❌ pas de bloc éditeur | ❌ | ❌ |
| `/contact` | ❌ | ❌ | ❌ (email/tél. seulement) |
| About us | ❌ **page inexistante** | – | – |

**Cause probable du refus** : Amazon cite explicitement « **address** ». Greffio affiche le nom et les numéros sur les mentions légales, mais **nulle part l’adresse du siège social**.

---

## 3. Les 3 chantiers à faire

Ordre recommandé :

```
1. Vérifier Seller Central (Business info) = même adresse que le KBIS
        ↓
2. Corriger le site (4 pages légales + déploiement)
        ↓
3. Vérifier / corriger JavaScript origin dans Seller Central (HTTPS)
        ↓
4. Appeal avec les URLs des pages corrigées
```

Ne pas faire l’appeal **avant** que les pages publiques soient à jour – Amazon reverra le site et re-refusera si l’adresse manque encore.

---

## 4. Chantier A – Seller Central : infos entreprise

**Lien** : [Business and contact info](https://sellercentral-europe.amazon.com/external-payments/business-and-contact-info)

### Actions

1. Se connecter au compte Seller Central Europe (celui qui a demandé Amazon Pay pour Greffio).
2. Ouvrir **Business and contact info**.
3. Vérifier que tout correspond au **KBIS de WILLIAM ESTABLISHMENTS** :
   - Raison sociale exacte (orthographe, majuscules)
   - Adresse du siège social
   - Numéro RCS / SIRET / TVA si demandés
   - Email et téléphone de contact
4. Si une info est fausse ou obsolète → **corriger ici d’abord**, puis aligner le site sur ces valeurs.

> **Règle Amazon** : une seule entité légale par compte Amazon Payments. Greffio = WILLIAM ESTABLISHMENTS. Pas d’autre société sur ce compte.

---

## 5. Chantier B – Seller Central : URL du site

**Lien** : [Manage Client/Store ID configurations](https://sellercentral-europe.amazon.com/external-payments/amazon-pay/integration-central/lwa)

### Procédure (reprise du mail Amazon)

1. Aller sur l’écran **Integration Central / LWA**.
2. Dans le menu déroulant **Store name**, sélectionner le store Greffio (celui lié à `greffio.willentreprises.com`).
3. Cliquer **Edit**.
4. Champ **Allowed JavaScript origins** :
   - Supprimer l’URL incorrecte si présente (ex. `http://greffio.willentreprises.com` sans **s**).
   - S’il n’y a rien, passer à l’étape suivante.
5. Ajouter l’URL valide :

```text
https://greffio.willentreprises.com/
```

6. Cliquer **Save changes**.

### Autres URLs à vérifier (déjà documentées Greffio)

| Paramètre | Valeur attendue |
|-----------|-----------------|
| Return URL | `https://greffio.willentreprises.com/paiement/amazon-pay/retour` |
| IPN (webhook) | `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay` |

Voir `docs/AMAZON_PAY_SETUP.md` pour le détail technique.

> Le mail cite `http://` – Greffio est en production **HTTPS**. L’origin doit être en `https://` avec le slash final `/`.

---

## 6. Chantier C – Site Greffio : 4 pages légales

Chaque page doit afficher le **même bloc identité** (section 7). Pas de contradictions entre pages.

### 6.1 Terms and conditions → `/mentions-legales`

**État actuel** : nom, RCS, SIRET, TVA – **sans adresse**.

**À faire** : dans la section « Éditeur du service », ajouter après le SIRET :

```text
Siège social : 470 Promenade des Anglais, 06200 Nice, France
Téléphone : 04 11 81 86 70
Email : contact@willentreprises.com
```

*(Adresse à remplacer si le KBIS ou Seller Central indique autre chose.)*

### 6.2 Privacy policy → `/confidentialite`

**État actuel** : texte RGPD sans identifier l’éditeur.

**À faire** : ajouter en haut ou dans une section « Responsable du traitement / Éditeur » le bloc légal complet (section 7).

### 6.3 Contact us → `/contact`

**État actuel** : formulaire + email + téléphone – pas d’identité société.

**À faire** : ajouter un encart « Éditeur du site » dans la colonne de droite (aside) avec le bloc légal (raison sociale, adresse, RCS, SIRET, contacts).

### 6.4 About us → `/a-propos` (nouvelle page)

**État actuel** : **n’existe pas**. Amazon le cite explicitement.

**À faire** :

1. Créer une page publique `/a-propos` avec :
   - Qui est WILLIAM ESTABLISHMENTS
   - Ce qu’est Greffio (SaaS formalités, service privé non officiel)
   - Bloc légal complet (adresse + immatriculation)
   - Liens vers contact, mentions, confidentialité
2. Ajouter un lien « À propos » dans le footer (`siteFooter.js`).

---

## 7. Bloc légal à afficher (texte canonique)

**À valider contre KBIS + Seller Central avant publication.**

```text
WILLIAM ESTABLISHMENTS
Siège social : 470 Promenade des Anglais, 06200 Nice, France
Immatriculée au RCS de Nice sous le numéro 102 230 414
SIRET : 10223041400017
N° de TVA intracommunautaire : FR49102230414

Greffio est une marque déposée et un service édité par WILLIAM ESTABLISHMENTS.
Greffio est un service privé d’assistance aux démarches administratives des entreprises ;
il ne constitue pas un service officiel de l’État, des greffes ou d’Infogreffe.

Contact : contact@willentreprises.com · 04 11 81 86 70
Site web : https://greffio.willentreprises.com
```

Ce bloc doit être **lisible sans être caché** (pas uniquement en meta, pas en image, pas derrière login).

---

## 8. Modifications code Greffio (Cursor)

Pour appliquer proprement dans le repo :

### 8.1 Source unique – `src/config/publisher.js`

Ajouter les constantes manquantes :

```js
export const PUBLISHER_ADDRESS_LINE = '470 Promenade des Anglais';
export const PUBLISHER_ADDRESS_CITY = '06200 Nice, France';
export const PUBLISHER_SIRET = '10223041400017';
export const PUBLISHER_VAT = 'FR49102230414';
export const PUBLISHER_PHONE = '04 11 81 86 70';
```

### 8.2 Composant réutilisable (recommandé)

Créer `src/components/legal/PublisherLegalBlock.jsx` – affiche le bloc section 7 – importé par :

- `LegalMentionsPage.jsx`
- `PrivacyPolicyPage.jsx`
- `ContactPage.jsx`
- `AboutPage.jsx` (nouveau)
- optionnel : `GreffioUltraFooter.jsx`

### 8.3 Routing – `src/App.jsx`

```jsx
<Route path="/a-propos" element={<AboutPage />} />
```

### 8.4 Footer – `src/config/siteFooter.js`

Ajouter dans la colonne « Conformité » ou « Utilitaire » :

```js
{ to: '/a-propos', label: 'À propos de Greffio' },
```

### 8.5 Contraintes identité

- **Ne pas** modifier la landing (`LandingPage.jsx`), la navbar globale, ni les tokens CSS globaux.
- Les pages légales et le footer légal sont **autorisés** (cf. `.cursor/rules/preserve-brand-identity.mdc`).

---

## 9. Déploiement et vérification publique

### Build et déploiement

```bash
npm run build
# Déployer dist/ sur Hostinger (comme les déploiements dist_*.zip habituels)
```

### Vérifier en navigation privée (obligatoire)

Ouvrir chaque URL et confirmer visuellement **nom + adresse + RCS/SIRET** :

- [ ] https://greffio.willentreprises.com/mentions-legales
- [ ] https://greffio.willentreprises.com/confidentialite
- [ ] https://greffio.willentreprises.com/contact
- [ ] https://greffio.willentreprises.com/a-propos

### Captures d’écran

Prendre 4 captures (une par page) montrant le bloc légal – utiles pour l’appeal ou un échange support Amazon.

---

## 10. Chantier D – Appeal Amazon Pay

**Quand** : uniquement **après** déploiement site + vérif Seller Central.

**Où** : [Integration Central / LWA](https://sellercentral-europe.amazon.com/external-payments/amazon-pay/integration-central/lwa) → option **Appeal**.

### Modèle de message (EN – Amazon préfère souvent l’anglais)

```text
Hello Amazon Pay team,

We have updated our website legal pages to display the full legal entity information
(company name, registered address, and registration number) for WILLIAM ESTABLISHMENTS,
the legal entity operating Greffio at https://greffio.willentreprises.com.

Updated pages:
- Terms and conditions: https://greffio.willentreprises.com/mentions-legales
- Privacy policy: https://greffio.willentreprises.com/confidentialite
- Contact us: https://greffio.willentreprises.com/contact
- About us: https://greffio.willentreprises.com/a-propos

We also verified that our Seller Central business information and the Allowed JavaScript
origin (https://greffio.willentreprises.com/) are correct.

Please resume the account verification review.

Thank you,
[Your name]
WILLIAM ESTABLISHMENTS / Greffio
```

### Version FR (si le formulaire accepte le français)

```text
Bonjour,

Nous avons mis à jour les pages légales de https://greffio.willentreprises.com pour
afficher l’identité complète de WILLIAM ESTABLISHMENTS (raison sociale, adresse du siège,
RCS et SIRET).

Pages mises à jour :
- CGU/CGV : https://greffio.willentreprises.com/mentions-legales
- Confidentialité : https://greffio.willentreprises.com/confidentialite
- Contact : https://greffio.willentreprises.com/contact
- À propos : https://greffio.willentreprises.com/a-propos

Les informations Seller Central et l’origin JavaScript HTTPS ont été vérifiées.
Merci de reprendre la vérification de notre compte Amazon Pay.

Cordialement,
[Nom]
WILLIAM ESTABLISHMENTS / Greffio
```

**Délai de réponse** : variable (quelques jours à 2 semaines). Surveiller Seller Central et la boîte mail du compte.

---

## 11. Checklist finale

### Seller Central

- [ ] Business info = WILLIAM ESTABLISHMENTS + adresse KBIS
- [ ] JavaScript origin = `https://greffio.willentreprises.com/`
- [ ] Return URL et IPN corrects (voir `AMAZON_PAY_SETUP.md`)

### Site public

- [ ] 4 pages live avec nom + adresse + immatriculation
- [ ] Même adresse sur les 4 pages
- [ ] Footer avec lien « À propos »
- [ ] HTTPS OK, pas de page blanche

### Appeal

- [ ] Appeal envoyé avec les 4 URLs
- [ ] Captures d’écran archivées

### Après validation Amazon

- [ ] Tester le bouton Amazon Pay sur `/paiement`
- [ ] Surveiller les IPN dans les logs serveur (`/api/webhooks/amazon-pay`)

---

## 12. FAQ / erreurs fréquentes

### « On a déjà le RCS sur les mentions légales, pourquoi refus ? »

Amazon exige aussi l’**adresse postale**. Le SIRET seul ne suffit pas si l’adresse n’apparaît nulle part.

### « Faut-il une page séparée CGV et mentions ? »

Non. Une page `/mentions-legales` regroupant CGU + CGV + éditeur suffit si Amazon y trouve les 3 infos.

### « http vs https dans le mail ? »

Le reviewer a peut-être vu une URL sans SSL ou une redirect. Utiliser **https** partout dans Seller Central.

### « Peut-on utiliser willentreprises.com au lieu de greffio.willentreprises.com ? »

Non pour Amazon Pay Greffio : l’origin enregistrée est le sous-domaine Greffio. Les pages légales doivent être sur **le même domaine** que l’origin JavaScript.

### « Erreur reçue par erreur ? »

Vérifier [Business and contact info](https://sellercentral-europe.amazon.com/external-payments/business-and-contact-info). Si tout est correct côté Seller Central mais le site manque l’adresse, ce n’est **pas** une erreur – corriger le site.

### « Support Amazon »

[Contact Seller Central](https://sellercentral-europe.amazon.com/cu/contact-us) · [Doc infos marchands](https://sellercentral-europe.amazon.com/help/hub/reference/G202146230)

---

## Documents associés

| Fichier | Contenu |
|---------|---------|
| `docs/contexte-amazon-pay-verification-shopfun-chatgpt.md` | Contexte technique + diagnostic pour ChatGPT/Cursor |
| `docs/AMAZON_PAY_SETUP.md` | URLs Seller Central, variables serveur |
| `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` | Intégration Amazon Pay production |
