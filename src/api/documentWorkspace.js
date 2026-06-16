import { apiGet, apiPost } from '@/api/client.js';

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

export const submitStatutesWorkflowAction = (dossierId, action) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/signed_statutes/workflow`,
  { action },
);

export const getOnlyOfficeConfig = (dossierId, docKey, { sessionId, token }) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/onlyoffice-config?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`,
);
