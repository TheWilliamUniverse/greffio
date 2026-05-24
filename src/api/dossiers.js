import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

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

export const createDossier = async ({ userId, companyName, legalForm, service }) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userId: userId || null,
      companyName,
      legalForm,
      service,
    }),
  });
  return parseResponse(response);
};

export const listDossiers = async () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const getDossierById = async (dossierId) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const fetchDossierDetail = async (dossierId, { allowOpsFallback = false } = {}) => {
  try {
    return await getDossierById(dossierId);
  } catch (error) {
    if (!allowOpsFallback || ![403, 404].includes(Number(error?.status))) {
      throw error;
    }
    const { getOpsDossierDetail } = await import('./ops.js');
    return getOpsDossierDetail(dossierId);
  }
};
