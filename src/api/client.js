import { runtimeConfig } from '@/config/runtime.js';
import { getRefreshToken, getToken, saveRefreshToken, saveToken } from '@/utils/localStorage.js';
import { refreshAccessToken } from '@/api/auth.js';

let refreshPromise = null;
let onUnauthorized = null;

export const setApiUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

export const parseApiResponse = async (response) => {
  if (response.ok) {
    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return response;
    return response.json();
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  error.code = payload?.error || 'API_ERROR';
  throw error;
};

const refreshAccessTokenOnce = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('AUTH_REFRESH_MISSING');
    const payload = await refreshAccessToken({ refreshToken });
    if (payload?.accessToken) saveToken(payload.accessToken);
    if (payload?.refreshToken) saveRefreshToken(payload.refreshToken);
    return payload;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

export const apiFetch = async (path, options = {}) => {
  const {
    auth = true,
    retryOnUnauthorized = true,
    parseJson = true,
    ...fetchOptions
  } = options;

  const headers = new Headers(fetchOptions.headers || {});
  const isFormData = fetchOptions.body instanceof FormData;
  if (!isFormData && fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();
    if (!token) {
      const error = new Error('AUTH_TOKEN_MISSING');
      error.status = 401;
      throw error;
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers,
    cache: 'no-store',
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    try {
      await refreshAccessTokenOnce();
      return apiFetch(path, { ...options, retryOnUnauthorized: false });
    } catch (_error) {
      onUnauthorized?.();
      const error = new Error('AUTH_SESSION_EXPIRED');
      error.status = 401;
      throw error;
    }
  }

  return parseJson ? parseApiResponse(response) : response;
};

export const apiGet = (path, options = {}) => apiFetch(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options = {}) => apiFetch(path, {
  ...options,
  method: 'POST',
  body: body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body ?? {}),
});
export const apiPut = (path, body, options = {}) => apiFetch(path, {
  ...options,
  method: 'PUT',
  body: body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body ?? {}),
});
export const apiDelete = (path, options = {}) => apiFetch(path, { ...options, method: 'DELETE' });
export const apiPatch = (path, body, options = {}) => apiFetch(path, {
  ...options,
  method: 'PATCH',
  body: body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body ?? {}),
});
