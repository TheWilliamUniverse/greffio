import fs from 'node:fs';
import { getSignatureConsentText } from '../services/signature/signatureConsent.js';
import { finalizeInternalSignature } from '../services/signature/finalizeInternalSignature.js';
import { ensureSignatureDraftPdf } from '../services/signatureDraftPdfService.js';
import { getPendingSignatureRequestByDocumentId } from '../signatureRequestStore.js';
import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import { PROXY_MANDATE_DOC_KEY } from '../services/mandateSignatureService.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';
import { getClientIp } from '../utils/loginContext.js';
import { maskEmail } from '../services/signature/signatureUtils.js';
import { resolveDossierAccess } from '../utils/dossierAccess.js';

const resolvePublicDocumentTitle = (docKey) => {
  if (docKey === PROXY_MANDATE_DOC_KEY) return 'Procuration Greffio';
  return getEditableDocumentConfig(docKey)?.publicDocumentTitle || 'Document Greffio';
};

export const registerDocumentSignRoutes = (app, {
  requireAuth,
  getDocumentById,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
  appUrl,
  transitionDossierStatus = null,
}) => {
  const resolveDocumentAccess = async (req, documentId) => {
    const document = await getDocumentById(documentId);
    if (!document) {
      return { ok: false, status: 404, error: 'DOCUMENT_NOT_FOUND' };
    }
    const access = await resolveDossierAccess(req, document.dossierId);
    if (!access.ok) {
      return { ok: false, status: access.status, error: access.error };
    }
    return { ok: true, document, dossier: access.dossier };
  };

  app.get('/api/documents/:documentId/sign-session', requireAuth, async (req, res) => {
    const resolved = await resolveDocumentAccess(req, req.params.documentId);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ ok: false, error: resolved.error });
    }
    const request = await getPendingSignatureRequestByDocumentId(resolved.document.id);
    if (!request) {
      return res.status(404).json({
        ok: false,
        error: 'SIGNATURE_REQUEST_NOT_FOUND',
        message: 'Aucune demande de signature en attente pour ce document.',
      });
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }
    const consent = getSignatureConsentText();
    return res.json({
      ok: true,
      documentId: resolved.document.id,
      dossierId: resolved.document.dossierId,
      docKey: request.docKey,
      documentTitle: resolvePublicDocumentTitle(request.docKey),
      signerFullName: request.signerFullName,
      signerEmail: request.signerEmail,
      signerEmailMasked: maskEmail(request.signerEmail),
      pdfUrl: `/api/documents/${resolved.document.id}/sign-preview`,
      status: request.status,
      signature: {
        provider: 'greffio_internal',
        level: 'ses_reinforced',
        consentText: consent.text,
        consentTextVersion: consent.version,
      },
      timestamps: { expiresAt: request.expiresAt },
    });
  });

  app.get('/api/documents/:documentId/sign-preview', requireAuth, async (req, res) => {
    const resolved = await resolveDocumentAccess(req, req.params.documentId);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ ok: false, error: resolved.error });
    }
    const request = await getPendingSignatureRequestByDocumentId(resolved.document.id);
    if (!request?.draftPdfPath || !fs.existsSync(request.draftPdfPath)) {
      return res.status(404).json({ ok: false, error: 'SIGNATURE_PDF_NOT_FOUND' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document-greffio.pdf"');
    return fs.createReadStream(request.draftPdfPath).pipe(res);
  });

  app.post('/api/documents/:documentId/sign', requireAuth, async (req, res) => {
    const resolved = await resolveDocumentAccess(req, req.params.documentId);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ ok: false, error: resolved.error });
    }
    const request = await getPendingSignatureRequestByDocumentId(resolved.document.id);
    if (!request) {
      return res.status(404).json({ ok: false, error: 'SIGNATURE_REQUEST_NOT_FOUND' });
    }
    if (request.status === 'signed') {
      return res.status(409).json({ ok: false, error: 'ALREADY_SIGNED' });
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }

    const consent = getSignatureConsentText();
    const signerFullName = String(req.body?.signerFullName || request.signerFullName || '').trim();
    const signerEmail = String(req.body?.signerEmail || request.signerEmail || req.auth?.email || '').trim();
    const signatureImagePngBase64 = req.body?.signatureImagePngBase64 || null;

    try {
      const draftPdfPath = await ensureSignatureDraftPdf({
        request,
        getDossier,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        transitionDossierStatus,
        actorId: req.auth?.sub || null,
      });
      const result = await finalizeInternalSignature({
        request,
        dossier: resolved.dossier,
        signerFullName,
        signerEmail,
        signatureImagePngBase64,
        visualSignatureMode: signatureImagePngBase64 ? 'drawn' : 'typed',
        consentAccepted: Boolean(req.body?.consent),
        consentTextVersion: consent.version,
        consentTextSnapshot: consent.text,
        previewAcknowledged: Boolean(req.body?.previewAcknowledged),
        draftPdfPath,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        appUrl,
        ensureDossierDocuments,
        updateDossierDocument,
        listDossierDocuments,
        DOCUMENT_STATUSES,
        actorId: req.auth?.sub || null,
      });
      return res.json({
        ok: true,
        status: 'signed',
        proofId: result.proofId,
        signedAt: new Date().toISOString(),
        documentTitle: resolvePublicDocumentTitle(request.docKey),
        verifyUrl: buildDocumentVerifyUrl({
          appUrl,
          documentId: request.documentId || request.evidence?.documentId,
          verifyToken: request.evidence?.verifyToken,
        }),
      });
    } catch (error) {
      console.error('DOCUMENT_SIGN_FAILED', error);
      const errorCode = error?.code || 'DOCUMENT_SIGN_FAILED';
      const status = ['SIGNATURE_PREVIEW_REQUIRED', 'SIGNATURE_CONSENT_REQUIRED', 'SIGNATURE_OTP_REQUIRED'].includes(errorCode) ? 400 : 500;
      return res.status(status).json({ ok: false, error: errorCode });
    }
  });
};
