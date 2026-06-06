-- Verification engine tables (Greffio audit V1)

CREATE TABLE IF NOT EXISTS verification_checks (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL DEFAULT 'dossier',
  subject_id TEXT,
  check_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  score NUMERIC,
  result_json TEXT NOT NULL DEFAULT '{}',
  raw_response_ref TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_checks_dossier_id ON verification_checks(dossier_id);
CREATE INDEX IF NOT EXISTS idx_verification_checks_check_type ON verification_checks(check_type);

CREATE TABLE IF NOT EXISTS verification_profiles (
  id TEXT PRIMARY KEY,
  dossier_id TEXT NOT NULL UNIQUE REFERENCES dossiers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  completeness_score NUMERIC DEFAULT 0,
  identity_status TEXT DEFAULT 'NOT_REQUIRED',
  company_status TEXT DEFAULT 'NOT_CHECKED',
  sanctions_status TEXT DEFAULT 'NOT_REQUIRED',
  signature_status TEXT DEFAULT 'NOT_REQUIRED',
  manual_review_required INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_profiles_risk_level ON verification_profiles(risk_level);
