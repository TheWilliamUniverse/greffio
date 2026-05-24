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
    'Content-Type': 'application/json',
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
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  throw error;
};

export const fetchUserProfile = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/user/profile`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const updateUserProfileApi = async (payload) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/user/profile`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const searchAddresses = async (query) => {
  const q = String(query || '').trim();
  if (q.length < 3) return { ok: true, results: [] };
  const response = await fetch(
    `${runtimeConfig.apiBaseUrl}/api/geo/address-search?q=${encodeURIComponent(q)}`,
    { headers: authHeaders() },
  );
  return parseResponse(response);
};
