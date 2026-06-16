# Audit priorités Greffio – 16 juin 2026

> Site web `greffio.willentreprises.com` · API `api.greffio.willentreprises.com` · App Android **remote-first** (Capacitor)

**Score global estimé : 7,8 / 10** · Stratégie : UI via déploiement web, backend via VPS, AAB uniquement si natif change.

---

## P0 – Primordial (ne doit pas casser)

| Zone | Score | Statut | Pourquoi |
|------|-------|--------|----------|
| Questionnaire & création dossier | 8/10 | OK | Cœur business ; navigation pas à pas corrigée le 16/06 |
| Documents, PDF, signature | 7,5/10 | RISK | Filigranes retirés, procuration refondue ; signature mobile à aligner sur procuration |
| Auth, session, biométrie | 8/10 | OK | JWT, MFA, biométrie native |
| Paiement Mollie B2C | 8/10 | OK | PSP actif, 3-D Secure, retour native |
| App remote & version | 9/10 | OK | `/api/app-version` + nouveau `/api/app-context` |

---

## P1 – Important

| Zone | Score | Statut |
|------|-------|--------|
| Statuts William 27 articles | 8,5/10 | OK |
| Ops & back-office | 7,5/10 | OK |
| Sécurité & CI | 6,5/10 | RISK (CSP report-only, tests sécurité hors CI) |
| Double chemin signature (interne / Signwell) | 6,5/10 | RISK |
| Push & offline | 6,5/10 | GAP |
| Landing, SEO, conversion | 8/10 | OK (identité figée) |

---

## Top actions prioritaires

1. **P0** – Parité mobile page signature document (`DocumentSignPage.jsx`)
2. **P0** – Smoke prod post-deploy : paiement + signature + PDF externe
3. **P0** – Coupler deploy web + vérif VPS à chaque release remote
4. **P1** – `test:security` + tests paiements dans CI
5. **P1** – Consolider provider signature par type de document
6. **P1** – Refactor ciblé `QuestionnairePage.jsx`

---

## Matrice déploiement remote

| Changement | Hostinger | VPS | AAB |
|------------|-----------|-----|-----|
| UI questionnaire, paiement, shell | Oui | Non | Non |
| PDF signés, procuration, webhooks Mollie | Non | Oui | Non |
| Changelog / seuil app-version | Non | Oui | Non |
| FileOpener, icône, plugins Capacitor | Non | Non | Oui |

---

## Enregistrement dans l'app remote

- **API** : `GET /api/app-context` (public, cache 5 min) – audit structuré + version + origines remote
- **Source code** : `server/config/greffioAuditPriorities.js`
- **Native** : au démarrage, `MobileAppShell` persiste le contexte dans Capacitor Preferences (`greffio_remote_context_v1`)
- **Assistant** : chunk RAG `audit-priorities-2026-06` dans `knowledgeChunks.js`
- **Changelog modale MAJ** : `server/config/appVersion.js` (aligné releases remote du 16/06)

---

## Forces actuelles

- Architecture split claire (static + API + shell remote)
- PDF natif fiable (validation, FileOpener, dossier Documents/Greffio)
- Paiement Mollie bien factorisé (adapter, webhooks, Custom Tabs)
- Guardrails repo (zones critiques, identité, logos paiement)
- Déploiement backend automatisé (tarball, migrate, health)

---

*Révision suivante recommandée : après correction signature mobile native ou changement majeur questionnaire.*
