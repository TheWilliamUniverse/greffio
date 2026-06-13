CREATE TABLE IF NOT EXISTS document_completion_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT NULL,

  original_file_name TEXT NOT NULL,
  original_file_mime_type TEXT NOT NULL,
  original_file_size_bytes BIGINT NOT NULL,
  original_storage_driver TEXT NOT NULL,
  original_storage_path TEXT NOT NULL,

  generated_file_name TEXT NULL,
  generated_file_mime_type TEXT NULL,
  generated_file_size_bytes BIGINT NULL,
  generated_storage_driver TEXT NULL,
  generated_storage_path TEXT NULL,

  status TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown',

  page_count INTEGER NULL,
  has_text_layer BOOLEAN NULL,
  has_existing_form_fields BOOLEAN NULL,
  requires_ocr BOOLEAN NULL,
  is_encrypted BOOLEAN NULL,

  analysis_summary_json TEXT NULL,
  analysis_warnings_json TEXT NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  analyzed_at TEXT NULL,
  exported_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_completion_documents_user_id
  ON document_completion_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_document_completion_documents_status
  ON document_completion_documents(status);

CREATE TABLE IF NOT EXISTS document_completion_fields (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES document_completion_documents(id) ON DELETE CASCADE,

  page_index INTEGER NOT NULL,
  page_number INTEGER NOT NULL,

  field_type TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NULL,
  placeholder TEXT NULL,
  help_text TEXT NULL,

  required BOOLEAN NOT NULL DEFAULT false,
  read_only BOOLEAN NOT NULL DEFAULT false,

  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  coordinate_system TEXT NOT NULL DEFAULT 'pdf_points',

  confidence DOUBLE PRECISION NOT NULL,
  confidence_label TEXT NOT NULL,
  detection_sources_json TEXT NOT NULL,
  detection_reason TEXT NOT NULL,
  matched_text TEXT NULL,
  nearby_label TEXT NULL,
  original_pdf_field_name TEXT NULL,
  needs_human_review BOOLEAN NOT NULL DEFAULT false,

  validation_json TEXT NULL,
  metadata_json TEXT NULL,

  review_status TEXT NOT NULL DEFAULT 'auto_detected',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_completion_fields_document_id
  ON document_completion_fields(document_id);

CREATE INDEX IF NOT EXISTS idx_document_completion_fields_page
  ON document_completion_fields(document_id, page_index);

CREATE INDEX IF NOT EXISTS idx_document_completion_fields_confidence
  ON document_completion_fields(confidence);
