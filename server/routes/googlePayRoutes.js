import { getGooglePayPublicConfig, processGooglePayCharge } from '../services/googlePayService.js';

export const registerGooglePayRoutes = (app, { requireAuth, appUrl }) => {
  app.get('/api/payments/google-pay/config', (_req, res) => {
    return res.json({ ok: true, config: getGooglePayPublicConfig() });
  });

  app.post('/api/payments/google-pay', requireAuth, async (req, res) => {
    try {
      const { dossierId, resourceOrderId, offerCode, paymentData } = req.body || {};
      const result = await processGooglePayCharge({
        userId: req.auth.sub,
        dossierId,
        resourceOrderId,
        offerCode,
        paymentData,
        appUrl,
      });
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(error?.status || 500).json({
        ok: false,
        error: error?.message || 'GOOGLE_PAY_FAILED',
      });
    }
  });
};
