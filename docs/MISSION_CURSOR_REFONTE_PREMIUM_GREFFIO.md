# Mission Cursor – Refonte premium Greffio

> **Statut exécution** : 14 juin 2026 – lot 1 implémenté (PDF, signature interne confirmée, footer paiements, boutique/panier). Chantiers restants documentés ci-dessous.

---

## Consigne utilisateur (verbatim)

Propose des améliorations de la procuration (de son texte et de sa disposition) donne les indications complètes et détaillées en un me pour cursor. Propose des améliorations de greffio SaaS, notamment le footer de la landing, où les logos des marques de paiement ne sont pas fondues dans le background (il faut enlever le blanc autour des logos tels que visa, MasterCard, amex) /// l'expérience de la boutique de greffio et panier doivent être améliorer, en conservant les couleurs et l'identité mais en refusant les designs et la dispositions du panier et de l'interface de paiement, Okay ? Rendu : tous ce que je te dis mot pour mot au début, puis un long me avec tes indications et le fichier de la procuration en pagination et disposition sur mesure au cm/px près /// il faut aussi améliorer le système de signature pour que les documents soient comme quand ils étaient avec Sign well (imite) : Sign well essai gratuit finit dans 12heures et je ne vais pas le renouveler. /// Ajoute des fonctionnalités innovantes et extraordinaire avec toutes les intégrations, api, ou, ux disponibles. À la fin du MD, liste 25 choses extraordinaire à ajouter en intégration sur le site. / À toi ! :)

---

## 1. Contexte produit

Greffio est une plateforme SaaS de formalités d'entreprise (William Establishments). Paiements via **Mollie** (pas Stripe). Signature documentaire : **SignWell en fin d'essai** – basculer définitivement sur la signature interne Greffio (`greffio_internal`).

**Contrainte impérative** : `.cursor/rules/preserve-brand-identity.mdc` – ne pas refondre landing hero, navbar globale, tokens CSS, footer design structurel.

**PDFs de référence analysés** :
- `formality_powers (1).pdf` – Pouvoirs pour formalités (Annexe 3) : layout basique, pas d'overflow majeur mais manque bandeau premium
- `Procuration_Greffio_F43820666.pdf` – bugs : `creation_societe` brut, date ISO `2026-06-14T07:21:24.664Z`, mise en page plate

---

## 2. Procuration Greffio – spec pagination A4 (mm / px)

Format **A4** : 210 × 297 mm = **595,28 × 841,89 pt** (pdf-lib / PDFKit).

### 2.1 Grille générale

| Zone | mm depuis haut | pt depuis haut (Y pdf-lib inversé) | Contenu |
|------|----------------|-------------------------------------|---------|
| Marge page | 18 mm tous côtés | 51 pt | Référence spec utilisateur |
| Bandeau header | 0–28 mm | y ≈ 793 → 762 pt | Titre + sous-titre + réf. dossier |
| Cartes Mandant / Mandataire | 38–52 mm | côte à côte, gap 12 pt | Cards fond #F7FAFC, bordure #D1D9E6 |
| Objet du mandat | 98 mm | paragraphe wrap max 481 pt | Texte légal |
| Table formalité | 112–138 mm | 3 lignes label/valeur | Entreprise, Type (libellé public), Forme |
| Limites | 148 mm | italique muted | Disclaimer |
| Consentement | 168 mm | wrap | Checkbox texte légal |
| Bloc signature | 220 mm | Nom + date FR | SES Greffio |
| Preuve signature | 248 mm | Hash, IP (optionnel ops) | Audit |
| QR vérification | bas page, 18 mm marge bas | 46×46 pt | URL `/verify/document/{hash32}` |
| Footer | 8 mm bas | « Greffio · Procuration · {ref} » + pagination | 1/1 |

### 2.2 Typographie

| Élément | Police | Taille pt | Couleur |
|---------|--------|-----------|---------|
| Titre principal | Helvetica Bold | 15 | #1F4A9E (brand) |
| Sous-titre | Helvetica | 10,5 | #616872 |
| Labels sections | Helvetica Bold | 8 | uppercase tracking |
| Corps | Helvetica | 10 | #141A24 |
| Footer / hash | Helvetica | 7–8 | #616872 |

### 2.3 Règles métier texte

- **Jamais** afficher un slug (`creation_societe`) – utiliser `resolveFormalityPublicLabel()` (`server/domain/formalityLabels.js`)
- Dates : `formatFrenchDateTime()` → « 14 juin 2026 à 09 h 21 » (pas ISO)
- Accents NFC normalisés via `pdfSafe()`
- Wrap automatique : `wrapTextByWidth()` – aucune ligne ne dépasse `CONTENT_WIDTH = 481 pt`

### 2.4 Fichiers code

| Fichier | Rôle |
|---------|------|
| `server/pdf/pdfLayoutPremium.js` | Utilitaires partagés (marges, cards, QR, footer) |
| `server/pdf/mandatePdf.js` | Génération procuration premium (pdf-lib) |
| `server/mandateTemplate.js` | Texte fallback + hash consentement |
| `server/index.js` | `POST /api/dossiers/:id/mandate/sign` |

### 2.5 Implémenté (14/06/2026)

- [x] Refonte `mandatePdf.js` avec layout premium
- [x] `formalityLabelMap` via `resolveFormalityPublicLabel`
- [x] Dates françaises
- [x] QR + route `/verify/document/:id`
- [ ] Page verify avec lookup API hash en base (phase 2)
- [ ] Multi-pages si consentement très long (rare)

---

## 3. Pouvoirs pour formalités (Annexe 3) – spec

Même grille 18 mm. Structure alignée sur PDF greffe :

| Zone | mm | Détail |
|------|-----|--------|
| Bandeau | 0–28 | « POUVOIRS POUR FORMALITÉS » + Annexe 3 |
| Société + forme | 38–52 | Label + forme juridique en italique (ex. « société par actions simplifiée ») |
| Greffe compétent | 56 | |
| Intro pouvoirs | 68 | « Les pouvoirs sont expressément conférés à… » |
| Liste à puces | 78–175 | 5 bullets, wrap, tiret « - » |
| Fait à / le | 188 | Ville + `formatFrenchDate` |
| Signataire | 206 | Nom + titre (Le Président / Le Gérant) |
| Ligne signature | 232–250 | Zone tampon `stampSignatureOnPdf` layout `formality_powers_official` |
| QR + footer | bas | idem procuration |

### Fichiers

- `server/pdf/formalityPowersPdf.js` – **refactoré**
- `server/documents/formalityPowers/buildFields.js` – champs éditeur
- `server/pdf/stampSignatureOnPdf.js` – estampille post-signature

### Implémenté

- [x] Header bandeau premium
- [x] Fix accent « régulariser »
- [x] QR optionnel si `documentId` passé
- [x] Footer pagination
- [ ] Passer `documentId` depuis route génération draft (phase 2)

---

## 4. Signature électronique – remplacement SignWell

SignWell : essai expiré, **ne pas renouveler**. Greffio utilise déjà `GREFFIO_INTERNAL_PROVIDER` par défaut (`server/services/signature/signatureProvider.js`).

### 4.1 Parcours 5 étapes (existant + à enrichir)

| Étape | Composant | Statut |
|-------|-----------|--------|
| 1. Preview PDF | `PdfPreviewPanel` + `SignaturePublicPage` | ✅ |
| 2. Identité signataire | `SignatureAdoptPanel` | ✅ |
| 3. Consentement | `SignatureDocumentAcknowledge` | ✅ |
| 4. Signature (typée / dessin) | `submitPublicSignature` | ✅ |
| 5. Téléchargement + audit | preuve PDF + `SignatureEvidence` | ✅ |

**Mention légale obligatoire** : « Signature électronique simple (SES) » – **pas** de claim eIDAS qualifié.

### 4.2 Fichiers clés

```
server/services/signature/finalizeInternalSignature.js
server/pdf/stampSignatureOnPdf.js
server/services/signature/generateProofCertificatePdf.js
src/pages/SignaturePublicPage.jsx
server/routes/signaturePublicRoutes.js
```

### 4.3 Alignement qualité SignWell

| Aspect SignWell | Équivalent Greffio | Statut |
|-----------------|-------------------|--------|
| PDF estampillé | `stampSignatureOnPdf` | ✅ |
| Certificat de preuve | `generateProofCertificatePdf` | ✅ |
| Audit trail | `signatureAuditService` | ✅ |
| OTP email | `signatureOtpService` | ✅ optionnel |
| Empreinte GRF | bas de page PDF | ✅ |
| UI embedded signing | redirect SignWell | ❌ retirer progressivement |

### 4.4 Actions phase 2

- [ ] Désactiver SignWell en prod : `GREFFIO_SIGNATURE_PROVIDER=greffio_internal` (ou unset)
- [ ] Retirer copy « SignWell » côté client (`SubscribersListPage`, toasts)
- [ ] Bloc signature premium unifié procuration + NC + pouvoirs
- [ ] Route dashboard `/documents/:id/sign` si lien interne manquant

---

## 5. Footer landing – logos paiement

### Problème

`PaymentBrandBadges` appliquait `bg-white/95` sur fond footer `#0b1220` → boîtes blanches autour de Visa / MC / Amex.

### Solution implémentée

1. Assets transparents : `public/images/payments/*-mark.svg` (logo seul, sans rectangle)
2. `PaymentBrandBadges` : mode `inverse` → `bg-transparent`, bordure `white/10`, src `markSrc`
3. Terminal checkout (fond clair) : SVG colorés originaux + fond blanc léger OK

### Fichiers

- `src/components/layout/PaymentBrandBadges.jsx`
- `src/config/paymentBrands.js`
- `src/components/layout/GreffioUltraFooter.jsx` (inchangé structurellement – conforme règle marque)

---

## 6. Boutique, panier, checkout Mollie

### 6.1 Panier – spec UX refusée → refonte

| Avant (refusé) | Après (implémenté) |
|----------------|-------------------|
| Drawer étroit une colonne | `sm:max-w-2xl`, grille 2 colonnes desktop |
| Récap en footer bas | Colonne sticky « Récapitulatif » |
| Empty state minimal | Illustration + CTA |
| Pas de toast add | `toast.success` à l'ajout (déjà ClientShopPage) |

### 6.2 Checkout Mollie

- `GreffioPaymentTerminal.jsx` – copy Mollie explicite
- `PaymentPage.jsx` – `formatOrderPublicReference()` masque UUID
- Pas de Stripe – webhooks `server/routes/paymentsRoutes.js` + Mollie

### 6.3 Fichiers

```
src/hooks/useShopCart.js
src/components/boutique/ShopCartDrawer.jsx
src/pages/ClientShopPage.jsx
src/pages/ClientOrdersPage.jsx
src/components/payments/GreffioPaymentTerminal.jsx
src/pages/PaymentPage.jsx
src/utils/orderReference.js
```

### 6.4 Phase 2 boutique

- [ ] Panier multi-commande → paiement groupé Mollie (1 checkout)
- [ ] Page checkout dédiée `/boutique/checkout` (full page, pas drawer)
- [ ] Codes promo / devis ops
- [ ] Recommandations cross-sell (Kbis + extrait RNE)

---

## 7. Déploiement

```powershell
npm run build
.\scripts\deploy-backend-vps.ps1   # si changements server/pdf ou signature
```

Variables prod recommandées :
```
GREFFIO_SIGNATURE_PROVIDER=greffio_internal
GREFFIO_APP_URL=https://greffio.fr
```

---

## 8. Checklist Cursor – prochaines sessions

### P0
- [ ] Test PDF procuration avec dossier BLACK MEN / creation_societe → libellé FR
- [ ] Désactivation SignWell UI + env
- [ ] API verify document par hash SHA-256

### P1
- [ ] Checkout boutique full-page
- [ ] Paiement groupé Mollie multi-lignes panier
- [ ] Emails procuration avec lien signature interne

### P2
- [ ] Font Inter embarquée PDF (licence)
- [ ] Watermark brouillon avant signature
- [ ] Export audit ZIP dossier

---

## 9. Vingt-cinq intégrations extraordinaires à ajouter

1. **Mollie Components** – iframe carte embedded sans redirect (UX premium checkout)
2. **INPI / Guichet Unique API** – statut formalité temps réel dans dossier
3. **Pappers / Societe.com API** – préremplissage SIREN boutique et questionnaire
4. **INSEE Sirene API** – validation SIREN live dans panier
5. **Yousign ou Universign** – option SES+ renforcée si client exige tiers
6. **FranceConnect+** – identification signataire procuration
7. **Didit KYC** (déjà partiel) – vérification identité avant signature
8. **Resend + webhooks** – emails transactionnels trackés (déjà Resend MCP)
9. **Cal.com** – prise RDV formaliste depuis dossier bloqué
10. **Crisp / Intercom** – chat contextuel avec réf. dossier
11. **Notion API** – sync checklist ops par dossier
12. **Slack webhooks** – alertes ops dépôt greffe
13. **n8n self-hosted** – automatisation relances documents manquants
14. **Cloudflare Turnstile** (existant) – étendre à signature publique
15. **Google Business Profile API** – post-création micro-entreprise
16. **LegalPlace / Legalstart webhook** – import dossiers partenaires
17. **DocuSeal open-source** – alternative self-hosted signature si scale
18. **PDF/A-3** – archivage long terme procuration
19. **Tesseract OCR** – extraction Kbis uploadé → préremplissage
20. **OpenAI Assistants** – relecture statuts + alertes incohérences
21. **Segment / Plausible** – funnel boutique → paiement → livraison
22. **Capacitor App Links** – deep link `greffio://dossier/{id}/sign`
23. **Hostinger MCP** – déploiement one-click staging preview PDF
24. **Qonto / Shine API** – offre pack création + compte pro
25. **Datadog RUM** – monitoring perf terminal Mollie mobile

---

*Document généré pour exécution Cursor – Greffio SaaS – 14 juin 2026*
