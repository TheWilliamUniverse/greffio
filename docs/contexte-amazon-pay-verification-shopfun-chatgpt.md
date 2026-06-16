# Greffio – Contexte Amazon Pay / ShopFun – Vérification marchand (Seller Central)

> **Usage** : coller ce document entier dans la fenêtre ChatGPT (session **ShopFun**) ou dans Cursor pour débloquer la **vérification du compte Amazon Pay** après le refus reçu le 13 juin 2026.
>
> **Objectif** : faire correspondre le site `https://greffio.willentreprises.com` avec l’entité légale déclarée dans Seller Central, puis relancer la review via **Appeal**.
>
> **Documents liés** :
> - `docs/AMAZON_PAY_SETUP.md` – URLs Seller Central (origin, return, IPN)
> - `docs/PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md` – intégration Amazon Pay production
> - `docs/contexte-integrations-greffio-chatgpt.md` – stack paiements
> - `.cursor/rules/preserve-brand-identity.mdc` – identité landing figée ; **pages légales modifiables**

**Snapshot** : 13 juin 2026 · domaine production `greffio.willentreprises.com`

---

## 1. Consigne à coller dans ChatGPT (ShopFun)

```
Tu travailles sur Greffio (SaaS formalités d’entreprise, marque Greffio, éditeur WILLIAM ESTABLISHMENTS).

Contexte : Amazon Pay a bloqué la vérification marchand car le site https://greffio.willentreprises.com
n’affiche pas correctement l’identité légale (raison sociale, adresse, numéro d’immatriculation).

À partir du contexte fourni :

1. Diagnostique précisément ce qui manque sur chaque page légale exigée par Amazon Pay.
2. Propose un plan d’action minimal (site + Seller Central + appeal) sans refonte de la landing.
3. Rédige le bloc légal canonique à afficher (FR) – raison sociale, forme, siège, RCS, SIRET, TVA, contact.
4. Liste les fichiers Greffio à modifier et le diff fonctionnel attendu.
5. Donne la checklist de validation avant appeal (URLs publiques, cohérence Seller Central, capture d’écran).
6. Signale les points à confirmer avec le fondateur (adresse siège exacte si divergence KBIS / Seller Central).

Contraintes :
- Ne pas toucher à la landing (`LandingPage.jsx`), navbar globale, tokens CSS globaux.
- Modifications autorisées : pages légales, footer légal, config publisher, éventuelle page « À propos » dédiée.
- Une seule entité légale par compte Amazon Payments (WILLIAM ESTABLISHMENTS).
- Répondre en français, actions concrètes, ordre d’exécution P0 → P1.
```

---

## 2. Email Amazon Pay reçu – synthèse

### Motif du blocage

> *« The following website URL that you provided does not include the correct information (address) about the legal entity who owns the website: http://greffio.willentreprises.com/ »*

Amazon exige que les pages légales du site affichent clairement :
- **nom de l’entreprise** (raison sociale),
- **adresse** (siège / adresse légale),
- **numéro d’immatriculation** (RCS / équivalent).

### Actions demandées par Amazon

| # | Action | Où |
|---|--------|-----|
| 1 | Mettre à jour l’**URL du site** dans Seller Central si nécessaire | Integration Central → Allowed JavaScript origins |
| 2 | Mettre à jour les **pages légales** du site | About us, Contact us, Terms, Privacy policy |
| 3 | Vérifier la **cohérence** avec les infos business Seller Central | Business and contact info |
| 4 | **Appeal** après corrections | Integration Central → option Appeal |

### Liens Seller Central (Europe)

| Écran | URL |
|-------|-----|
| Manage Client/Store ID (origins, return URLs) | https://sellercentral-europe.amazon.com/external-payments/amazon-pay/integration-central/lwa |
| Business and contact info | https://sellercentral-europe.amazon.com/external-payments/business-and-contact-info |
| Contact Amazon Pay | https://sellercentral-europe.amazon.com/cu/contact-us |
| Doc « Information required from merchants » | https://sellercentral-europe.amazon.com/help/hub/reference/G202146230 |

### Procédure Seller Central – JavaScript origin

1. **Manage Client/Store ID configurations** (lien ci-dessus).
2. Sélectionner le store Greffio dans le dropdown.
3. **Edit**.
4. Supprimer l’ancienne URL dans **Allowed JavaScript origins** (si incorrecte).
5. Ajouter l’URL valide (voir section 5).
6. **Save changes**.
7. Après déploiement site → **Appeal** sur le même écran.

> **Note** : l’email cite `http://` ; en production Greffio est en **HTTPS**. Utiliser `https://greffio.willentreprises.com/` (avec slash final, comme dans `docs/AMAZON_PAY_SETUP.md`).

---

## 3. Entité légale Greffio – référence canonique

Ces valeurs sont déjà partiellement dans le code. **À valider une dernière fois** contre le KBIS et Seller Central avant publication.

| Champ | Valeur actuelle dans le repo | Source code |
|-------|------------------------------|-------------|
| Raison sociale | **WILLIAM ESTABLISHMENTS** | `src/config/publisher.js`, `src/config/legalFlow.js` |
| Marque commerciale | **Greffio** | partout |
| RCS | **RCS Nice 102 230 414** | `src/config/publisher.js` |
| SIRET | **10223041400017** | `LegalMentionsPage.jsx`, `runtime.js` |
| TVA intracom. | **FR49102230414** | `LegalMentionsPage.jsx`, `runtime.js` |
| Email | **contact@willentreprises.com** | `publisher.js`, `runtime.js` |
| Téléphone | **04 11 81 86 70** | `runtime.js`, footer |
| Site | **https://greffio.willentreprises.com** | `runtime.js` |
| Siège social (adresse postale) | **470 Promenade des Anglais, 06200 Nice, France** | fixtures tests statuts William – **pas encore sur les pages légales publiques** |

### Point critique identifié

L’**adresse postale du siège** n’apparaît sur **aucune** page légale publique aujourd’hui. C’est très probablement la cause directe du refus Amazon (« address »).

Le nom, RCS, SIRET et TVA sont présents sur `/mentions-legales` ; l’adresse physique manque.

---

## 4. Pages légales Amazon – mapping et état actuel

Amazon cite quatre types de pages. Correspondance Greffio :

| Exigence Amazon | Page Greffio | URL production | État au 13/06/2026 |
|-----------------|--------------|----------------|---------------------|
| **Terms and conditions** | Mentions légales + CGU + CGV | `/mentions-legales` | Raison sociale, RCS, SIRET, TVA ✅ – **adresse ❌** |
| **Privacy policy** | Politique de confidentialité | `/confidentialite` | Contenu RGPD ✅ – **bloc éditeur / adresse ❌** |
| **Contact us** | Contact | `/contact` | Email + téléphone ✅ – **bloc société / adresse ❌** |
| **About us** | *Aucune page dédiée* | – | **Manquante** – pas de `/a-propos` ni équivalent |

### URLs à fournir à Amazon (après correction)

```text
https://greffio.willentreprises.com/mentions-legales
https://greffio.willentreprises.com/confidentialite
https://greffio.willentreprises.com/contact
https://greffio.willentreprises.com/a-propos   ← à créer ou URL alternative documentée
```

### Autres pages utiles (déjà en ligne)

| Route | Rôle |
|-------|------|
| `/cookies` | Politique cookies |
| `/suppression-compte` | Suppression compte (Google Play) |
| `/suppression-donnees` | Suppression données |
| `/paiement` | Page paiement sécurisé (Amazon Pay activé) |

---

## 5. Configuration Amazon Pay déjà en place (technique)

Documentée dans `docs/AMAZON_PAY_SETUP.md` :

| Paramètre Seller Central | Valeur |
|--------------------------|--------|
| Allowed return URL | `https://greffio.willentreprises.com/paiement/amazon-pay/retour` |
| Allowed JavaScript origins | `https://greffio.willentreprises.com/` |
| IPN (webhook) | `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay` |

### Code backend / frontend

| Fichier | Rôle |
|---------|------|
| `server/services/amazonPayService.js` | Signature, checkout, finalisation charge |
| `server/routes/amazonPayRoutes.js` | API checkout + retour |
| `src/components/payments/AmazonPayCheckoutPanel.jsx` | Bouton Amazon Pay |
| `src/components/payments/GreffioPaymentTerminal.jsx` | Terminal accordéon (Amazon Pay prioritaire) |
| `src/pages/PaymentPage.jsx` | Parcours paiement web |
| `src/mobile/MobilePaymentPage.jsx` | Parcours paiement mobile |

Le blocage actuel est **administratif / conformité site**, pas un bug d’intégration technique.

---

## 5bis. ShopFun – boutique client Greffio

Dans le vocabulaire interne, **ShopFun** désigne le parcours **boutique / checkout** côté client :

| Élément | Fichier / route |
|---------|-----------------|
| Boutique documents (dashboard) | `src/pages/ClientShopPage.jsx` → route `/boutique` ou équivalent cockpit |
| Terminal paiement unifié | `GreffioPaymentTerminal.jsx` |
| Page paiement dossier | `/paiement` |

Amazon Pay y est affiché comme moyen de paiement B2C. La vérification marchand bloque l’activation **production complète** tant que les pages légales publiques ne sont pas conformes.

---

## 6. Diagnostic écarts – ce qu’il faut corriger (P0)

### P0 – Bloquant Amazon Pay

1. **Ajouter l’adresse du siège social** sur toutes les pages exigées (mentions, confidentialité, contact).
2. **Créer ou enrichir une page « À propos »** (`/a-propos`) avec :
   - raison sociale WILLIAM ESTABLISHMENTS,
   - description Greffio (service privé, non officiel État/greffe),
   - adresse, RCS, SIRET, contacts.
3. **Centraliser les constantes légales** dans `src/config/publisher.js` (ajouter `PUBLISHER_ADDRESS`, `PUBLISHER_SIRET`, `PUBLISHER_VAT`) pour éviter les divergences.
4. **Footer légal** (`GreffioUltraFooter.jsx`) : ajouter la ligne adresse sous le RCS.
5. **Déployer** le frontend sur Hostinger / VPS, vérifier en navigation privée.
6. **Appeal** Seller Central avec URLs exactes.

### P1 – Renforcement conformité

- Bloc « Responsable du traitement / Éditeur » en tête de `PrivacyPolicyPage.jsx`.
- Lien croisé footer : À propos · Mentions · Confidentialité · Contact.
- Aligner `siteSearchIndex.js` (`/politique-confidentialite` vs `/confidentialite` – incohérence mineure).
- Vérifier que Seller Central **Business and contact info** = même adresse que le site.

### Hors scope (ne pas faire dans ce lot)

- Refonte landing, hero, palette, navbar publique.
- Changement d’entité légale ou second compte Amazon Pay.

---

## 7. Bloc légal proposé (template FR – à valider fondateur)

```text
WILLIAM ESTABLISHMENTS
Siège social : 470 Promenade des Anglais, 06200 Nice, France
Immatriculée au RCS de Nice sous le numéro 102 230 414
SIRET : 10223041400017
N° TVA intracommunautaire : FR49102230414

Greffio est une marque déposée et un service édité par WILLIAM ESTABLISHMENTS.
Contact : contact@willentreprises.com · 04 11 81 86 70
Site : https://greffio.willentreprises.com
```

> ⚠️ **Confirmer l’adresse** avec le KBIS et l’écran Seller Central « Business and contact info » avant merge. Si l’adresse Seller Central diffère, c’est **celle de Seller Central** qui fait foi pour Amazon.

---

## 8. Fichiers code à modifier (plan Cursor)

| Priorité | Fichier | Modification attendue |
|----------|---------|------------------------|
| P0 | `src/config/publisher.js` | Exporter adresse, SIRET, TVA, téléphone (source unique) |
| P0 | `src/pages/LegalMentionsPage.jsx` | Section éditeur : adresse postale complète |
| P0 | `src/pages/PrivacyPolicyPage.jsx` | Section « Responsable de traitement » + identité légale |
| P0 | `src/pages/ContactPage.jsx` | Encart « Éditeur / société » avec adresse + immatriculation |
| P0 | `src/pages/AboutPage.jsx` *(nouveau)* | Page À propos Amazon-compatible |
| P0 | `src/App.jsx` | Route `/a-propos` |
| P0 | `src/config/siteFooter.js` | Lien « À propos » dans colonne Conformité ou Utilitaire |
| P1 | `src/components/layout/GreffioUltraFooter.jsx` | Ligne adresse dans bandeau légal |
| P1 | `src/config/siteSearchIndex.js` | Entrée À propos + corriger URL confidentialité |
| P1 | `server/config/publisher.js` | Aligner exports serveur (emails PDF si besoin) |

### Composant réutilisable (recommandé)

Créer `src/components/legal/PublisherLegalBlock.jsx` – bloc compact ou complet – importé par mentions, contact, confidentialité, à propos, footer. Évite 5 copies du même texte.

---

## 9. Checklist avant Appeal Amazon Pay

### Site (production)

- [ ] `https://greffio.willentreprises.com/mentions-legales` affiche raison sociale + **adresse** + RCS + SIRET
- [ ] `https://greffio.willentreprises.com/confidentialite` identifie l’éditeur / responsable avec **adresse**
- [ ] `https://greffio.willentreprises.com/contact` affiche coordonnées **et** identité légale
- [ ] `https://greffio.willentreprises.com/a-propos` (ou équivalent) existe et est linked depuis le footer
- [ ] Informations **identiques** sur les 4 pages (pas de WILLIAM vs William, pas de SIRET différent)
- [ ] Site accessible en HTTPS sans redirect cassé
- [ ] Captures d’écran des 4 pages prêtes pour l’appeal

### Seller Central

- [ ] Business and contact info = même entité et adresse que le site
- [ ] JavaScript origin = `https://greffio.willentreprises.com/`
- [ ] Return URL = `https://greffio.willentreprises.com/paiement/amazon-pay/retour`
- [ ] IPN = `https://api.greffio.willentreprises.com/api/webhooks/amazon-pay`
- [ ] Un seul compte / une seule entité légale (WILLIAM ESTABLISHMENTS)

### Appeal

- [ ] Message court : corrections effectuées, URLs des pages légales listées
- [ ] Joindre ou référencer captures si le formulaire le permet
- [ ] Délai de réponse Amazon : surveiller Seller Central + email

---

## 10. Déploiement après modification

1. Build frontend : `npm run build`
2. Déployer `dist/` sur Hostinger (comme les déploiements récents – archives `dist_*.zip` du 12–13/06)
3. Vérifier en navigation privée les 4 URLs
4. Relancer appeal Seller Central
5. Tester bouton Amazon Pay sur `/paiement` une fois compte validé

Backend Amazon Pay **déjà déployé** (commits `168024b`, `50dfe6a` – voir `PAYMENT_TERMINAL_MODIFICATIONS_2026-06-13.md`). Pas de changement serveur requis pour ce lot légal, sauf alignement `server/config/publisher.js` optionnel.

---

## 11. Questions ouvertes pour le fondateur

1. **Adresse siège** : confirmer `470 Promenade des Anglais, 06200 Nice` vs adresse enregistrée Seller Central ?
2. **Forme juridique** à afficher (SAS, SARL, etc.) – utile pour Amazon et mentions légales ?
3. **Page About** : créer `/a-propos` dédiée ou enrichir `/services` + lien footer ?
4. **Capital social / dirigeant** : à mentionner sur About ou mentions uniquement ?
5. **Appeal** : qui envoie depuis le compte Seller Central (William) ?

---

## 12. Résumé exécutif (1 paragraphe)

Amazon Pay a suspendu la vérification car `greffio.willentreprises.com` ne montre pas l’**adresse** de l’entité légale propriétaire du site. Greffio (WILLIAM ESTABLISHMENTS) a déjà le nom, RCS, SIRET et TVA sur `/mentions-legales`, mais pas l’adresse postale ; la politique de confidentialité et le contact n’ont pas de bloc éditeur complet ; il n’y a pas de page « À propos » dédiée. Correctif : centraliser l’identité légale dans `publisher.js`, l’afficher sur 4 pages publiques, déployer, vérifier la cohérence Seller Central, puis **Appeal**. L’intégration technique Amazon Pay est prête ; seul le conformisme site bloque ShopFun / checkout production.
