import { runtimeConfig } from '@/config/runtime.js';
import { apiPost } from '@/api/client.js';
import {
  isTransientHttpStatus,
  withTransientRetry,
} from '@/api/networkResilience.js';
import { buildCaptchaPayload } from '@/utils/captchaPayload.js';
import { nativeClientAuthHeaders } from '@/utils/nativeClient.js';
import { mfaDeviceAuthHeaders } from '@/utils/mfaDevice.js';

const parseApi = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const code = isTransientHttpStatus(response.status) ? 'API_TRANSIENT_UNAVAILABLE' : 'API_INVALID_RESPONSE';
    const error = new Error(code);
    error.status = response.status || 502;
    error.code = code;
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (response.ok) return payload;

  if (!payload && isTransientHttpStatus(response.status)) {
    const error = new Error('API_TRANSIENT_UNAVAILABLE');
    error.status = response.status;
    error.code = 'API_TRANSIENT_UNAVAILABLE';
    throw error;
  }

  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  error.code = payload?.error || 'API_ERROR';
  throw error;
};

const postAuth = async (path, body, options = {}) => withTransientRetry(async () => {
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...nativeClientAuthHeaders(),
        ...(options.headers || {}),
      },
      body: JSON.stringify(body ?? {}),
      cache: 'no-store',
    });
    return parseApi(response);
  } catch (error) {
    if (error?.code) throw error;
    const transient = new Error('API_TRANSIENT_UNAVAILABLE');
    transient.status = 0;
    transient.code = 'API_TRANSIENT_UNAVAILABLE';
    throw transient;
  }
}, { retries: 2, delays: [500, 1500] });

export const loginWithApi = async (payload) => postAuth(
  '/api/auth/login',
  {
    email: payload.email,
    password: payload.password,
    ...buildCaptchaPayload(payload),
  },
  { headers: mfaDeviceAuthHeaders() },
);

export const signupWithApi = async ({
  email,
  password,
  firstName,
  lastName,
  role,
  company,
  loginAlertsEnabled,
  turnstileToken,
  recaptchaToken,
  provider,
}) => apiPost('/api/auth/signup', {
  email,
  password,
  firstName,
  lastName,
  role,
  company,
  loginAlertsEnabled,
  ...buildCaptchaPayload({ turnstileToken, recaptchaToken, provider }),
}, { auth: false });

export const refreshAccessToken = async ({ refreshToken }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  return parseApi(response);
};

export const requestPasswordReset = async (payload) => apiPost(
  '/api/auth/forgot-password',
  { email: payload.email, ...buildCaptchaPayload(payload) },
  { auth: false },
);

export const confirmPasswordReset = async (payload) => apiPost(
  '/api/auth/reset-password',
  {
    token: payload.token,
    password: payload.password,
    ...buildCaptchaPayload(payload),
  },
  { auth: false },
);
