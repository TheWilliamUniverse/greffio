import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/** Postgres production skips SQLite so login/API stay up without native better-sqlite3. */
let sqlite = null;

if (!process.env.DATABASE_URL) {
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');

const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'greffio.sqlite');
sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  company_json TEXT,
  profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dossiers (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  reference TEXT UNIQUE,
  type_formalite TEXT,
  forme_juridique TEXT,
  denomination TEXT,
  company_name TEXT NOT NULL,
  legal_form TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dossier_status_events (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
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
  updated_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  raw_payload_json TEXT,
  processed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  type TEXT,
  label TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  original_filename TEXT,
  recommended_filename TEXT,
  file_url TEXT,
  filename TEXT,
  file_size_bytes INTEGER,
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
  UNIQUE(dossier_id, doc_key),
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  dossier_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  dossier_id TEXT,
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
  clicked_at TEXT,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  content_hash TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  document_id TEXT,
  signer_user_id TEXT,
  signature_type TEXT NOT NULL,
  status TEXT NOT NULL,
  signed_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ops_notes (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  author_id TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dossier_messages (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'thread',
  email_sent_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
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
`);

const hasColumn = (tableName, columnName) => sqlite
  .prepare(`PRAGMA table_info(${tableName})`)
  .all()
  .some((column) => column.name === columnName);

const addColumnIfMissing = (tableName, columnName, sqlType) => {
  if (!hasColumn(tableName, columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType};`);
  }
};

addColumnIfMissing('users', 'phone', 'TEXT');
addColumnIfMissing('dossiers', 'reference', 'TEXT');
addColumnIfMissing('dossiers', 'type_formalite', 'TEXT');
addColumnIfMissing('dossiers', 'forme_juridique', 'TEXT');
addColumnIfMissing('dossiers', 'denomination', 'TEXT');
addColumnIfMissing('dossiers', 'progress_percent', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('dossiers', 'data_json', 'TEXT');
addColumnIfMissing('dossiers', 'assigned_to_user_id', 'TEXT');
addColumnIfMissing('dossiers', 'ops_queue', 'TEXT');
addColumnIfMissing('dossiers', 'ops_priority', 'TEXT');
addColumnIfMissing('dossiers', 'deleted_at', 'TEXT');
addColumnIfMissing('dossiers', 'purge_after', 'TEXT');
addColumnIfMissing('dossiers', 'deleted_by', 'TEXT');
addColumnIfMissing('documents', 'type', 'TEXT');
addColumnIfMissing('users', 'phone', 'TEXT');
addColumnIfMissing('users', 'profile_json', 'TEXT');
addColumnIfMissing('documents', 'original_filename', 'TEXT');
addColumnIfMissing('documents', 'recommended_filename', 'TEXT');
addColumnIfMissing('documents', 'file_url', 'TEXT');
addColumnIfMissing('documents', 'sha256', 'TEXT');
addColumnIfMissing('documents', 'metadata_json', 'TEXT');
addColumnIfMissing('generated_documents', 'file_size_bytes', 'INTEGER');
addColumnIfMissing('documents', 'editor_schema_version', 'TEXT');
addColumnIfMissing('documents', 'document_hash_before_signature', 'TEXT');
addColumnIfMissing('documents', 'document_hash_after_signature', 'TEXT');
addColumnIfMissing('documents', 'verify_token_hash', 'TEXT');
addColumnIfMissing('email_events', 'provider', 'TEXT');
addColumnIfMissing('email_events', 'tags_json', 'TEXT');
addColumnIfMissing('email_events', 'error_code', 'TEXT');
addColumnIfMissing('email_events', 'updated_at', 'TEXT');
addColumnIfMissing('email_events', 'opened_at', 'TEXT');
addColumnIfMissing('email_events', 'clicked_at', 'TEXT');
addColumnIfMissing('payments', 'customer_id', 'TEXT');
addColumnIfMissing('payments', 'customer_type', 'TEXT');
addColumnIfMissing('payments', 'invoice_id', 'TEXT');
addColumnIfMissing('payments', 'provider_checkout_url', 'TEXT');
addColumnIfMissing('payments', 'payment_method', 'TEXT');
addColumnIfMissing('payments', 'metadata_json', 'TEXT');
addColumnIfMissing('payments', 'cancelled_at', 'TEXT');
addColumnIfMissing('payments', 'qonto_transaction_id', 'TEXT');
addColumnIfMissing('users', 'mfa_enabled', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'totp_secret_encrypted', 'TEXT');
addColumnIfMissing('users', 'totp_pending_secret_encrypted', 'TEXT');

sqlite.exec(`
CREATE TABLE IF NOT EXISTS signature_requests (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  document_id TEXT,
  doc_key TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  signer_email TEXT NOT NULL,
  signer_full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  draft_pdf_path TEXT,
  signed_pdf_path TEXT,
  sha256_draft TEXT,
  sha256_signed TEXT,
  fields_json TEXT,
  expires_at TEXT,
  signed_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_json TEXT,
  audit_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS mfa_trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS resource_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_title TEXT NOT NULL,
  company_name TEXT,
  siren TEXT,
  dossier_id TEXT,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL DEFAULT 'manual_ops',
  price_ttc_cents INTEGER NOT NULL,
  notes TEXT,
  payment_id TEXT,
  provider_ref TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

addColumnIfMissing('payments', 'resource_order_id', 'TEXT');

[
  ['signature_requests', 'provider', 'TEXT DEFAULT \'greffio_internal\''],
  ['signature_requests', 'signature_level', 'TEXT DEFAULT \'ses_reinforced\''],
  ['signature_requests', 'proof_id', 'TEXT'],
  ['signature_requests', 'proof_certificate_path', 'TEXT'],
  ['signature_requests', 'consent_text_version', 'TEXT'],
  ['signature_requests', 'consent_text_snapshot', 'TEXT'],
  ['signature_requests', 'document_acknowledged_at', 'TEXT'],
  ['signature_requests', 'consent_accepted_at', 'TEXT'],
  ['signature_requests', 'otp_required', 'INTEGER DEFAULT 0'],
  ['signature_requests', 'otp_verified', 'INTEGER DEFAULT 0'],
  ['signature_requests', 'otp_sent_at', 'TEXT'],
  ['signature_requests', 'otp_verified_at', 'TEXT'],
  ['signature_requests', 'otp_attempts', 'INTEGER DEFAULT 0'],
  ['signature_requests', 'opened_at', 'TEXT'],
  ['signature_requests', 'failed_attempts', 'INTEGER DEFAULT 0'],
  ['signature_requests', 'max_attempts', 'INTEGER DEFAULT 8'],
  ['signatures', 'signature_request_id', 'TEXT'],
  ['signatures', 'provider', 'TEXT DEFAULT \'greffio_internal\''],
  ['signatures', 'signature_level', 'TEXT DEFAULT \'ses_reinforced\''],
  ['signatures', 'signer_name', 'TEXT'],
  ['signatures', 'signer_email', 'TEXT'],
  ['signatures', 'original_hash_sha256', 'TEXT'],
  ['signatures', 'signed_hash_sha256', 'TEXT'],
  ['signatures', 'proof_id', 'TEXT'],
  ['signatures', 'proof_certificate_path', 'TEXT'],
  ['signatures', 'consent_text_version', 'TEXT'],
  ['signatures', 'consent_text_snapshot', 'TEXT'],
  ['signatures', 'document_acknowledged', 'INTEGER DEFAULT 0'],
  ['signatures', 'otp_verified', 'INTEGER DEFAULT 0'],
  ['signatures', 'visual_signature_mode', 'TEXT'],
  ['signatures', 'greffio_proof_line', 'TEXT'],
].forEach(([table, column, type]) => addColumnIfMissing(table, column, type));

sqlite.exec(`
CREATE TABLE IF NOT EXISTS signature_audit_events (
  id TEXT PRIMARY KEY,
  signature_request_id TEXT NOT NULL,
  signature_id TEXT,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_user_id TEXT,
  actor_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  origin TEXT,
  referer TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signature_audit_events_request ON signature_audit_events(signature_request_id);

CREATE TABLE IF NOT EXISTS signature_otps (
  id TEXT PRIMARY KEY,
  signature_request_id TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signature_email_verification',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signature_otps_request ON signature_otps(signature_request_id);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS push_device_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(user_id, token),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS verification_checks (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL,
  user_id TEXT,
  subject_type TEXT NOT NULL DEFAULT 'dossier',
  subject_id TEXT,
  check_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  score REAL,
  result_json TEXT NOT NULL DEFAULT '{}',
  raw_response_ref TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_verification_checks_dossier_id ON verification_checks(dossier_id);

CREATE TABLE IF NOT EXISTS verification_profiles (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  completeness_score REAL DEFAULT 0,
  identity_status TEXT DEFAULT 'NOT_REQUIRED',
  company_status TEXT DEFAULT 'NOT_CHECKED',
  sanctions_status TEXT DEFAULT 'NOT_REQUIRED',
  signature_status TEXT DEFAULT 'NOT_REQUIRED',
  manual_review_required INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_completion_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  original_file_name TEXT NOT NULL,
  original_file_mime_type TEXT NOT NULL,
  original_file_size_bytes INTEGER NOT NULL,
  original_storage_driver TEXT NOT NULL,
  original_storage_path TEXT NOT NULL,
  generated_file_name TEXT,
  generated_file_mime_type TEXT,
  generated_file_size_bytes INTEGER,
  generated_storage_driver TEXT,
  generated_storage_path TEXT,
  status TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown',
  page_count INTEGER,
  has_text_layer INTEGER,
  has_existing_form_fields INTEGER,
  requires_ocr INTEGER,
  is_encrypted INTEGER,
  analysis_summary_json TEXT,
  analysis_warnings_json TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  analyzed_at TEXT,
  exported_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_document_completion_documents_user_id ON document_completion_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_completion_documents_status ON document_completion_documents(status);

CREATE TABLE IF NOT EXISTS document_completion_fields (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_index INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  field_type TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT,
  placeholder TEXT,
  help_text TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  read_only INTEGER NOT NULL DEFAULT 0,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  coordinate_system TEXT NOT NULL DEFAULT 'pdf_points',
  confidence REAL NOT NULL,
  confidence_label TEXT NOT NULL,
  detection_sources_json TEXT NOT NULL,
  detection_reason TEXT NOT NULL,
  matched_text TEXT,
  nearby_label TEXT,
  original_pdf_field_name TEXT,
  needs_human_review INTEGER NOT NULL DEFAULT 0,
  validation_json TEXT,
  metadata_json TEXT,
  review_status TEXT NOT NULL DEFAULT 'auto_detected',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES document_completion_documents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_document_completion_fields_document_id ON document_completion_fields(document_id);
`);

sqlite.exec(`
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
  file_size_bytes INTEGER NULL,
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
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  dossier_id TEXT,
  payment_id TEXT,
  user_id TEXT,
  invoice_kind TEXT NOT NULL DEFAULT 'dossier_service',
  invoice_number TEXT,
  qonto_invoice_id TEXT UNIQUE,
  qonto_status TEXT,
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  client_delivery_status TEXT NOT NULL DEFAULT 'pending_ops_review',
  ops_reviewed_by TEXT,
  ops_reviewed_at TEXT,
  client_sent_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_dossier_kind
  ON invoices(dossier_id, invoice_kind)
  WHERE dossier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client_delivery_status
  ON invoices(client_delivery_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id
  ON invoices(payment_id);
`);

[
  ['documents', 'current_version_id', 'TEXT'],
  ['documents', 'current_pdf_version_id', 'TEXT'],
  ['documents', 'last_free_edit_at', 'TEXT'],
  ['documents', 'editor_locked_until', 'TEXT'],
  ['documents', 'editor_locked_by', 'TEXT'],
].forEach(([table, column, type]) => addColumnIfMissing(table, column, type));

}

export {
  sqlite,
};
