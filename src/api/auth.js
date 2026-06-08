import { runtimeConfig } from '@/config/runtime.js';
import { apiPost } from '@/api/client.js';
import { mfaDeviceAuthHeaders } from '@/utils/mfaDevice.js';

const parseApi = async (response) => {
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_e) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  throw error;
};

export const loginWithApi = async ({ email, password }) => apiPost(
  '/api/auth/login',
  { email, password },
  { auth: false, headers: mfaDeviceAuthHeaders() },
);

export const signupWithApi = async ({
  email,
  password,
  firstName,
  lastName,
  role,
  company,
  loginAlertsEnabled,
}) => apiPost('/api/auth/signup', {
  email,
  password,
  firstName,
  lastName,
  role,
  company,
  loginAlertsEnabled,
}, { auth: false });

export const refreshAccessToken = async ({ refreshToken }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseApi(response);
};

export const requestPasswordReset = async ({ email }) => apiPost(
  '/api/auth/forgot-password',
  { email },
  { auth: false },
);

export const confirmPasswordReset = async ({ token, password }) => apiPost(
  '/api/auth/reset-password',
  { token, password },
  { auth: false },
);
