import { runtimeConfig } from '@/config/runtime.js';

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

export const getCredentialsUnlockMeta = async (token) => {
  const params = new URLSearchParams({ token });
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/public/credentials-unlock?${params.toString()}`);
  return parseResponse(response);
};

export const verifyCredentialsUnlock = async ({ token, code }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/public/credentials-unlock/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, code }),
  });
  return parseResponse(response);
};
