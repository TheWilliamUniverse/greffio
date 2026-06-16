import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getEditableDocumentConfig } from '../../documents/editableDocumentRegistry.js';
import { NON_CONVICTION_DOC_KEY, persistSignedNonConvictionPdf } from '../nonConvictionDocumentService.js';
import { persistSignedEditableDocumentPdf } from '../editableDocumentService.js';
import { markSignatureRequestSigned } from '../../signatureRequestStore.js';
import { sendTransactionalEmail } from '../emailService.js';
import { resolveSignatureCompletedEmail } from './signatureCompletedEmail.js';
import {
  createSignwellDocumentRecord,
  getSignwellDocumentBySignwellId,
  updateSignwellDocumentStatus,
} from '../../signwellStore.js';
import {
  createSignwellDocument,
  getSignwellCompletedPdfBuffer,
  isSignwellConfigured,
  resolveSignwellRedirectUrl,
  SIGNWELL_PROVIDER,
} from './signwell.service.js';

export { isSignwellConfigured, SIGNWELL_PROVIDER };

export const isSignwellStrictMode = () => process.env.SIGNWELL_STRICT === 'true';

export const formatSignwellApiError = (error) => ({
  code: error?.code || 'SIGNWELL_API_ERROR',
  message: error?.message || 'SIGNWELL_API_ERROR',
  signwellCode: error?.signwellCode || null,
});

const extractSigningUrl = (document) => {
  const recipients = document?.recipients || [];
  const recipient = recipients.find((entry) => entry?.embedded_signing_url || entry?.signing_url) || recipients[0];
  return recipient?.embedded_signing_url
    || recipient?.signing_url
    || document?.embedded_signing_url
    || document?.signing_url
    || null;
};

export const sendDocumentForSignature = async ({
  dossier,
  docKey,
  documentTitle,
  pdfPath,
  sha256Draft,
  signerEmail,
  signerFullName,
  signatureRequestId = null,
  fields = {},
  appUrl,
  emailSubject,
  emailMessage,
}) => {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const redirectUrl = `${resolveSignwellRedirectUrl(appUrl)}&doc=${encodeURIComponent(docKey)}`;
  const document = await createSignwellDocument({
    name: documentTitle || docKey,
    pdfBuffer,
    recipients: [{ email: signerEmail, name: signerFullName }],
    redirectUrl,
    embeddedSigning: true,
    subject: emailSubject,
    message: emailMessage,
    metadata: {
      dossierId: dossier.id,
      docKey,
      signatureRequestId,
      sha256Draft,
    },
  });

  const signwellDocumentId = document?.id || document?.document?.id;
  if (!signwellDocumentId) {
    const error = new Error('SIGNWELL_DOCUMENT_ID_MISSING');
    error.code = 'SIGNWELL_DOCUMENT_ID_MISSING';
    throw error;
  }

  const signingUrl = extractSigningUrl(document);
  await createSignwellDocumentRecord({
    dossierId: dossier.id,
    docKey,
    signwellDocumentId,
    signatureRequestId,
    signerEmail,
    signerFullName,
    signingUrl,
    metadata: { fields, sha256Draft },
  });

  return {
    signingLink: signingUrl,
    signwellDocumentId,
    provider: SIGNWELL_PROVIDER,
    status: 'signature_pending',
  };
};

export const completeSignwellDocument = async ({
  signwellDocumentId,
  appUrl,
  getDossier,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
}) => {
  const record = await getSignwellDocumentBySignwellId(signwellDocumentId);
  if (!record) {
    return { ok: false, error: 'SIGNWELL_RECORD_NOT_FOUND' };
  }
  if (record.status === 'completed') {
    return { ok: true, skipped: true };
  }

  const dossier = await getDossier(record.dossierId);
  if (!dossier) {
    return { ok: false, error: 'DOSSIER_NOT_FOUND' };
  }

  const pdfBuffer = await getSignwellCompletedPdfBuffer(signwellDocumentId);
  const signedAtIso = new Date().toISOString();
  const tmpPath = path.join(
    os.tmpdir(),
    `signwell_${signwellDocumentId}_${Date.now()}.pdf`,
  );
  try {
    fs.writeFileSync(tmpPath, pdfBuffer);
    const sha256Signed = createHash('sha256').update(pdfBuffer).digest('hex');
    const fields = record.metadata?.fields || {};
    const sha256Draft = record.metadata?.sha256Draft || null;
    const editableConfig = getEditableDocumentConfig(record.docKey);

    if (editableConfig) {
      await persistSignedEditableDocumentPdf({
        docKey: editableConfig.docKey,
        schemaVersion: editableConfig.schemaVersion,
        dossier,
        signedLocalPath: tmpPath,
        fields,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        metadataExtra: {
          signedAt: signedAtIso,
          sha256BeforeSignature: sha256Draft,
          sha256AfterSignature: sha256Signed,
          provider: SIGNWELL_PROVIDER,
          signwellDocumentId,
        },
      });
    } else if (record.docKey === NON_CONVICTION_DOC_KEY) {
      await persistSignedNonConvictionPdf({
        dossier,
        signedLocalPath: tmpPath,
        fields,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        metadataExtra: {
          signedAt: signedAtIso,
          sha256BeforeSignature: sha256Draft,
          sha256AfterSignature: sha256Signed,
          provider: SIGNWELL_PROVIDER,
          signwellDocumentId,
          signerEmail: record.signerEmail,
          signerFullName: record.signerFullName,
        },
      });
    } else {
      return { ok: false, error: 'UNSUPPORTED_DOC_KEY' };
    }

    if (record.signatureRequestId) {
      await markSignatureRequestSigned({
        id: record.signatureRequestId,
        signedPdfPath: tmpPath,
        sha256Signed,
        ipAddress: null,
        userAgent: 'signwell-webhook',
        evidence: {
          provider: SIGNWELL_PROVIDER,
          signwellDocumentId,
          sha256Draft,
          sha256Signed,
        },
      });
    }

    try {
      await createSignatureRecord({
        dossierId: record.dossierId,
        evidence: {
          provider: SIGNWELL_PROVIDER,
          signwellDocumentId,
          sha256Signed,
        },
        ipAddress: null,
        userAgent: 'signwell-webhook',
      });
    } catch (auditError) {
      console.error('SIGNWELL_SIGNATURE_AUDIT_FAILED', auditError);
    }

    await updateSignwellDocumentStatus(record.id, 'completed', {
      metadata: {
        ...record.metadata,
        signedAt: signedAtIso,
        sha256Signed,
      },
    });

    const completedEmail = resolveSignatureCompletedEmail({
      docKey: record.docKey,
      dossier,
      signerFullName: record.signerFullName,
      appUrl,
    });
    void sendTransactionalEmail({
      to: { email: record.signerEmail, name: record.signerFullName },
      templateKey: completedEmail.templateKey,
      variables: completedEmail.variables,
      dossierId: record.dossierId,
      tags: ['signature', 'signwell', record.docKey],
    });

    return { ok: true, status: 'completed', signwellDocumentId };
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_cleanupError) {
      // ignore temp cleanup failure
    }
  }
};
