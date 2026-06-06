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

export const getIdentityVerificationStatus = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/identity/status/${encodeURIComponent(dossierId)}`, {
    headers: { Authorization: `Bearer ${authToken()}` },
  });
  return parseResponse(response);
};

export const startIdentityVerification = async (dossierId, { docKey = 'identity_proof' } = {}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/identity/start/${encodeURIComponent(dossierId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ docKey }),
  });
  return parseResponse(response);
};

export const refreshIdentityVerification = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/identity/refresh/${encodeURIComponent(dossierId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken()}` },
  });
  return parseResponse(response);
};
