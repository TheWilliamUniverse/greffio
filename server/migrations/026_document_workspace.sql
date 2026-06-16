-- Document Workspace: versioning + editor sessions (PostgreSQL + SQLite compatible)

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  document_id TEXT NULL,
  version_number INTEGER NOT NULL,
  parent_version_id TEXT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  file_format TEXT NOT NULL,
  mime_type TEXT NULL,
  storage_url TEXT NOT NULL,
  storage_key TEXT NULL,
  file_size_bytes BIGINT NULL,
  sha256 TEXT NULL,
  content_hash TEXT NULL,
  pdf_version_id TEXT NULL,
  source_version_id TEXT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT NULL,
  locked_until TEXT NULL,
  editor_provider TEXT NULL,
  editor_session_id TEXT NULL,
  editor_schema_version INTEGER NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  validated_by TEXT NULL,
  validated_at TEXT NULL,
  rejected_by TEXT NULL,
  rejected_at TEXT NULL,
  rejection_reason TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_unique_number
  ON document_versions(dossier_id, doc_key, version_number);

CREATE INDEX IF NOT EXISTS idx_document_versions_dossier_doc
  ON document_versions(dossier_id, doc_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_status
  ON document_versions(status);

CREATE INDEX IF NOT EXISTS idx_document_versions_origin
  ON document_versions(origin);

CREATE INDEX IF NOT EXISTS idx_document_versions_session
  ON document_versions(editor_session_id);

CREATE TABLE IF NOT EXISTS document_editor_sessions (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  document_version_id TEXT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  access_token_hash TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NULL,
  file_format TEXT NOT NULL,
  source_storage_url TEXT NOT NULL,
  source_sha256 TEXT NULL,
  result_version_id TEXT NULL,
  expires_at TEXT NOT NULL,
  opened_at TEXT NULL,
  last_callback_at TEXT NULL,
  closed_at TEXT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_editor_sessions_lookup
  ON document_editor_sessions(dossier_id, doc_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_editor_sessions_token_hash
  ON document_editor_sessions(access_token_hash);

CREATE INDEX IF NOT EXISTS idx_document_editor_sessions_expiry
  ON document_editor_sessions(expires_at);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_version_id TEXT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_pdf_version_id TEXT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_free_edit_at TEXT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_locked_until TEXT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_locked_by TEXT NULL;
