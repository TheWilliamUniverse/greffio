import { listDossierDocuments, updateDossierDocument } from './store.js';

const getDocumentsForDossier = async (dossierId) => listDossierDocuments(dossierId);

const reviewDossierDocument = async ({
  dossierId,
  docKey,
  status,
  reviewerId,
  rejectedReason = null,
  filename = null,
  fileSizeBytes = null,
  mimeType = null,
  storageUrl = null,
}) => updateDossierDocument({
  dossierId,
  docKey,
  status,
  reviewerId,
  rejectedReason,
  filename,
  fileSizeBytes,
  mimeType,
  storageUrl,
});

export {
  getDocumentsForDossier,
  reviewDossierDocument,
};
