import fs from 'node:fs';
import {
  getSignatureRequestByTokenHash,
  hashSigningToken,
  markSignatureRequestOpened,
} from '../signatureRequestStore.js';
import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import { getClientIp } from '../utils/loginContext.js';
import { maskEmail } from '../services/signature/signatureUtils.js';
import { getSignatureConsentText, getSignatureLegalNotice, isSignatureOtpRequired } from '../services/signature/signatureConsent.js';
import { sendSignatureOtp, verifySignatureOtp, isSignatureOtpVerified } from '../services/signature/signatureOtpService.js';
import { recordSignatureAuditEvent } from '../services/signature/signatureAuditService.js';
import { sendWithProvider } from '../emails/provider.js';
import { buildDocumentVerifyUrl } from '../services/documentIntegrityService.js';
import { PROXY_MANDATE_DOC_KEY } from '../services/mandateSignatureService.js';

const resolvePublicDocumentTitle = (docKey) => {
  if (docKey === PROXY_MANDATE_DOC_KEY) return 'Procuration Greffio';
  return getEditableDocumentConfig(docKey)?.publicDocumentTitle || 'Document Greffio';
};

const resolveVerifyUrl = (request, appUrl) => {
  const evidence = request?.evidence || {};
  return buildDocumentVerifyUrl({
    appUrl,
    documentId: request?.documentId || evidence.documentId,
    verifyToken: evidence.verifyToken,
  });
};

const publicTokenError = () => ({
  ok: false,
  error: 'SIGNATURE_TOKEN_INVALID',
  message: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
});

export const registerSignaturePublicRoutes = (app, { getDossier, strictPublicRateLimitMiddleware, appUrl = null }) => {
  const loadRequest = async (req) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request) return { error: publicTokenError(), status: 404 };
    if (request.status === 'signed') return { request, signed: true };
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return {
        error: {
          ok: false,
          error: 'SIGNATURE_TOKEN_EXPIRED',
          message: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
        },
        status: 410,
      };
    }
    return { request, signed: false };
  };

  app.get('/api/signature/public/:token', strictPublicRateLimitMiddleware, async (req, res) => {
    const loaded = await loadRequest(req);
    if (loaded.error) return res.status(loaded.status).json(loaded.error);
    const { request, signed } = loaded;
    const dossier = await getDossier(request.dossierId);
    const editableConfig = getEditableDocumentConfig(request.docKey);
    const consent = getSignatureConsentText();
    const otpRequired = isSignatureOtpRequired() || Boolean(request.otpRequired);

    if (signed) {
      const evidence = request.evidence || {};
      return res.json({
        ok: true,
        status: 'signed',
        signerFullName: request.signerFullName,
        documentTitle: resolvePublicDocumentTitle(request.docKey),
        proofId: request.proofId || evidence.proofId,
        signedAt: request.signedAt || evidence.signedAt || null,
        verifyUrl: resolveVerifyUrl(request, appUrl),
        downloads: {
          signedDocumentUrl: `/api/signature/public/${req.params.token}/signed-document`,
          proofCertificateUrl: `/api/signature/public/${req.params.token}/proof-certificate`,
        },
      });
    }

    await markSignatureRequestOpened(request.id, getClientIp(req));
    await recordSignatureAuditEvent({
      signatureRequestId: request.id,
      eventType: 'link_opened',
      actorType: 'signer',
      actorEmail: request.signerEmail,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    return res.json({
      ok: true,
      status: request.status,
      signerFullName: request.signerFullName,
      signerEmail: request.signerEmail,
      signerEmailMasked: maskEmail(request.signerEmail),
      companyName: dossier?.companyName || dossier?.denomination || 'Greffio',
      documentTitle: resolvePublicDocumentTitle(request.docKey),
      pdfUrl: `/api/signature/public/${req.params.token}/pdf`,
      provider: 'internal',
      signature: {
        provider: 'greffio_internal',
        level: 'ses_reinforced',
        legalNotice: getSignatureLegalNotice(),
        consentText: consent.text,
        consentTextVersion: consent.version,
        otpRequired,
        otpVerified: otpRequired ? await isSignatureOtpVerified(request.id) : true,
      },
      timestamps: {
        expiresAt: request.expiresAt,
        openedAt: request.openedAt,
      },
    });
  });

  app.post('/api/signature/public/:token/otp/send', strictPublicRateLimitMiddleware, async (req, res) => {
    const loaded = await loadRequest(req);
    if (loaded.error) return res.status(loaded.status).json(loaded.error);
    const { request } = loaded;
    try {
      const result = await sendSignatureOtp({
        signatureRequestId: request.id,
        signerEmail: request.signerEmail,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        sendEmailFn: async ({ email, code }) => {
          await sendWithProvider({
            to: email,
            toName: request.signerFullName,
            subject: 'Votre code de validation Greffio',
            html: `<p>Bonjour,</p><p>Votre code de validation pour signer votre document Greffio est :</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>Ce code est valable pendant 10 minutes.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
            text: `Votre code Greffio : ${code} (valable 10 minutes)`,
            tags: ['signature', 'otp'],
          });
        },
      });
      if (!result.ok) {
        return res.status(429).json({ ok: false, error: result.error, retryAfterSeconds: result.retryAfterSeconds });
      }
      return res.json({ ok: true, maskedEmail: result.maskedEmail, expiresInSeconds: result.expiresInSeconds });
    } catch (error) {
      console.error('SIGNATURE_OTP_SEND_FAILED', error);
      return res.status(500).json({ ok: false, error: 'SIGNATURE_EMAIL_FAILED' });
    }
  });

  app.post('/api/signature/public/:token/otp/verify', strictPublicRateLimitMiddleware, async (req, res) => {
    const loaded = await loadRequest(req);
    if (loaded.error) return res.status(loaded.status).json(loaded.error);
    const { request } = loaded;
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ ok: false, error: 'SIGNATURE_OTP_INVALID' });
    }
    const result = await verifySignatureOtp({
      signatureRequestId: request.id,
      code,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    return res.json({ ok: true, verified: true });
  });

  app.get('/api/signature/public/:token/signed-document', strictPublicRateLimitMiddleware, async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    if (!request || request.status !== 'signed' || !request.signedPdfPath) {
      return res.status(404).json(publicTokenError());
    }
    if (!fs.existsSync(request.signedPdfPath)) {
      return res.status(404).json({ ok: false, error: 'SIGNATURE_DOCUMENT_NOT_FOUND' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document-signe-greffio.pdf"');
    return fs.createReadStream(request.signedPdfPath).pipe(res);
  });

  app.get('/api/signature/public/:token/proof-certificate', strictPublicRateLimitMiddleware, async (req, res) => {
    const request = await getSignatureRequestByTokenHash(hashSigningToken(req.params.token));
    const evidence = request?.evidence || {};
    const proofPath = request?.proofCertificatePath || evidence.proofCertificatePath;
    if (!request || request.status !== 'signed' || !proofPath) {
      return res.status(404).json(publicTokenError());
    }
    if (!fs.existsSync(proofPath)) {
      return res.status(404).json({ ok: false, error: 'SIGNATURE_PROOF_NOT_FOUND' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="certificat-preuve-signature-greffio.pdf"');
    return fs.createReadStream(proofPath).pipe(res);
  });
};
