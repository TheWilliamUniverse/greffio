import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';
import { getDossierDocumentEditor, saveDossierDocumentEditor } from '@/api/documents.js';

const authHeaders = () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const parseResponse = async (response) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  if (response.ok) {
    if (payload && typeof payload === 'object') return payload;
    const error = new Error('API_ERROR');
    error.code = 'API_ERROR';
    error.status = response.status;
    throw error;
  }
  const code = payload?.error || 'API_ERROR';
  const error = new Error(code);
  error.code = code;
  error.status = response.status;
  error.payload = payload;
  throw error;
};

export const loadEditableDocumentEditor = (dossierId, docKey) => getDossierDocumentEditor({
  dossierId,
  docKey,
});

export const saveEditableDocumentDraft = (dossierId, docKey, fields) => saveDossierDocumentEditor({
  dossierId,
  docKey,
  fields,
});

export const sendEditableDocumentSignatureRequest = async (dossierId, docKey, payload) => {
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/send-signature`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseResponse(response);
};

export const signEditableDocumentNow = async (dossierId, docKey, payload) => {
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/sign-now`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseResponse(response);
};
