-- Fil de messages partagé client ↔ ops (visible client + cockpit ops).
CREATE TABLE IF NOT EXISTS dossier_messages (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('client', 'ops', 'system')),
  author_id TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'thread' CHECK (channel IN ('thread', 'email')),
  email_sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dossier_messages_dossier_created
  ON dossier_messages (dossier_id, created_at DESC);
