import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generateNonConvictionPdf, validateNonConvictionFields } from '../pdf/nonConvictionPdf.js';
import { getDeclarationErrorMessage, normalizeDeclarationFields } from '../documents/declarationNonCondamnation/formatters.js';
import { stampSignatureOnPdf } from '../pdf/stampSignatureOnPdf.js';
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

const DOC_KEY = 'manager_non_conviction';

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
}) => {
  const persistDraftPdf = async ({ dossier, fields }) => {
    await ensureDossierDocuments(dossier.id);
    const safeReference = String(dossier.reference || dossier.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Declaration_non_condamnation_${safeReference}_${Date.now()}.pdf`;
    const pdfPath = await generateNonConvictionPdf({
      filename,
      fields,
    });
    const sha256 = createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    const updated = await updateDossierDocument({
      dossierId: dossier.id,
      docKey: DOC_KEY,
      status: DOCUMENT_STATUSES.UPLOADED,
      filename,
      fileSizeBytes: fs.statSync(pdfPath).size,
      mimeType: 'application/pdf',
      storageUrl: pdfPath,
      sha256,
      metadata: {
        editorSchemaVersion: 'manager_non_conviction_v5',
        declarationStatus: 'preview_ready',
        fields,
        generatedAt: new Date().toISOString(),
      },
    });
    return { pdfPath, sha256, updated, filename };
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
    const validation = validateNonConvictionFields({ ...fields, signatureFullName: signerFullName, declarationNonCondamnation: true });
    if (!validation.ok) return res.status(400).json({ ok: false, error: validation.error });

    try {
      const { pdfPath, sha256, updated } = await persistDraftPdf({ dossier, fields: { ...fields, signerEmail, signatureFullName } });
      const { raw, hash } = createSigningToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await createSignatureRequest({
        dossierId: dossier.id,
        documentId: updated?.id || null,
        docKey: DOC_KEY,
        tokenHash: hash,
        signerEmail,
        signerFullName,
        draftPdfPath: pdfPath,
        sha256Draft: sha256,
        fields: { ...fields, signerEmail, signatureFullName },
        expiresAt,
      });
      const signingLink = `${appUrl}/signature/${raw}`;
      await sendTransactionalEmail({
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
    const validation = validateNonConvictionFields({ ...fields, signatureFullName, declarationNonCondamnation: true });
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: validation.error,
        message: getDeclarationErrorMessage(validation.error),
      });
    }
    const normalizedFields = validation.normalized || fields;

    try {
      const { pdfPath, sha256: sha256Draft, updated } = await persistDraftPdf({
        dossier,
        fields: { ...normalizedFields, signerEmail, signatureFullName },
      });
      const signedFilename = pdfPath.replace('.pdf', '_signed.pdf');
      await stampSignatureOnPdf({
        inputPath: pdfPath,
        outputPath: signedFilename,
        signerFullName,
        signedAtIso: new Date().toISOString(),
        documentId: dossier.reference || dossier.id,
        signatureImagePngBase64,
        proofLines: [`Empreinte brouillon : ${sha256Draft.slice(0, 16)}…`],
      });
      const sha256Signed = createHash('sha256').update(fs.readFileSync(signedFilename)).digest('hex');
      await updateDossierDocument({
        dossierId: dossier.id,
        docKey: DOC_KEY,
        status: DOCUMENT_STATUSES.VALID,
        filename: path.basename(signedFilename),
        fileSizeBytes: fs.statSync(signedFilename).size,
        mimeType: 'application/pdf',
        storageUrl: signedFilename,
        sha256: sha256Signed,
        metadata: {
          declarationStatus: 'signed',
          signedAt: new Date().toISOString(),
          sha256BeforeSignature: sha256Draft,
          sha256AfterSignature: sha256Signed,
          fields: normalizedFields,
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
        await sendTransactionalEmail({
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
      return res.json({ ok: true, status: 'signed', sha256Signed, documents: await listDossierDocuments(dossier.id) });
    } catch (error) {
      console.error('SIGN_NOW_FAILED', error);
      const errorCode = error?.message === 'INVALID_SIGNATURE_FORMAT'
        ? 'INVALID_SIGNATURE_FORMAT'
        : 'SIGN_NOW_FAILED';
      return res.status(errorCode === 'INVALID_SIGNATURE_FORMAT' ? 400 : 500).json({
        ok: false,
        error: errorCode,
        message: getDeclarationErrorMessage(errorCode),
      });
    }
  });

  app.get('/api/signature/public/:token', async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request) return res.status(404).json({ ok: false, error: 'SIGNATURE_TOKEN_NOT_FOUND' });
    if (request.status === 'signed') {
      return res.json({ ok: true, status: 'signed', signerFullName: request.signerFullName });
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }
    await appendSignatureAudit(request.id, { type: 'viewed', ipAddress: getClientIp(req) });
    const dossier = await getDossier(request.dossierId);
    return res.json({
      ok: true,
      status: request.status,
      signerFullName: request.signerFullName,
      signerEmail: request.signerEmail,
      companyName: dossier?.companyName || dossier?.denomination || 'Greffio',
      documentTitle: 'Déclaration de non-condamnation et de filiation',
      pdfUrl: `/api/signature/public/${req.params.token}/pdf`,
    });
  });

  app.get('/api/signature/public/:token/pdf', async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request?.draftPdfPath || !fs.existsSync(request.draftPdfPath)) {
      return res.status(404).json({ ok: false, error: 'SIGNATURE_PDF_NOT_FOUND' });
    }
    if (new Date(request.expiresAt).getTime() < Date.now() && request.status !== 'signed') {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="declaration_non_condamnation.pdf"');
    return fs.createReadStream(request.draftPdfPath).pipe(res);
  });

  app.post('/api/signature/public/:token/sign', async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request) return res.status(404).json({ ok: false, error: 'SIGNATURE_TOKEN_NOT_FOUND' });
    if (request.status === 'signed') return res.status(409).json({ ok: false, error: 'ALREADY_SIGNED' });
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ ok: false, error: 'SIGNATURE_TOKEN_EXPIRED' });
    }
    const consent = Boolean(req.body?.consent);
    const signerFullName = String(req.body?.signerFullName || request.signerFullName || '').trim();
    const signatureImagePngBase64 = req.body?.signatureImagePngBase64 || null;
    if (!consent) return res.status(400).json({ ok: false, error: 'SIGNATURE_CONSENT_REQUIRED' });

    try {
      const signedFilename = request.draftPdfPath.replace('.pdf', `_signed_${Date.now()}.pdf`);
      const signedAtIso = new Date().toISOString();
      await stampSignatureOnPdf({
        inputPath: request.draftPdfPath,
        outputPath: signedFilename,
        signerFullName,
        signedAtIso,
        documentId: request.dossierId,
        signatureImagePngBase64,
        proofLines: [`Empreinte : ${request.sha256Draft?.slice(0, 20) || ''}…`],
      });
      const sha256Signed = createHash('sha256').update(fs.readFileSync(signedFilename)).digest('hex');
      await markSignatureRequestSigned({
        id: request.id,
        signedPdfPath: signedFilename,
        sha256Signed,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        evidence: { consent: true, signerFullName, sha256Draft: request.sha256Draft, sha256Signed },
      });
      await updateDossierDocument({
        dossierId: request.dossierId,
        docKey: DOC_KEY,
        status: DOCUMENT_STATUSES.VALID,
        filename: path.basename(signedFilename),
        fileSizeBytes: fs.statSync(signedFilename).size,
        mimeType: 'application/pdf',
        storageUrl: signedFilename,
        sha256: sha256Signed,
        metadata: {
          declarationStatus: 'signed',
          signedAt: signedAtIso,
          sha256BeforeSignature: request.sha256Draft,
          sha256AfterSignature: sha256Signed,
          fields: request.fields,
        },
      });
      await createSignatureRecord({
        dossierId: request.dossierId,
        documentId: request.documentId,
        evidence: { sha256Signed, tokenRequestId: request.id },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      });
      const dossier = await getDossier(request.dossierId);
      await sendTransactionalEmail({
        to: { email: request.signerEmail, name: signerFullName },
        templateKey: 'non_conviction_signature_completed',
        variables: {
          companyName: dossier?.companyName || 'Votre société',
          signedDownloadLink: `${appUrl}/documents`,
          firstName: signerFullName.split(' ')[0] || 'Client',
        },
        dossierId: request.dossierId,
        tags: ['signature', 'non_conviction'],
      });
      return res.json({ ok: true, status: 'signed' });
    } catch (error) {
      console.error('PUBLIC_SIGN_FAILED', error);
      return res.status(500).json({ ok: false, error: 'PUBLIC_SIGN_FAILED' });
    }
  });
};
