import { apiGet, apiPost } from '@/api/client.js';

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

export const getAppDownloadInfo = async ({ accessToken }) => apiGet(
  `/api/public/app-download/info?accessToken=${encodeURIComponent(accessToken)}`,
  { auth: false },
);

export const buildAppDownloadApkUrl = ({ accessToken, apiBaseUrl }) => (
  `${apiBaseUrl}/api/public/app-download/apk?accessToken=${encodeURIComponent(accessToken)}`
);
