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

export const getOpsDossiers = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsDossiersRisk = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers-risk`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsPayments = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/payments`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getOpsDossierDetail = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/detail`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const updateOpsAssignment = async ({
  dossierId,
  assignedToUserId,
  opsQueue,
  opsPriority,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/assignment`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      assignedToUserId,
      opsQueue,
      opsPriority,
    }),
  });
  return parseResponse(response);
};

export const getOpsNotes = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/notes`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const createOpsNote = async ({
  dossierId,
  note,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/ops/dossiers/${dossierId}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ note }),
  });
  return parseResponse(response);
};
