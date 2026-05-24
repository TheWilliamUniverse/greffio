import { runtimeConfig } from '@/config/runtime.js';

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

export const submitAppointmentRequest = async (payload) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/contact/appointment-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApi(response);
};
