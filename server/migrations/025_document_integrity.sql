-- Empreintes SHA-256 et jeton de vérification publique (QR procuration / pouvoirs)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_hash_before_signature TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_hash_after_signature TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS verify_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_verify_token_hash ON documents(verify_token_hash);
