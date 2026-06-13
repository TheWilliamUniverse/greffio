import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const parseJson = (value, fallback = null) => {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const mapDocumentRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    organizationId: row.organizationId ?? row.organization_id ?? null,
    originalFile: {
      name: row.originalFileName ?? row.original_file_name,
      mimeType: row.originalFileMimeType ?? row.original_file_mime_type,
      sizeBytes: Number(row.originalFileSizeBytes ?? row.original_file_size_bytes ?? 0),
      storageDriver: row.originalStorageDriver ?? row.original_storage_driver,
      storagePath: row.originalStoragePath ?? row.original_storage_path,
    },
    generatedFile: (row.generatedStoragePath ?? row.generated_storage_path) ? {
      name: row.generatedFileName ?? row.generated_file_name,
      mimeType: (row.generatedFileMimeType ?? row.generated_file_mime_type) || 'application/pdf',
      sizeBytes: row.generatedFileSizeBytes ?? row.generated_file_size_bytes
        ? Number(row.generatedFileSizeBytes ?? row.generated_file_size_bytes)
        : undefined,
      storageDriver: row.generatedStorageDriver ?? row.generated_storage_driver,
      storagePath: row.generatedStoragePath ?? row.generated_storage_path,
      generatedAt: row.exportedAt ?? row.exported_at,
    } : undefined,
    status: row.status,
    sourceType: row.sourceType ?? row.source_type ?? 'unknown',
    metadata: {
      pageCount: row.pageCount ?? row.page_count ?? undefined,
      hasTextLayer: row.hasTextLayer ?? row.has_text_layer ?? undefined,
      hasExistingFormFields: row.hasExistingFormFields ?? row.has_existing_form_fields ?? undefined,
      requiresOcr: row.requiresOcr ?? row.requires_ocr ?? undefined,
      isEncrypted: row.isEncrypted ?? row.is_encrypted ?? undefined,
    },
    analysisSummary: parseJson(row.analysisSummaryJson ?? row.analysis_summary_json),
    warnings: parseJson(row.analysisWarningsJson ?? row.analysis_warnings_json, []) || [],
    error: (row.errorCode ?? row.error_code) ? {
      code: row.errorCode ?? row.error_code,
      message: row.errorMessage ?? row.error_message,
    } : undefined,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    analyzedAt: row.analyzedAt ?? row.analyzed_at ?? undefined,
    exportedAt: row.exportedAt ?? row.exported_at ?? undefined,
  };
};

const mapFieldRow = (row) => {
  if (!row) return null;
  const sources = parseJson(row.detectionSourcesJson ?? row.detection_sources_json, []) || [];
  return {
    id: row.id,
    documentId: row.documentId ?? row.document_id,
    pageIndex: Number(row.pageIndex ?? row.page_index ?? 0),
    pageNumber: Number(row.pageNumber ?? row.page_number ?? 1),
    type: row.fieldType ?? row.field_type,
    name: row.name,
    label: row.label ?? undefined,
    placeholder: row.placeholder ?? undefined,
    helpText: row.helpText ?? row.help_text ?? undefined,
    required: Boolean(row.required),
    readOnly: Boolean(row.readOnly ?? row.read_only),
    bbox: {
      x: Number(row.x),
      y: Number(row.y),
      width: Number(row.width),
      height: Number(row.height),
      coordinateSystem: row.coordinateSystem ?? row.coordinate_system ?? 'pdf_points',
    },
    detection: {
      sources,
      confidence: Number(row.confidence),
      confidenceLabel: row.confidenceLabel ?? row.confidence_label,
      reason: row.detectionReason ?? row.detection_reason,
      matchedText: row.matchedText ?? row.matched_text ?? undefined,
      nearbyLabel: row.nearbyLabel ?? row.nearby_label ?? undefined,
      originalPdfFieldName: row.originalPdfFieldName ?? row.original_pdf_field_name ?? undefined,
      needsHumanReview: Boolean(row.needsHumanReview ?? row.needs_human_review),
    },
    validation: parseJson(row.validationJson ?? row.validation_json) ?? undefined,
    metadata: parseJson(row.metadataJson ?? row.metadata_json) ?? undefined,
    review: { status: row.reviewStatus ?? row.review_status ?? 'auto_detected' },
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
};

export const createDocumentCompletionRecord = async ({
  userId,
  organizationId = null,
  originalFileName,
  originalFileMimeType,
  originalFileSizeBytes,
  originalStorageDriver,
  originalStoragePath,
  status = 'uploaded',
}) => {
  const createdAt = nowIso();
  const record = {
    id: randomUUID(),
    userId,
    organizationId,
    originalFileName,
    originalFileMimeType,
    originalFileSizeBytes,
    originalStorageDriver,
    originalStoragePath,
    generatedFileName: null,
    generatedFileMimeType: null,
    generatedFileSizeBytes: null,
    generatedStorageDriver: null,
    generatedStoragePath: null,
    status,
    sourceType: 'unknown',
    pageCount: null,
    hasTextLayer: null,
    hasExistingFormFields: null,
    requiresOcr: null,
    isEncrypted: null,
    analysisSummaryJson: null,
    analysisWarningsJson: JSON.stringify([]),
    errorCode: null,
    errorMessage: null,
    createdAt,
    updatedAt: createdAt,
    analyzedAt: null,
    exportedAt: null,
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO document_completion_documents (
        id, user_id, organization_id,
        original_file_name, original_file_mime_type, original_file_size_bytes,
        original_storage_driver, original_storage_path,
        generated_file_name, generated_file_mime_type, generated_file_size_bytes,
        generated_storage_driver, generated_storage_path,
        status, source_type,
        page_count, has_text_layer, has_existing_form_fields, requires_ocr, is_encrypted,
        analysis_summary_json, analysis_warnings_json, error_code, error_message,
        created_at, updated_at, analyzed_at, exported_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
      )
    `, [
      record.id, record.userId, record.organizationId,
      record.originalFileName, record.originalFileMimeType, record.originalFileSizeBytes,
      record.originalStorageDriver, record.originalStoragePath,
      record.generatedFileName, record.generatedFileMimeType, record.generatedFileSizeBytes,
      record.generatedStorageDriver, record.generatedStoragePath,
      record.status, record.sourceType,
      record.pageCount, record.hasTextLayer, record.hasExistingFormFields, record.requiresOcr, record.isEncrypted,
      record.analysisSummaryJson, record.analysisWarningsJson, record.errorCode, record.errorMessage,
      record.createdAt, record.updatedAt, record.analyzedAt, record.exportedAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO document_completion_documents (
        id, user_id, organization_id,
        original_file_name, original_file_mime_type, original_file_size_bytes,
        original_storage_driver, original_storage_path,
        generated_file_name, generated_file_mime_type, generated_file_size_bytes,
        generated_storage_driver, generated_storage_path,
        status, source_type,
        page_count, has_text_layer, has_existing_form_fields, requires_ocr, is_encrypted,
        analysis_summary_json, analysis_warnings_json, error_code, error_message,
        created_at, updated_at, analyzed_at, exported_at
      ) VALUES (
        @id, @userId, @organizationId,
        @originalFileName, @originalFileMimeType, @originalFileSizeBytes,
        @originalStorageDriver, @originalStoragePath,
        @generatedFileName, @generatedFileMimeType, @generatedFileSizeBytes,
        @generatedStorageDriver, @generatedStoragePath,
        @status, @sourceType,
        @pageCount, @hasTextLayer, @hasExistingFormFields, @requiresOcr, @isEncrypted,
        @analysisSummaryJson, @analysisWarningsJson, @errorCode, @errorMessage,
        @createdAt, @updatedAt, @analyzedAt, @exportedAt
      )
    `).run(record);
  }

  return mapDocumentRow(record);
};

export const getDocumentCompletionById = async (documentId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        user_id AS "userId",
        organization_id AS "organizationId",
        original_file_name AS "originalFileName",
        original_file_mime_type AS "originalFileMimeType",
        original_file_size_bytes AS "originalFileSizeBytes",
        original_storage_driver AS "originalStorageDriver",
        original_storage_path AS "originalStoragePath",
        generated_file_name AS "generatedFileName",
        generated_file_mime_type AS "generatedFileMimeType",
        generated_file_size_bytes AS "generatedFileSizeBytes",
        generated_storage_driver AS "generatedStorageDriver",
        generated_storage_path AS "generatedStoragePath",
        status,
        source_type AS "sourceType",
        page_count AS "pageCount",
        has_text_layer AS "hasTextLayer",
        has_existing_form_fields AS "hasExistingFormFields",
        requires_ocr AS "requiresOcr",
        is_encrypted AS "isEncrypted",
        analysis_summary_json AS "analysisSummaryJson",
        analysis_warnings_json AS "analysisWarningsJson",
        error_code AS "errorCode",
        error_message AS "errorMessage",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        analyzed_at AS "analyzedAt",
        exported_at AS "exportedAt"
      FROM document_completion_documents
      WHERE id = $1
      LIMIT 1
    `, [documentId]);
    return mapDocumentRow(result.rows[0]);
  }

  const row = sqlite.prepare('SELECT * FROM document_completion_documents WHERE id = ? LIMIT 1').get(documentId);
  return mapDocumentRow(row);
};

export const updateDocumentCompletionRecord = async (documentId, patch = {}) => {
  const current = await getDocumentCompletionById(documentId);
  if (!current) return null;
  const updatedAt = nowIso();
  const next = {
    status: patch.status ?? current.status,
    sourceType: patch.sourceType ?? current.sourceType,
    pageCount: patch.pageCount ?? current.metadata.pageCount ?? null,
    hasTextLayer: patch.hasTextLayer ?? current.metadata.hasTextLayer ?? null,
    hasExistingFormFields: patch.hasExistingFormFields ?? current.metadata.hasExistingFormFields ?? null,
    requiresOcr: patch.requiresOcr ?? current.metadata.requiresOcr ?? null,
    isEncrypted: patch.isEncrypted ?? current.metadata.isEncrypted ?? null,
    analysisSummaryJson: patch.analysisSummary != null
      ? JSON.stringify(patch.analysisSummary)
      : (current.analysisSummary ? JSON.stringify(current.analysisSummary) : null),
    analysisWarningsJson: JSON.stringify(patch.warnings ?? current.warnings ?? []),
    errorCode: patch.error?.code ?? null,
    errorMessage: patch.error?.message ?? null,
    generatedFileName: patch.generatedFile?.name ?? current.generatedFile?.name ?? null,
    generatedFileMimeType: patch.generatedFile?.mimeType ?? current.generatedFile?.mimeType ?? null,
    generatedFileSizeBytes: patch.generatedFile?.sizeBytes ?? current.generatedFile?.sizeBytes ?? null,
    generatedStorageDriver: patch.generatedFile?.storageDriver ?? current.generatedFile?.storageDriver ?? null,
    generatedStoragePath: patch.generatedFile?.storagePath ?? current.generatedFile?.storagePath ?? null,
    analyzedAt: patch.analyzedAt ?? current.analyzedAt ?? null,
    exportedAt: patch.exportedAt ?? current.exportedAt ?? null,
    updatedAt,
  };

  if (hasPostgres) {
    await query(`
      UPDATE document_completion_documents SET
        status = $2,
        source_type = $3,
        page_count = $4,
        has_text_layer = $5,
        has_existing_form_fields = $6,
        requires_ocr = $7,
        is_encrypted = $8,
        analysis_summary_json = $9,
        analysis_warnings_json = $10,
        error_code = $11,
        error_message = $12,
        generated_file_name = $13,
        generated_file_mime_type = $14,
        generated_file_size_bytes = $15,
        generated_storage_driver = $16,
        generated_storage_path = $17,
        analyzed_at = $18,
        exported_at = $19,
        updated_at = $20
      WHERE id = $1
    `, [
      documentId,
      next.status,
      next.sourceType,
      next.pageCount,
      next.hasTextLayer,
      next.hasExistingFormFields,
      next.requiresOcr,
      next.isEncrypted,
      next.analysisSummaryJson,
      next.analysisWarningsJson,
      next.errorCode,
      next.errorMessage,
      next.generatedFileName,
      next.generatedFileMimeType,
      next.generatedFileSizeBytes,
      next.generatedStorageDriver,
      next.generatedStoragePath,
      next.analyzedAt,
      next.exportedAt,
      next.updatedAt,
    ]);
  } else {
    sqlite.prepare(`
      UPDATE document_completion_documents SET
        status = @status,
        source_type = @sourceType,
        page_count = @pageCount,
        has_text_layer = @hasTextLayer,
        has_existing_form_fields = @hasExistingFormFields,
        requires_ocr = @requiresOcr,
        is_encrypted = @isEncrypted,
        analysis_summary_json = @analysisSummaryJson,
        analysis_warnings_json = @analysisWarningsJson,
        error_code = @errorCode,
        error_message = @errorMessage,
        generated_file_name = @generatedFileName,
        generated_file_mime_type = @generatedFileMimeType,
        generated_file_size_bytes = @generatedFileSizeBytes,
        generated_storage_driver = @generatedStorageDriver,
        generated_storage_path = @generatedStoragePath,
        analyzed_at = @analyzedAt,
        exported_at = @exportedAt,
        updated_at = @updatedAt
      WHERE id = @documentId
    `).run({ documentId, ...next });
  }

  return getDocumentCompletionById(documentId);
};

export const deleteDocumentCompletionRecord = async (documentId) => {
  if (hasPostgres) {
    await query('DELETE FROM document_completion_documents WHERE id = $1', [documentId]);
  } else {
    sqlite.prepare('DELETE FROM document_completion_documents WHERE id = ?').run(documentId);
  }
  return { deleted: true };
};

export const replaceDocumentCompletionFields = async (documentId, fields = []) => {
  if (hasPostgres) {
    await query('DELETE FROM document_completion_fields WHERE document_id = $1', [documentId]);
  } else {
    sqlite.prepare('DELETE FROM document_completion_fields WHERE document_id = ?').run(documentId);
  }

  const createdAt = nowIso();
  for (const field of fields) {
    const row = {
      id: field.id || randomUUID(),
      documentId,
      pageIndex: field.pageIndex,
      pageNumber: field.pageNumber,
      fieldType: field.type,
      name: field.name,
      label: field.label ?? null,
      placeholder: field.placeholder ?? null,
      helpText: field.helpText ?? null,
      required: field.required ? 1 : 0,
      readOnly: field.readOnly ? 1 : 0,
      x: field.bbox.x,
      y: field.bbox.y,
      width: field.bbox.width,
      height: field.bbox.height,
      coordinateSystem: field.bbox.coordinateSystem || 'pdf_points',
      confidence: field.detection.confidence,
      confidenceLabel: field.detection.confidenceLabel,
      detectionSourcesJson: JSON.stringify(field.detection.sources || []),
      detectionReason: field.detection.reason,
      matchedText: field.detection.matchedText ?? null,
      nearbyLabel: field.detection.nearbyLabel ?? null,
      originalPdfFieldName: field.detection.originalPdfFieldName ?? null,
      needsHumanReview: field.detection.needsHumanReview ? 1 : 0,
      validationJson: field.validation ? JSON.stringify(field.validation) : null,
      metadataJson: field.metadata ? JSON.stringify(field.metadata) : null,
      reviewStatus: field.review?.status || 'auto_detected',
      createdAt,
      updatedAt: createdAt,
    };

    if (hasPostgres) {
      await query(`
        INSERT INTO document_completion_fields (
          id, document_id, page_index, page_number, field_type, name, label, placeholder, help_text,
          required, read_only, x, y, width, height, coordinate_system,
          confidence, confidence_label, detection_sources_json, detection_reason,
          matched_text, nearby_label, original_pdf_field_name, needs_human_review,
          validation_json, metadata_json, review_status, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
        )
      `, [
        row.id, row.documentId, row.pageIndex, row.pageNumber, row.fieldType, row.name, row.label,
        row.placeholder, row.helpText, row.required, row.readOnly, row.x, row.y, row.width, row.height,
        row.coordinateSystem, row.confidence, row.confidenceLabel, row.detectionSourcesJson,
        row.detectionReason, row.matchedText, row.nearbyLabel, row.originalPdfFieldName,
        row.needsHumanReview, row.validationJson, row.metadataJson, row.reviewStatus,
        row.createdAt, row.updatedAt,
      ]);
    } else {
      sqlite.prepare(`
        INSERT INTO document_completion_fields (
          id, document_id, page_index, page_number, field_type, name, label, placeholder, help_text,
          required, read_only, x, y, width, height, coordinate_system,
          confidence, confidence_label, detection_sources_json, detection_reason,
          matched_text, nearby_label, original_pdf_field_name, needs_human_review,
          validation_json, metadata_json, review_status, created_at, updated_at
        ) VALUES (
          @id, @documentId, @pageIndex, @pageNumber, @fieldType, @name, @label, @placeholder, @helpText,
          @required, @readOnly, @x, @y, @width, @height, @coordinateSystem,
          @confidence, @confidenceLabel, @detectionSourcesJson, @detectionReason,
          @matchedText, @nearbyLabel, @originalPdfFieldName, @needsHumanReview,
          @validationJson, @metadataJson, @reviewStatus, @createdAt, @updatedAt
        )
      `).run(row);
    }
  }
};

export const listDocumentCompletionFields = async (documentId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        document_id AS "documentId",
        page_index AS "pageIndex",
        page_number AS "pageNumber",
        field_type AS "fieldType",
        name,
        label,
        placeholder,
        help_text AS "helpText",
        required,
        read_only AS "readOnly",
        x, y, width, height,
        coordinate_system AS "coordinateSystem",
        confidence,
        confidence_label AS "confidenceLabel",
        detection_sources_json AS "detectionSourcesJson",
        detection_reason AS "detectionReason",
        matched_text AS "matchedText",
        nearby_label AS "nearbyLabel",
        original_pdf_field_name AS "originalPdfFieldName",
        needs_human_review AS "needsHumanReview",
        validation_json AS "validationJson",
        metadata_json AS "metadataJson",
        review_status AS "reviewStatus",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM document_completion_fields
      WHERE document_id = $1
      ORDER BY page_index ASC, y DESC, x ASC
    `, [documentId]);
    return result.rows.map(mapFieldRow);
  }

  const rows = sqlite.prepare(`
    SELECT * FROM document_completion_fields
    WHERE document_id = ?
    ORDER BY page_index ASC, y DESC, x ASC
  `).all(documentId);
  return rows.map(mapFieldRow);
};

export const listDocumentCompletionByUser = async (userId, { limit = 20 } = {}) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id FROM document_completion_documents
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    const docs = await Promise.all(result.rows.map((row) => getDocumentCompletionById(row.id)));
    return docs.filter(Boolean);
  }

  const rows = sqlite.prepare(`
    SELECT id FROM document_completion_documents
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);
  return Promise.all(rows.map((row) => getDocumentCompletionById(row.id)));
};
