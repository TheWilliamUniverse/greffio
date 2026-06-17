import { apiGet, apiPost } from '@/api/client.js';
import { clearCurrentDossierId } from '@/utils/sessionStore.js';
import { isInternalUser } from '@/utils/roles.js';

export const createDossier = async ({
  userId,
  companyName,
  legalForm,
  service,
  forceNew = false,
}) => apiPost('/api/dossiers', {
  userId: userId || null,
  companyName,
  legalForm,
  service,
  forceNew,
});

export const listDossiers = async () => {
  const payload = await apiGet('/api/dossiers');
  return payload;
};

export const getDossierById = async (dossierId) => apiGet(`/api/dossiers/${dossierId}`);

export const getDossierActionState = async (dossierId) => (
  apiGet(`/api/dossiers/${encodeURIComponent(dossierId)}/action-state`)
);

export const fetchDossierDetail = async (dossierId, { allowOpsFallback = false } = {}) => {
  const opsFallback = allowOpsFallback || isInternalUser(null);
  try {
    return await getDossierById(dossierId);
  } catch (error) {
    if (!opsFallback || ![403, 404].includes(Number(error?.status))) {
      throw error;
    }
    const { getOpsDossierDetail } = await import('./ops.js');
    return getOpsDossierDetail(dossierId);
  }
};

export const listTrashedDossiers = async () => apiGet('/api/dossiers/trash');

export const purgePlaceholderDossiers = async () => apiPost('/api/dossiers/purge-placeholders');

export const trashDossier = async (dossierId) => {
  const payload = await apiPost(`/api/dossiers/${dossierId}/trash`);
  clearCurrentDossierId();
  return payload;
};

export const restoreDossier = async (dossierId) => apiPost(`/api/dossiers/${dossierId}/restore`);
