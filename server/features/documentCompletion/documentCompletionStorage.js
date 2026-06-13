import {
  deleteDocumentFromConfiguredStorage,
  downloadDocumentBufferFromConfiguredStorage,
  uploadDocumentToConfiguredStorage,
} from '../../services/objectStorage.js';
import { documentCompletionConfig } from './config.js';

const sanitizeFilename = (name) => String(name || 'document.pdf')
  .replace(/[^a-zA-Z0-9._-àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ ]/g, '_')
  .trim() || 'document.pdf';

export const uploadOriginalDocument = async ({ userId, buffer, originalFilename, mimeType }) => {
  const safeName = sanitizeFilename(originalFilename);
  const uploaded = await uploadDocumentToConfiguredStorage({
    dossierId: `${documentCompletionConfig.storagePrefix}/${userId}`,
    docKey: documentCompletionConfig.storageDocKey,
    buffer,
    originalFilename: safeName,
    mimeType: mimeType || 'application/pdf',
  });
  return {
    storageDriver: uploaded.storageProvider,
    storagePath: uploaded.storageUrl,
    fileName: safeName,
  };
};

export const uploadGeneratedDocument = async ({ userId, documentId, buffer, fileName }) => {
  const safeName = sanitizeFilename(fileName);
  const uploaded = await uploadDocumentToConfiguredStorage({
    dossierId: `${documentCompletionConfig.storagePrefix}/${userId}/${documentId}`,
    docKey: `${documentCompletionConfig.storageDocKey}_generated`,
    buffer,
    originalFilename: safeName,
    mimeType: 'application/pdf',
    targetFilename: safeName,
  });
  return {
    storageDriver: uploaded.storageProvider,
    storagePath: uploaded.storageUrl,
    fileName: safeName,
    sizeBytes: buffer.length,
  };
};

export const downloadOriginalDocumentBuffer = async (storagePath) => (
  downloadDocumentBufferFromConfiguredStorage(storagePath)
);

export const downloadGeneratedDocumentBuffer = async (storagePath) => (
  downloadDocumentBufferFromConfiguredStorage(storagePath)
);

export const deleteStoredDocuments = async ({ originalPath, generatedPath }) => {
  const results = [];
  if (originalPath) results.push(await deleteDocumentFromConfiguredStorage(originalPath));
  if (generatedPath) results.push(await deleteDocumentFromConfiguredStorage(generatedPath));
  return results;
};

export const buildGeneratedFilename = (originalName) => {
  const base = String(originalName || 'document.pdf').replace(/\.pdf$/i, '');
  return `${base}-greffio-completion.pdf`;
};
