import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

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
  if (response.ok) return response.json();
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  const error = new Error(payload?.error || 'API_ERROR');
  error.payload = payload;
  error.status = response.status;
  throw error;
};

const mapDocumentEditorError = (error) => {
  const code = String(error?.message || '');
  if (code === 'DOCUMENT_EDITOR_USE_CASE_REQUIRED') return 'Sélectionnez au moins un cas d’usage : pour vous ou filiation parents.';
  if (code === 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED') return 'Indiquez le nom du signataire.';
  if (code === 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED') return 'Indiquez le lieu et la date de la déclaration.';
  if (code === 'DOCUMENT_EDITOR_ADDRESS_REQUIRED') return 'Renseignez l’adresse complète du déclarant.';
  if (code === 'DOCUMENT_EDITOR_IDENTITY_REQUIRED') return 'Renseignez l’identité du déclarant (nom et date de naissance).';
  if (code === 'DOCUMENT_EDITOR_NON_CONDAMNATION_REQUIRED') return 'Cochez la déclaration de non-condamnation.';
  if (code === 'DOCUMENT_EDITOR_FILIATION_REQUIRED') return 'Cochez la déclaration de filiation.';
  if (code === 'DOCUMENT_EDITOR_PARENTS_REQUIRED') return 'Renseignez les deux lignées parentales.';
  if (code === 'DOCUMENT_SLOT_NOT_FOUND') return 'Emplacement document introuvable. Réouvrez le dossier puis réessayez.';
  if (code === 'DOCUMENT_EDITOR_GENERATION_FAILED') return 'Génération PDF impossible. Réessayez dans quelques secondes.';
  return "Le document n'a pas pu être généré.";
};

const mapDocumentUploadError = (error) => {
  const code = String(error?.message || '');
  if (code === 'DOCUMENT_NOT_ALLOWED_FOR_FORMALITY') {
    return 'Ce document n est pas autorise pour cette formalite (EI/micro inclus).';
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
  return code || "L upload a echoue.";
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

  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken()}`,
    },
    body: formData,
  });
  try {
    return await parseResponse(response);
  } catch (error) {
    const mapped = new Error(mapDocumentUploadError(error));
    mapped.status = error?.status;
    mapped.payload = error?.payload;
    throw mapped;
  }
};

export const getDossierDocuments = async (dossierId) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken()}`,
    },
  });
  const payload = await parseResponse(response);
  return payload.documents || [];
};

export const getDossierDocumentDownloadUrl = ({ dossierId, docKey }) => (
  `${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/download`
);

export const downloadDossierDocument = async ({ dossierId, docKey }) => {
  const response = await fetch(getDossierDocumentDownloadUrl({ dossierId, docKey }), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken()}`,
    },
  });
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
    const error = new Error(payload?.error || 'DOCUMENT_DOWNLOAD_FAILED');
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  const contentDisposition = response.headers.get('content-disposition') || '';
  const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = nameMatch?.[1] || `${docKey}.pdf`;
  const blob = await response.blob();
  return { filename, blob };
};

export const getDossierDocumentEditor = async ({ dossierId, docKey }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/editor`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken()}`,
    },
  });
  return parseResponse(response);
};

export const saveDossierDocumentEditor = async ({ dossierId, docKey, fields }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/dossiers/${dossierId}/documents/${docKey}/editor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken()}`,
    },
    body: JSON.stringify({ fields }),
  });
  try {
    return await parseResponse(response);
  } catch (error) {
    const mapped = new Error(mapDocumentEditorError(error));
    mapped.status = error?.status;
    mapped.payload = error?.payload;
    throw mapped;
  }
};
