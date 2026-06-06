import { apiGet, apiPost } from '@/api/client.js';

export const createDossier = async ({ userId, companyName, legalForm, service }) => apiPost('/api/dossiers', {
  userId: userId || null,
  companyName,
  legalForm,
  service,
});

export const listDossiers = async () => {
  const payload = await apiGet('/api/dossiers');
  return payload;
};

export const getDossierById = async (dossierId) => apiGet(`/api/dossiers/${dossierId}`);

export const fetchDossierDetail = async (dossierId, { allowOpsFallback = false } = {}) => {
  try {
    return await getDossierById(dossierId);
  } catch (error) {
    if (!allowOpsFallback || ![403, 404].includes(Number(error?.status))) {
      throw error;
    }
    const { getOpsDossierDetail } = await import('./ops.js');
    return getOpsDossierDetail(dossierId);
  }
};

export const listTrashedDossiers = async () => apiGet('/api/dossiers/trash');

export const trashDossier = async (dossierId) => apiPost(`/api/dossiers/${dossierId}/trash`);

export const restoreDossier = async (dossierId) => apiPost(`/api/dossiers/${dossierId}/restore`);
