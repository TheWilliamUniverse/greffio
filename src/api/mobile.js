import { apiGet, apiPost } from '@/api/client.js';

export const registerPushToken = async ({ token, platform, deviceLabel }) => apiPost('/api/mobile/push/register', {
  token,
  platform,
  deviceLabel,
});

export const unregisterPushToken = async ({ token }) => apiPost('/api/mobile/push/unregister', { token });

export const fetchMobileNotifications = async () => apiGet('/api/mobile/notifications');

export const runMobileSearch = async ({ query }) => apiPost('/api/mobile/search', { query });
