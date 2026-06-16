-- Miroir factures Greffio + file d'attente revue ops avant envoi client
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  dossier_id TEXT,
  payment_id TEXT,
  user_id TEXT,
  invoice_kind TEXT NOT NULL DEFAULT 'dossier_service',
  invoice_number TEXT,
  qonto_invoice_id TEXT UNIQUE,
  qonto_status TEXT,
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  client_delivery_status TEXT NOT NULL DEFAULT 'pending_ops_review',
  ops_reviewed_by TEXT,
  ops_reviewed_at TEXT,
  client_sent_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_dossier_kind
  ON invoices(dossier_id, invoice_kind)
  WHERE dossier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_delivery_status
  ON invoices(client_delivery_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_id
  ON invoices(payment_id);
