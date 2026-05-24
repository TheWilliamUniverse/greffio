import { runtimeConfig } from '@/config/runtime.js';

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

export const loginWithApi = async ({ email, password }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseApi(response);
  return payload;
};

export const signupWithApi = async ({
  email,
  password,
  firstName,
  lastName,
  role,
  company,
  loginAlertsEnabled,
}) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      role,
      company,
      loginAlertsEnabled,
    }),
  });
  return parseApi(response);
};

export const refreshAccessToken = async ({ refreshToken }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseApi(response);
};

export const requestPasswordReset = async ({ email }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseApi(response);
};

export const confirmPasswordReset = async ({ token, password }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return parseApi(response);
};
