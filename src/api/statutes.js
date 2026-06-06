import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const tokenHeaders = (json = true) => {
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

const optionalTokenHeaders = (json = true) => {
  const token = getToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export const fetchStatutesPreviewDraft = async ({ data = {}, answers = {} } = {}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/statutes/preview-draft`, {
    method: 'POST',
    headers: optionalTokenHeaders(true),
    body: JSON.stringify({ data, answers }),
  });
  return parseResponse(response);
};

export const fetchStatutesPreview = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/statutes/preview`, {
    method: 'GET',
    headers: tokenHeaders(false),
  });
  return parseResponse(response);
};

export const generateStatutes = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/statutes/generate`, {
    method: 'POST',
    headers: tokenHeaders(true),
    body: JSON.stringify({}),
  });
  return parseResponse(response);
};

export const listStatutes = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/statutes`, {
    method: 'GET',
    headers: tokenHeaders(false),
  });
  return parseResponse(response);
};

export const downloadStatutesPdf = async (dossierId, { cacheBust = false } = {}) => {
  const query = cacheBust ? `?t=${Date.now()}` : '';
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/statutes/pdf${query}`, {
    method: 'GET',
    headers: tokenHeaders(false),
  });
  if (!response.ok) {
    throw new Error('STATUTES_PDF_NOT_FOUND');
  }
  return response.blob();
};
