CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  company_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dossiers (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE,
  user_id TEXT,
  type_formalite TEXT,
  forme_juridique TEXT,
  denomination TEXT,
  company_name TEXT NOT NULL,
  legal_form TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  data_json TEXT,
  assigned_to_user_id TEXT,
  ops_queue TEXT,
  ops_priority TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dossier_status_events (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id TEXT,
  offer_code TEXT NOT NULL,
  amount_total_cents INTEGER NOT NULL,
  amount_service_cents INTEGER NOT NULL,
  amount_legal_fees_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_payment_id TEXT UNIQUE,
  provider_payload_json TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  failed_at TEXT,
  refunded_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  raw_payload_json TEXT,
  processed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  doc_key TEXT NOT NULL,
  type TEXT,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL,
  original_filename TEXT,
  recommended_filename TEXT,
  file_url TEXT,
  filename TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  storage_url TEXT,
  sha256 TEXT,
  rejected_reason TEXT,
  uploaded_at TEXT,
  reviewed_at TEXT,
  reviewer_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(dossier_id, doc_key)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  file_size_bytes BIGINT,
  content_hash TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  document_id TEXT,
  signer_user_id TEXT,
  signature_type TEXT NOT NULL,
  status TEXT NOT NULL,
  signed_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE SET NULL,
  user_id TEXT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  tags_json TEXT,
  error_code TEXT,
  payload_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  sent_at TEXT,
  opened_at TEXT,
  clicked_at TEXT
);

CREATE TABLE IF NOT EXISTS ops_notes (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  author_id TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS type_formalite TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS forme_juridique TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS denomination TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS data_json TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS ops_queue TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS ops_priority TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recommended_filename TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata_json TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_schema_version TEXT;
ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS tags_json TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS opened_at TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS clicked_at TEXT;
