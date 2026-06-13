import { apiPost } from '@/api/client.js';

export const requestAppDownloadCode = async () => apiPost(
  '/api/public/app-download/request-code',
  {},
  { auth: false },
);

export const verifyAppDownloadCode = async ({ code, accessToken }) => apiPost(
  '/api/public/app-download/verify',
  { code, accessToken },
  { auth: false },
);
