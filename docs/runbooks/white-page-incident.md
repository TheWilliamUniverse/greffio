# Runbook – page blanche Greffio

## Symptômes
- Écran vide (`#root` sans contenu)
- Erreur `ChunkLoadError` / `Loading chunk failed`
- Données périmées après retour navigateur

## Diagnostic rapide (5 min)
1. Ouvrir DevTools → Console : noter erreurs JS ou 404 sur `/assets/*`.
2. Application → Service Workers : vérifier version `greffio-shell-v2`.
3. Network : `index.html` doit être `Cache-Control: no-store`.
4. Vérifier que les hashes dans `index.html` existent dans `/assets/`.

## Actions utilisateur
1. Hard reload : Ctrl+F5 (Windows) / Cmd+Shift+R (Mac).
2. Vider cache site (Safari iOS : Réglages → Safari → Avancé → Données).
3. Désinscrire le SW puis recharger.

## Actions équipe
1. Lancer `node scripts/verify-build-assets.js` après build.
2. Rollback Hostinger au commit précédent si mismatch assets.
3. Purger CDN si activé – ne jamais cacher `index.html` ni `sw.js`.
4. Redéployer backend si 401 massifs (`/api/auth/refresh`).

## Prévention
- CI `frontend-ci.yml` : build + verify assets + Playwright anti page blanche.
- SW : shell icons/manifest uniquement (voir `docs/policies/service-worker-cache.md`).
