# Greffio – stockage documentaire (AWS S3)

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

- `POST /api/dossiers/:id/documents` – upload (mémoire → S3)
- `GET /api/dossiers/:id/documents/:docKey/download` – redirection URL signée
- `GET /api/dossiers/:id/documents/:docKey/download-url` – JSON `{ url, expiresIn }`

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
3. Déployer le code (`scripts/deploy-backend-vps.ps1`).
4. Lancer le script interactif (demande les clés AWS, ne jamais les committer) :

```bash
sudo /opt/greffio/scripts/setup-aws-s3-production.sh
```

Le script :

1. installe AWS CLI v2 si absent ;
2. sauvegarde `/opt/greffio/.env` (horodaté) ;
3. met à jour les variables S3 ;
4. teste `sts get-caller-identity` et list/upload/read/delete S3 ;
5. exécute `npm ci`, migrations, `pm2 restart greffio-api --update-env` ;
6. vérifie `GET /api/ready` → `"storageDriver": "s3"`.

## Vérification manuelle

```bash
curl https://api.greffio.willentreprises.com/api/ready
```

Attendu :

```json
{
  "ok": true,
  "checks": {
    "storageDriver": "s3",
    "s3Configured": true
  }
}
```

## IAM : erreur AccessDenied sur PutObject

Si `aws s3 cp` ou l’upload Greffio renvoie `AccessDenied` sur `s3:PutObject`, l’utilisateur IAM n’a pas encore la policy attachée.

1. Console AWS → IAM → Users → `greffio-backend-s3`
2. Add permissions → Create inline policy → JSON
3. Coller `docs/aws-iam-greffio-documents-policy.json`
4. Vérifier que le bucket `greffio-production-documents` existe en `eu-west-3` (Block Public Access ON)
5. Re-tester :

```bash
aws s3 cp /tmp/test.txt s3://greffio-production-documents/test/probe.txt --region eu-west-3
pm2 restart greffio-api --update-env
```

## Dépannage

Si l’API renvoie encore `storageDriver: local` :

```bash
grep -E "DOCUMENT_STORAGE_DRIVER|AWS_REGION|AWS_S3_BUCKET|AWS_S3_PRESIGNED_URL_TTL_SECONDS" /opt/greffio/.env
pm2 describe greffio-api
pm2 logs greffio-api --lines 200
```

Causes fréquentes : variables `.env` manquantes, PM2 redémarré sans `--update-env`, mauvaises credentials ou région, policy IAM trop restrictive.

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
