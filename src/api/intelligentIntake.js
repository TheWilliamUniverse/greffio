import { apiGet } from '@/api/client.js';

export const getIntelligentPrefill = async (dossierId) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/intelligent-prefill`,
);
