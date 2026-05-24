import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

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

export const fetchResourceServices = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/services`);
  return parseResponse(response);
};

export const searchResourceServices = async (query) => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/search?${params}`);
  return parseResponse(response);
};

export const fetchResourceConfig = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/config`);
  return parseResponse(response);
};

export const getResourceOrder = async (orderId) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/orders/${orderId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const checkoutResourceOrder = async (orderId) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/orders/${orderId}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return parseResponse(response);
};

export const createResourceOrder = async (payload) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/resources/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};
