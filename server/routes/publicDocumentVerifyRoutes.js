import { healthRateLimiter } from '../security/rateLimits.js';
import { verifyDocumentPublic } from '../services/documentIntegrityService.js';

export const registerPublicDocumentVerifyRoutes = (app) => {
  app.get('/api/public/verify/document/:documentId', healthRateLimiter, async (req, res) => {
    try {
      const payload = await verifyDocumentPublic({
        documentId: req.params.documentId,
        token: req.query.token || null,
      });
      const statusCode = payload.status === 'not_found' ? 404 : 200;
      return res.status(statusCode).json(payload);
    } catch (error) {
      console.error('DOCUMENT_VERIFY_FAILED', error);
      return res.status(500).json({ ok: false, error: 'DOCUMENT_VERIFY_FAILED' });
    }
  });
};
