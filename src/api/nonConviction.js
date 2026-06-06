import { getDeclarationErrorMessage } from '@/utils/declarationErrors.js';
import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';
import {
  getDossierDocumentEditor,
  saveDossierDocumentEditor,
  getDossierDocumentDownloadUrl,
} from '@/api/documents.js';

const authHeaders = (json = true) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
};

const parseResponse = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.message || payload?.error || 'API_ERROR');
  error.status = response.status;
  error.payload = payload;
  error.code = payload?.error || 'API_ERROR';
  throw error;
};

export const loadNonConvictionEditor = (dossierId) => getDossierDocumentEditor({
  dossierId,
  docKey: 'manager_non_conviction',
});

export const saveNonConvictionDraft = (dossierId, fields) => saveDossierDocumentEditor({
  dossierId,
  docKey: 'manager_non_conviction',
  fields,
});

export const getNonConvictionPreviewUrl = (dossierId) => (
  `${getDossierDocumentDownloadUrl({ dossierId, docKey: 'manager_non_conviction' })}`
);

export const sendNonConvictionSignatureRequest = async (dossierId, { fields, signerEmail, signerFullName }) => {
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/manager_non_conviction/send-signature`,
    {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ fields, signerEmail, signerFullName }),
    },
  );
  return parseResponse(response);
};

export const signNonConvictionNow = async (dossierId, payload) => {
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/manager_non_conviction/sign-now`,
    {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    },
  );
  return parseResponse(response);
};

export const fetchPublicSignatureSession = async (token) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/signature/public/${token}`);
  return parseResponse(response);
};

export const getPublicSignaturePdfUrl = (token) => (
  `${runtimeConfig.apiBaseUrl}/api/signature/public/${token}/pdf`
);

export const submitPublicSignature = async (token, payload) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/signature/public/${token}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};
