# Infrastructure VPS Greffio

Ce dossier contient la cible auto-hebergee de la migration hors Supabase :

- PostgreSQL 17.10 sur `127.0.0.1:5433` avec TLS et SCRAM-SHA-256 ;
- Garage 2.3.0 sur `127.0.0.1:3900`, compatible avec l'API S3 ;
- API d'administration Garage limitee a `127.0.0.1:3903` ;
- sauvegarde PostgreSQL + objets, puis envoi chiffre vers un depot Restic hors VPS ;
- scripts de repetition, bascule et retour en arriere.

Aucune commande de bascule ne doit etre lancee avant une repetition complete sur une copie de la production.

## 1. Prerequis

Sur Ubuntu : Docker Engine avec Compose v2, Nginx, Certbot, les clients PostgreSQL 17, Node.js 22 et Restic.

Le DNS suivant doit pointer vers le VPS :

```text
storage.greffio.willentreprises.com
```

Les secrets qui ont deja ete transmis en clair doivent etre renouveles avant l'installation.

## 2. Configuration de l'infrastructure

```bash
cd /opt/greffio/ops/vps
cp .env.infrastructure.example .env.infrastructure
chmod 600 .env.infrastructure
```

Generer des secrets, par exemple :

```bash
openssl rand -hex 32
openssl rand -base64 48
```

Renseigner `.env.infrastructure`, puis :

```bash
bash scripts/setup-infrastructure.sh
```

Le script initialise PostgreSQL, cree le compte applicatif et demarre Garage avec un bucket prive.

## 3. Publication de l'API S3

```bash
sudo cp nginx/storage.greffio.willentreprises.com.conf \
  /etc/nginx/sites-available/storage.greffio.willentreprises.com
sudo ln -sfn /etc/nginx/sites-available/storage.greffio.willentreprises.com \
  /etc/nginx/sites-enabled/storage.greffio.willentreprises.com
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d storage.greffio.willentreprises.com
```

Ne jamais publier le port 3903 ni une interface d'administration.

## 4. Environnement applicatif cible

```bash
cp .env.app-target.example /opt/greffio/.env.vps-target
chmod 600 /opt/greffio/.env.vps-target
```

Fusionner dans ce fichier les autres secrets actuels de Greffio sans recopier de variable `SUPABASE_*`.

Les variables de stockage sont :

```env
DOCUMENT_STORAGE_DRIVER=s3
S3_ENDPOINT=https://storage.greffio.willentreprises.com
S3_REGION=garage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=greffio-production-documents
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_TTL_SECONDS=900
S3_SERVER_SIDE_ENCRYPTION=
```

## 5. Environnement temporaire de migration

```bash
cp .env.migration.example .env.migration
chmod 600 .env.migration
```

Les identifiants Supabase de ce fichier sont temporaires. Ils servent uniquement au dernier export et a la copie d'eventuels objets `supabase://`.

## 6. Audit et repetition

```bash
cd /opt/greffio
node scripts/audit-supabase-usage.mjs
bash ops/vps/scripts/preflight.sh
```

Exporter la source :

```bash
SOURCE_DIR=$(bash ops/vps/scripts/export-source-database.sh)
echo "$SOURCE_DIR"
```

Restaurer sur la cible de repetition :

```bash
I_UNDERSTAND_RESTORE=YES \
  bash ops/vps/scripts/restore-target-database.sh "$SOURCE_DIR/source.dump"
```

Auditer les anciennes references Storage sans les modifier :

```bash
set -a
source ops/vps/.env.migration
source /opt/greffio/.env.vps-target
set +a
NODE_ENV=migration DATABASE_URL="$TARGET_DATABASE_URL" \
  MIGRATION_SUPABASE_URL="$MIGRATION_SUPABASE_URL" \
  MIGRATION_SUPABASE_SERVICE_ROLE_KEY="$MIGRATION_SUPABASE_SERVICE_ROLE_KEY" \
  node server/scripts/migrate-supabase-storage-to-s3.js --limit=100000
```

Une fois l'audit verifie, refaire la commande avec `--apply`. Le script ne supprime jamais les objets Supabase.

## 7. Bascule

La branche de migration doit deja etre deployee sur `/opt/greffio`. Pendant la fenetre de maintenance :

```bash
I_UNDERSTAND_CUTOVER=YES \
  bash ops/vps/scripts/cutover-to-vps.sh
```

Le script :

1. sauvegarde l'environnement actif ;
2. arrete l'API pour bloquer les ecritures ;
3. effectue un dernier export Supabase ;
4. sauvegarde puis restaure la base cible ;
5. migre et verifie les objets Storage ;
6. installe l'environnement cible ;
7. redemarre PM2 et verifie `/api/health` et `/api/ready` ;
8. restaure automatiquement l'ancien environnement si une etape echoue.

## 8. Retour en arriere

```bash
I_UNDERSTAND_ROLLBACK=YES \
  bash ops/vps/scripts/rollback-to-supabase.sh
```

Ce retour restaure l'ancien `.env`. Il ne resynchronise pas automatiquement vers Supabase les ecritures creees apres la bascule.

## 9. Sauvegardes

Configurer un depot Restic situe hors du VPS dans `.env.infrastructure`, puis :

```bash
bash scripts/backup.sh
```

Installer la programmation quotidienne :

```bash
sudo cp systemd/greffio-backup.service /etc/systemd/system/
sudo cp systemd/greffio-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now greffio-backup.timer
systemctl list-timers greffio-backup.timer
```

Verifier l'integrite d'une archive locale :

```bash
bash scripts/restore-test.sh /srv/greffio/backups/AAAAmmjjTHHMMSSZ
```

Cette verification ne remplace pas une restauration periodique dans une base et un bucket temporaires.

## 10. Validation apres bascule

Verifier au minimum : connexion, MFA, renouvellement de session, creation et lecture de dossier, upload et telechargement PDF, statuts, signature, paiement Mollie de test, webhooks, emails, espace ops, application mobile, rappels cron, sauvegarde et restauration.

Supabase doit rester intact jusqu'a la validation fonctionnelle complete et au premier test de restauration reussi.
