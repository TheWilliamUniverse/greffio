# Greffio Android 1.2.7 (261510006)

## Notes courtes Play Console (≤ 500 caractères)

```
Stabilité et expérience mobile :
• Retour Android plus fiable (overlays, signature, drawer)
• Documents signables optimisés (clavier, CTA visible)
• Mode hors connexion clarifié
• Écran Compte enrichi (version, sécurité, notifications)
• Tarifs mobile : lecture « En clair » améliorée
```

## Notes complètes (français)

**Version :** 1.2.7  
**versionCode :** 261510006  
**Package :** com.greffio.app

### Améliorations

- **Navigation Android** – Le bouton Retour ferme les overlays dans le bon ordre (veille, compte, notifications, recherche, choix de dossier, signature, menu).
- **Documents signables** – Interface mobile dédiée sans sidebar desktop ; CTA sticky au-dessus du clavier ; retour Android ferme la feuille de signature.
- **Hors connexion** – Bannière explicite et message de reconnexion lorsque le réseau revient.
- **Compte** – Version, build, état des notifications et de la biométrie ; accès rapide à la mise en veille et au support.
- **Permissions** – Messages clairs si notifications ou caméra refusées, avec alternatives (accueil, import manuel).
- **Tarifs (navigateur mobile)** – Les blocs « Prestation Greffio » et « Frais légaux » s’affichent côte à côte pour une lecture plus rapide.

### Recommandation de test

Play Internal Testing : cold start, signature d’un document, mode avion, refus push/caméra, deep link `/documents`.

Voir aussi : `docs/qa-android-release-checklist.md`
