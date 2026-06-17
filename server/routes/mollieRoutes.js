import { retrieveMolliePayment, isMolliePaidStatus, listMollieMethods, getMollieProfileId, isMollieTestMode } from '../mollie.js';
import { describeMolliePaymentStatus } from '../config/mollieUrls.js';

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

  app.get('/api/mollie/status', (_req, res) => (
    res.json({ ok: true, ...describeMolliePaymentStatus() })
  ));

  app.get('/api/mollie/methods', async (req, res) => {
    if (!process.env.MOLLIE_API_KEY) {
      return res.status(503).json({ ok: false, error: 'MOLLIE_NOT_CONFIGURED' });
    }
    try {
      const amount = Number(req.query.amount || 0);
      const currency = String(req.query.currency || 'EUR').toUpperCase();
      const locale = String(req.query.locale || 'fr_FR');
      const methods = await listMollieMethods({
        amountTotalCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null,
        currency,
        locale,
      });
      return res.json({
        ok: true,
        methods,
        profileId: getMollieProfileId(),
        testmode: isMollieTestMode(),
      });
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'MOLLIE_METHODS_FAILED',
        message: error?.message,
      });
    }
  });
};
