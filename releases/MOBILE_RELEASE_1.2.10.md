# Greffio Android – release 1.2.10

- **versionName** : `1.2.10`
- **versionCode** : `261510009`
- **package** : `com.greffio.app`

> Parité web mobile + terminal paiement accordéon + profil/paramètres accessibles sur mobile.

## Notes de version (Play Console – fr-FR)

```
• Mon profil et Paramètres accessibles depuis le menu ☰ et le parcours Compte
• Terminal de paiement unifié (Amazon Pay, Google Pay, carte) aligné avec le site
• Chargements et états vides plus clairs sur Documents et Dossiers
• Connexion : erreurs affichées directement sous les champs
• Navigation mobile : drawer structuré (activité, pilotage, compte)
• Corrections de confort sur profil, paramètres et parcours authentifié
```

## Notes ultra-courtes (≤ 500 car.)

```
Profil & paramètres mobile, paiement accordéon, états UI plus clairs, connexion améliorée.
```

## Contenu technique embarqué

- `GreffioPaymentTerminal` (accordéon Amazon Pay / Google Pay / carte)
- `ProfileEntry` / `SettingsEntry` sans redirection vers hub Compte sur mobile web
- Patterns UI client : chargements, empty states, erreurs inline
- Drawer mobile groupé (`Mon activité`, `Pilotage`, `Créer`, `Compte`)

## Build

```bash
npm run build
npm run mobile:build
cd android && ./gradlew.bat bundleRelease
```

## Artefact

- AAB : `releases/android/greffio-1.2.10-261510009.aab`
- Bureau : `Greffio-1.2.10-261510009.aab`
- Taille : 9,65 Mo (10 121 410 octets)
- SHA256 : `33F96C18EA9DBFE4715D4256681ED105079F88AD66BDF77A49248A61819B2325`

## Déploiement web (13 juin 2026)

| Cible | Détail |
|-------|--------|
| Frontend Hostinger | `dist_20260613_011839.zip` → `greffio.willentreprises.com` |
| Bundle live | `/assets/index-CdCyLwjV.js` |
| Backend VPS | `deploy-backend-vps.ps1` – backup `greffio-backup-20260612-231922` |
| API `/api/app-version` | `1.2.10` / `261510009` |

## API (après déploiement serveur)

Mettre à jour `APP_LATEST_VERSION_CODE=261510009` et `APP_LATEST_VERSION_NAME=1.2.10` sur le VPS, ou déployer `server/config/appVersion.js` avec les nouvelles valeurs par défaut.

**Statut :** déployé le 13/06/2026 – `/api/app-version` renvoie déjà `1.2.10`.
