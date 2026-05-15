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
  role TEXT NOT NULL,
  company_json TEXT,
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
  rejected_reason TEXT,
  uploaded_at TEXT,
  reviewed_at TEXT,
  reviewer_id TEXT,
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
  provider_message_id TEXT,
  payload_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
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
addColumnIfMissing('documents', 'original_filename', 'TEXT');
addColumnIfMissing('documents', 'recommended_filename', 'TEXT');
addColumnIfMissing('documents', 'file_url', 'TEXT');
addColumnIfMissing('generated_documents', 'file_size_bytes', 'INTEGER');

export {
  sqlite,
};
