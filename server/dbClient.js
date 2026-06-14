import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { sqlite } from './database.js';

dotenv.config({ quiet: true });

const hasPostgres = Boolean(process.env.DATABASE_URL);
if (process.env.NODE_ENV === 'production' && !hasPostgres) {
  throw new Error('DATABASE_URL_REQUIRED_IN_PRODUCTION');
}
const pool = hasPostgres ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

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
      phone TEXT,
      role TEXT NOT NULL,
      company_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_json TEXT;`);
  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  await query(`
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS reference TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS type_formalite TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS forme_juridique TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS denomination TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS data_json TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS ops_queue TEXT;`);
  await query(`ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS ops_priority TEXT;`);
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(dossier_id, doc_key)
    );
  `);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_filename TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS recommended_filename TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS sha256 TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata_json TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_schema_version TEXT;`);
  await query(`
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
  `);
  await query(`ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;`);
  await query(`
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
  `);
  await query(`
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
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider TEXT;`);
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS tags_json TEXT;`);
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS error_code TEXT;`);
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS updated_at TEXT;`);
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS opened_at TEXT;`);
  await query(`ALTER TABLE email_events ADD COLUMN IF NOT EXISTS clicked_at TEXT;`);
  await query(`
    CREATE TABLE IF NOT EXISTS ops_notes (
      id TEXT PRIMARY KEY,
      dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
      author_id TEXT,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await query(`
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
};

const ensurePostgresDocumentColumns = async () => {
  if (!hasPostgres) return;
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS sha256 TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata_json TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS editor_schema_version TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_hash_before_signature TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_hash_after_signature TEXT;`);
  await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS verify_token_hash TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_type TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata_json TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancelled_at TEXT;`);
  await query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS qonto_transaction_id TEXT;`);
};

const initSchema = async () => {
  if (hasPostgres) {
    await runPostgresMigrations();
    await ensurePostgresDocumentColumns();
  }
};

const runPostgresMigrations = async () => {
  if (!hasPostgres) {
    throw new Error('POSTGRES_NOT_CONFIGURED');
  }
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied = [];
  for (const file of migrationFiles) {
    const version = file.replace(/\.sql$/i, '');
    const exists = await query(
      'SELECT 1 AS found FROM schema_migrations WHERE version = $1 LIMIT 1',
      [version],
    );
    if (exists.rows[0]) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await query('BEGIN');
      await query(sql);
      await query(
        'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)',
        [version, new Date().toISOString()],
      );
      await query('COMMIT');
      applied.push(version);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
  return applied;
};

const checkDatabaseConnection = async () => {
  if (hasPostgres) {
    await query('SELECT 1');
    return 'Postgres OK';
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SQLITE_FORBIDDEN_IN_PRODUCTION');
  }
  sqlite.prepare('SELECT 1').get();
  return 'SQLite OK';
};

export {
  checkDatabaseConnection,
  initSchema,
  initPostgresSchema,
  runPostgresMigrations,
  hasPostgres,
  pool,
  query,
  sqlite,
};
