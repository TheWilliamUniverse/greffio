-- Didit identity verification sessions

CREATE TABLE IF NOT EXISTS identity_verifications (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'didit',
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  verification_url TEXT,
  result_json TEXT NOT NULL DEFAULT '{}',
  triggered_by_doc_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_dossier_id ON identity_verifications(dossier_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_verifications_provider_session ON identity_verifications(provider_session_id);
