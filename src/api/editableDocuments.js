import { apiPost } from '@/api/client.js';
import { getDossierDocumentEditor, saveDossierDocumentEditor } from '@/api/documents.js';

export const loadEditableDocumentEditor = (dossierId, docKey) => getDossierDocumentEditor({
  dossierId,
  docKey,
});

export const saveEditableDocumentDraft = (dossierId, docKey, fields) => saveDossierDocumentEditor({
  dossierId,
  docKey,
  fields,
});

export const sendEditableDocumentSignatureRequest = async (dossierId, docKey, payload) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/send-signature`,
  payload,
);

export const signEditableDocumentNow = async (dossierId, docKey, payload) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/sign-now`,
  payload,
);
