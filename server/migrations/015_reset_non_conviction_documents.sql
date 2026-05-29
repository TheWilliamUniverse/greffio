-- Remise à zéro des déclarations non-condamnation générées (template PDF v5).
-- Conserve les champs formulaire (metadata.fields) pour préremplissage client.

UPDATE documents
SET
  status = 'requested',
  original_filename = NULL,
  recommended_filename = NULL,
  file_url = NULL,
  filename = NULL,
  file_size_bytes = NULL,
  mime_type = NULL,
  storage_url = NULL,
  sha256 = NULL,
  rejected_reason = NULL,
  uploaded_at = NULL,
  reviewed_at = NULL,
  reviewer_id = NULL,
  metadata_json = CASE
    WHEN metadata_json IS NOT NULL
      AND metadata_json::jsonb ? 'fields'
      AND jsonb_typeof(metadata_json::jsonb->'fields') = 'object'
    THEN jsonb_build_object(
      'fields', metadata_json::jsonb->'fields',
      'editorSchemaVersion', 'manager_non_conviction_v5',
      'resetAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'resetReason', 'pdf_template_v5'
    )::text
    ELSE jsonb_build_object(
      'editorSchemaVersion', 'manager_non_conviction_v5',
      'resetAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'resetReason', 'pdf_template_v5'
    )::text
  END,
  updated_at = NOW()
WHERE doc_key = 'manager_non_conviction'
  AND dossier_id IN (SELECT id FROM dossiers WHERE deleted_at IS NULL)
  AND (
    filename IS NOT NULL
    OR storage_url IS NOT NULL
    OR file_url IS NOT NULL
    OR status <> 'requested'
  );
