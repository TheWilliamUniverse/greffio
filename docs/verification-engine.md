# Greffio – Verification Engine (V1)

Couche interne de **pré-vérification** : cohérence, complétude, audit trail.  
Ce n’est **pas** une certification juridique.

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/verification/company/search` | Recherche entreprise (API Recherche d’Entreprises) |
| POST | `/api/verification/company/check` | Validation SIREN + fiche publique |
| POST | `/api/verification/address/check` | Normalisation BAN |
| POST | `/api/verification/dossier/:id/run` | Lance toutes les vérifications dossier |
| GET | `/api/verification/dossier/:id/profile` | Profil risque / complétude |
| GET | `/api/verification/dossier/:id/checks` | Historique des checks |

## Checks locaux (sans clé API)

- SIREN / SIRET (Luhn)
- Email (syntaxe, domaines jetables)
- Complétude dossier
- Incohérences forme / formalité

## Providers optionnels

- `PAPPERS_API_TOKEN` – enrichissement entreprise (si configuré)
- API Recherche d’Entreprises – toujours disponible (open data)

## Niveaux de risque

| Score | Niveau |
|-------|--------|
| 0–20 | LOW |
| 21–50 | MEDIUM |
| 51–79 | HIGH |
| 80–100 | BLOCKING |

## Migration

```bash
npm run db:migrate
```

Applique `016_verification_engine.sql` (PostgreSQL production).

## UI

- `VerificationStatusCard` sur la fiche dossier client
- Relance via bouton « Lancer les vérifications »
