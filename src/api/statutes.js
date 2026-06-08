import { apiFetch, apiGet, apiPost } from '@/api/client.js';

export const fetchStatutesPreviewDraft = async ({ data = {}, answers = {} } = {}) => (
  apiPost('/api/statutes/preview-draft', { data, answers }, { auth: false })
);

export const downloadStatutesPreviewDraftPdf = async ({ data = {}, answers = {} } = {}) => {
  const response = await apiFetch('/api/statutes/preview-draft/pdf', {
    method: 'POST',
    body: JSON.stringify({ data, answers }),
    auth: false,
    parseJson: false,
  });
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'STATUTES_PDF_FAILED');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return response.blob();
};

export const fetchStatutesPreview = async (dossierId) => apiGet(`/api/dossiers/${dossierId}/statutes/preview`);

export const generateStatutes = async (dossierId) => apiPost(`/api/dossiers/${dossierId}/statutes/generate`, {});

export const listStatutes = async (dossierId) => apiGet(`/api/dossiers/${dossierId}/statutes`);

export const downloadStatutesPdf = async (dossierId, { cacheBust = false } = {}) => {
  const query = cacheBust ? `?t=${Date.now()}` : '';
  const response = await apiFetch(
    `/api/dossiers/${encodeURIComponent(dossierId)}/statutes/pdf${query}`,
    { parseJson: false },
  );
  if (!response.ok) {
    throw new Error('STATUTES_PDF_NOT_FOUND');
  }
  return response.blob();
};
