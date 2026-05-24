import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const authHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseApi = async (response) => {
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

export const fetchMfaStatus = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/status`, {
    headers: authHeaders(),
  });
  return parseApi(response);
};

export const setupTotp = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/totp/setup`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseApi(response);
};

export const enableTotp = async ({ code }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/totp/enable`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
  return parseApi(response);
};

export const disableTotp = async ({ password, code }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/totp/disable`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ password, code }),
  });
  return parseApi(response);
};

export const regenerateRecoveryCodes = async ({ password, code }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/recovery-codes/regenerate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ password, code }),
  });
  return parseApi(response);
};

export const verifyMfaLogin = async ({ mfaToken, code, recoveryCode }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken, code, recoveryCode }),
  });
  return parseApi(response);
};
