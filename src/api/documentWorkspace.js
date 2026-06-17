import { apiFetch, apiGet, apiPost } from '@/api/client.js';

export const getDocumentWorkspace = (dossierId, docKey) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/workspace`,
);

export const listDocumentVersions = (dossierId, docKey, { limit = 20 } = {}) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/versions?limit=${limit}`,
);

export const createDocumentEditSession = (dossierId, docKey, payload = {}) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/edit/session`,
  payload,
);

export const createFreeEditSession = (dossierId, docKey, payload = {}) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/free-edit/session`,
  payload,
);

export const closeFreeEditSession = (dossierId, docKey, sessionId, payload = {}) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/free-edit/${encodeURIComponent(sessionId)}/close`,
  payload,
);

export const getFreeEditSessionStatus = (dossierId, docKey, sessionId) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/free-edit/${encodeURIComponent(sessionId)}/status`,
);

export const downloadDocumentSourceFile = async ({ dossierId, docKey, format = 'docx' } = {}) => {
  const response = await apiFetch(
    `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/download-source?format=${encodeURIComponent(format)}`,
    { parseJson: false },
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'SOURCE_DOWNLOAD_FAILED');
    error.code = payload?.error || 'SOURCE_DOWNLOAD_FAILED';
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  const contentDisposition = response.headers.get('content-disposition') || '';
  const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = nameMatch?.[1] || `${docKey}.${format}`;
  const blob = await response.blob();
  return { filename, blob };
};

export const submitStatutesWorkflowAction = (dossierId, action) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/signed_statutes/workflow`,
  { action },
);

export const getOnlyOfficeConfig = (dossierId, docKey, { sessionId, token }) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/onlyoffice-config?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`,
);
