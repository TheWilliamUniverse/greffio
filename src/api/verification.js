import { apiGet, apiPost } from '@/api/client.js';

export const fetchVerificationProfile = async (dossierId) => {
  const payload = await apiGet(`/api/verification/dossier/${encodeURIComponent(dossierId)}/profile`);
  return payload.profile;
};

export const runDossierVerification = async (dossierId) => apiPost(
  `/api/verification/dossier/${encodeURIComponent(dossierId)}/run`,
);
