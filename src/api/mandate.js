import { apiFetch, apiGet, apiPost } from '@/api/client.js';

export const getMandateState = async (dossierId) => apiGet(
  `/api/dossiers/${encodeURIComponent(dossierId)}/mandate`,
);

export const signMandate = async ({
  dossierId,
  signerFullName,
  accepted,
  documentVersion = 'v1',
}) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/mandate/sign`,
  { signerFullName, accepted, documentVersion },
);

export const downloadMandatePdf = async (dossierId) => {
  const response = await apiFetch(
    `/api/dossiers/${encodeURIComponent(dossierId)}/mandate/pdf`,
    { parseJson: false },
  );
  if (!response.ok) {
    throw new Error('MANDATE_PDF_NOT_FOUND');
  }
  return response.blob();
};
