-- Mollie Connect OAuth: CSRF states + encrypted partner account tokens
CREATE TABLE IF NOT EXISTS mollie_connect_oauth_states (
  id TEXT PRIMARY KEY,
  state_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mollie_connect_oauth_states_user_id
  ON mollie_connect_oauth_states(user_id);

CREATE TABLE IF NOT EXISTS mollie_connect_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TEXT,
  scope TEXT,
  profile_id TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  initiated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mollie_connect_accounts_status
  ON mollie_connect_accounts(status, updated_at DESC);
