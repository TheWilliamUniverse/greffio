# Greffio – Réponses aux questions ChatGPT (éditeur ODT / Document Workspace)

> **Usage** : document de contexte à joindre ou coller avec le prompt `PROMPT_CHATGPT_PLAN_EDITEUR_DOCUMENTS_GREFFIO.md`.
>
> **Date** : 16 juin 2026 · production `greffio.willentreprises.com`

---

## Synthèse de notre besoin

Nous voulons aller **au-delà** de l’édition guidée actuelle (formulaire → PDF) pour permettre à l’utilisateur de **personnaliser et retoucher** certains documents directement dans Greffio (web + app), avec sauvegarde dans le dossier, historique, et export PDF propre.

Nous sommes alignés avec ta recommandation **hybride** :
1. **Personnalisation guidée** (formulaire Greffio, variables, questionnaire) – déjà partiellement en place.
2. **Édition libre** (type Word/LibreOffice) – **à ajouter**, pour les retouches finales sur des documents déjà générés.

Le livrable juridique final reste avant tout un **PDF conforme et signable**. ODT/DOCX sont des formats intermédiaires ou d’export utiles, pas une contrainte absolue si la fidélité PDF est garantie.

---

## 1. Stack actuelle

| Couche | Technologie | Notes |
|--------|-------------|-------|
| Frontend | **React 18 + Vite 7 + React Router** | Pas Next.js |
| UI | Tailwind, Radix, Framer Motion | Identité visuelle figée |
| Backend | **Node.js ESM + Express 5** | PM2 sur VPS |
| BDD prod | **PostgreSQL** (Supabase `DATABASE_URL`) | Migrations SQL |
| BDD dev | SQLite | `server/data/greffio.sqlite` |
| Mobile | **Capacitor 8 Android** | Mode remote-first (`com.greffio.app`) |
| Frontend hébergement | **Hostinger** (git push → build static) | `dist/` |
| Backend hébergement | **VPS Ubuntu** `/opt/greffio`, Nginx, port 8787 | `api.greffio.willentreprises.com` |
| Email | Brevo (+ Resend fallback) | |
| Auth | JWT access/refresh, MFA, appareils de confiance | |
| Paiement | Mollie (+ legacy CAWL) | |

**Réponse directe** : React/Vite + Express/Postgres + Capacitor. Ni Next.js, ni Firebase, ni Hostinger Horizons pour le backend.

---

## 2. Stockage des documents

| Environnement | Driver | Détail |
|---------------|--------|--------|
| Production | **AWS S3** (prioritaire) | `DOCUMENT_STORAGE_DRIVER=s3`, URLs présignées |
| Fallback / legacy | Supabase Storage | Supporté dans `server/services/objectStorage.js` |
| Développement | Fichiers locaux | Chemin disque sous `server/` |
| Migration | Script existant | `npm run storage:migrate-s3` |

Modèle de données existant :
- Table **`documents`** : `dossier_id`, `doc_key`, `status`, `storage_url`, `sha256`, `metadata_json`, `editor_schema_version`, etc.
- Table **`generated_documents`** : versions générées (type, version, `file_url`, `content_hash`).
- Table **`document_events`** : audit des changements de statut.

Les fichiers ne sont **pas** stockés en base64 en BDD. Métadonnées + champs éditeur en JSON, binaire en S3/local.

---

## 3. Format principal

**Réponse : D avec nuance C**

| Priorité | Format | Rôle |
|----------|--------|------|
| 1 | **PDF** | Livrable final, signature, dépôt greffe, aperçu client |
| 2 | **DOCX** | Export statuts / documents bureautiques (génération programmatique existante) |
| 3 | **ODT** | Export statuts (génération programmatique existante) |

**Contexte important** :
- Les statuts William SAS (27 articles, 16 pages) sont générés par un **moteur codé** (`server/statuts/`, template William 2026), pas par fusion d’un .odt LibreOffice brut.
- Exports ODT/DOCX statuts : `src/utils/statutesOfficeExport.js` (construction ZIP/XML via `fflate`).
- D’autres documents éditables produisent directement du **PDF** (`server/services/editableDocumentService.js`).

**ODT n’est pas obligatoire** comme format interne d’édition. En revanche, si l’éditeur en ligne travaille nativement en ODT (Collabora), il faudra valider la **fidélité** sur nos modèles réels (statuts, mandats, listes).

---

## 4. Type de personnalisation

**Réponse : C – Les deux**

| Mode | État actuel | Cible |
|------|-------------|-------|
| **A. Formulaire guidé** | ✅ En production | Enrichir |
| **B. Édition libre bureautique** | ❌ Absent | **Objectif principal de cette mission** |
| **C. Les deux combinés** | Partiel (guidé seul) | **Architecture cible** |

### Déjà implémenté (édition guidée → PDF)

| Document | `doc_key` | Page / flux |
|----------|-----------|-------------|
| Déclaration non-condamnation et filiation | `manager_non_conviction` | `NonConvictionDeclarationPage.jsx` |
| Liste des souscripteurs | `subscribers_list` | `SubscribersListPage.jsx` |
| Procuration et pouvoirs formalités | `formality_powers` | `FormalityPowersPage.jsx` |
| Statuts SAS | génération dédiée | `StatutesPage.jsx` + `server/statuts/` |

Pattern technique :
- API `GET/POST /api/dossiers/:id/documents/:docKey/editor`
- Champs JSON persistés dans `metadata_json`
- Régénération PDF via services dédiés (`editableDocumentService`, `nonConvictionDocumentService`, etc.)
- Signature intégrée (`GreffioSignatureActionBlock`, routes signature)

### Manque aujourd’hui

- Ouvrir le **document source** (ODT/DOCX/PDF) dans un éditeur WYSIWYG complet.
- Sauvegarder les modifications utilisateur comme **nouvelle version** sans écraser l’original.
- Reconvertir en PDF après édition libre.

---

## 5. Niveau d’édition souhaité

| Capacité | MVP | Phase 2 |
|----------|-----|---------|
| Modifier du texte | ✅ Oui | |
| Modifier mise en page (styles, marges) | ⚠️ Limité MVP | ✅ |
| Ajouter / supprimer paragraphes | ✅ Oui | |
| Ajouter une signature | ✅ Déjà via flux Greffio | Conserver ce flux |
| Ajouter des images | ⚠️ Nice-to-have | ✅ |
| Commentaires / suivi de changes | ❌ Non MVP | Optionnel |
| Co-édition temps réel | ❌ Non | Hors scope initial |

**Contrainte mobile** : l’app Capacitor est en remote-first. Un éditeur iframe (Collabora/ONLYOFFICE) sur mobile Android/iOS doit être **explicitement adressé** dans le plan (fallback « ouvrir sur desktop » vs WebView dédiée vs deep link).

---

## 6. Documents concernés

### Priorité P0 (générés par Greffio, forte valeur édition libre)

| Type | Statut actuel |
|------|---------------|
| **Statuts SAS** (27 articles William) | Génération + export ODT/DOCX/PDF, pas d’éditeur libre |
| **Procuration / pouvoirs formalités** | Formulaire → PDF |
| **Liste des souscripteurs** | Formulaire → PDF |
| **Déclaration non-condamnation** | Formulaire → PDF + signature |
| **Mandat / procuration** (`proxy_mandate`) | Upload client principalement |

### Priorité P1

| Type | Statut |
|------|--------|
| PV d’assemblée | Non implémenté comme éditeur |
| Attestations (capital, annonce légale) | Upload + validation ops |
| Lettres au greffe | Partiellement via moteur formalités |

### Hors scope initial ou secondaire

- Documents importés par l’utilisateur (pièces d’identité, justificatifs) : upload PDF, pas édition.
- Documents générés par l’IA : assistant chat existe (`POST /api/assistant`), pas de génération documentaire IA structurée.

### Catalogue `doc_key` backend (`server/store.js`)

```
identity_proof, address_proof, proxy_mandate, signed_statutes,
capital_certificate, legal_notice_certificate, registered_office_proof,
ubo_declaration, manager_non_conviction, subscribers_list,
formality_powers, regulated_activity_proof,
minor_emancipation_order, minor_parental_authorization
```

---

## 7. Hébergement – serveur Collabora / ONLYOFFICE

**Réponse : C → tendance A avec prudence**

| Option | Position |
|--------|----------|
| **A. Docker séparé (Collabora ou ONLYOFFICE)** | Acceptable si ROI clair et runbook ops |
| **B. Rester simple, sans nouvelle brique** | Préféré pour un MVP ultra-léger, mais limite l’édition libre |
| **C. Ne sait pas encore** | État actuel |

**Infrastructure existante** :
- VPS Ubuntu avec Nginx, PM2, PostgreSQL distant, S3.
- Pas de Docker en production documenté aujourd’hui pour Greffio.
- Équipe petite : toute nouvelle brique (Collabora) doit inclure **monitoring, backups, mises à jour, sécurité WOPI/callback**.

**Demande au plan ChatGPT** : comparer explicitement
1. Collabora Online (WOPI) – meilleur pour ODT natif.
2. ONLYOFFICE Document Server – meilleur DX web, tester fidélité ODT.
3. Alternative sans serveur dédié (éditeur riche limité, conversion serveur LibreOffice headless, etc.) – avec limites honnêtes.

---

## 8. Produit final attendu pour Cursor

**Réponse : B + C + D en phasage**

| Phase | Objectif |
|-------|----------|
| **Phase 0 – Cadrage** | Plan détaillé (ce que ChatGPT doit produire) |
| **Phase 1 – MVP** | 1 document pilote (ex. statuts ou mandat) : session édition + save + version + export PDF |
| **Phase 2 – Document Workspace** | Espace unifié dans le dossier : aperçu, formulaire, édition libre, historique |
| **Phase 3 – Premium** | UX Greffio native (masquer complexité iframe), mobile, ops |

Nous ne voulons **pas** un simple POC jetable. Nous voulons une architecture **propre et scalable**, avec une UX **premium Greffio**, livrée **incrémentalement**.

---

## 9. Existant technique à réutiliser (impératif pour Cursor)

Le plan doit **s’appuyer** sur l’existant, pas repartir de zéro.

### Backend

```
server/index.js                          # routes API principales
server/store.js                          # DOSSIER_DOCUMENT_TEMPLATES, CRUD documents
server/services/editableDocumentService.js
server/services/objectStorage.js         # S3 / Supabase / local
server/services/documentEditorPreviewService.js
server/services/documentIntegrityService.js  # sha256, verify tokens
server/statuts/                          # moteur statuts 27 articles
server/pdf/                              # génération PDF (statuts, mandats)
server/routes/editableDocumentSignatureRoutes.js
```

### Frontend

```
src/pages/DocumentsPage.jsx
src/pages/StatutesPage.jsx
src/pages/NonConvictionDeclarationPage.jsx
src/pages/FormalityPowersPage.jsx
src/pages/SubscribersListPage.jsx
src/api/documents.js                     # getDossierDocumentEditor, saveDossierDocumentEditor
src/api/editableDocuments.js
src/components/documents/PdfPreviewPanel.jsx
src/components/signature/GreffioSignatureActionBlock.jsx
src/utils/statutesOfficeExport.js        # export ODT/DOCX statuts
src/utils/dossierDocumentFile.js         # preview mobile, cache PDF
```

### Sécurité déjà en place

- Auth JWT + contrôle accès dossier (`resolveDossierAccess`)
- Tests sécurité : `server/security/idor.test.js`
- URLs présignées S3 (TTL configurable)
- Hash SHA256 documents, tokens de vérification signature

### Ce qui n’existe pas

- Collabora / ONLYOFFICE / WOPI
- Table `document_versions` dédiée (versions partiellement via `generated_documents` + remplacement fichier)
- UI « Modifier en ligne » générique

---

## 10. Contraintes produit & marque (non négociables)

1. **Identité Greffio figée** : pas de refonte landing, palette, header/footer global.
2. **Statuts complets** : 27 articles William SAS – jamais de résumé court.
3. **Parcours dossier** : l’éditeur s’intègre dans le flux dossier existant (`/dossiers/:id`, pages documents/statuts).
4. **Signature Greffio** : conserver le flux signature actuel après validation document.
5. **Ops** : l’équipe interne doit pouvoir voir statut document, versions, rejets (cockpit ops existant).
6. **Mobile** : Capacitor Android en production Play Store – ne pas casser le remote-first.

---

## 11. Questions ouvertes que nous laissons au plan ChatGPT

1. **Collabora vs ONLYOFFICE vs alternative** pour notre stack VPS + S3 + React ?
2. **Document pilote** recommandé pour MVP (statuts vs mandat vs non-condamnation) ?
3. **Modèle de versions** : étendre `generated_documents` ou nouvelle table `document_versions` ?
4. **Conversion PDF** post-édition : LibreOffice headless sur VPS vs service du document server vs pdf-lib existant ?
5. **Stratégie mobile** : iframe éditeur vs redirection desktop vs édition guidée seule sur mobile ?
6. **Coût ops mensuel** estimé (RAM/CPU VPS, second serveur, stockage) ?
7. **Ordre d’implémentation Cursor** : fichiers précis, routes, migrations SQL, feature flags ?
8. **Risques juridiques** : document modifié librement par client – comment marquer brouillon vs validé vs signé ?

---

## 12. Recommandation produit Greffio (notre position)

Flux cible par document :

```
Questionnaire / formulaire Greffio
        ↓
Génération document (PDF + source ODT/DOCX si pertinent)
        ↓
Aperçu + checklist champs manquants
        ↓
[Option A] Ajuster via formulaire
[Option B] Modifier librement (éditeur en ligne)
        ↓
Sauvegarde version (brouillon)
        ↓
Validation client → export PDF final
        ↓
Signature Greffio
        ↓
Dépôt / ops
```

Nous sommes ouverts à ta recommandation provisoire (**Collabora + templates + versions**), à condition que le plan détaille **phases, risques, et intégration Cursor** sur notre repo réel.
