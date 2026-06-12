-- Verrouillage Supabase complet (audit sécurité juin 2026).
-- Contexte : l'API Greffio passe exclusivement par le backend Node (DATABASE_URL,
-- rôle propriétaire / service_role qui bypass RLS). Aucun client frontend ne doit
-- pouvoir lire le schéma public via PostgREST avec la clé anon/publishable.
--
-- 1) RLS activé sur TOUTES les tables du schéma public (y compris celles créées
--    après la migration 013 : dossier_messages, identity_verifications,
--    verification_*, subscribers_list, formality_powers, security_lockout_counters…).
--    Aucune policy n'est créée : deny-by-default pour anon/authenticated.
-- 2) Révocation des privilèges PostgREST (tables, séquences, fonctions, schéma).
-- 3) Default privileges : les futures tables ne seront jamais exposées par défaut.
--
-- Idempotent, et sans effet sur un Postgres local où les rôles Supabase n'existent pas.

-- 1. RLS sur toutes les tables existantes du schéma public.
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END $$;

-- 2. Révoquer tout accès direct des rôles PostgREST (Supabase uniquement).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    REVOKE USAGE ON SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
    REVOKE USAGE ON SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
  END IF;
END $$;
