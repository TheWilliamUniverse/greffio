# Greffio — stockage documentaire (AWS S3)

## Architecture

```
Client → Frontend Hostinger → API Express (VPS) → AWS S3 (fichiers privés)
                                              → PostgreSQL (métadonnées uniquement)
```

- Aucun credential AWS côté frontend.
- Bucket **privé** (Block Public Access activé).
- En base : clé S3 permanente (`s3://bucket/dossiers/...`), jamais d’URL signée stockée.
- URLs signées générées à la demande (TTL 900 s par défaut).

## Variables d’environnement (VPS)

```env
DOCUMENT_STORAGE_DRIVER=s3
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=greffio-production-documents
AWS_S3_PRESIGNED_URL_TTL_SECONDS=900
```

## Structure des clés S3

```
dossiers/{dossierId}/{docKey}/{uuid}.{ext}
```

Exemple : `dossiers/dos_9283/identity_card/7f7e8f4e-a3f4-4c5c-bdf4.pdf`

## Drivers supportés

| Driver | Usage |
|--------|--------|
| `s3` | Production recommandée |
| `supabase` | Legacy / secours |
| `local` | Développement local uniquement |

## Endpoints API

- `POST /api/dossiers/:id/documents` — upload (mémoire → S3)
- `GET /api/dossiers/:id/documents/:docKey/download` — redirection URL signée
- `GET /api/dossiers/:id/documents/:docKey/download-url` — JSON `{ url, expiresIn }`

## IAM minimal (bucket dédié)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::greffio-production-documents/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::greffio-production-documents"
    }
  ]
}
```

## Déploiement VPS

1. Créer le bucket `greffio-production-documents` (eu-west-3), Block Public Access ON.
2. Créer un utilisateur IAM avec la policy ci-dessus.
3. Ajouter les variables dans `/opt/greffio/.env`.
4. `pm2 restart greffio-api`
5. Vérifier : `GET /api/ready` → `storageDriver: "s3"`.

## Tests manuels

1. Upload PDF < 10 Mo depuis `/documents`.
2. Vérifier l’objet dans S3 et `storage_url` en base (`s3://...`).
3. Télécharger via l’espace client.
4. Confirmer qu’aucun nouveau fichier durable n’apparaît dans `server/data/uploads/` (hors fallback temporaire).

## Rotation des clés

1. Créer une nouvelle clé IAM.
2. Mettre à jour `.env` sur le VPS.
3. Redémarrer PM2.
4. Révoquer l’ancienne clé après validation.
