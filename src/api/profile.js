import { apiGet, apiPatch } from '@/api/client.js';

export const fetchUserProfile = async () => apiGet('/api/user/profile');

export const updateUserProfileApi = async (payload) => apiPatch('/api/user/profile', payload);

export const searchAddresses = async (query) => {
  const q = String(query || '').trim();
  if (q.length < 3) return { ok: true, results: [] };
  return apiGet(`/api/geo/address-search?q=${encodeURIComponent(q)}`);
};
