# Prompt ChatGPT – Plan détaillé éditeur documents Greffio

> **Comment l’utiliser** : copier-coller le bloc « Prompt à envoyer » ci-dessous dans ChatGPT, puis joindre ou coller le contenu de `REPONSE_CHATGPT_EDITEUR_DOCUMENTS_GREFFIO.md`.

---

## Prompt à envoyer

```
Tu es architecte produit + lead technique sur Greffio, une SaaS legal-tech de formalités d'entreprise (William Establishments).

Contexte : nous avons déjà échangé sur la faisabilité d'un éditeur ODT/DOCX en ligne (Collabora vs ONLYOFFICE vs alternatives) et sur une architecture hybride :
- personnalisation guidée (formulaire → PDF) — déjà partiellement en place ;
- édition libre bureautique — à ajouter ;
- export PDF final signable — priorité absolue.

Je te fournis ci-dessous nos réponses détaillées à tes 8 questions, basées sur notre codebase réelle (React/Vite, Express, PostgreSQL, S3, Capacitor Android, VPS + Hostinger).

---

[COLLER ICI LE CONTENU COMPLET DE docs/REPONSE_CHATGPT_EDITEUR_DOCUMENTS_GREFFIO.md]

---

## Ta mission

Rédige un **plan d'implémentation Markdown complet**, directement exploitable par **Cursor** (agent de code), pour intégrer un **Document Workspace** dans Greffio.

Le document doit être **actionnable** : pas de généralités, pas de refonte globale de l'identité Greffio, pas de « recommandez-vous Next.js ».

## Format obligatoire du livrable

Structure le plan avec ces sections exactes :

### 1. Executive summary
- Décision recommandée (Collabora / ONLYOFFICE / hybride / autre) avec justification en 10 lignes max.
- Document pilote MVP recommandé.
- Estimation effort : S / M / L par phase.

### 2. Architecture cible
- Schéma ASCII ou Mermaid : Frontend React → API Express → S3 → Serveur édition → callbacks.
- Flux utilisateur complet (ouvrir, éditer, sauvegarder, versionner, exporter PDF, signer).
- Flux ops (validation, rejet, audit).

### 3. Choix technique argumentés
Tableau comparatif :
| Critère | Collabora | ONLYOFFICE | Alternative sans serveur dédié |
Inclure : fidélité ODT, complexité WOPI/callback, coût VPS, mobile Capacitor, maintenance, sécurité.

### 4. Modèle de données
- Extensions SQL précises (nouvelles tables/colonnes ou réutilisation `generated_documents`).
- États document : `draft`, `edited`, `validated`, `signed`, `rejected`.
- Politique de versions (ne jamais écraser l'original).

### 5. API backend à créer ou étendre
Liste des routes Express avec méthode, payload, réponses, auth, erreurs.
Exemples concrets sur notre modèle :
- `/api/dossiers/:dossierId/documents/:docKey/editor` (existant – comment l'étendre)
- nouvelles routes session édition / callback save / export

Référencer les fichiers existants à modifier :
- `server/index.js`, `server/store.js`, `server/services/objectStorage.js`, etc.

### 6. Frontend React à créer ou étendre
- Pages et composants (chemins probables sous `src/pages/`, `src/components/documents/`).
- UX premium Greffio : comment masquer l'iframe éditeur, libellés FR, états loading/erreur.
- Intégration avec pages existantes : `StatutesPage`, `DocumentsPage`, `NonConvictionDeclarationPage`, etc.
- **Stratégie mobile Capacitor** explicite (fallback si iframe impossible).

### 7. Sécurité & conformité
- Tokens session édition (TTL, scope dossier+doc_key).
- Protection IDOR (nous avons déjà `resolveDossierAccess` et tests IDOR).
- URLs S3 présignées vs proxy backend.
- Traçabilité : sha256, `document_events`, audit ops.
- Risque juridique : document modifié librement par le client — garde-fous UX et statuts.

### 8. Conversion & export
- Pipeline PDF post-édition (LibreOffice headless vs document server vs autre).
- Réutilisation de `server/pdf/`, `editableDocumentService.js`, `statutesOfficeExport.js`.
- Exports ODT/DOCX optionnels.

### 9. Plan d'implémentation par phases (pour Cursor)

#### Phase 1 – MVP (1 document pilote)
- Checklist fichiers à créer/modifier (liste exhaustive).
- Migration SQL.
- Feature flag recommandé.
- Critères d'acceptation testables.
- Commandes de test (`npm run test:statutes`, lint, smoke).

#### Phase 2 – Document Workspace
- Unification UI dossier.
- Historique versions.
- Extension à N doc_keys.

#### Phase 3 – Premium & mobile
- Polish UX, ops, monitoring.

### 10. Infrastructure & ops
- Prérequis VPS (RAM, CPU, Docker, Nginx reverse proxy, sous-domaine éditeur).
- Variables d'environnement à ajouter (sans valeurs secrètes).
- Runbook : deploy, rollback, monitoring, sauvegarde.
- Estimation coût infra mensuel (ordre de grandeur).

### 11. Risques & mitigations
Top 10 risques (fidélité mise en page statuts 27 articles, mobile, charge VPS, etc.).

### 12. Hors scope explicite
Ce que nous ne faisons PAS dans cette mission (co-édition temps réel, refonte landing, etc.).

### 13. Prompt Cursor final
Termine par un **bloc markdown prêt à coller dans Cursor** :
- objectif en 3 lignes ;
- contraintes (identité figée, fichiers critiques, statuts 27 articles) ;
- ordre d'exécution des tâches ;
- definition of done.

## Contraintes de rédaction

- Langue : **français**.
- Ton : professionnel, concis, orienté implémentation.
- Citer des **chemins de fichiers réels** du repo quand pertinent.
- Ne propose **pas** de migrer vers Next.js, Supabase Auth, ou autre stack.
- Ne propose **pas** de refonte de la landing ou du design system global.
- Les statuts William SAS doivent rester **complets (27 articles)**.
- Prioriser réutilisation de l'existant (`editableDocumentService`, signature Greffio, S3, routes editor).
- Distinguer clairement MVP vs nice-to-have.

## Livrable attendu

Un seul fichier Markdown structuré, minimum ~800 lignes si nécessaire pour être exhaustif, utilisable tel quel comme `docs/MISSION_CURSOR_DOCUMENT_WORKSPACE.md`.
```

---

## Notes pour l’utilisateur

1. Envoie d’abord le prompt ci-dessus avec le contenu de `REPONSE_CHATGPT_EDITEUR_DOCUMENTS_GREFFIO.md` collé à la place indiquée.
2. Si ChatGPT produit un plan trop vague, relance avec : *« Détaille la Phase 1 avec la liste exacte des fichiers et routes, et choisis un document pilote unique. »*
3. Une fois le plan reçu, enregistre-le sous `docs/MISSION_CURSOR_DOCUMENT_WORKSPACE.md` et ouvre une session Cursor en le référençant.
