import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { getDeclarationErrorMessage, normalizeDeclarationFields } from '../documents/declarationNonCondamnation/formatters.js';
import { generateNonConvictionPdf, validateNonConvictionFields } from '../pdf/nonConvictionPdf.js';
import { stampSignatureOnPdf } from '../pdf/stampSignatureOnPdf.js';
import {
  persistNonConvictionPdfForDossier,
  persistSignedNonConvictionPdf,
  NON_CONVICTION_DOC_KEY,
} from '../services/nonConvictionDocumentService.js';
import { persistSignedEditableDocumentPdf } from '../services/editableDocumentService.js';
import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
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
import { ensureSignatureDraftPdf } from '../services/signatureDraftPdfService.js';
import { finalizeInternalSignature } from '../services/signature/finalizeInternalSignature.js';
import { getSignatureConsentText } from '../services/signature/signatureConsent.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';

export const registerNonConvictionSignatureRoutes = (app, {
  requireAuth,
  isInternalRole,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  createSignatureRecord,
  appUrl,
  transitionDossierStatus = null,
}) => {
  const persistDraftPdf = async ({ dossier, fields }) => {
    const result = await persistNonConvictionPdfForDossier({
      dossier,
      fields,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: {
        declarationStatus: 'preview_ready',
      },
    });
    return {
      pdfPath: result.pdfPath,
      sha256: result.sha256,
      updated: result.updated,
      filename: result.filename,
      verifyToken: result.verifyToken,
      documentId: result.documentId,
    };
  };

  app.post('/api/dossiers/:dossierId/documents/manager_non_conviction/send-signature', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId);
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });
    const { dossier } = access;
    const fields = req.body?.fields || {};
    const signerEmail = String(req.body?.signerEmail || fields.signerEmail || '').trim().toLowerCase();
    const signerFullName = String(req.body?.signerFullName || fields.signatureFullName || '').trim();
    if (!signerEmail || !signerEmail.includes('@')) {
      return res.status(400).json({ ok: false, error: 'SIGNER_EMAIL_REQUIRED' });
    }
    const validation = validateNonConvictionFields({
      ...fields,
      signatureFullName: signerFullName,
      declarationNonCondamnation: true,
      declarationFiliation: fields.declarationFiliation !== false,
    });
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: validation.error,
        message: getDeclarationErrorMessage(validation.error),
      });
    }

    try {
      const { pdfPath, sha256, updated, verifyToken } = await persistDraftPdf({
        dossier,
        fields: { ...validation.normalized, signerEmail, signatureFullName: signerFullName },
      });
      const { raw, hash } = createSigningToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const signatureRequest = await createSignatureRequest({
        dossierId: dossier.id,
        documentId: updated?.id || null,
        docKey: NON_CONVICTION_DOC_KEY,
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
        templateKey: 'non_conviction_signature_request',
        variables: {
          companyName: dossier.companyName || dossier.denomination || 'Votre société',
          signingLink,
          firstName: signerFullName.split(' ')[0] || 'Client',
        },
        dossierId: dossier.id,
        userId: req.auth.sub,
        tags: ['signature', 'non_conviction'],
      });
      return res.json({ ok: true, signingLink, status: 'signature_pending' });
    } catch (error) {
      console.error('SEND_SIGNATURE_REQUEST_FAILED', error);
      return res.status(500).json({ ok: false, error: 'SEND_SIGNATURE_REQUEST_FAILED' });
    }
  });

  app.post('/api/dossiers/:dossierId/documents/manager_non_conviction/sign-now', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId);
    if (!access.ok) {
      return res.status(access.status).json({ ok: false, error: access.error, message: getDeclarationErrorMessage(access.error) });
    }
    const { dossier } = access;
    const rawFields = req.body?.fields || {};
    const fields = normalizeDeclarationFields(rawFields);
    const signerFullName = String(req.body?.signerFullName || fields.signatureFullName || '').trim();
    const signerEmail = String(req.body?.signerEmail || fields.signerEmail || req.auth?.email || '').trim().toLowerCase();
    const signatureImagePngBase64 = req.body?.signatureImagePngBase64 || null;
    const consent = Boolean(req.body?.consent);
    if (!consent) {
      return res.status(400).json({
        ok: false,
        error: 'SIGNATURE_CONSENT_REQUIRED',
        message: getDeclarationErrorMessage('SIGNATURE_CONSENT_REQUIRED'),
      });
    }
    const validation = validateNonConvictionFields({
      ...fields,
      signatureFullName: signerFullName,
      declarationNonCondamnation: true,
      declarationFiliation: fields.declarationFiliation !== false,
    });
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: validation.error,
        message: getDeclarationErrorMessage(validation.error),
      });
    }
    const normalizedFields = validation.normalized || fields;

    try {
      const { pdfPath, sha256: sha256Draft, updated, verifyToken } = await persistDraftPdf({
        dossier,
        fields: { ...normalizedFields, signerEmail, signatureFullName: signerFullName },
      });
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw new Error('PDF_GENERATION_FAILED');
      }

      const cleanPdfPath = await generateNonConvictionPdf({
        filename: `Declaration_non_condamnation_clean_${dossier.reference || dossier.id}_${Date.now()}.pdf`,
        fields: { ...normalizedFields, signerEmail, signatureFullName: signerFullName },
        isDraft: false,
      });
      const signedFilename = pdfPath.replace(/\.pdf$/i, '_signed.pdf');
      await stampSignatureOnPdf({
        inputPath: cleanPdfPath,
        outputPath: signedFilename,
        signerFullName,
        signedAtIso: new Date().toISOString(),
        documentId: dossier.reference || dossier.id,
        signatureImagePngBase64,
        proofLines: [],
        layout: 'non_conviction_official',
      });
      const sha256Signed = createHash('sha256').update(fs.readFileSync(signedFilename)).digest('hex');
      await persistSignedNonConvictionPdf({
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
          evidence: { sha256Draft, sha256Signed, signerFullName, mode: 'immediate' },
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
        });
      } catch (auditError) {
        console.error('SIGNATURE_AUDIT_FAILED', auditError);
      }
      if (signerEmail) {
        void sendTransactionalEmail({
          to: { email: signerEmail, name: signerFullName },
          templateKey: 'non_conviction_signature_completed',
          variables: {
            companyName: dossier.companyName || 'Votre société',
            signedDownloadLink: `${appUrl}/documents`,
            firstName: signerFullName.split(' ')[0] || 'Client',
          },
          dossierId: dossier.id,
          userId: req.auth.sub,
        });
      }
      return res.json({
        ok: true,
        status: 'signed',
        sha256Signed,
        verifyUrl: buildDocumentVerifyUrl({
          appUrl,
          documentId: updated?.id,
          verifyToken,
        }),
        documents: await listDossierDocuments(dossier.id),
      });
    } catch (error) {
      console.error('SIGN_NOW_FAILED', error);
      let errorCode = 'SIGN_NOW_FAILED';
      if (error?.message === 'INVALID_SIGNATURE_FORMAT') errorCode = 'INVALID_SIGNATURE_FORMAT';
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

  app.post('/api/signature/public/:token/sign', async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request) {
      return res.status(404).json({
        ok: false,
        error: 'SIGNATURE_TOKEN_INVALID',
        message: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
      });
    }
    if (request.status === 'signed') return res.status(409).json({ ok: false, error: 'ALREADY_SIGNED' });
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        ok: false,
        error: 'SIGNATURE_TOKEN_EXPIRED',
        message: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
      });
    }
    const consent = getSignatureConsentText();
    const consentAccepted = Boolean(req.body?.consent);
    const previewAcknowledged = Boolean(req.body?.previewAcknowledged);
    const signerFullName = String(req.body?.signerFullName || request.signerFullName || '').trim();
    const signerEmail = String(req.body?.signerEmail || request.signerEmail || '').trim();
    const signatureImagePngBase64 = req.body?.signatureImagePngBase64 || null;
    const visualSignatureMode = signatureImagePngBase64 ? 'drawn' : 'typed';

    try {
      const draftPdfPath = await ensureSignatureDraftPdf({
        request,
        getDossier,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
      });
      const dossier = await getDossier(request.dossierId);
      const result = await finalizeInternalSignature({
        request,
        dossier,
        signerFullName,
        signerEmail,
        signatureImagePngBase64,
        visualSignatureMode,
        consentAccepted,
        consentTextVersion: consent.version,
        consentTextSnapshot: consent.text,
        previewAcknowledged,
        draftPdfPath,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        appUrl,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        transitionDossierStatus,
        actorId: null,
      });
      return res.json({
        ok: true,
        status: 'signed',
        proofId: result.proofId,
        signedAt: new Date().toISOString(),
        documentTitle: request.docKey === 'proxy_mandate'
          ? 'Procuration Greffio'
          : (getEditableDocumentConfig(request.docKey)?.publicDocumentTitle || 'Document Greffio'),
        verifyUrl: buildDocumentVerifyUrl({
          appUrl,
          documentId: request.documentId || request.evidence?.documentId,
          verifyToken: request.evidence?.verifyToken,
        }),
        downloads: {
          signedDocumentUrl: `/api/signature/public/${req.params.token}/signed-document`,
          proofCertificateUrl: `/api/signature/public/${req.params.token}/proof-certificate`,
        },
      });
    } catch (error) {
      console.error('PUBLIC_SIGN_FAILED', error);
      const errorCode = error?.code || 'PUBLIC_SIGN_FAILED';
      const status = ['SIGNATURE_PREVIEW_REQUIRED', 'SIGNATURE_CONSENT_REQUIRED', 'SIGNATURE_OTP_REQUIRED'].includes(errorCode) ? 400 : 500;
      return res.status(status).json({
        ok: false,
        error: errorCode,
        message: getDeclarationErrorMessage(errorCode) || 'La signature n\'a pas pu être finalisée. Veuillez réessayer.',
      });
    }
  });

  app.get('/api/signature/public/:token/pdf', async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request) return res.status(404).json({ ok: false, error: 'SIGNATURE_PDF_NOT_FOUND' });
    if (new Date(request.expiresAt).getTime() < Date.now() && request.status !== 'signed') {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }
    try {
      const pdfPath = await ensureSignatureDraftPdf({
        request,
        getDossier,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="declaration_non_condamnation.pdf"');
      return fs.createReadStream(pdfPath).pipe(res);
    } catch (error) {
      console.error('SIGNATURE_PUBLIC_PDF_FAILED', error);
      return res.status(404).json({ ok: false, error: 'SIGNATURE_PDF_NOT_FOUND' });
    }
  });
};
