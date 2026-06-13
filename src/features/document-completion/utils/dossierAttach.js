import { getToken } from '@/utils/localStorage.js';
import { runtimeConfig } from '@/config/runtime.js';
import { exportDocumentCompletionPdf } from '../api/documentCompletionApi.js';
import { uploadDossierDocument, getDossierDocuments } from '@/api/documents.js';
import { documentHasFile } from '@/utils/documentWorkflow.js';

const buildApiError = (payload, fallback = 'DOCUMENT_COMPLETION_FAILED') => {
  const error = new Error(payload?.message || payload?.error || fallback);
  error.code = payload?.error || fallback;
  error.payload = payload;
  return error;
};

export const fetchCompletedDocumentBlob = async (documentId) => {
  const token = getToken();
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/document-completion/documents/${documentId}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    throw buildApiError(payload, 'DOWNLOAD_FAILED');
  }
  return response.blob();
};

export const pickDossierUploadSlot = (documents = []) => (
  documents.find((item) => !documentHasFile(item) && item.docKey !== 'identity_proof')
  || documents.find((item) => !documentHasFile(item))
  || null
);

export const attachCompletedDocumentToDossier = async ({
  documentId,
  dossierId,
  fileName,
  ownerFirstName = '',
  ownerLastName = '',
}) => {
  await exportDocumentCompletionPdf(documentId);
  const blob = await fetchCompletedDocumentBlob(documentId);
  const documents = await getDossierDocuments(dossierId);
  const slot = pickDossierUploadSlot(documents);
  if (!slot?.docKey) {
    throw new Error('Aucun emplacement document disponible sur ce dossier.');
  }
  const safeName = fileName || 'document-a-completer.pdf';
  const file = new File([blob], safeName, { type: 'application/pdf' });
  return uploadDossierDocument({
    dossierId,
    docKey: slot.docKey,
    file,
    ownerFirstName,
    ownerLastName,
  });
};
