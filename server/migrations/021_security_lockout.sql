CREATE TABLE IF NOT EXISTS security_lockout_counters (
  scope TEXT NOT NULL CHECK (scope IN ('email', 'ip')),
  key_hash TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS idx_security_lockout_updated
  ON security_lockout_counters (updated_at);
