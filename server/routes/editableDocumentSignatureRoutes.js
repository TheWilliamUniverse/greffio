import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { stampSignatureOnPdf } from '../pdf/stampSignatureOnPdf.js';
import {
  persistEditableDocumentPdf,
  persistSignedEditableDocumentPdf,
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
import { isSignwellConfigured, sendDocumentForSignature } from '../services/signature/signwellOrchestrator.js';

export const registerEditableDocumentSignatureRoutes = (app, {
  requireAuth,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
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
        const { pdfPath, sha256, updated } = await persistDraft({
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
        });

        if (isSignwellConfigured()) {
          try {
            const signwellResult = await sendDocumentForSignature({
              dossier,
              docKey,
              documentTitle: config.publicDocumentTitle,
              pdfPath,
              sha256Draft: sha256,
              signerEmail,
              signerFullName,
              signatureRequestId: signatureRequest.id,
              fields: { ...validation.normalized, signerEmail, signatureFullName: signerFullName },
              appUrl,
              emailSubject: `Signature — ${config.publicDocumentTitle}`,
            });
            const signingLink = signwellResult.signingLink || `${appUrl}/signature/${raw}`;
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
              tags: ['signature', docKey, 'signwell'],
            });
            return res.json({
              ok: true,
              signingLink,
              status: 'signature_pending',
              provider: signwellResult.provider,
              signwellDocumentId: signwellResult.signwellDocumentId,
            });
          } catch (signwellError) {
            console.error('SIGNWELL_SEND_FAILED', signwellError);
            return res.status(502).json({
              ok: false,
              error: signwellError?.code || 'SIGNWELL_SEND_FAILED',
            });
          }
        }

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
        const { pdfPath, sha256: sha256Draft, updated } = await persistDraft({
          dossier,
          config,
          fields: { ...normalizedFields, signerEmail, signatureFullName: signerFullName },
        });
        if (!pdfPath || !fs.existsSync(pdfPath)) {
          throw new Error('PDF_GENERATION_FAILED');
        }
        const signedFilename = pdfPath.replace(/\.pdf$/i, '_signed.pdf');
        await stampSignatureOnPdf({
          inputPath: pdfPath,
          outputPath: signedFilename,
          signerFullName,
          signedAtIso: new Date().toISOString(),
          documentId: dossier.reference || dossier.id,
          signatureImagePngBase64,
          proofLines: [`Empreinte brouillon : ${sha256Draft.slice(0, 16)}…`],
          layout: config.signatureLayout,
        });
        const { sha256Signed } = await persistSignedEditableDocumentPdf({
          docKey,
          schemaVersion: config.schemaVersion,
          dossier,
          signedLocalPath: signedFilename,
          fields: normalizedFields,
          updateDossierDocument,
          listDossierDocuments,
          DOCUMENT_STATUSES,
          metadataExtra: {
            signedAt: new Date().toISOString(),
            sha256BeforeSignature: sha256Draft,
            sha256AfterSignature: sha256Signed,
            signerEmail,
            signerFullName,
          },
        });
        try {
          await createSignatureRecord({
            dossierId: dossier.id,
            documentId: updated?.id,
            signerUserId: req.auth.sub,
            evidence: { sha256Draft, sha256Signed, signerFullName, mode: 'immediate', docKey },
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || '',
          });
        } catch (auditError) {
          console.error('SIGNATURE_AUDIT_FAILED', auditError);
        }
        return res.json({ ok: true, status: 'signed', sha256Signed, documents: await listDossierDocuments(dossier.id) });
      } catch (error) {
        console.error('SIGN_NOW_FAILED', error);
        let errorCode = 'SIGN_NOW_FAILED';
        if (error?.message === 'INVALID_SIGNATURE_FORMAT') errorCode = 'INVALID_SIGNATURE_FORMAT';
        else if (String(error?.message || '').includes('STORAGE') || String(error?.message || '').includes('S3')) {
          errorCode = 'STORAGE_UPLOAD_FAILED';
        } else if (String(error?.message || '').includes('PDF')) {
          errorCode = 'PDF_GENERATION_FAILED';
        }
        return res.status(errorCode === 'INVALID_SIGNATURE_FORMAT' ? 400 : 500).json({ ok: false, error: errorCode });
      }
    });
  };

  Object.values(EDITABLE_DOCUMENT_REGISTRY).forEach(registerDocRoutes);
};
