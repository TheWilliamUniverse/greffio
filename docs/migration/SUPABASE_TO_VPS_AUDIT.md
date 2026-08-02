# Audit de migration Supabase vers le VPS

Date de l'audit initial : 2 aout 2026  
Depot de reference : `TheWilliamUniverse/greffio`  
Branche de travail : `migration/supabase-to-vps`

## Conclusion

Greffio ne depend deja plus de Supabase comme plateforme applicative complete. Le depot contient son propre backend Express, son propre mecanisme d'authentification, ses migrations PostgreSQL, ses controles d'autorisation et son canal WebSocket. La migration ne doit donc **pas** auto-heberger l'ensemble de Supabase.

L'architecture retenue conserve les contrats actuels et remplace les deux dependances restantes :

1. la base PostgreSQL geree par Supabase devient un PostgreSQL 17.10 auto-heberge sur le VPS ;
2. les eventuels objets `supabase://` deviennent des objets `s3://` dans un MinIO S3-compatible auto-heberge sur le VPS.

La source Supabase reste intacte pendant toute la fenetre de validation. La bascule se fait en arretant temporairement les ecritures, en realisant un dernier export, puis en changeant uniquement les variables d'environnement du backend.

## Inventaire des dependances

### Base de donnees

**Active avant migration.**

- Le backend utilise `pg` et `DATABASE_URL`.
- La production interdit SQLite lorsque `DATABASE_URL` est absente.
- Les migrations SQL sont versionnees dans `server/migrations` et suivies par `schema_migrations`.
- Le code metier accede a PostgreSQL exclusivement par le backend Node.

La base Supabase est donc utilisee comme PostgreSQL heberge, et non comme Data API publique.

### Authentification

**Supabase Auth n'est pas utilise.**

- Les utilisateurs sont stockes dans la table applicative `users`.
- Les mots de passe sont haches avec `scrypt` et un sel aleatoire.
- Les jetons d'acces et de rafraichissement sont emis par le backend avec `jsonwebtoken`.
- Les roles et les acces aux dossiers sont controles par les middlewares et services Express.
- La MFA, les appareils de confiance et la reinitialisation de mot de passe sont implementes dans le depot.

Risque restant distinct de Supabase : le jeton de rafraichissement est actuellement un JWT autonome. La table `refresh_tokens` existe, mais la route de rafraichissement observee ne valide pas une session persistante revocable. Ce point doit etre corrige dans un lot de securite dedie avant de pouvoir affirmer que toutes les sessions sont revocables.

### Stockage de fichiers

**Dependance runtime residuelle dans le code, mais S3 est deja force en production.**

Le service `server/services/objectStorage.js` contient encore trois pilotes : local, S3 et Supabase Storage. Le code Supabase utilise directement l'API Storage avec une cle privilegiee. En revanche :

- `ecosystem.config.cjs` force `DOCUMENT_STORAGE_DRIVER=s3` ;
- `.env.example` indique que S3 est le stockage de production courant ;
- un ancien correctif signale que le bucket Supabase attendu n'existait pas et que le pilote devait etre force sur S3 ;
- le depot contient deja les URL signees S3, les controles de connectivite et la migration des fichiers locaux vers S3.

Il reste neanmoins indispensable de rechercher toutes les valeurs `supabase://` dans la base restauree. Le script `server/scripts/migrate-supabase-storage-to-s3.js` analyse dynamiquement toutes les colonnes texte du schema `public`, migre les objets, verifie leur SHA-256 et met a jour les references dans une transaction. Il ne supprime aucun objet source.

### Temps reel

**Supabase Realtime n'est pas utilise.**

Le depot utilise le paquet `ws` et un hub de messages interne au backend. Aucun SDK Supabase Realtime n'est declare dans `package.json`.

### Fonctions serveur

**Aucune Edge Function Supabase active identifiee.**

Les fonctions serveur sont des routes et services Node/Express dans `server/`.

### Taches planifiees

**Supabase Cron n'est pas utilise.**

Les rappels de dossiers et syntheses hebdomadaires sont des scripts Node prevus pour le cron du VPS.

### SDK et frontend

**Aucun paquet `@supabase/*` n'est declare dans `package.json`.**

Le frontend utilise les contrats HTTP du backend Greffio. Il ne doit recevoir aucune cle administrateur ou cle de service.

### Migrations RLS historiques

Les migrations de verrouillage RLS 013 et 022 sont historiques. Elles activent RLS et revoquent les droits des roles Supabase `anon` et `authenticated` lorsqu'ils existent. Elles sont conditionnelles et ne constituent pas un mecanisme d'autorisation applicatif. Les controles d'autorisation du VPS restent ceux du backend Express.

## Architecture cible

```text
Internet
  |
  +-- greffio.willentreprises.com         frontend
  +-- api.greffio.willentreprises.com     Nginx -> Express/PM2 :8787
  +-- storage.greffio.willentreprises.com Nginx -> MinIO :9000

VPS Hostinger
  +-- Express / PM2
  +-- PostgreSQL 17.10, TLS, port 127.0.0.1:5433
  +-- MinIO S3-compatible, port 127.0.0.1:9000
  +-- Console MinIO, port 127.0.0.1:9001 uniquement
  +-- sauvegardes locales temporaires + depot Restic hors VPS
```

### PostgreSQL

- Image epinglee `postgres:17.10-bookworm`.
- Compte administrateur distinct du compte applicatif.
- Compte applicatif sans privileges superutilisateur.
- Ecoute uniquement sur l'interface locale.
- TLS active afin de rester compatible avec la configuration actuelle du client `pg`.
- Authentification SCRAM-SHA-256.

### Stockage

- API S3-compatible MinIO pour reutiliser le code et les URL `s3://` existants.
- Compte applicatif MinIO limite a un seul bucket.
- Console non publiee sur Internet.
- URL temporaires signees generees cote backend.
- Versioning active sur le bucket.
- Aucune lecture publique anonyme.

Un MinIO mono-noeud sur un seul VPS n'est pas hautement disponible. Les sauvegardes hors VPS sont donc obligatoires. Le chiffrement MinIO au repos necessite un KMS/KES ; sans KMS, la protection repose sur les controles d'acces, TLS, les permissions du VPS et le chiffrement du depot de sauvegarde Restic.

## Procedure de migration

1. Faire tourner `scripts/audit-supabase-usage.mjs` et traiter tous les `runtime-blocker`.
2. Renouveler les secrets deja partages et passer l'acces SSH root a une cle dediee.
3. Creer le DNS `storage.greffio.willentreprises.com`.
4. Installer Docker, Nginx et Certbot sur le VPS.
5. Copier `infrastructure.env.example` vers `.env.infrastructure`, generer des secrets longs et lancer `setup-infrastructure.sh`.
6. Copier `migration.env.example` vers `.env.migration` avec des identifiants temporaires.
7. Executer `preflight.sh`.
8. Realiser une repetition complete : export, restauration PostgreSQL, migration Storage en mode audit, puis tests.
9. Construire et televerser l'archive de la branche de migration.
10. Pendant une courte fenetre de maintenance, executer `cutover-to-vps.sh`.
11. Verifier les comptes, dossiers, paiements, signatures, telechargements, e-mails, taches planifiees et applications mobiles.
12. Conserver Supabase intact pendant la periode de validation.
13. Apres validation et sauvegarde restauree avec succes, revoquer les secrets Supabase et fermer le projet.

## Retour en arriere

Le retour immediat restaure le code et le `.env` sauvegardes, puis redemarre le backend sur la base Supabase. Il est fiable tant qu'aucune nouvelle ecriture n'a ete acceptee sur PostgreSQL VPS.

Apres reouverture du service sur la cible, un retour tardif peut perdre les nouvelles ecritures. Il faut alors remettre le site en maintenance et synchroniser les differences avant de revenir a Supabase.

## Blocages avant execution en production

- confirmer les ressources exactes du VPS et l'espace disque libre ;
- creer le DNS et le certificat du domaine Storage ;
- verifier la version et les extensions PostgreSQL de la source ;
- compter les references `supabase://` et les references eventuelles dans du JSON ;
- choisir et tester un depot Restic situe hors du VPS ;
- renouveler tous les secrets qui ont ete transmis en clair ;
- corriger la revocabilite persistante des refresh tokens ;
- executer les tests sur une restauration de repetition avant toute bascule.
