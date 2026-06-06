import { getToken } from '@/utils/localStorage.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export const fetchVerificationProfile = async (dossierId) => {
  const response = await fetch(`${API_BASE}/api/verification/dossier/${encodeURIComponent(dossierId)}/profile`, {
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'VERIFICATION_PROFILE_FAILED');
  return payload.profile;
};

export const runDossierVerification = async (dossierId) => {
  const response = await fetch(`${API_BASE}/api/verification/dossier/${encodeURIComponent(dossierId)}/run`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'VERIFICATION_RUN_FAILED');
  return payload;
};
