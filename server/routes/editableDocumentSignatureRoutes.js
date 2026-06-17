import fs from 'node:fs';
import {
  persistEditableDocumentPdf,
} from '../services/editableDocumentService.js';
import { EDITABLE_DOCUMENT_REGISTRY } from '../documents/editableDocumentRegistry.js';
import {
  createSigningToken,
  createSignatureRequest,
  getSignatureRequestByTokenHash,
  hashSigningToken,
  appendSignatureAudit,
  markSignatureRequestSigned,
} from '../signatureRequestStore.js';
import { sendTransactionalEmail } from '../services/emailService.js';
import { getClientIp } from '../utils/loginContext.js';
import { resolveDossierAccess } from '../utils/dossierAccess.js';
import { finalizeInternalSignature } from '../services/signature/finalizeInternalSignature.js';
import { getSignatureConsentText } from '../services/signature/signatureConsent.js';
import { getDeclarationErrorMessage } from '../documents/declarationNonCondamnation/formatters.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';

export const registerEditableDocumentSignatureRoutes = (app, {
  requireAuth,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  appUrl,
}) => {
  const persistDraft = async ({ dossier, config, fields }) => {
    const result = await persistEditableDocumentPdf({
      docKey: config.docKey,
      schemaVersion: config.schemaVersion,
      dossier,
      fields,
      generatePdf: config.generatePdf,
      filenamePrefix: config.filenamePrefix,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: { declarationStatus: 'preview_ready' },
    });
    return result;
  };

  const registerDocRoutes = (config) => {
    const { docKey } = config;

    app.post(`/api/dossiers/:dossierId/documents/${docKey}/send-signature`, requireAuth, async (req, res) => {
      const access = await resolveDossierAccess(req, req.params.dossierId);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      const { dossier } = access;
      const fields = req.body?.fields || {};
      const signerEmail = String(req.body?.signerEmail || fields.signerEmail || '').trim().toLowerCase();
      const signerFullName = String(req.body?.signerFullName || fields.signatureFullName || fields.presidentName || fields.signatoryName || '').trim();
      if (!signerEmail || !signerEmail.includes('@')) {
        return res.status(400).json({ ok: false, error: 'SIGNER_EMAIL_REQUIRED' });
      }
      const validation = config.validateFields({ ...fields, signatureFullName: signerFullName, signerEmail });
      if (!validation.ok) {
        return res.status(400).json({ ok: false, error: validation.error });
      }

      try {
        const { pdfPath, sha256, updated, verifyToken } = await persistDraft({
          dossier,
          config,
          fields: { ...validation.normalized, signerEmail, signatureFullName: signerFullName },
        });
        const { raw, hash } = createSigningToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const signatureRequest = await createSignatureRequest({
          dossierId: dossier.id,
          documentId: updated?.id || null,
          docKey,
          tokenHash: hash,
          signerEmail,
          signerFullName,
          draftPdfPath: pdfPath,
          sha256Draft: sha256,
          fields: { ...validation.normalized, signerEmail, signatureFullName: signerFullName },
          expiresAt,
          initialEvidence: verifyToken ? { verifyToken, documentId: updated?.id || null } : {},
        });

        const signingLink = `${appUrl}/signature/${raw}`;
        void sendTransactionalEmail({
          to: { email: signerEmail, name: signerFullName },
          templateKey: config.emailTemplateSend,
          variables: {
            companyName: dossier.companyName || dossier.denomination || 'Votre société',
            documentTitle: config.publicDocumentTitle,
            signingLink,
            firstName: signerFullName.split(' ')[0] || 'Client',
          },
          dossierId: dossier.id,
          userId: req.auth.sub,
          tags: ['signature', docKey],
        });
        return res.json({ ok: true, signingLink, status: 'signature_pending' });
      } catch (error) {
        console.error('SEND_SIGNATURE_REQUEST_FAILED', error);
        return res.status(500).json({ ok: false, error: 'SEND_SIGNATURE_REQUEST_FAILED' });
      }
    });

    app.post(`/api/dossiers/:dossierId/documents/${docKey}/sign-now`, requireAuth, async (req, res) => {
      const access = await resolveDossierAccess(req, req.params.dossierId);
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
      const { dossier } = access;
      const fields = req.body?.fields || {};
      const signerFullName = String(
        req.body?.signerFullName
        || fields.signatureFullName
        || fields.presidentName
        || fields.signatoryName
        || '',
      ).trim();
      const signerEmail = String(req.body?.signerEmail || fields.signerEmail || req.auth?.email || '').trim().toLowerCase();
      const signatureImagePngBase64 = req.body?.signatureImagePngBase64 || null;
      const consent = Boolean(req.body?.consent);
      const previewAcknowledged = Boolean(req.body?.previewAcknowledged);
      if (!consent) return res.status(400).json({ ok: false, error: 'SIGNATURE_CONSENT_REQUIRED' });
      if (!previewAcknowledged) {
        return res.status(400).json({ ok: false, error: 'SIGNATURE_PREVIEW_REQUIRED' });
      }

      const validation = config.validateFields({ ...fields, signatureFullName: signerFullName, signerEmail });
      if (!validation.ok) return res.status(400).json({ ok: false, error: validation.error });
      const normalizedFields = validation.normalized || fields;

      try {
        const { pdfPath, sha256: sha256Draft, updated, verifyToken } = await persistDraft({
          dossier,
          config,
          fields: { ...normalizedFields, signerEmail, signatureFullName: signerFullName },
        });
        if (!pdfPath || !fs.existsSync(pdfPath)) {
          throw new Error('PDF_GENERATION_FAILED');
        }

        const consentMeta = getSignatureConsentText();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { hash } = createSigningToken();
        const signatureRequest = await createSignatureRequest({
          dossierId: dossier.id,
          documentId: updated?.id || null,
          docKey,
          tokenHash: hash,
          signerEmail,
          signerFullName,
          draftPdfPath: pdfPath,
          sha256Draft,
          fields: { ...normalizedFields, signerEmail, signatureFullName: signerFullName },
          expiresAt,
          otpRequired: false,
          initialEvidence: verifyToken ? { verifyToken, documentId: updated?.id || null } : {},
        });

        const result = await finalizeInternalSignature({
          request: signatureRequest,
          dossier,
          signerFullName,
          signerEmail,
          signatureImagePngBase64,
          visualSignatureMode: signatureImagePngBase64 ? 'drawn' : 'typed',
          consentAccepted: consent,
          consentTextVersion: consentMeta.version,
          consentTextSnapshot: consentMeta.text,
          previewAcknowledged,
          draftPdfPath: pdfPath,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
          appUrl,
          ensureDossierDocuments,
          updateDossierDocument,
          listDossierDocuments,
          DOCUMENT_STATUSES,
        });

        return res.json({
          ok: true,
          status: 'signed',
          sha256Signed: result.sha256Signed,
          proofId: result.proofId,
          verifyUrl: buildDocumentVerifyUrl({
            appUrl,
            documentId: updated?.id,
            verifyToken,
          }),
          documents: await listDossierDocuments(dossier.id),
        });
      } catch (error) {
        console.error('SIGN_NOW_FAILED', error);
        let errorCode = error?.code || error?.message || 'SIGN_NOW_FAILED';
        if (errorCode === 'INVALID_SIGNATURE_FORMAT') errorCode = 'INVALID_SIGNATURE_FORMAT';
        else if (String(error?.message || '').includes('STORAGE') || String(error?.message || '').includes('S3')) {
          errorCode = 'STORAGE_UPLOAD_FAILED';
        } else if (String(error?.message || '').includes('PDF')) {
          errorCode = 'PDF_GENERATION_FAILED';
        }
        return res.status(errorCode === 'INVALID_SIGNATURE_FORMAT' ? 400 : 500).json({
          ok: false,
          error: errorCode,
          message: getDeclarationErrorMessage(errorCode),
        });
      }
    });
  };

  Object.values(EDITABLE_DOCUMENT_REGISTRY).forEach(registerDocRoutes);
};
