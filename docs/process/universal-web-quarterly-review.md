# Revue trimestrielle – Universal Web Greffio

## Périmètre
- Desktop web (≥768px)
- Mobile web (<768px, shell `MobileWebShell`)
- App native Capacitor (`MobileAppShell`)

## Contrat données live
- [ ] Aucune page connectée ne lit dossiers/documents/notifications depuis `localStorage`
- [ ] React Query `staleTime: 0` + invalidation route/focus
- [ ] API `Cache-Control: no-store, private`
- [ ] Bandeau offline si snapshot Capacitor/offline

## Garde-fous anti page blanche
- [ ] Boot splash HTML + `AppBootSplash`
- [ ] Error boundaries globale + route
- [ ] Chunk recovery + SW v2
- [ ] `scripts/verify-build-assets.js` en CI

## Matrice de tests (minimum)
- [ ] Playwright 15 routes publiques
- [ ] iOS Safari + Chrome Android (viewport mobile)
- [ ] Navigation privée + cookies acceptés/refusés
- [ ] Retour arrière après paiement PSP

## Prochaine revue
Date cible : +3 mois – responsable : équipe produit Greffio.
