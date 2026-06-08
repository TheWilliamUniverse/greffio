import { apiGet, apiPost } from '@/api/client.js';

export const getCredentialsUnlockMeta = async (token) => {
  const params = new URLSearchParams({ token });
  return apiGet(`/api/public/credentials-unlock?${params.toString()}`, { auth: false });
};

export const verifyCredentialsUnlock = async ({ token, code }) => apiPost(
  '/api/public/credentials-unlock/verify',
  { token, code },
  { auth: false },
);
