import {
  createDocumentCompletionRecord,
  deleteDocumentCompletionRecord,
  getDocumentCompletionById,
  listDocumentCompletionByUser,
  listDocumentCompletionFields,
  replaceDocumentCompletionFields,
  updateDocumentCompletionRecord,
} from '../../documentCompletionStore.js';
import {
  buildGeneratedFilename,
  deleteStoredDocuments,
  downloadGeneratedDocumentBuffer,
  downloadOriginalDocumentBuffer,
  uploadGeneratedDocument,
  uploadOriginalDocument,
} from './documentCompletionStorage.js';
import { analyzeDocumentForCompletion } from './analysis/analyzeDocument.js';
import { generateFillableCompletionPdf } from './export/generateFillablePdf.js';
import { documentCompletionConfig } from './config.js';

const nowIso = () => new Date().toISOString();

const assertDocumentAccess = async (documentId, userId) => {
  const document = await getDocumentCompletionById(documentId);
  if (!document) return { ok: false, status: 404, error: 'NOT_FOUND' };
  if (document.userId !== userId) return { ok: false, status: 403, error: 'UNAUTHORIZED' };
  return { ok: true, document };
};

export const enqueueDocumentCompletionAnalysis = async (documentId) => {
  setImmediate(() => {
    runDocumentAnalysisJob(documentId).catch((error) => {
      console.error('DOCUMENT_COMPLETION_ANALYSIS_FAILED', documentId, error?.message || error);
    });
  });
};

export const runDocumentAnalysisJob = async (documentId) => {
  const document = await getDocumentCompletionById(documentId);
  if (!document) return null;

  await updateDocumentCompletionRecord(documentId, { status: 'processing' });

  try {
    const pdfBytes = await downloadOriginalDocumentBuffer(document.originalFile.storagePath);
    const analysis = await analyzeDocumentForCompletion({
      documentId,
      pdfBytes,
      fileName: document.originalFile.name,
    });

    await replaceDocumentCompletionFields(documentId, analysis.fields);
    const nextStatus = analysis.fields.some((field) => field.detection.needsHumanReview)
      ? 'needs_review'
      : 'analyzed';

    const updated = await updateDocumentCompletionRecord(documentId, {
      status: nextStatus,
      sourceType: analysis.sourceType,
      pageCount: analysis.metadata.pageCount,
      hasTextLayer: analysis.metadata.hasTextLayer,
      hasExistingFormFields: analysis.metadata.hasExistingFormFields,
      requiresOcr: analysis.metadata.requiresOcr,
      isEncrypted: analysis.metadata.isEncrypted,
      analysisSummary: analysis.analysisSummary,
      warnings: analysis.warnings,
      analyzedAt: nowIso(),
      error: null,
    });

    if (analysis.fields.length > 0) {
      try {
        await exportDocumentCompletion(documentId, document.userId);
      } catch (exportError) {
        console.warn('DOCUMENT_COMPLETION_AUTO_EXPORT_FAILED', documentId, exportError?.message || exportError);
      }
    }

    return updated;
  } catch (error) {
    const code = error?.code || 'PDF_PARSE_FAILED';
    return updateDocumentCompletionRecord(documentId, {
      status: 'failed',
      error: {
        code,
        message: String(error?.message || 'Analyse impossible'),
      },
    });
  }
};

export const uploadDocumentCompletion = async ({ userId, file }) => {
  if (!file?.buffer) {
    throw Object.assign(new Error('INVALID_FILE_TYPE'), { code: 'INVALID_FILE_TYPE' });
  }
  if (file.mimetype !== 'application/pdf') {
    throw Object.assign(new Error('INVALID_FILE_TYPE'), { code: 'INVALID_FILE_TYPE' });
  }
  if (file.size > documentCompletionConfig.maxFileSizeBytes) {
    throw Object.assign(new Error('FILE_TOO_LARGE'), { code: 'FILE_TOO_LARGE' });
  }

  let stored;
  try {
    stored = await uploadOriginalDocument({
      userId,
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
    });
  } catch (error) {
    const raw = String(error?.message || '');
    if (raw.includes('SUPABASE_UPLOAD_FAILED') || raw.includes('S3_UPLOAD_FAILED') || raw.includes('STORAGE')) {
      throw Object.assign(
        new Error('Le document n’a pas pu être enregistré. Réessayez dans quelques instants.'),
        { code: 'STORAGE_FAILED' },
      );
    }
    throw error;
  }

  const record = await createDocumentCompletionRecord({
    userId,
    originalFileName: stored.fileName,
    originalFileMimeType: file.mimetype,
    originalFileSizeBytes: file.size,
    originalStorageDriver: stored.storageDriver,
    originalStoragePath: stored.storagePath,
    status: 'queued',
  });

  await updateDocumentCompletionRecord(record.id, { status: 'queued' });
  enqueueDocumentCompletionAnalysis(record.id);

  return getDocumentCompletionStatus(record.id, userId);
};

export const getDocumentCompletionStatus = async (documentId, userId) => {
  const access = await assertDocumentAccess(documentId, userId);
  if (!access.ok) return access;
  const fields = await listDocumentCompletionFields(documentId);
  return {
    ok: true,
    document: access.document,
    fields,
  };
};

export const exportDocumentCompletion = async (documentId, userId, { force = false } = {}) => {
  const access = await assertDocumentAccess(documentId, userId);
  if (!access.ok) return access;
  const { document } = access;

  if (!force && document.generatedFile?.storagePath && document.status === 'exported') {
    return { ok: true, document, fields: await listDocumentCompletionFields(documentId) };
  }

  await updateDocumentCompletionRecord(documentId, { status: 'exporting' });
  const fields = await listDocumentCompletionFields(documentId);
  const originalBytes = await downloadOriginalDocumentBuffer(document.originalFile.storagePath);
  const generatedBytes = await generateFillableCompletionPdf({
    originalPdfBytes: originalBytes,
    fields,
    options: {
      includeVisualBlueHints: true,
      includeInteractivePdfFields: true,
      flatten: false,
    },
  });

  const generatedName = buildGeneratedFilename(document.originalFile.name);
  const uploaded = await uploadGeneratedDocument({
    userId,
    documentId,
    buffer: Buffer.from(generatedBytes),
    fileName: generatedName,
  });

  const updated = await updateDocumentCompletionRecord(documentId, {
    status: 'exported',
    generatedFile: {
      name: uploaded.fileName,
      mimeType: 'application/pdf',
      sizeBytes: uploaded.sizeBytes,
      storageDriver: uploaded.storageDriver,
      storagePath: uploaded.storagePath,
    },
    exportedAt: nowIso(),
  });

  return { ok: true, document: updated, fields };
};

export const downloadDocumentCompletionFile = async (documentId, userId) => {
  const access = await assertDocumentAccess(documentId, userId);
  if (!access.ok) return access;

  const exportResult = await exportDocumentCompletion(documentId, userId, { force: true });
  if (!exportResult.ok) return exportResult;

  const { document } = exportResult;
  const buffer = await downloadGeneratedDocumentBuffer(document.generatedFile.storagePath);
  return {
    ok: true,
    buffer,
    fileName: document.generatedFile.name,
    mimeType: 'application/pdf',
  };
};

export const deleteDocumentCompletion = async (documentId, userId) => {
  const access = await assertDocumentAccess(documentId, userId);
  if (!access.ok) return access;
  await deleteStoredDocuments({
    originalPath: access.document.originalFile.storagePath,
    generatedPath: access.document.generatedFile?.storagePath,
  });
  await deleteDocumentCompletionRecord(documentId);
  return { ok: true, deleted: true };
};

export const listUserDocumentCompletions = async (userId) => {
  const documents = await listDocumentCompletionByUser(userId, { limit: 20 });
  return { ok: true, documents };
};
