CREATE TABLE IF NOT EXISTS push_device_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  device_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user_id ON push_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_token ON push_device_tokens(token);
