-- Colonnes documents / éditeur (bases créées avant 001 complet)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata_json TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_schema_version TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recommended_filename TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
