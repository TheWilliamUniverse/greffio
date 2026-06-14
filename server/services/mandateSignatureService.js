import fs from 'node:fs';
import { generateMandatePdf } from '../pdf/mandatePdf.js';
import {
  computeSha256,
  createDocumentVerifyToken,
  recordDocumentHashBeforeSignature,
  recordDocumentHashAfterSignature,
  buildDocumentVerifyUrl,
} from './documentIntegrityService.js';
import {
  createSigningToken,
  createSignatureRequest,
} from '../signatureRequestStore.js';
import { sendDossierEmail } from '../emails/index.js';
import { DOSSIER_STATUSES } from '../stateMachine.js';
import { ROLE } from '../stateMachine.js';
import { createSignatureRecord } from '../signatureStore.js';
import { isEmailFeatureEnabled } from '../config/emailFeatureFlags.js';

export const PROXY_MANDATE_DOC_KEY = 'proxy_mandate';

const resolveAppUrl = (appUrl) => (
  String(appUrl || process.env.GREFFIO_APP_URL || process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '')
);

const resolveSignerFromDossier = (dossier, fallbackEmail = null) => {
  let data = {};
  try {
    data = dossier?.dataJson ? JSON.parse(dossier.dataJson) : {};
  } catch (_error) {
    data = {};
  }
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const signerFullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    || String(dossier?.companyName || '').trim()
    || 'Client Greffio';
  const signerEmail = String(fallbackEmail || data.email || '').trim().toLowerCase();
  return { signerFullName, signerEmail, firstName: firstName || signerFullName.split(' ')[0] || 'Client' };
};

export const generateMandateDraftPdf = async ({
  dossier,
  signerFullName,
  documentId = null,
  verifyToken = null,
  appUrl,
}) => {
  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Procuration_Greffio_${safeReference}_draft_${Date.now()}.pdf`;
  const pdfPath = await generateMandatePdf({
    filename,
    dossier,
    signerFullName,
    signedAtIso: null,
    evidence: {
      documentId,
      verifyToken,
    },
    appUrl: resolveAppUrl(appUrl),
  });
  const pdfBuffer = fs.readFileSync(pdfPath);
  return {
    pdfPath,
    pdfBuffer,
    sha256: computeSha256(pdfBuffer),
    filename,
  };
};

export const prepareMandateSignatureRequest = async ({
  dossier,
  signerEmail = null,
  signerFullName = null,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  appUrl,
}) => {
  await ensureDossierDocuments(dossier.id);
  const documents = await listDossierDocuments(dossier.id);
  let mandateDoc = documents.find((item) => item.docKey === PROXY_MANDATE_DOC_KEY);
  const resolved = resolveSignerFromDossier(dossier, signerEmail);
  const email = signerEmail || resolved.signerEmail;
  const fullName = signerFullName || resolved.signerFullName;
  if (!email || !email.includes('@')) {
    const error = new Error('MANDATE_SIGNER_EMAIL_REQUIRED');
    error.status = 400;
    throw error;
  }

  const documentId = mandateDoc?.id || null;
  const { raw: verifyToken, hash: verifyTokenHash } = createDocumentVerifyToken();
  const { pdfPath, pdfBuffer, sha256, filename } = await generateMandateDraftPdf({
    dossier,
    signerFullName: fullName,
    documentId,
    verifyToken,
    appUrl,
  });

  if (documentId) {
    await recordDocumentHashBeforeSignature({
      documentId,
      buffer: pdfBuffer,
      verifyTokenHash,
      verifyToken,
    }).catch(() => {});
  }

  await updateDossierDocument({
    dossierId: dossier.id,
    docKey: PROXY_MANDATE_DOC_KEY,
    status: DOCUMENT_STATUSES.UNDER_REVIEW,
    filename,
    fileSizeBytes: pdfBuffer.length,
    mimeType: 'application/pdf',
    storageUrl: pdfPath,
    sha256,
    metadata: {
      ...(mandateDoc?.metadata && typeof mandateDoc.metadata === 'object' ? mandateDoc.metadata : {}),
      mandateDraft: true,
      signerFullName: fullName,
      signerEmail: email,
      preparedAt: new Date().toISOString(),
    },
  });

  mandateDoc = (await listDossierDocuments(dossier.id)).find((item) => item.docKey === PROXY_MANDATE_DOC_KEY);
  const { raw, hash } = createSigningToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = resolveAppUrl(appUrl);
  const publicSigningLink = `${baseUrl}/signature/${raw}`;
  const dashboardSigningLink = mandateDoc?.id
    ? `${baseUrl}/documents/${mandateDoc.id}/sign`
    : publicSigningLink;

  const signatureRequest = await createSignatureRequest({
    dossierId: dossier.id,
    documentId: mandateDoc?.id || null,
    docKey: PROXY_MANDATE_DOC_KEY,
    tokenHash: hash,
    signerEmail: email,
    signerFullName: fullName,
    draftPdfPath: pdfPath,
    sha256Draft: sha256,
    fields: { signerFullName: fullName, signerEmail: email },
    expiresAt,
    initialEvidence: {
      verifyToken,
      documentId: mandateDoc?.id || null,
      publicSigningLink,
      dashboardSigningLink,
    },
  });

  return {
    signatureRequest,
    signingLink: publicSigningLink,
    dashboardSigningLink,
    documentId: mandateDoc?.id || null,
    rawToken: raw,
    signerEmail: email,
    signerFullName: fullName,
    prenom: resolved.firstName,
  };
};

export const finalizeSignedMandatePdf = async ({
  dossier,
  signerFullName,
  signedAtIso = null,
  ipAddress = null,
  userAgent = null,
  documentId = null,
  appUrl,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  transitionDossierStatus,
  actorId = null,
}) => {
  const signedAt = signedAtIso || new Date().toISOString();
  const { raw: verifyToken, hash: verifyTokenHash } = createDocumentVerifyToken();
  const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Procuration_Greffio_${safeReference}_${Date.now()}.pdf`;
  const pdfPath = await generateMandatePdf({
    filename,
    dossier,
    signerFullName: String(signerFullName).trim(),
    signedAtIso: signedAt,
    evidence: {
      documentId,
      verifyToken,
      ipAddress,
      userAgent,
      documentVersion: 'v1',
      signedAt,
    },
    appUrl: resolveAppUrl(appUrl),
  });
  const pdfBuffer = fs.readFileSync(pdfPath);
  const documentHash = computeSha256(pdfBuffer);

  if (documentId) {
    await recordDocumentHashBeforeSignature({
      documentId,
      buffer: pdfBuffer,
      verifyTokenHash,
      verifyToken,
    }).catch(() => {});
    await recordDocumentHashAfterSignature({
      documentId,
      buffer: pdfBuffer,
    }).catch(() => {});
  }

  await createSignatureRecord({
    dossierId: dossier.id,
    documentId,
    signerUserId: actorId,
    signerName: String(signerFullName).trim(),
    signatureType: 'electronic_simple',
    status: 'signed',
    signedAt,
    ipAddress,
    userAgent,
    originalHashSha256: documentHash,
    signedHashSha256: documentHash,
    evidence: {
      documentHash,
      documentVersion: 'v1',
      consentTextAccepted: true,
      signerFullName: String(signerFullName).trim(),
      pdfPath,
      verifyTokenIssued: Boolean(documentId),
    },
  });

  const mandateDocuments = await listDossierDocuments(dossier.id);
  const mandateDoc = mandateDocuments.find((item) => item.docKey === PROXY_MANDATE_DOC_KEY);

  await updateDossierDocument({
    dossierId: dossier.id,
    docKey: PROXY_MANDATE_DOC_KEY,
    status: DOCUMENT_STATUSES.VALID,
    filename,
    fileSizeBytes: pdfBuffer.length,
    mimeType: 'application/pdf',
    storageUrl: pdfPath,
    sha256: documentHash,
    reviewerId: actorId,
    metadata: {
      ...(mandateDoc?.metadata && typeof mandateDoc.metadata === 'object' ? mandateDoc.metadata : {}),
      signedAt,
      documentHash,
      documentVersion: 'v1',
      signerFullName: String(signerFullName).trim(),
      mandateDraft: false,
    },
  });

  if (typeof transitionDossierStatus === 'function') {
    await transitionDossierStatus({
      dossierId: dossier.id,
      nextStatus: DOSSIER_STATUSES.MANDATE_SIGNED,
      actorType: 'api',
      actorRole: ROLE.CLIENT,
      actorId,
      reason: 'mandate_signed',
      metadata: { documentHash, documentVersion: 'v1' },
    });
  }

  return {
    pdfPath,
    documentHash,
    verifyUrl: buildDocumentVerifyUrl({
      appUrl: resolveAppUrl(appUrl),
      documentId,
      verifyToken,
    }),
    signedAt,
    filename,
  };
};

export const sendMandateSignatureEmail = async ({
  dossier,
  userId = null,
  toEmail,
  signingLink,
  dashboardSigningLink = null,
  prenom = 'Client',
}) => {
  if (!toEmail || !isEmailFeatureEnabled('signatureRequests')) {
    return { ok: true, skipped: true };
  }
  const link = dashboardSigningLink || signingLink;
  return sendDossierEmail({
    templateId: 'mandate_required',
    dossier,
    userId,
    toEmail,
    variables: {
      prenom,
      lien_signature_procuration: link,
      signingLink: link,
    },
  });
};

export const notifyMandateReadyForSignature = async (deps) => {
  const prepared = await prepareMandateSignatureRequest(deps);
  await sendMandateSignatureEmail({
    dossier: deps.dossier,
    userId: deps.userId,
    toEmail: prepared.signerEmail,
    signingLink: prepared.signingLink,
    dashboardSigningLink: prepared.dashboardSigningLink,
    prenom: prepared.prenom,
  });
  return prepared;
};
