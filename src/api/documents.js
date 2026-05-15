import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const authToken = () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return token;
};

const parseResponse = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  throw error;
};

export const uploadDossierDocument = async ({
  dossierId,
  docKey,
  file,
  ownerFirstName,
  ownerLastName,
}) => {
  const formData = new FormData();
  formData.append('docKey', docKey);
  formData.append('ownerFirstName', ownerFirstName || '');
  formData.append('ownerLastName', ownerLastName || '');
  formData.append('file', file);

  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken()}`,
    },
    body: formData,
  });
  return parseResponse(response);
};

export const getDossierDocuments = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken()}`,
    },
  });
  const payload = await parseResponse(response);
  return payload.documents || [];
};
