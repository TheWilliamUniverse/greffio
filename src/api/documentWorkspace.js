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
