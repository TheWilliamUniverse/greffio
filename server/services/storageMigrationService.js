import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { hasPostgres, query } from '../dbClient.js';
import { updateDossierDocument } from '../store.js';
import {
  objectStorageConfig,
  uploadDocumentToConfiguredStorage,
} from './objectStorage.js';
import { isS3Configured } from './s3StorageService.js';

const uploadsRoot = () => path.resolve(process.cwd(), 'server', 'data');

export const isRemoteStorageUrl = (storageUrl) => {
  const source = String(storageUrl || '').trim();
  return source.startsWith('s3://') || source.startsWith('supabase://');
};

export const isSafeLocalUploadPath = (filePath) => {
  if (!filePath) return false;
  const normalizedRoot = uploadsRoot();
  const normalizedCandidate = path.resolve(String(filePath));
  return normalizedCandidate.startsWith(normalizedRoot);
};

const parseMetadata = (metadataJson) => {
  if (!metadataJson) return {};
  if (typeof metadataJson === 'object') return metadataJson;
  try {
    return JSON.parse(metadataJson);
  } catch (_error) {
    return {};
  }
};

export const listDocumentsWithLocalStorage = async () => {
  if (!hasPostgres) return [];
  const result = await query(`
    SELECT
      id,
      dossier_id AS "dossierId",
      doc_key AS "docKey",
      status,
      filename,
      mime_type AS "mimeType",
      storage_url AS "storageUrl",
      metadata_json AS "metadataJson"
    FROM documents
    WHERE storage_url IS NOT NULL
      AND storage_url NOT LIKE 's3://%'
      AND storage_url NOT LIKE 'supabase://%'
    ORDER BY updated_at ASC
  `);
  return result.rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadataJson),
  }));
};

export const countDocumentsWithLocalStorage = async () => {
  const rows = await listDocumentsWithLocalStorage();
  return rows.length;
};

export const migrateDocumentStorageToS3 = async (document, { dryRun = false } = {}) => {
  if (objectStorageConfig.driver !== 's3' || !isS3Configured()) {
    return { ok: false, skipped: true, reason: 'S3_NOT_ACTIVE' };
  }

  const localPath = String(document.storageUrl || '').trim();
  if (!localPath || isRemoteStorageUrl(localPath)) {
    return { ok: false, skipped: true, reason: 'NOT_LOCAL_STORAGE' };
  }
  if (!isSafeLocalUploadPath(localPath)) {
    return { ok: false, skipped: true, reason: 'UNSAFE_LOCAL_PATH' };
  }

  let buffer;
  try {
    buffer = await fs.readFile(localPath);
  } catch (_error) {
    return { ok: false, skipped: true, reason: 'LOCAL_FILE_MISSING', localPath };
  }

  const originalFilename = document.filename || path.basename(localPath);
  const mimeType = document.mimeType || 'application/pdf';

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      dossierId: document.dossierId,
      docKey: document.docKey,
      localPath,
    };
  }

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: document.dossierId,
    docKey: document.docKey,
    buffer,
    originalFilename,
    mimeType,
    localFilePath: localPath,
  });

  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const migratedAt = new Date().toISOString();
  const nextMetadata = {
    ...(document.metadata || {}),
    storageProvider: uploadResult.storageProvider || 's3',
    migratedFromLocalPath: localPath,
    migratedToS3At: migratedAt,
    storageUploadWarning: null,
  };

  await updateDossierDocument({
    dossierId: document.dossierId,
    docKey: document.docKey,
    status: document.status,
    filename: document.filename || originalFilename,
    fileSizeBytes: buffer.length,
    mimeType,
    storageUrl: uploadResult.storageUrl,
    fileUrl: uploadResult.storageUrl,
    sha256,
    metadata: nextMetadata,
  });

  try {
    await fs.unlink(localPath);
  } catch (_error) {
    // Non bloquant : le fichier S3 est la source de vérité.
  }

  return {
    ok: true,
    migrated: true,
    dossierId: document.dossierId,
    docKey: document.docKey,
    storageUrl: uploadResult.storageUrl,
  };
};

export const migrateAllLocalDocumentsToS3 = async ({ dryRun = false, limit = 200 } = {}) => {
  const documents = await listDocumentsWithLocalStorage();
  const slice = documents.slice(0, Math.max(1, limit));
  const summary = {
    ok: true,
    dryRun,
    scanned: documents.length,
    processed: slice.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    missingFile: 0,
    results: [],
  };

  for (const document of slice) {
    try {
      const result = await migrateDocumentStorageToS3(document, { dryRun });
      summary.results.push(result);
      if (result.migrated || result.dryRun) summary.migrated += 1;
      else if (result.reason === 'LOCAL_FILE_MISSING') summary.missingFile += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        ok: false,
        dossierId: document.dossierId,
        docKey: document.docKey,
        error: error?.message || 'MIGRATION_FAILED',
      });
    }
  }

  return summary;
};
