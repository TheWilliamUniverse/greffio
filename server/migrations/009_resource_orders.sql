CREATE TABLE IF NOT EXISTS resource_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_title TEXT NOT NULL,
  company_name TEXT,
  siren TEXT,
  dossier_id TEXT REFERENCES dossiers(id) ON DELETE SET NULL,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL DEFAULT 'manual_ops',
  price_ttc_cents INTEGER NOT NULL,
  notes TEXT,
  payment_id TEXT,
  provider_ref TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resource_orders_user_id ON resource_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_orders_status ON resource_orders(status);
CREATE INDEX IF NOT EXISTS idx_resource_orders_created_at ON resource_orders(created_at DESC);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS resource_order_id TEXT REFERENCES resource_orders(id) ON DELETE SET NULL;
ALTER TABLE payments ALTER COLUMN dossier_id DROP NOT NULL;
