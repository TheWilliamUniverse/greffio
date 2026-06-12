import {
  createAmazonPayCheckoutSession,
  getAmazonPayPublicConfig,
} from '../services/amazonPayService.js';

export const registerAmazonPayRoutes = (app, { requireAuth, appUrl }) => {
  app.get('/api/payments/amazon-pay/config', (_req, res) => (
    res.json({ ok: true, config: getAmazonPayPublicConfig() })
  ));

  app.post('/api/payments/amazon-pay/session', requireAuth, async (req, res) => {
    try {
      const { dossierId, resourceOrderId, offerCode } = req.body || {};
      const result = await createAmazonPayCheckoutSession({
        userId: req.auth.sub,
        dossierId,
        resourceOrderId,
        offerCode,
        appUrl,
      });
      return res.json({
        ok: true,
        payment: result.payment,
        config: result.config,
        createCheckoutSessionConfig: result.createCheckoutSessionConfig,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        ok: false,
        error: error?.message || 'AMAZON_PAY_SESSION_FAILED',
      });
    }
  });
};
