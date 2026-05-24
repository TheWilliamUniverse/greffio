CREATE TABLE IF NOT EXISTS signature_requests (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  document_id TEXT,
  doc_key TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  signer_email TEXT NOT NULL,
  signer_full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  sha256_draft TEXT,
  sha256_signed TEXT,
  fields_json TEXT,
  expires_at TEXT NOT NULL,
  signed_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_json TEXT,
  audit_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_dossier ON signature_requests(dossier_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
