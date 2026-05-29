-- Corbeille dossier : suppression différée 72 h avec possibilité de restauration.
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS purge_after TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS deleted_by TEXT;
