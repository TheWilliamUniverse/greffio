import { retrieveMolliePayment, isMolliePaidStatus } from '../mollie.js';
import { resolveMollieUrls } from '../config/mollieUrls.js';

/**
 * Routes publiques Mollie (callback utilisateur + diagnostic).
 */
export const registerMollieRoutes = (app, deps = {}) => {
  const appUrl = deps.appUrl || process.env.APP_URL || 'https://greffio.willentreprises.com';

  app.get('/api/mollie/callback', async (req, res) => {
    const dossierId = String(req.query.dossierId || '').trim();
    const resourceOrderId = String(req.query.resourceOrderId || '').trim();
    const invoiceId = String(req.query.invoiceId || '').trim();
    const molliePaymentId = String(req.query.id || '').trim();

    let paymentStatus = null;
    if (molliePaymentId && process.env.MOLLIE_API_KEY) {
      try {
        const state = await retrieveMolliePayment({ providerPaymentId: molliePaymentId });
        paymentStatus = state.status;
      } catch (_error) {
        paymentStatus = null;
      }
    }

    const params = new URLSearchParams();
    if (dossierId) params.set('dossierId', dossierId);
    if (resourceOrderId) params.set('resourceOrderId', resourceOrderId);
    if (invoiceId) params.set('invoiceId', invoiceId);
    if (molliePaymentId) params.set('molliePaymentId', molliePaymentId);
    if (paymentStatus) params.set('status', paymentStatus);

    const qs = params.toString();
    const target = qs
      ? `${appUrl}/paiement/verification?${qs}`
      : `${appUrl}/paiement/verification`;

    return res.redirect(302, target);
  });

  app.get('/api/mollie/status', (_req, res) => {
    const urls = resolveMollieUrls();
    return res.json({
      ok: true,
      configured: Boolean(process.env.MOLLIE_API_KEY),
      webhookUrl: urls.webhookUrl,
      callbackUrl: urls.callbackUrl,
      apiPublicUrl: urls.apiPublicUrl,
    });
  });
};
