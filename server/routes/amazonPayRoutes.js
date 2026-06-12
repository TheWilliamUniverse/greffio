import express from 'express';
import {
  completeAmazonPayCheckoutSession,
  createAmazonPayCheckoutSession,
  getAmazonPayPublicConfig,
  handleAmazonPayIpn,
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

  app.post('/api/payments/amazon-pay/complete', requireAuth, async (req, res) => {
    try {
      const { paymentId, amazonCheckoutSessionId } = req.body || {};
      const result = await completeAmazonPayCheckoutSession({
        userId: req.auth.sub,
        paymentId,
        amazonCheckoutSessionId,
      });
      return res.json({
        ok: true,
        payment: result.payment,
        amazonPay: result.amazonPay,
        status: result.status,
      });
    } catch (error) {
      return res.status(error?.status || 500).json({
        ok: false,
        error: error?.message || 'AMAZON_PAY_COMPLETE_FAILED',
        details: error?.payload || undefined,
      });
    }
  });

  app.post('/api/webhooks/amazon-pay', express.text({ type: '*/*' }), async (req, res) => {
    try {
      const result = await handleAmazonPayIpn({
        rawBody: typeof req.body === 'string' ? req.body : '',
        headers: req.headers,
      });
      if (!result.ok) {
        return res.status(result.status || 500).json({
          ok: false,
          error: result.error || 'AMAZON_PAY_IPN_FAILED',
        });
      }
      return res.status(result.status || 200).json({ ok: true, ...result });
    } catch (error) {
      console.error('[amazon-pay] ipn error', error);
      return res.status(500).json({ ok: false, error: 'AMAZON_PAY_IPN_FAILED' });
    }
  });
};
