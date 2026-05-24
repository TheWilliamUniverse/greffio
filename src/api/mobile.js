import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const authHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const registerPushToken = async ({ token, platform, deviceLabel }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/mobile/push/register`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ token, platform, deviceLabel }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'PUSH_REGISTER_FAILED');
  return payload;
};

export const unregisterPushToken = async ({ token }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/mobile/push/unregister`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ token }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'PUSH_UNREGISTER_FAILED');
  return payload;
};

export const fetchMobileNotifications = async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/mobile/notifications`, {
    headers: authHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'MOBILE_NOTIFICATIONS_FAILED');
  return payload;
};

export const runMobileSearch = async ({ query }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/mobile/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'MOBILE_SEARCH_FAILED');
  return payload;
};
