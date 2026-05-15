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
  company_name TEXT NOT NULL,
  legal_form TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT NOT NULL,
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
  label TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
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
`);

export {
  sqlite,
};
