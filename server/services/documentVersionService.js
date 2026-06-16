import { randomUUID, createHash } from 'node:crypto';
import { hasPostgres, query, sqlite } from '../dbClient.js';

const nowIso = () => new Date().toISOString();

/** Postgres stores is_current/is_locked as INTEGER (migration 026); SQLite uses 0/1 as well. */
const toFlagInt = (value) => (value ? 1 : 0);

const parseMetadata = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
};

const mapVersionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    dossierId: row.dossierId ?? row.dossier_id,
    docKey: row.docKey ?? row.doc_key,
    documentId: row.documentId ?? row.document_id ?? null,
    versionNumber: Number(row.versionNumber ?? row.version_number ?? 0),
    parentVersionId: row.parentVersionId ?? row.parent_version_id ?? null,
    origin: row.origin,
    status: row.status,
    fileFormat: row.fileFormat ?? row.file_format,
    mimeType: row.mimeType ?? row.mime_type ?? null,
    storageUrl: row.storageUrl ?? row.storage_url,
    storageKey: row.storageKey ?? row.storage_key ?? null,
    fileSizeBytes: row.fileSizeBytes ?? row.file_size_bytes ?? null,
    sha256: row.sha256 ?? null,
    contentHash: row.contentHash ?? row.content_hash ?? null,
    pdfVersionId: row.pdfVersionId ?? row.pdf_version_id ?? null,
    sourceVersionId: row.sourceVersionId ?? row.source_version_id ?? null,
    isCurrent: Boolean(row.isCurrent ?? row.is_current),
    isLocked: Boolean(row.isLocked ?? row.is_locked),
    lockedBy: row.lockedBy ?? row.locked_by ?? null,
    lockedUntil: row.lockedUntil ?? row.locked_until ?? null,
    editorProvider: row.editorProvider ?? row.editor_provider ?? null,
    editorSessionId: row.editorSessionId ?? row.editor_session_id ?? null,
    editorSchemaVersion: row.editorSchemaVersion ?? row.editor_schema_version ?? null,
    metadata: parseMetadata(row.metadataJson ?? row.metadata_json),
    createdBy: row.createdBy ?? row.created_by ?? null,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    validatedBy: row.validatedBy ?? row.validated_by ?? null,
    validatedAt: row.validatedAt ?? row.validated_at ?? null,
    rejectedBy: row.rejectedBy ?? row.rejected_by ?? null,
    rejectedAt: row.rejectedAt ?? row.rejected_at ?? null,
    rejectionReason: row.rejectionReason ?? row.rejection_reason ?? null,
  };
};

export const getNextVersionNumber = async (dossierId, docKey) => {
  if (hasPostgres) {
    const result = await query(
      'SELECT COALESCE(MAX(version_number), 0) AS max_version FROM document_versions WHERE dossier_id = $1 AND doc_key = $2',
      [dossierId, docKey],
    );
    return Number(result.rows[0]?.max_version || 0) + 1;
  }
  const row = sqlite.prepare(
    'SELECT COALESCE(MAX(version_number), 0) AS maxVersion FROM document_versions WHERE dossier_id = ? AND doc_key = ?',
  ).get(dossierId, docKey);
  return Number(row?.maxVersion || 0) + 1;
};

const clearCurrentFlags = async (dossierId, docKey) => {
  const timestamp = nowIso();
  if (hasPostgres) {
    await query(
      'UPDATE document_versions SET is_current = 0, updated_at = $3 WHERE dossier_id = $1 AND doc_key = $2 AND is_current = 1',
      [dossierId, docKey, timestamp],
    );
    return;
  }
  sqlite.prepare(
    'UPDATE document_versions SET is_current = 0, updated_at = ? WHERE dossier_id = ? AND doc_key = ? AND is_current = 1',
  ).run(timestamp, dossierId, docKey);
};

export const createVersion = async ({
  dossierId,
  docKey,
  documentId = null,
  origin,
  status = 'draft',
  fileFormat,
  mimeType = null,
  storageUrl,
  storageKey = null,
  fileSizeBytes = null,
  sha256 = null,
  contentHash = null,
  parentVersionId = null,
  pdfVersionId = null,
  sourceVersionId = null,
  editorProvider = null,
  editorSessionId = null,
  editorSchemaVersion = null,
  metadata = {},
  createdBy = null,
  markCurrent = true,
}) => {
  const versionNumber = await getNextVersionNumber(dossierId, docKey);
  const timestamp = nowIso();
  const version = {
    id: randomUUID(),
    dossierId,
    docKey,
    documentId,
    versionNumber,
    parentVersionId,
    origin,
    status,
    fileFormat,
    mimeType,
    storageUrl,
    storageKey,
    fileSizeBytes,
    sha256,
    contentHash: contentHash || sha256,
    pdfVersionId,
    sourceVersionId,
    isCurrent: markCurrent,
    isLocked: false,
    lockedBy: null,
    lockedUntil: null,
    editorProvider,
    editorSessionId,
    editorSchemaVersion,
    metadata,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    validatedBy: null,
    validatedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  };

  if (markCurrent) {
    await clearCurrentFlags(dossierId, docKey);
  }

  if (hasPostgres) {
    await query(`
      INSERT INTO document_versions (
        id, dossier_id, doc_key, document_id, version_number, parent_version_id,
        origin, status, file_format, mime_type, storage_url, storage_key,
        file_size_bytes, sha256, content_hash, pdf_version_id, source_version_id,
        is_current, is_locked, locked_by, locked_until, editor_provider,
        editor_session_id, editor_schema_version, metadata_json, created_by,
        created_at, updated_at, validated_by, validated_at, rejected_by,
        rejected_at, rejection_reason
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
      )
    `, [
      version.id,
      version.dossierId,
      version.docKey,
      version.documentId,
      version.versionNumber,
      version.parentVersionId,
      version.origin,
      version.status,
      version.fileFormat,
      version.mimeType,
      version.storageUrl,
      version.storageKey,
      version.fileSizeBytes,
      version.sha256,
      version.contentHash,
      version.pdfVersionId,
      version.sourceVersionId,
      toFlagInt(version.isCurrent),
      toFlagInt(version.isLocked),
      version.lockedBy,
      version.lockedUntil,
      version.editorProvider,
      version.editorSessionId,
      version.editorSchemaVersion,
      JSON.stringify(version.metadata || {}),
      version.createdBy,
      version.createdAt,
      version.updatedAt,
      version.validatedBy,
      version.validatedAt,
      version.rejectedBy,
      version.rejectedAt,
      version.rejectionReason,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO document_versions (
        id, dossier_id, doc_key, document_id, version_number, parent_version_id,
        origin, status, file_format, mime_type, storage_url, storage_key,
        file_size_bytes, sha256, content_hash, pdf_version_id, source_version_id,
        is_current, is_locked, locked_by, locked_until, editor_provider,
        editor_session_id, editor_schema_version, metadata_json, created_by,
        created_at, updated_at, validated_by, validated_at, rejected_by,
        rejected_at, rejection_reason
      ) VALUES (
        @id, @dossierId, @docKey, @documentId, @versionNumber, @parentVersionId,
        @origin, @status, @fileFormat, @mimeType, @storageUrl, @storageKey,
        @fileSizeBytes, @sha256, @contentHash, @pdfVersionId, @sourceVersionId,
        @isCurrent, @isLocked, @lockedBy, @lockedUntil, @editorProvider,
        @editorSessionId, @editorSchemaVersion, @metadataJson, @createdBy,
        @createdAt, @updatedAt, @validatedBy, @validatedAt, @rejectedBy,
        @rejectedAt, @rejectionReason
      )
    `).run({
      ...version,
      isCurrent: version.isCurrent ? 1 : 0,
      isLocked: version.isLocked ? 1 : 0,
      metadataJson: JSON.stringify(version.metadata || {}),
    });
  }

  return version;
};

const fetchCurrentVersion = async (dossierId, docKey) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        doc_key AS "docKey",
        document_id AS "documentId",
        version_number AS "versionNumber",
        parent_version_id AS "parentVersionId",
        origin,
        status,
        file_format AS "fileFormat",
        mime_type AS "mimeType",
        storage_url AS "storageUrl",
        storage_key AS "storageKey",
        file_size_bytes AS "fileSizeBytes",
        sha256,
        content_hash AS "contentHash",
        pdf_version_id AS "pdfVersionId",
        source_version_id AS "sourceVersionId",
        is_current AS "isCurrent",
        is_locked AS "isLocked",
        locked_by AS "lockedBy",
        locked_until AS "lockedUntil",
        editor_provider AS "editorProvider",
        editor_session_id AS "editorSessionId",
        editor_schema_version AS "editorSchemaVersion",
        metadata_json AS "metadataJson",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        validated_by AS "validatedBy",
        validated_at AS "validatedAt",
        rejected_by AS "rejectedBy",
        rejected_at AS "rejectedAt",
        rejection_reason AS "rejectionReason"
      FROM document_versions
      WHERE dossier_id = $1 AND doc_key = $2 AND is_current = 1
      ORDER BY version_number DESC
      LIMIT 1
    `, [dossierId, docKey]);
    return mapVersionRow(result.rows[0]);
  }
  const row = sqlite.prepare(`
    SELECT *
    FROM document_versions
    WHERE dossier_id = ? AND doc_key = ? AND is_current = 1
    ORDER BY version_number DESC
    LIMIT 1
  `).get(dossierId, docKey);
  return mapVersionRow(row);
};

export const getCurrentVersion = fetchCurrentVersion;

export const getVersionById = async (versionId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        doc_key AS "docKey",
        document_id AS "documentId",
        version_number AS "versionNumber",
        parent_version_id AS "parentVersionId",
        origin,
        status,
        file_format AS "fileFormat",
        mime_type AS "mimeType",
        storage_url AS "storageUrl",
        storage_key AS "storageKey",
        file_size_bytes AS "fileSizeBytes",
        sha256,
        content_hash AS "contentHash",
        pdf_version_id AS "pdfVersionId",
        source_version_id AS "sourceVersionId",
        is_current AS "isCurrent",
        is_locked AS "isLocked",
        locked_by AS "lockedBy",
        locked_until AS "lockedUntil",
        editor_provider AS "editorProvider",
        editor_session_id AS "editorSessionId",
        editor_schema_version AS "editorSchemaVersion",
        metadata_json AS "metadataJson",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        validated_by AS "validatedBy",
        validated_at AS "validatedAt",
        rejected_by AS "rejectedBy",
        rejected_at AS "rejectedAt",
        rejection_reason AS "rejectionReason"
      FROM document_versions
      WHERE id = $1
      LIMIT 1
    `, [versionId]);
    return mapVersionRow(result.rows[0]);
  }
  const row = sqlite.prepare('SELECT * FROM document_versions WHERE id = ? LIMIT 1').get(versionId);
  return mapVersionRow(row);
};

export const getCurrentPdfVersion = async (dossierId, docKey) => {
  const current = await fetchCurrentVersion(dossierId, docKey);
  if (!current) return null;
  if (current.fileFormat === 'pdf') return current;
  if (!current.pdfVersionId) return null;
  return getVersionById(current.pdfVersionId);
};

export const listVersions = async (dossierId, docKey, { limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        doc_key AS "docKey",
        document_id AS "documentId",
        version_number AS "versionNumber",
        parent_version_id AS "parentVersionId",
        origin,
        status,
        file_format AS "fileFormat",
        mime_type AS "mimeType",
        storage_url AS "storageUrl",
        storage_key AS "storageKey",
        file_size_bytes AS "fileSizeBytes",
        sha256,
        content_hash AS "contentHash",
        pdf_version_id AS "pdfVersionId",
        source_version_id AS "sourceVersionId",
        is_current AS "isCurrent",
        is_locked AS "isLocked",
        locked_by AS "lockedBy",
        locked_until AS "lockedUntil",
        editor_provider AS "editorProvider",
        editor_session_id AS "editorSessionId",
        editor_schema_version AS "editorSchemaVersion",
        metadata_json AS "metadataJson",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        validated_by AS "validatedBy",
        validated_at AS "validatedAt",
        rejected_by AS "rejectedBy",
        rejected_at AS "rejectedAt",
        rejection_reason AS "rejectionReason"
      FROM document_versions
      WHERE dossier_id = $1 AND doc_key = $2
      ORDER BY version_number DESC
      LIMIT $3
    `, [dossierId, docKey, safeLimit]);
    return result.rows.map(mapVersionRow);
  }
  return sqlite.prepare(`
    SELECT *
    FROM document_versions
    WHERE dossier_id = ? AND doc_key = ?
    ORDER BY version_number DESC
    LIMIT ?
  `).all(dossierId, docKey, safeLimit).map(mapVersionRow);
};

export const linkPdfVersionToDocx = async (docxVersionId, pdfVersionId) => {
  if (!docxVersionId || !pdfVersionId) return;
  const timestamp = nowIso();
  if (hasPostgres) {
    await query(
      'UPDATE document_versions SET pdf_version_id = $2, updated_at = $3 WHERE id = $1',
      [docxVersionId, pdfVersionId, timestamp],
    );
    return;
  }
  sqlite.prepare(
    'UPDATE document_versions SET pdf_version_id = ?, updated_at = ? WHERE id = ?',
  ).run(pdfVersionId, timestamp, docxVersionId);
};

export const syncDocumentVersionPointers = async ({
  dossierId,
  docKey,
  versionId,
  pdfVersionId = null,
  lastFreeEditAt = null,
}) => {
  const timestamp = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE documents
      SET
        current_version_id = $3,
        current_pdf_version_id = COALESCE($4, current_pdf_version_id),
        last_free_edit_at = COALESCE($5, last_free_edit_at),
        updated_at = $6
      WHERE dossier_id = $1 AND doc_key = $2
    `, [dossierId, docKey, versionId, pdfVersionId, lastFreeEditAt, timestamp]);
    return;
  }
  sqlite.prepare(`
    UPDATE documents
    SET
      current_version_id = @versionId,
      current_pdf_version_id = COALESCE(@pdfVersionId, current_pdf_version_id),
      last_free_edit_at = COALESCE(@lastFreeEditAt, last_free_edit_at),
      updated_at = @updatedAt
    WHERE dossier_id = @dossierId AND doc_key = @docKey
  `).run({
    dossierId,
    docKey,
    versionId,
    pdfVersionId,
    lastFreeEditAt,
    updatedAt: timestamp,
  });
};

export const createVersionFromEditorSave = async ({
  dossierId,
  docKey,
  document,
  storageUrl,
  sha256,
  fileSizeBytes = null,
  mimeType = 'application/pdf',
  fileFormat = 'pdf',
  origin = 'editor_form',
  editorProvider = 'internal',
  createdBy = null,
  metadata = {},
  pdfVersionId = null,
}) => {
  const parentVersion = await fetchCurrentVersion(dossierId, docKey);
  const normalizedFormat = String(fileFormat || 'pdf').toLowerCase();
  const resolvedPdfVersionId = pdfVersionId
    || (normalizedFormat === 'pdf'
      ? null
      : parentVersion?.pdfVersionId || (parentVersion?.fileFormat === 'pdf' ? parentVersion.id : null));

  const version = await createVersion({
    dossierId,
    docKey,
    documentId: document?.id || null,
    origin,
    status: 'draft',
    fileFormat: normalizedFormat,
    mimeType,
    storageUrl,
    fileSizeBytes,
    sha256,
    parentVersionId: parentVersion?.id || null,
    pdfVersionId: normalizedFormat === 'pdf' ? null : resolvedPdfVersionId,
    editorProvider,
    metadata: {
      ...(parentVersion?.metadata || {}),
      ...metadata,
    },
    createdBy,
    markCurrent: true,
  });

  const nextPdfVersionId = normalizedFormat === 'pdf' ? version.id : resolvedPdfVersionId;
  await syncDocumentVersionPointers({
    dossierId,
    docKey,
    versionId: version.id,
    pdfVersionId: nextPdfVersionId,
    lastFreeEditAt: nowIso(),
  });

  if (normalizedFormat === 'pdf' && version.pdfVersionId !== version.id) {
    if (hasPostgres) {
      await query(
        'UPDATE document_versions SET pdf_version_id = $2, updated_at = $3 WHERE id = $1',
        [version.id, version.id, nowIso()],
      );
    } else {
      sqlite.prepare(
        'UPDATE document_versions SET pdf_version_id = ?, updated_at = ? WHERE id = ?',
      ).run(version.id, nowIso(), version.id);
    }
    version.pdfVersionId = version.id;
  }

  return version;
};

export const hashAccessToken = (token, secret = process.env.JWT_SECRET || 'greffio-dev') => (
  createHash('sha256').update(`${token}:${secret}`).digest('hex')
);
