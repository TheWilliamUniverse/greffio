-- Colonnes ajoutées pour l'architecture multi-prestataires (CAWL B2C,
-- GoCardless B2B uniquement, Qonto réconciliation, virement manuel).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_checkout_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata_json TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cancelled_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS qonto_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_type ON payments (customer_type);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);
