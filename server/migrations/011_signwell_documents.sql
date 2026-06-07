CREATE TABLE IF NOT EXISTS signwell_documents (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  doc_key TEXT NOT NULL,
  signwell_document_id TEXT NOT NULL UNIQUE,
  signature_request_id TEXT,
  signer_email TEXT NOT NULL,
  signer_full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  signing_url TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signwell_documents_dossier ON signwell_documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_signwell_documents_status ON signwell_documents(status);
