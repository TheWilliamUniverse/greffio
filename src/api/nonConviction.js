import { runtimeConfig } from '@/config/runtime.js';
import { apiGet, apiPost } from '@/api/client.js';
import {
  getDossierDocumentEditor,
  saveDossierDocumentEditor,
  getDossierDocumentDownloadUrl,
} from '@/api/documents.js';

export const loadNonConvictionEditor = (dossierId) => getDossierDocumentEditor({
  dossierId,
  docKey: 'manager_non_conviction',
});

export const saveNonConvictionDraft = (dossierId, fields) => saveDossierDocumentEditor({
  dossierId,
  docKey: 'manager_non_conviction',
  fields,
});

export const getNonConvictionPreviewUrl = (dossierId) => (
  `${getDossierDocumentDownloadUrl({ dossierId, docKey: 'manager_non_conviction' })}`
);

export const sendNonConvictionSignatureRequest = async (dossierId, { fields, signerEmail, signerFullName }) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/manager_non_conviction/send-signature`,
  { fields, signerEmail, signerFullName },
);

export const signNonConvictionNow = async (dossierId, payload) => apiPost(
  `/api/dossiers/${encodeURIComponent(dossierId)}/documents/manager_non_conviction/sign-now`,
  payload,
);

export const fetchPublicSignatureSession = async (token) => apiGet(
  `/api/signature/public/${encodeURIComponent(token)}`,
  { auth: false },
);

export const getPublicSignaturePdfUrl = (token) => (
  `${runtimeConfig.apiBaseUrl}/api/signature/public/${encodeURIComponent(token)}/pdf`
);

export const submitPublicSignature = async (token, payload) => apiPost(
  `/api/signature/public/${encodeURIComponent(token)}/sign`,
  payload,
  { auth: false },
);

export const sendPublicSignatureOtp = async (token) => apiPost(
  `/api/signature/public/${encodeURIComponent(token)}/otp/send`,
  {},
  { auth: false },
);

export const verifyPublicSignatureOtp = async (token, code) => apiPost(
  `/api/signature/public/${encodeURIComponent(token)}/otp/verify`,
  { code },
  { auth: false },
);

export const getPublicSignedDocumentUrl = (token) => (
  `${runtimeConfig.apiBaseUrl}/api/signature/public/${encodeURIComponent(token)}/signed-document`
);

export const getPublicProofCertificateUrl = (token) => (
  `${runtimeConfig.apiBaseUrl}/api/signature/public/${encodeURIComponent(token)}/proof-certificate`
);
