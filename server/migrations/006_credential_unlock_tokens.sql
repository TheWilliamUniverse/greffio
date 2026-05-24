CREATE TABLE IF NOT EXISTS credential_unlock_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  sms_code_hash TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  phone_masked TEXT,
  expires_at TEXT NOT NULL,
  sms_sent_at TEXT,
  verified_at TEXT,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credential_unlock_tokens_user_id ON credential_unlock_tokens(user_id);
