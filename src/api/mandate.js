import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

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
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.status = response.status;
  error.payload = payload;
  throw error;
};

export const getMandateState = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/mandate`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const signMandate = async ({
  dossierId,
  signerFullName,
  accepted,
  documentVersion = 'v1',
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/mandate/sign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      signerFullName,
      accepted,
      documentVersion,
    }),
  });
  return parseResponse(response);
};

export const downloadMandatePdf = async (dossierId) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/mandate/pdf`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('MANDATE_PDF_NOT_FOUND');
  }
  const blob = await response.blob();
  return blob;
};
