import { apiGet, apiPost } from '@/api/client.js';

export const getIdentityVerificationStatus = async (dossierId) => apiGet(
  `/api/identity/status/${encodeURIComponent(dossierId)}`,
);

export const startIdentityVerification = async (dossierId, { docKey = 'identity_proof' } = {}) => apiPost(
  `/api/identity/start/${encodeURIComponent(dossierId)}`,
  { docKey },
);

export const refreshIdentityVerification = async (dossierId) => apiPost(
  `/api/identity/refresh/${encodeURIComponent(dossierId)}`,
);
