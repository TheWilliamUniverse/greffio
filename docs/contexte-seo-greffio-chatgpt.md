# Contexte SEO Greffio – référence ChatGPT (juin 2026)

> **Repo** : `TheWilliamUniverse/greffio` · commit prod `4aad544`  
> **Domaine** : `https://greffio.willentreprises.com`  
> **Règle** : ne pas modifier l'identité visuelle landing (hero, palette, structure).

---

## 1. Implémenté en production

### Infrastructure
- `public/robots.txt` → sitemap
- `public/sitemap.xml` → URLs publiques indexables
- `index.html` → meta SEO home (title, description, OG, canonical)
- `src/components/seo/SeoHead.jsx` → meta dynamiques par page SPA
- JSON-LD home : Organization + WebSite + Service (`HOME_JSON_LD`)

### Pages P0 (piliers)
| URL | Fichier config |
|-----|----------------|
| `/creation-entreprise` | `src/config/seoContent.js` |
| `/modification-entreprise` | idem |
| `/annonce-legale` | idem |
| `/guichet-unique-inpi` | idem |
| `/kbis` | idem |

Chaque pilier : H1, intro, sections H2, bloc « Ce que Greffio clarifie », FAQ + schema FAQPage, liens internes, disclaimer juridique.

### Hubs P1
- `/guides` + 8 guides (`/guides/creer-sasu`, etc.)
- `/glossaire` + 10 entrées (`/glossaire/siren`, etc.)
- `/faq`

### Routing
- `src/App.jsx` – routes SEO + header masqué sur pages piliers
- `src/pages/SeoPages.jsx` – composants rendu
- Footer : colonne « Formalités & SEO » (`src/config/siteFooter.js`)

### Session web (distinct app native)
- `src/components/IdleSessionGuard.jsx`
- **Navigateur** (desktop + mobile web) : verrouillage bleu 30 min inactivité + logout
- **App Capacitor** : exclue (`isCapacitorNative()`)
- SW : mise à jour silencieuse (plus de toast « Recharger »)

---

## 2. Vérifications prod (2026-06-12)

Toutes URLs → HTTP 200 :
- Home, 5 piliers, guides, glossaire, faq
- `https://api.greffio.willentreprises.com/api/health`
- `https://api.greffio.willentreprises.com/api/app-version` → `1.2.9` / `261510008`

Meta home en prod :
```html
<title>Greffio – Simplifiez vos démarches d'entreprise en France</title>
```

---

## 3. Déploiement

| Composant | Méthode |
|-----------|---------|
| Frontend | git push `main` → Hostinger rebuild auto |
| Backend | `pwsh -File scripts/deploy-backend-vps.ps1` |
| Android AAB | `releases/android/greffio-1.2.9-261510008.aab` |

---

## 4. Manuel (ops)

1. Google Search Console → propriété `greffio.willentreprises.com`
2. Soumettre sitemap : `https://greffio.willentreprises.com/sitemap.xml`
3. Play Console → AAB `261510008`
4. DNS local : si NXDOMAIN box → DNS Windows `8.8.8.8`

---

## 5. Fichiers clés à modifier pour enrichir le SEO

- Contenu : `src/config/seoContent.js`
- Meta composant : `src/components/seo/SeoHead.jsx`
- Sitemap : `public/sitemap.xml`
- Plan d'action source : `CURSOR_ACTION_PLAN_GREFFIO_SEO.md`

---

## 6. Non fait / P2 optionnel

- Page `/a-propos/` dédiée
- og-cover.jpg dédié (actuellement icône SVG)
- Lighthouse audit automatisé CI
- Pages glossaire supplémentaires au-delà des 10 entrées
