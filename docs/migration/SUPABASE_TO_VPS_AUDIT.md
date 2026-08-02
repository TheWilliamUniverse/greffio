# Audit de migration Supabase vers le VPS

Date de l'audit initial : 2 aout 2026  
Depot de reference : `TheWilliamUniverse/greffio`  
Branche de travail : `migration/supabase-to-vps`

## Conclusion

Greffio ne depend deja plus de Supabase comme plateforme applicative complete. Le depot contient son propre backend Express, son propre mecanisme d'authentification, ses migrations PostgreSQL, ses controles d'autorisation et son canal WebSocket. La migration ne doit donc **pas** auto-heberger l'ensemble de Supabase.

L'architecture retenue conserve les contrats actuels et remplace les deux dependances restantes :

1. la base PostgreSQL geree par Supabase devient un PostgreSQL 17.10 auto-heberge sur le VPS ;
2. les eventuels objets `supabase://` deviennent des objets `s3://` dans Garage 2.3.0, un stockage S3-compatible auto-heberge sur le VPS.

MinIO n'est pas retenu : son depot communautaire a ete archive en avril 2026 et les anciens binaires ne sont plus maintenus. Garage est encore maintenu, dispose d'une version 2.3 publiee en 2026 et documente officiellement le deploiement Docker mono-noeud ainsi que la creation automatique d'une cle et d'un bucket.

La source Supabase reste intacte pendant toute la fenetre de validation. La bascule arrete temporairement les ecritures, realise un dernier export, restaure PostgreSQL sur le VPS, migre les eventuels objets, puis remplace uniquement l'environnement du backend.

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

**Dependance runtime residuelle pendant la transition, mais S3 est deja force en production.**

Le service `server/services/objectStorage.js` contient encore trois pilotes : local, S3 et Supabase Storage. Le code Supabase utilise directement l'API Storage avec une cle privilegiee. En revanche :

- `ecosystem.config.cjs` force `DOCUMENT_STORAGE_DRIVER=s3` ;
- `.env.example` indique que S3 est le stockage de production courant ;
- un ancien correctif signale que le bucket Supabase attendu n'existait pas et que le pilote devait etre force sur S3 ;
- le depot contient deja les URL signees S3, les controles de connectivite et la migration des fichiers locaux vers S3.

Le pilote S3 accepte maintenant un endpoint personnalise, le mode path-style et des variables generiques `S3_*`, tout en conservant les anciens alias `AWS_*`. Cela permet de reutiliser les URL `s3://` et l'AWS SDK avec Garage.

Le script `server/scripts/migrate-supabase-storage-to-s3.js` analyse dynamiquement les colonnes texte du schema `public`, telecharge chaque objet Supabase, le place sous une cle deterministe dans Garage, verifie le SHA-256 par relecture puis met a jour la reference dans une transaction. Il ne supprime aucun objet source. Les references contenues dans du JSON sont signalees comme blocantes et ne sont jamais modifiees automatiquement.

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
  +-- storage.greffio.willentreprises.com Nginx -> Garage S3 :3900

VPS Hostinger
  +-- Express / PM2
  +-- PostgreSQL 17.10, TLS, port 127.0.0.1:5433
  +-- Garage 2.3.0 S3-compatible, port 127.0.0.1:3900
  +-- API d'administration Garage, port 127.0.0.1:3903 uniquement
  +-- sauvegardes locales temporaires + depot Restic hors VPS
```

### PostgreSQL

- Image epinglee `postgres:17.10-bookworm`.
- Compte administrateur distinct du compte applicatif.
- Compte applicatif sans privileges superutilisateur.
- Ecoute uniquement sur l'interface locale.
- TLS active afin de rester compatible avec la configuration actuelle du client `pg`.
- Authentification SCRAM-SHA-256.
- Checksums de pages actives a l'initialisation.

### Stockage

- Image epinglee `dxflrs/garage:v2.3.0`.
- API S3-compatible afin de reutiliser le code et les URL `s3://` existants.
- Cle applicative limitee au bucket initialise pour Greffio.
- API d'administration non publiee sur Internet.
- URL temporaires signees generees cote backend.
- Aucune lecture publique anonyme.

Un Garage mono-noeud sur un seul VPS ne fournit aucune redondance materielle. Les sauvegardes chiffrees hors VPS sont donc obligatoires. Le script de sauvegarde exporte chaque objet par l'API S3 dans un format manifeste + blobs verifies, plutot que de copier a chaud les fichiers internes du moteur.

## Procedure de migration

1. Faire tourner `scripts/audit-supabase-usage.mjs` et traiter tous les `runtime-blocker`.
2. Renouveler les secrets deja partages et passer l'acces SSH root a une cle dediee.
3. Creer le DNS `storage.greffio.willentreprises.com`.
4. Installer Docker, Nginx, Certbot, les clients PostgreSQL et Restic sur le VPS.
5. Copier `ops/vps/.env.infrastructure.example` vers `.env.infrastructure`, generer les secrets et lancer `setup-infrastructure.sh`.
6. Installer le vhost Nginx Storage, obtenir le certificat TLS et verifier l'endpoint S3.
7. Copier `.env.migration.example` vers `.env.migration` avec des identifiants temporaires.
8. Preparer `/opt/greffio/.env.vps-target` a partir de `.env.app-target.example` et des secrets applicatifs existants.
9. Executer `preflight.sh`.
10. Realiser une repetition complete : export, restauration PostgreSQL, audit Storage, migration Storage, tests fonctionnels et test de restauration.
11. Deployer le code de la branche de migration sans changer encore la base active.
12. Pendant une courte fenetre de maintenance, executer `cutover-to-vps.sh`.
13. Verifier les comptes, dossiers, paiements, signatures, telechargements, e-mails, taches planifiees et applications mobiles.
14. Conserver Supabase intact pendant la periode de validation.
15. Apres validation et sauvegarde restauree avec succes, supprimer le code de compatibilite Supabase, revoquer les secrets puis fermer le projet.

## Retour en arriere

Le retour immediat restaure le `.env` sauvegarde puis redemarre le backend sur la base Supabase. Il est fiable tant qu'aucune nouvelle ecriture n'a ete acceptee sur PostgreSQL VPS.

Apres reouverture du service sur la cible, un retour tardif peut perdre les nouvelles ecritures. Il faut alors remettre le site en maintenance et synchroniser les differences avant de revenir a Supabase. Le script `rollback-to-supabase.sh` affiche explicitement cet avertissement et ne tente aucune synchronisation implicite.

## Blocages avant execution en production

- confirmer les ressources exactes du VPS et l'espace disque libre ;
- creer le DNS et le certificat du domaine Storage ;
- verifier la version et les extensions PostgreSQL de la source ;
- compter les references `supabase://` et les references eventuelles dans du JSON ;
- choisir et tester un depot Restic situe hors du VPS ;
- renouveler tous les secrets qui ont ete transmis en clair ;
- corriger la revocabilite persistante des refresh tokens ;
- executer les tests sur une restauration de repetition avant toute bascule ;
- supprimer le pilote Supabase uniquement apres migration et validation des objets.
