import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'greffio.sqlite');
const sqlite = new Database(dbPath);

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
`);

export {
  sqlite,
};
