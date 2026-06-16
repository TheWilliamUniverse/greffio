import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  createDocumentVerifyToken,
  recordDocumentHashAfterSignature,
  recordDocumentHashBeforeSignature,
} from './documentIntegrityService.js';
import {
  deleteDocumentFromConfiguredStorage,
  uploadDocumentToConfiguredStorage,
} from './objectStorage.js';

export const persistEditableDocumentPdf = async ({
  docKey,
  schemaVersion,
  dossier,
  fields,
  generatePdf,
  filenamePrefix,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  status = null,
  metadataExtra = {},
}) => {
  await ensureDossierDocuments(dossier.id);
  const documents = await listDossierDocuments(dossier.id);
  const existing = documents.find((item) => item.docKey === docKey);
  const previousStorageUrl = existing?.storageUrl || null;

  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${filenamePrefix}_${safeReference}_${Date.now()}.pdf`;
  const documentId = existing?.id || null;
  const { raw: verifyToken, hash: verifyTokenHash } = createDocumentVerifyToken();

  const pdfPath = await generatePdf({
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
    docKey,
    buffer,
    originalFilename: filename,
    mimeType: 'application/pdf',
    localFilePath: pdfPath,
  });

  const updated = await updateDossierDocument({
    dossierId: dossier.id,
    docKey,
    status: status || DOCUMENT_STATUSES.UPLOADED,
    filename,
    fileSizeBytes: buffer.length,
    mimeType: 'application/pdf',
    storageUrl: uploadResult.storageUrl,
    fileUrl: uploadResult.storageUrl,
    sha256,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      editorSchemaVersion: schemaVersion,
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
      console.error(`${docKey}_STORAGE_DELETE_FAILED`, deleteError);
    }
  }

  return { pdfPath, buffer, sha256, updated, filename, storageUrl: uploadResult.storageUrl, verifyToken, documentId: updated?.id || documentId };
};

export const persistSignedEditableDocumentPdf = async ({
  docKey,
  schemaVersion,
  dossier,
  signedLocalPath,
  fields,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  metadataExtra = {},
}) => {
  const documents = await listDossierDocuments(dossier.id);
  const existing = documents.find((item) => item.docKey === docKey);
  const previousStorageUrl = existing?.storageUrl || null;
  const buffer = fs.readFileSync(signedLocalPath);
  const sha256Signed = createHash('sha256').update(buffer).digest('hex');
  const filename = signedLocalPath.split(/[/\\]/).pop() || `${docKey}_signed_${Date.now()}.pdf`;

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: dossier.id,
    docKey,
    buffer,
    originalFilename: filename,
    mimeType: 'application/pdf',
    localFilePath: signedLocalPath,
  });

  const updated = await updateDossierDocument({
    dossierId: dossier.id,
    docKey,
    status: DOCUMENT_STATUSES.VALID,
    filename,
    fileSizeBytes: buffer.length,
    mimeType: 'application/pdf',
    storageUrl: uploadResult.storageUrl,
    fileUrl: uploadResult.storageUrl,
    sha256: sha256Signed,
    metadata: {
      ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
      editorSchemaVersion: schemaVersion,
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
      console.error(`${docKey}_SIGNED_STORAGE_DELETE_FAILED`, deleteError);
    }
  }

  return { sha256Signed, updated };
};
