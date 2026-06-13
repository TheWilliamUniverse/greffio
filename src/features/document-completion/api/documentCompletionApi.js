import { apiDelete, apiGet, apiPost } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const buildApiError = (payload, fallback = 'DOCUMENT_COMPLETION_FAILED') => {
  const error = new Error(payload?.message || payload?.error || fallback);
  error.code = payload?.error || fallback;
  error.payload = payload;
  return error;
};

export const uploadDocumentForCompletion = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const payload = await apiPost('/api/document-completion/documents', formData);
  if (!payload?.ok) throw buildApiError(payload, 'UPLOAD_FAILED');
  return {
    documentId: payload.documentId,
    status: payload.status,
    document: payload.document,
  };
};

export const getDocumentCompletionStatus = async (documentId) => {
  const payload = await apiGet(`/api/document-completion/documents/${documentId}/status`);
  if (!payload?.ok) throw buildApiError(payload, 'NOT_FOUND');
  return payload;
};

export const getDocumentCompletionDetail = async (documentId) => {
  const payload = await apiGet(`/api/document-completion/documents/${documentId}`);
  if (!payload?.ok) throw buildApiError(payload, 'NOT_FOUND');
  return payload;
};

export const exportDocumentCompletionPdf = async (documentId) => {
  const payload = await apiPost(`/api/document-completion/documents/${documentId}/export`, {});
  if (!payload?.ok) throw buildApiError(payload, 'EXPORT_FAILED');
  return payload;
};

export const reanalyzeDocumentCompletion = async (documentId) => {
  const payload = await apiPost(`/api/document-completion/documents/${documentId}/analyze`, {});
  if (!payload?.ok) throw buildApiError(payload, 'PDF_PARSE_FAILED');
  return payload;
};

export const deleteDocumentCompletion = async (documentId) => {
  const payload = await apiDelete(`/api/document-completion/documents/${documentId}`);
  if (!payload?.ok) throw buildApiError(payload, 'NOT_FOUND');
  return payload;
};

export const downloadCompletedDocument = async (documentId, fileName) => {
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
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document-a-completer.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return blob;
};
