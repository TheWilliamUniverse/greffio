import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';
import { apiDelete, apiFetch, apiGet, apiPost } from '@/api/client.js';

const authToken = () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  return token;
};

const parseResponse = async (response) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  if (response.ok) {
    if (payload && typeof payload === 'object') return payload;
    const error = new Error('API_ERROR');
    error.code = 'API_ERROR';
    error.status = response.status;
    throw error;
  }
  const code = payload?.error || 'API_ERROR';
  const error = new Error(code);
  error.code = code;
  error.payload = payload;
  error.status = response.status;
  throw error;
};

const mapDocumentEditorError = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code === 'DOCUMENT_EDITOR_USE_CASE_REQUIRED') return 'Sélectionnez au moins un cas d’usage : pour vous ou filiation parents.';
  if (code === 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED') return 'Indiquez le nom du signataire.';
  if (code === 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED') return 'Indiquez le lieu et la date de la déclaration.';
  if (code === 'DOCUMENT_EDITOR_ADDRESS_REQUIRED') return 'Renseignez l’adresse complète du déclarant.';
  if (code === 'DOCUMENT_EDITOR_IDENTITY_REQUIRED') return 'Renseignez l’identité du déclarant (nom et date de naissance).';
  if (code === 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED') return 'Cochez la déclaration de non-condamnation.';
  if (code === 'DOCUMENT_EDITOR_FILIATION_REQUIRED') return 'Cochez la déclaration de filiation.';
  if (code === 'DOCUMENT_EDITOR_PARENTS_REQUIRED') return 'Renseignez les deux lignées parentales.';
  if (code === 'DOCUMENT_EDITOR_COMPANY_REQUIRED') return 'Indiquez la dénomination sociale.';
  if (code === 'DOCUMENT_EDITOR_SUBSCRIBERS_REQUIRED') return 'Ajoutez au moins un souscripteur.';
  if (code === 'DOCUMENT_EDITOR_SUBSCRIBER_IDENTITY_REQUIRED') return 'Chaque souscripteur doit avoir un nom.';
  if (code === 'DOCUMENT_EDITOR_SUBSCRIBER_BIRTH_REQUIRED') return 'Chaque personne physique doit avoir une date et un lieu de naissance.';
  if (code === 'DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED') return 'Chaque personne morale doit avoir un représentant légal signataire.';
  if (code === 'DOCUMENT_EDITOR_MANDATAIRE_REQUIRED') return 'Indiquez le mandataire.';
  if (code === 'DOCUMENT_SLOT_NOT_FOUND') return 'Emplacement document introuvable. Réouvrez le dossier puis réessayez.';
  if (code === 'DOCUMENT_EDITOR_GENERATION_FAILED') return 'Génération PDF impossible. Réessayez dans quelques secondes.';
  return "Le document n'a pas pu être généré.";
};

const mapDocumentUploadError = (error) => {
  const code = String(error?.message || '');
  if (code === 'DOCUMENT_NOT_ALLOWED_FOR_FORMALITY') {
    return 'Ce document n\'est pas autorisé pour cette formalité (EI/micro inclus).';
  }
  if (code === 'FILE_TOO_LARGE') {
    return 'Le fichier depasse la limite de 10 Mo.';
  }
  if (code === 'INVALID_FILE_TYPE') {
    return 'Seuls les fichiers PDF sont acceptes.';
  }
  if (code === 'DOSSIER_FORBIDDEN') {
    return 'Acces refuse a ce dossier.';
  }
  if (code === 'STORAGE_UPLOAD_FAILED') {
    return 'Le document n’a pas pu être enregistré. Réessayez dans quelques instants.';
  }
  if (code === 'API_ERROR' || code === 'PDF_ANALYSIS_FAILED' || code === 'PDF_PARSE_FAILED') {
    return 'Le document n’a pas pu être enregistré. Réessayez dans quelques instants.';
  }
  return code || "L'upload a échoué.";
};

const mapDocumentDeleteError = (error) => {
  const code = String(error?.message || '');
  if (code === 'DOCUMENT_NOT_UPLOADED') return 'Aucune pièce jointe à supprimer pour ce document.';
  if (code === 'DOCUMENT_VALIDATED_LOCKED') return 'Ce document a été validé par Greffio. Contactez le support pour le retirer.';
  if (code === 'DOCUMENT_SLOT_NOT_FOUND') return 'Emplacement document introuvable.';
  if (code === 'DOSSIER_FORBIDDEN') return 'Accès refusé à ce dossier.';
  return code || 'La suppression a échoué.';
};

export const deleteDossierDocument = async ({ dossierId, docKey }) => {
  try {
    return await apiDelete(`/api/dossiers/${dossierId}/documents/${encodeURIComponent(docKey)}`);
  } catch (error) {
    const mapped = new Error(mapDocumentDeleteError(error));
    mapped.status = error?.status;
    mapped.payload = error?.payload;
    throw mapped;
  }
};

export const uploadDossierDocument = async ({
  dossierId,
  docKey,
  file,
  ownerFirstName,
  ownerLastName,
}) => {
  const formData = new FormData();
  formData.append('docKey', docKey);
  formData.append('ownerFirstName', ownerFirstName || '');
  formData.append('ownerLastName', ownerLastName || '');
  formData.append('file', file);

  try {
    return await apiPost(`/api/dossiers/${dossierId}/documents`, formData);
  } catch (error) {
    const mapped = new Error(mapDocumentUploadError(error));
    mapped.status = error?.status;
    mapped.payload = error?.payload;
    throw mapped;
  }
};

export const getDossierDocuments = async (dossierId) => {
  const payload = await apiGet(`/api/dossiers/${dossierId}`);
  return payload.documents || [];
};

export const getDossierDocumentDownloadUrl = ({ dossierId, docKey }) => (
  `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/download`
);

export const downloadDossierDocument = async ({ dossierId, docKey, cacheBust = false, inline = true } = {}) => {
  const params = new URLSearchParams();
  if (cacheBust) params.set('t', String(Date.now()));
  if (inline) params.set('inline', '1');
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiFetch(
    `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/download${query}`,
    { parseJson: false },
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'DOCUMENT_DOWNLOAD_FAILED');
    error.code = payload?.error || 'DOCUMENT_DOWNLOAD_FAILED';
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  const contentDisposition = response.headers.get('content-disposition') || '';
  const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = nameMatch?.[1] || `${docKey}.pdf`;
  const blob = await response.blob();

  const contentType = response.headers.get('content-type') || '';
  const header = await blob.slice(0, 5).text().catch(() => '');
  const looksLikePdf = header.startsWith('%PDF');
  if (!looksLikePdf && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
    const error = new Error('DOCUMENT_NOT_PDF');
    error.code = 'DOCUMENT_NOT_PDF';
    error.contentType = contentType;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[downloadDossierDocument] unexpected content-type', { dossierId, docKey, contentType });
    }
    throw error;
  }

  return { filename, blob };
};

export const previewDossierDocumentPdf = async ({ dossierId, docKey, fields = {} } = {}) => {
  const response = await apiFetch(
    `/api/dossiers/${encodeURIComponent(dossierId)}/documents/${encodeURIComponent(docKey)}/preview-pdf`,
    {
      method: 'POST',
      body: JSON.stringify({ fields }),
      parseJson: false,
    },
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'PDF_GENERATION_FAILED');
    error.code = payload?.error || 'PDF_GENERATION_FAILED';
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return response.blob();
};

export const getDossierDocumentEditor = async ({ dossierId, docKey }) => (
  apiGet(`/api/dossiers/${dossierId}/documents/${docKey}/editor`)
);

export const saveDossierDocumentEditor = async ({ dossierId, docKey, fields }) => {
  try {
    return await apiPost(`/api/dossiers/${dossierId}/documents/${docKey}/editor`, { fields });
  } catch (error) {
    const code = String(error?.code || error?.message || 'API_ERROR');
    const mapped = new Error(mapDocumentEditorError({ ...error, code }));
    mapped.code = code;
    mapped.status = error?.status;
    mapped.payload = error?.payload;
    throw mapped;
  }
};

export const fetchDocumentSignSession = async (documentId) => (
  apiGet(`/api/documents/${encodeURIComponent(documentId)}/sign-session`)
);

export const getDocumentSignPreviewUrl = (documentId) => (
  `${runtimeConfig.apiBaseUrl}/api/documents/${encodeURIComponent(documentId)}/sign-preview`
);

export const downloadDocumentSignPreview = async (documentId) => {
  const response = await apiFetch(
    `/api/documents/${encodeURIComponent(documentId)}/sign-preview`,
    { parseJson: false },
  );
  if (!response.ok) {
    throw new Error('SIGNATURE_PDF_NOT_FOUND');
  }
  return response.blob();
};

export const submitDocumentSignature = async (documentId, body) => (
  apiPost(`/api/documents/${encodeURIComponent(documentId)}/sign`, body)
);
