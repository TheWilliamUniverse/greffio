import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stampSignatureOnPdf } from '../../pdf/stampSignatureOnPdf.js';
import { persistSignedNonConvictionPdf } from '../nonConvictionDocumentService.js';
import { persistSignedEditableDocumentPdf } from '../editableDocumentService.js';
import { getEditableDocumentConfig } from '../../documents/editableDocumentRegistry.js';
import {
  markSignatureRequestSigned,
  updateSignatureRequestFields,
} from '../../signatureRequestStore.js';
import { createSignatureRecord } from '../../signatureStore.js';
import { sendTransactionalEmail } from '../emailService.js';
import { generateSignatureProofCertificatePdf } from './generateProofCertificatePdf.js';
import { recordSignatureAuditEvent, listSignatureAuditEvents } from './signatureAuditService.js';
import { getSignatureConsentText, isSignatureOtpRequired } from './signatureConsent.js';
import { isSignatureOtpVerified } from './signatureOtpService.js';
import {
  buildGreffioProofLine,
  generateSignatureProofId,
  hashPdfFile,
} from './signatureUtils.js';
import { GREFFIO_INTERNAL_PROVIDER } from './signatureProvider.js';
import { recordDossierSignatureTimelineEvent } from '../../store.js';

export const finalizeInternalSignature = async ({
  request,
  dossier,
  signerFullName,
  signerEmail,
  signatureImagePngBase64,
  visualSignatureMode = 'typed',
  consentAccepted,
  consentTextVersion,
  consentTextSnapshot,
  previewAcknowledged,
  draftPdfPath,
  ipAddress,
  userAgent,
  appUrl,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
}) => {
  if (!previewAcknowledged) {
    const error = new Error('SIGNATURE_PREVIEW_REQUIRED');
    error.code = 'SIGNATURE_PREVIEW_REQUIRED';
    throw error;
  }
  if (!consentAccepted) {
    const error = new Error('SIGNATURE_CONSENT_REQUIRED');
    error.code = 'SIGNATURE_CONSENT_REQUIRED';
    throw error;
  }

  const otpRequired = isSignatureOtpRequired() || Boolean(request.otpRequired);
  if (otpRequired) {
    const verified = await isSignatureOtpVerified(request.id);
    if (!verified) {
      const error = new Error('SIGNATURE_OTP_REQUIRED');
      error.code = 'SIGNATURE_OTP_REQUIRED';
      throw error;
    }
  }

  const proofId = request.proofId || generateSignatureProofId();
  const signedAtIso = new Date().toISOString();
  const proofLine = buildGreffioProofLine({ proofId, signedAtIso });
  const signedFilename = draftPdfPath.replace(/\.pdf$/i, `_signed_${Date.now()}.pdf`);
  const layout = getEditableDocumentConfig(request.docKey)?.signatureLayout || 'non_conviction_official';

  await stampSignatureOnPdf({
    inputPath: draftPdfPath,
    outputPath: signedFilename,
    signerFullName,
    signedAtIso,
    documentId: proofId,
    signatureImagePngBase64,
    proofLines: [proofLine, `Hash brouillon : ${request.sha256Draft?.slice(0, 16) || ''}…`],
    layout,
  });

  const sha256Signed = hashPdfFile(signedFilename, fs);
  const proofCertificatePath = signedFilename.replace(/\.pdf$/i, '_proof.pdf');
  const auditEvents = await listSignatureAuditEvents(request.id);

  await generateSignatureProofCertificatePdf({
    outputPath: proofCertificatePath,
    signatureRequest: { ...request, sha256Signed, proofId, signedAt: signedAtIso },
    signatureMeta: {
      documentTitle: getEditableDocumentConfig(request.docKey)?.publicDocumentTitle || request.docKey,
      signerFullName,
      signerEmail,
      provider: GREFFIO_INTERNAL_PROVIDER,
      level: 'ses_reinforced',
      proofId,
      signedAt: signedAtIso,
      proofLine,
      consentVersion: consentTextVersion,
      consentSnapshot: consentTextSnapshot,
      otpVerified: otpRequired,
      sha256Signed,
    },
    auditEvents,
  });

  await markSignatureRequestSigned({
    id: request.id,
    signedPdfPath: signedFilename,
    sha256Signed,
    ipAddress,
    userAgent,
    evidence: {
      consent: true,
      consentTextVersion,
      consentTextSnapshot,
      previewAcknowledged,
      signerFullName,
      sha256Draft: request.sha256Draft,
      sha256Signed,
      proofId,
      proofCertificatePath,
      visualSignatureMode,
      otpVerified: otpRequired,
    },
  });

  await updateSignatureRequestFields(request.id, {
    proofId,
    proofCertificatePath,
    consentTextVersion,
    consentTextSnapshot,
    consentAcceptedAt: signedAtIso,
    documentAcknowledgedAt: previewAcknowledged ? signedAtIso : null,
    otpVerified: otpRequired ? 1 : 0,
  });

  const editableConfig = getEditableDocumentConfig(request.docKey);
  const metadataExtra = {
    signedAt: signedAtIso,
    sha256BeforeSignature: request.sha256Draft,
    sha256AfterSignature: sha256Signed,
    proofId,
    proofCertificatePath,
  };

  if (editableConfig) {
    await persistSignedEditableDocumentPdf({
      docKey: editableConfig.docKey,
      schemaVersion: editableConfig.schemaVersion,
      dossier,
      signedLocalPath: signedFilename,
      fields: request.fields,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra,
    });
  } else {
    await persistSignedNonConvictionPdf({
      dossier,
      signedLocalPath: signedFilename,
      fields: request.fields,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra,
    });
  }

  const signatureRecord = await createSignatureRecord({
    dossierId: request.dossierId,
    documentId: request.documentId,
    signatureType: 'electronic_simple',
    ipAddress,
    userAgent,
    evidence: {
      sha256Signed,
      sha256Draft: request.sha256Draft,
      tokenRequestId: request.id,
      proofId,
      proofCertificatePath,
      provider: GREFFIO_INTERNAL_PROVIDER,
      level: 'ses_reinforced',
      consentTextVersion,
      consentTextSnapshot,
      greffioProofLine: proofLine,
    },
    signatureRequestId: request.id,
    signerName: signerFullName,
    signerEmail,
    originalHashSha256: request.sha256Draft,
    signedHashSha256: sha256Signed,
    proofId,
    proofCertificatePath,
    consentTextVersion,
    consentTextSnapshot,
    documentAcknowledged: previewAcknowledged,
    otpVerified: otpRequired,
    visualSignatureMode,
    greffioProofLine: proofLine,
  });

  await recordSignatureAuditEvent({
    signatureRequestId: request.id,
    signatureId: signatureRecord.id,
    eventType: 'request_signed',
    actorType: 'signer',
    actorEmail: signerEmail,
    ipAddress,
    userAgent,
    metadata: { proofId, sha256Signed },
  });

  await recordDossierSignatureTimelineEvent({
    dossierId: request.dossierId,
    documentTitle: getEditableDocumentConfig(request.docKey)?.publicDocumentTitle || request.docKey,
    signerFullName,
    proofId,
    metadata: {
      sha256Signed,
      proofCertificatePath,
      provider: GREFFIO_INTERNAL_PROVIDER,
    },
  }).catch(() => {});

  void sendTransactionalEmail({
    to: { email: signerEmail, name: signerFullName },
    templateKey: 'non_conviction_signature_completed',
    variables: {
      companyName: dossier?.companyName || 'Votre société',
      signedDownloadLink: `${appUrl}/documents`,
      firstName: signerFullName.split(' ')[0] || 'Client',
    },
    dossierId: request.dossierId,
    tags: ['signature', request.docKey],
  });

  return {
    status: 'signed',
    proofId,
    sha256Signed,
    signedPdfPath: signedFilename,
    proofCertificatePath,
    signatureRecordId: signatureRecord.id,
  };
};
