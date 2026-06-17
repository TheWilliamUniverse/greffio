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
  createYousignSignatureFlow,
  downloadYousignDocument,
  getYousignSignatureRequest,
  isYousignConfigured,
  resolveYousignRedirectUrl,
  YOUSIGN_PROVIDER,
} from './yousign.service.js';

export { isYousignConfigured, YOUSIGN_PROVIDER };

export const isYousignStrictMode = () => process.env.YOUSIGN_STRICT === 'true';

const extractDocumentId = (signatureRequest) => {
  const docs = signatureRequest?.documents || [];
  return docs[0]?.id || null;
};

export const sendDocumentForYousignSignature = async ({
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
  const redirectUrl = `${resolveYousignRedirectUrl(appUrl)}&doc=${encodeURIComponent(docKey)}`;
  const flow = await createYousignSignatureFlow({
    name: documentTitle || docKey,
    pdfBuffer,
    signerEmail,
    signerFullName,
    metadata: {
      dossierId: dossier.id,
      docKey,
      signatureRequestId,
      sha256Draft,
      redirectUrl,
      emailSubject,
      emailMessage,
    },
  });

  await createSignwellDocumentRecord({
    dossierId: dossier.id,
    docKey,
    signwellDocumentId: flow.signatureRequestId,
    signatureRequestId,
    signerEmail,
    signerFullName,
    signingUrl: flow.signingLink,
    metadata: {
      fields,
      sha256Draft,
      provider: YOUSIGN_PROVIDER,
      yousignDocumentId: flow.documentId,
      yousignSignerId: flow.signerId,
    },
  });

  return {
    signingLink: flow.signingLink,
    signwellDocumentId: flow.signatureRequestId,
    yousignSignatureRequestId: flow.signatureRequestId,
    provider: YOUSIGN_PROVIDER,
    status: 'signature_pending',
  };
};

export const completeYousignDocument = async ({
  yousignSignatureRequestId,
  appUrl,
  getDossier,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
}) => {
  const record = await getSignwellDocumentBySignwellId(yousignSignatureRequestId);
  if (!record) {
    return { ok: false, error: 'YOUSIGN_RECORD_NOT_FOUND' };
  }
  if (record.status === 'completed') {
    return { ok: true, skipped: true };
  }

  const signatureRequest = await getYousignSignatureRequest(yousignSignatureRequestId);
  if (String(signatureRequest?.status || '').toLowerCase() !== 'done') {
    return { ok: false, error: 'YOUSIGN_NOT_COMPLETED', status: signatureRequest?.status || null };
  }

  const dossier = await getDossier(record.dossierId);
  if (!dossier) {
    return { ok: false, error: 'DOSSIER_NOT_FOUND' };
  }

  const documentId = record.metadata?.yousignDocumentId || extractDocumentId(signatureRequest);
  if (!documentId) {
    return { ok: false, error: 'YOUSIGN_DOCUMENT_ID_MISSING' };
  }

  const pdfBuffer = await downloadYousignDocument(yousignSignatureRequestId, documentId);
  const signedAtIso = new Date().toISOString();
  const tmpPath = path.join(
    os.tmpdir(),
    `yousign_${yousignSignatureRequestId}_${Date.now()}.pdf`,
  );

  try {
    fs.writeFileSync(tmpPath, pdfBuffer);
    const sha256Signed = createHash('sha256').update(pdfBuffer).digest('hex');
    const fieldValues = record.metadata?.fields || {};
    const sha256Draft = record.metadata?.sha256Draft || null;
    const editableConfig = getEditableDocumentConfig(record.docKey);

    if (editableConfig) {
      await persistSignedEditableDocumentPdf({
        docKey: editableConfig.docKey,
        schemaVersion: editableConfig.schemaVersion,
        dossier,
        signedLocalPath: tmpPath,
        fields: fieldValues,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        metadataExtra: {
          signedAt: signedAtIso,
          sha256BeforeSignature: sha256Draft,
          sha256AfterSignature: sha256Signed,
          provider: YOUSIGN_PROVIDER,
          yousignSignatureRequestId,
        },
      });
    } else if (record.docKey === NON_CONVICTION_DOC_KEY) {
      await persistSignedNonConvictionPdf({
        dossier,
        signedLocalPath: tmpPath,
        fields: fieldValues,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        metadataExtra: {
          signedAt: signedAtIso,
          sha256BeforeSignature: sha256Draft,
          sha256AfterSignature: sha256Signed,
          provider: YOUSIGN_PROVIDER,
          yousignSignatureRequestId,
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
        userAgent: 'yousign-webhook',
        evidence: {
          provider: YOUSIGN_PROVIDER,
          yousignSignatureRequestId,
          sha256Draft,
          sha256Signed,
        },
      });
    }

    try {
      await createSignatureRecord({
        dossierId: record.dossierId,
        evidence: {
          provider: YOUSIGN_PROVIDER,
          yousignSignatureRequestId,
          sha256Signed,
        },
        ipAddress: null,
        userAgent: 'yousign-webhook',
      });
    } catch (auditError) {
      console.error('YOUSIGN_SIGNATURE_AUDIT_FAILED', auditError);
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
      tags: ['signature', 'yousign', record.docKey],
    });

    return { ok: true, status: 'completed', yousignSignatureRequestId };
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_cleanupError) {
      // ignore
    }
  }
};
