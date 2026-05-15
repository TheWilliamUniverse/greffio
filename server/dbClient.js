import { Pool } from 'pg';
import { sqlite } from './database.js';

const hasPostgres = Boolean(process.env.DATABASE_URL);
const pool = hasPostgres ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

const query = async (text, params = []) => {
  if (!pool) throw new Error('POSTGRES_NOT_CONFIGURED');
  const result = await pool.query(text, params);
  return result;
};

const initPostgresSchema = async () => {
  if (!pool) return;
  await query(`
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
  `);
  await query(`
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
  `);
  await query(`
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
  `);
  await query(`
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
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      provider_event_id TEXT NOT NULL UNIQUE,
      raw_payload_json TEXT,
      processed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
      doc_key TEXT NOT NULL,
      label TEXT NOT NULL,
      required BOOLEAN NOT NULL DEFAULT TRUE,
      status TEXT NOT NULL,
      filename TEXT,
      file_size_bytes BIGINT,
      mime_type TEXT,
      storage_url TEXT,
      rejected_reason TEXT,
      uploaded_at TEXT,
      reviewed_at TEXT,
      reviewer_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(dossier_id, doc_key)
    );
  `);
  await query(`
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
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS email_events (
      id TEXT PRIMARY KEY,
      dossier_id TEXT REFERENCES dossiers(id) ON DELETE SET NULL,
      user_id TEXT,
      template_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      payload_json TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );
  `);
};

export {
  initPostgresSchema,
  hasPostgres,
  pool,
  query,
  sqlite,
};
