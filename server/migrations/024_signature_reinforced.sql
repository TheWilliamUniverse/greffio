-- Signature électronique renforcée Greffio (SES + preuve + OTP)

ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'greffio_internal';
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS signature_level TEXT DEFAULT 'ses_reinforced';
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS proof_id TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS proof_certificate_path TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS consent_text_version TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS consent_text_snapshot TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_acknowledged_at TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS consent_accepted_at TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS otp_required INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS otp_verified INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS otp_sent_at TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS otp_verified_at TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS opened_at TEXT;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 8;

ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signature_request_id TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'greffio_internal';
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signature_level TEXT DEFAULT 'ses_reinforced';
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signer_email TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS original_hash_sha256 TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signed_hash_sha256 TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS proof_id TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS proof_certificate_path TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS consent_text_version TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS consent_text_snapshot TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS document_acknowledged INTEGER DEFAULT 0;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS otp_verified INTEGER DEFAULT 0;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS visual_signature_mode TEXT;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS greffio_proof_line TEXT;

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
CREATE INDEX IF NOT EXISTS idx_signature_audit_events_type ON signature_audit_events(event_type);

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
