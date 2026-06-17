import { runtimeConfig } from '@/config/runtime.js';
import { getRefreshToken, getToken, saveRefreshToken, saveToken, saveUser } from '@/utils/localStorage.js';
import { refreshAccessToken } from '@/api/auth.js';
import { nativeClientAuthHeaders } from '@/utils/nativeClient.js';
import { getOpsStepUpToken } from '@/lib/auth/opsStepUp.js';
import {
  isAuthSessionInvalidError,
  isTransientApiError,
  isTransientFetchError,
  isTransientHttpStatus,
  withTransientRetry,
} from '@/api/networkResilience.js';

let refreshPromise = null;
let onUnauthorized = null;

export const setApiUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const buildApiError = (message, { status, payload = null } = {}) => {
  const error = new Error(message);
  error.payload = payload;
  error.status = status;
  error.code = message;
  return error;
};

export const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (response.ok) {
    if (response.status === 204) return null;
    if (!isJson) {
      throw buildApiError('API_INVALID_RESPONSE', { status: response.status || 502 });
    }
    return response.json();
  }

  if (!isJson && isTransientHttpStatus(response.status)) {
    throw buildApiError('API_TRANSIENT_UNAVAILABLE', { status: response.status });
  }

  let payload = null;
  try {
    payload = isJson ? await response.json() : null;
  } catch (_error) {
    payload = null;
  }

  if (!payload && isTransientHttpStatus(response.status)) {
    throw buildApiError('API_TRANSIENT_UNAVAILABLE', { status: response.status });
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
    if (!refreshToken) throw buildApiError('AUTH_REFRESH_MISSING', { status: 401 });
    const payload = await withTransientRetry(
      () => refreshAccessToken({ refreshToken }),
      { retries: 2, delays: [500, 1500] },
    );
    if (payload?.accessToken) saveToken(payload.accessToken);
    if (payload?.refreshToken) saveRefreshToken(payload.refreshToken);
    if (payload?.user) saveUser(payload.user);
    return payload;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

const performFetch = async (path, fetchOptions) => {
  try {
    return await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
      ...fetchOptions,
      cache: 'no-store',
    });
  } catch (error) {
    if (isTransientFetchError(error)) {
      throw buildApiError('API_TRANSIENT_UNAVAILABLE', { status: 0 });
    }
    throw error;
  }
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
  Object.entries(nativeClientAuthHeaders()).forEach(([key, value]) => {
    if (value && !headers.has(key)) headers.set(key, value);
  });
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
    if (path.startsWith('/api/ops/') && !path.startsWith('/api/ops/step-up/')) {
      const stepUpToken = getOpsStepUpToken();
      if (stepUpToken) {
        headers.set('X-Greffio-Ops-Step-Up', stepUpToken);
      }
    }
  }

  const response = await withTransientRetry(
    () => performFetch(path, { ...fetchOptions, headers }),
    { retries: 1, delays: [600] },
  );

  if (response.status === 401 && auth && retryOnUnauthorized) {
    try {
      await refreshAccessTokenOnce();
      return apiFetch(path, { ...options, retryOnUnauthorized: false });
    } catch (error) {
      if (isTransientApiError(error) || isTransientFetchError(error)) {
        throw buildApiError('API_TRANSIENT_UNAVAILABLE', { status: error.status || 503 });
      }
      if (isAuthSessionInvalidError(error)) {
        onUnauthorized?.();
        throw buildApiError('AUTH_SESSION_EXPIRED', { status: 401 });
      }
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
