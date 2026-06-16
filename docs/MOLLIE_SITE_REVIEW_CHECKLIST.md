# Checklist revue site Mollie – Greffio

**Date :** 14 juin 2026  
**Domaine principal :** `https://greffio.willentreprises.com`  
**Objectif :** fournir à Mollie un site accessible, conforme et documenté pour l’activation du compte marchand.

---

## 1. URLs à soumettre dans le dashboard Mollie

| Paramètre | URL recommandée |
|-----------|-----------------|
| **Site web** | `https://greffio.willentreprises.com` |
| **URL de redirection (OAuth / checkout)** | `https://greffio.willentreprises.com/api/mollie/callback` |
| **Webhook** | `https://api.greffio.willentreprises.com/api/webhooks/mollie` |
| **Webhook (fallback frontend)** | `https://greffio.willentreprises.com/api/webhooks/mollie` |

> Les deux URLs webhook sont équivalentes : le frontend proxie vers l’API Node.

**Diagnostic après déploiement :**

```bash
curl -s https://greffio.willentreprises.com/api/mollie/status
curl -sI https://greffio.willentreprises.com/api/mollie/callback
curl -sI -X POST https://api.greffio.willentreprises.com/api/webhooks/mollie
```

Attendu : JSON pour `/status`, redirection 302 pour `/callback`, pas de HTML SPA.

---

## 2. Redirections canoniques (4 variantes)

Mollie teste souvent `http://www.` – toutes doivent aboutir en **HTTPS sans www** :

| URL testée | Attendu |
|------------|---------|
| `http://www.greffio.willentreprises.com` | 301 → `https://greffio.willentreprises.com` |
| `http://greffio.willentreprises.com` | 301 → `https://greffio.willentreprises.com` |
| `https://www.greffio.willentreprises.com` | 301 → `https://greffio.willentreprises.com` |
| `https://greffio.willentreprises.com` | 200 OK |

Implémentation : `server/hostinger-frontend.js` (Node Hostinger) + `public/.htaccess` (fallback Apache).

---

## 3. Pages obligatoires pour la revue Mollie

Vérifier que chaque page répond **200** en HTTPS (sans www) :

| Page | URL | Contenu attendu |
|------|-----|-----------------|
| Accueil | `/` | Présentation Greffio, activité légale |
| Tarifs | `/tarifs` | Grille tarifaire, transparence prix |
| Contact | `/contact` | Formulaire + email support |
| Confidentialité | `/confidentialite` | RGPD, traitement des données |
| CGU / Mentions | `/cgu` ou `/mentions-legales` | Conditions générales |
| À propos | `/a-propos` | Identité William Establishments / Greffio |

Pages complémentaires utiles :

- `/faq` – questions fréquentes
- `/creation-entreprise` – description du service
- `/paiement` – flux de paiement client

---

## 4. Contenu métier à mettre en avant

Description suggérée (déjà dans l’app Mollie OAuth) :

> Greffio accompagne les entrepreneurs dans la création, la gestion et le suivi administratif de leur entreprise.

Points à valider visuellement :

- Logo et identité visuelle cohérents
- Pas de page « under construction »
- Liens footer vers confidentialité et contact
- Numéro SIREN / raison sociale visible (mentions légales)

---

## 5. Paiements – architecture Greffio

| Flux | Prestataire | Usage |
|------|-------------|-------|
| B2C (particuliers, carte) | CAWL / e-Transactions | Checkout site |
| B2B / factures | **Mollie** + Qonto | iDEAL, carte pro, facturation |
| Prélèvement SEPA B2B | GoCardless (si activé) | Mandats entreprise |

Variables d’environnement (backend VPS, **jamais commitées**) :

```env
MOLLIE_API_KEY=live_...
MOLLIE_PROFILE_ID=pfl_...
MOLLIE_CALLBACK_URL=https://greffio.willentreprises.com/api/mollie/callback
MOLLIE_WEBHOOK_URL=https://api.greffio.willentreprises.com/api/webhooks/mollie
QONTO_CLIENT_ID=william-establishments-3315
QONTO_CLIENT_SECRET=...
```

---

## 6. Actions après correction

1. Pousser `main` → rebuild automatique Hostinger (frontend)
2. Déployer le backend : `pwsh -File scripts/deploy-backend-vps.ps1`
3. Re-tester les 4 variantes d’URL + `/api/mollie/status`
4. **Resoumettre le site** dans le dashboard Mollie (Profil → Site web)
5. Vérifier le webhook `hook_kyygnht9eERt5eKQWAHRJ` reste **Activé**

---

## 7. Contacts

- Support Greffio : `contact@willentreprises.com`
- Email facturation : `greffio@willentreprises.com`
