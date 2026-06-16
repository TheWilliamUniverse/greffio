# Greffio – Design tokens (cockpit & mobile)

> Audit complet : voir [`docs/audit-branding-greffio.md`](./audit-branding-greffio.md) (palette normalisée, typographie, mini brand book).

Tokens figés pour éviter les dérives visuelles. Ne pas modifier sans validation produit.

## Couleurs marque

| Token | Valeur | Usage |
|-------|--------|-------|
| `--greffio-blue` | `214 72% 32%` (~ `#1e4d8c`) | CTA, liens, logo texte |
| `--greffio-blue-900` | `218 62% 9%` | Titres cockpit mobile |
| `--we-blue` | `#1e4d8c` | Hero landing |
| `--we-border` | `#c5d2e6` | Cartes `.we-card` |

## Composants

| Classe | Rôle |
|--------|------|
| `.we-card` | Carte landing / simulateur |
| `.choice-grid-2` | Grille 2×2 mobile |
| `.choice-card-mobile` | Carte choix hauteur homogène |
| `.mobile-cockpit-px` | Padding horizontal cockpit |
| `.fluid-h1` / `.fluid-h2` | Titres responsives |
| `.sticky-action-bar` | Actions bas + safe-area |

## Breakpoints

| Nom | px | Comportement |
|-----|-----|--------------|
| Mobile | &lt;768 | MobileWebShell, bottom nav |
| Tablette | 768–1024 | Layout desktop |
| Desktop | ≥1024 | Layout standard |
