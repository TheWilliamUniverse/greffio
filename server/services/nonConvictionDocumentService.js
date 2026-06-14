import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { generateNonConvictionPdf } from '../pdf/nonConvictionPdf.js';
import {
  createDocumentVerifyToken,
  recordDocumentHashAfterSignature,
  recordDocumentHashBeforeSignature,
} from './documentIntegrityService.js';
import {
  deleteDocumentFromConfiguredStorage,
  uploadDocumentToConfiguredStorage,
} from './objectStorage.js';

export const NON_CONVICTION_DOC_KEY = 'manager_non_conviction';
export const NON_CONVICTION_SCHEMA_VERSION = 'manager_non_conviction_v7';

export const persistNonConvictionPdfForDossier = async ({
  dossier,
  fields,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  status = null,
  metadataExtra = {},
}) => {
  await ensureDossierDocuments(dossier.id);
  const documents = await listDossierDocuments(dossier.id);
  const existing = documents.find((item) => item.docKey === NON_CONVICTION_DOC_KEY);
  const previousStorageUrl = existing?.storageUrl || null;

  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Declaration_non_condamnation_${safeReference}_${Date.now()}.pdf`;
  const documentId = existing?.id || null;
  const { raw: verifyToken, hash: verifyTokenHash } = createDocumentVerifyToken();
  const pdfPath = await generateNonConvictionPdf({
    filename,
    fields,
    documentId,
    verifyToken,
    appUrl: process.env.GREFFIO_APP_URL || process.env.APP_URL || null,
  });
  const buffer = fs.readFileSync(pdfPath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  if (documentId) {
    await recordDocumentHashBeforeSignature({
      documentId,
      buffer,
      verifyTokenHash,
      verifyToken,
    }).catch(() => {});
  }

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: dossier.id,
    docKey: NON_CONVICTION_DOC_KEY,
    buffer,
    originalFilename: filename,
    mimeType: 'application/pdf',
    localFilePath: pdfPath,
  });

  const updated = await updateDossierDocument({
    dossierId: dossier.id,
    docKey: NON_CONVICTION_DOC_KEY,
    status: status || DOCUMENT_STATUSES.UPLOADED,
    filename,
    fileSizeBytes: buffer.length,
    mimeType: 'application/pdf',
    storageUrl: uploadResult.storageUrl,
    fileUrl: uploadResult.storageUrl,
    sha256,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      editorSchemaVersion: NON_CONVICTION_SCHEMA_VERSION,
      fields,
      generatedAt: new Date().toISOString(),
      storageProvider: uploadResult.storageProvider || null,
      ...metadataExtra,
    },
  });

  if (previousStorageUrl && previousStorageUrl !== uploadResult.storageUrl) {
    try {
      await deleteDocumentFromConfiguredStorage(previousStorageUrl);
    } catch (deleteError) {
      console.error('NON_CONVICTION_STORAGE_DELETE_FAILED', deleteError);
    }
  }

  return {
    pdfPath,
    buffer,
    sha256,
    updated,
    filename,
    storageUrl: uploadResult.storageUrl,
    verifyToken,
    documentId: updated?.id || documentId,
  };
};

export const persistSignedNonConvictionPdf = async ({
  dossier,
  signedLocalPath,
  fields,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  metadataExtra = {},
}) => {
  const documents = await listDossierDocuments(dossier.id);
  const existing = documents.find((item) => item.docKey === NON_CONVICTION_DOC_KEY);
  const previousStorageUrl = existing?.storageUrl || null;
  const buffer = fs.readFileSync(signedLocalPath);
  const sha256Signed = createHash('sha256').update(buffer).digest('hex');
  const filename = signedLocalPath.split(/[/\\]/).pop() || `Declaration_non_condamnation_signed_${Date.now()}.pdf`;

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: dossier.id,
    docKey: NON_CONVICTION_DOC_KEY,
    buffer,
    originalFilename: filename,
    mimeType: 'application/pdf',
    localFilePath: signedLocalPath,
  });

  const updated = await updateDossierDocument({
    dossierId: dossier.id,
    docKey: NON_CONVICTION_DOC_KEY,
    status: DOCUMENT_STATUSES.VALID,
    filename,
    fileSizeBytes: buffer.length,
    mimeType: 'application/pdf',
    storageUrl: uploadResult.storageUrl,
    fileUrl: uploadResult.storageUrl,
    sha256: sha256Signed,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      editorSchemaVersion: NON_CONVICTION_SCHEMA_VERSION,
      declarationStatus: 'signed',
      fields,
      storageProvider: uploadResult.storageProvider || null,
      ...metadataExtra,
    },
  });

  if (existing?.id) {
    await recordDocumentHashAfterSignature({
      documentId: existing.id,
      buffer,
    }).catch(() => {});
  }

  if (previousStorageUrl && previousStorageUrl !== uploadResult.storageUrl) {
    try {
      await deleteDocumentFromConfiguredStorage(previousStorageUrl);
    } catch (deleteError) {
      console.error('NON_CONVICTION_SIGNED_STORAGE_DELETE_FAILED', deleteError);
    }
  }

  return { updated, sha256Signed, storageUrl: uploadResult.storageUrl, filename };
};
