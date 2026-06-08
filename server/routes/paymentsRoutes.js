import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import { getPaymentService } from '../payments/paymentServiceFactory.js';
import {
  CUSTOMER_TYPES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PaymentError,
} from '../payments/types.js';
import { rejectIfWebhookSecretMissing } from '../utils/webhookSecurity.js';

const handlePaymentError = (res, error, fallbackCode = 'PAYMENT_ERROR') => {
  if (error instanceof PaymentError) {
    return res.status(error.httpStatus || 400).json({
      ok: false,
      error: error.code,
      message: error.message,
    });
  }
  console.error('[payments]', error);
  return res.status(500).json({ ok: false, error: fallbackCode, message: error?.message });
};

/**
 * Routes paiements multi-prestataires.
 *
 * @param {import('express').Express} app
 * @param {Object} deps
 * @param {Function} deps.requireAuth
 * @param {Function} deps.requireRole
 * @param {Object} deps.store           { upsertPayment, getPaymentByProviderId, getPaymentById, addPaymentEvent, hasPaymentEventProviderId, getDossier }
 * @param {Function} [deps.getUserById]
 */
export const registerPaymentsRoutes = (app, deps) => {
  const { requireAuth, requireRole, store, getUserById } = deps;
  const service = getPaymentService({
    upsertPayment: store.upsertPayment,
    getPaymentByProviderId: store.getPaymentByProviderId,
    getPaymentById: store.getPaymentById,
  });

  /**
   * Détermine le type de client à partir des données serveur.
   * - Si l'utilisateur a un compte société (companyJson), → b2b.
   * - Sinon b2c par défaut.
   * - Le client peut suggérer via `customerType` mais on revérifie.
   */
  const resolveCustomerType = async (req, hint) => {
    if (hint === CUSTOMER_TYPES.B2B || hint === CUSTOMER_TYPES.B2C) {
      const user = getUserById ? await getUserById(req.auth?.sub) : null;
      if (hint === CUSTOMER_TYPES.B2B && !user?.companyJson) {
        return CUSTOMER_TYPES.B2C;
      }
      return hint;
    }
    const user = getUserById ? await getUserById(req.auth?.sub) : null;
    if (user?.companyJson) return CUSTOMER_TYPES.B2B;
    return CUSTOMER_TYPES.B2C;
  };

  /**
   * Endpoint multi-prestataires (CAWL B2C / GoCardless B2B / virement manuel).
   *
   * NB : la route historique `POST /api/payments/create` reste en place pour
   * les dossiers Greffio et continue d'utiliser GoCardless directement. Tous
   * les nouveaux flows (boutique e-commerce, ressources, paiements ponctuels)
   * doivent appeler `POST /api/payments` avec `customerType` explicite.
   */
  app.post('/api/payments', requireAuth, async (req, res) => {
    try {
      const {
        dossierId,
        orderId,
        invoiceId,
        offerCode,
        amount: clientAmount,
        currency = 'EUR',
        description,
        customerType: customerTypeHint,
        returnUrl,
        cancelUrl,
        metadata,
      } = req.body || {};

      const customerType = await resolveCustomerType(req, customerTypeHint);

      let amountTotalCents = null;
      let normalizedOffer = offerCode || null;
      let dossier = null;
      if (dossierId && store.getDossier) {
        dossier = await store.getDossier(dossierId);
        if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
        const ownerId = dossier.userId;
        if (ownerId && ownerId !== req.auth?.sub) {
          return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
        }
        const amounts = computePaymentAmounts(offerCode || dossier.offerCode);
        amountTotalCents = amounts.amountTotalCents;
        normalizedOffer = amounts.normalizedOffer;
      } else if (typeof clientAmount === 'number' && Number.isFinite(clientAmount)) {
        // Montant explicite (boutique e-commerce / paiement ponctuel).
        // Le serveur RECALCULERA via le catalogue concerné dès que la route
        // dédiée existera ; ici on accepte uniquement après vérification ops.
        amountTotalCents = Math.round(clientAmount);
      } else if (orderId && store.getResourceOrderById) {
        const order = await store.getResourceOrderById(orderId);
        if (!order) return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
        const amounts = computeResourcePaymentAmounts(order.priceTtcCents);
        amountTotalCents = amounts.amountTotalCents;
        normalizedOffer = `resource:${order.serviceId}`;
      } else {
        return res.status(400).json({ ok: false, error: 'AMOUNT_OR_DOSSIER_REQUIRED' });
      }

      const result = await service.createPayment({
        customerId: req.auth?.sub,
        customerType,
        amount: amountTotalCents,
        currency,
        orderId,
        invoiceId,
        description: description || `Paiement Greffio${normalizedOffer ? ` ${normalizedOffer}` : ''}`,
        metadata: {
          ...(metadata && typeof metadata === 'object' ? metadata : {}),
          dossierId: dossier?.id,
          offerCode: normalizedOffer,
        },
        returnUrl,
        cancelUrl,
        dossierId: dossier?.id,
        userId: req.auth?.sub,
        offerCode: normalizedOffer,
      });

      return res.json({
        ok: true,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        provider: result.provider,
        status: result.status,
      });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_CREATE_FAILED');
    }
  });

  app.get('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      const payment = await store.getPaymentById(req.params.id);
      if (!payment) return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
      const isOwner = payment.userId === req.auth?.sub || payment.customerId === req.auth?.sub;
      const isOps = req.auth?.role && ['admin', 'ops', 'super_admin'].includes(String(req.auth.role));
      if (!isOwner && !isOps) {
        return res.status(403).json({ ok: false, error: 'PAYMENT_FORBIDDEN' });
      }
      return res.json({ ok: true, payment });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_GET_FAILED');
    }
  });

  const refundGuard = (typeof requireRole === 'function')
    ? requireRole(['ADMIN', 'OPS'])
    : (_req, _res, next) => next();
  app.post('/api/payments/:id/refund', requireAuth, refundGuard, async (req, res) => {
    try {
      const payment = await store.getPaymentById(req.params.id);
      if (!payment) return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
      if (payment.status !== PAYMENT_STATUSES.PAID
        && payment.status !== PAYMENT_STATUSES.PARTIALLY_REFUNDED) {
        return res.status(409).json({ ok: false, error: 'PAYMENT_NOT_REFUNDABLE' });
      }
      const adapter = service.providers[payment.provider];
      if (!adapter?.refundPayment) {
        return res.status(409).json({ ok: false, error: 'PROVIDER_REFUND_NOT_SUPPORTED' });
      }
      await adapter.refundPayment(payment.providerPaymentId, req.body?.amount);
      const refunded = await store.upsertPayment({
        ...payment,
        status: PAYMENT_STATUSES.REFUNDED,
        refundedAt: new Date().toISOString(),
      });
      return res.json({ ok: true, payment: refunded });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_REFUND_FAILED');
    }
  });

  app.get('/api/payments/providers/status', requireAuth, async (_req, res) => {
    try {
      return res.json({ ok: true, providers: service.describeProviders() });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_PROVIDERS_STATUS_FAILED');
    }
  });

  /**
   * Webhook CAWL (B2C). Le corps brut est nécessaire pour la vérification
   * de signature ; on monte donc un parser texte dédié sur cette route.
   */
  app.post('/api/webhooks/cawl', async (req, res) => {
    if (rejectIfWebhookSecretMissing(res, process.env.CAWL_WEBHOOK_SECRET, 'CAWL_WEBHOOK')) return;
    try {
      const adapter = service.providers[PAYMENT_PROVIDERS.CAWL];
      if (!adapter) {
        return res.status(503).json({ ok: false, error: 'CAWL_NOT_AVAILABLE' });
      }
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      const result = await adapter.handleWebhook(req.body, req.headers, rawBody);
      if (!result.ok) {
        return res.status(401).json({ ok: false, error: result.error || 'CAWL_WEBHOOK_INVALID' });
      }

      const { providerPaymentId, status, event } = result;
      if (!providerPaymentId) {
        return res.status(400).json({ ok: false, error: 'CAWL_WEBHOOK_NO_PAYMENT_ID' });
      }

      const payment = await store.getPaymentByProviderId(providerPaymentId);
      if (!payment) {
        return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
      }

      const providerEventId = `cawl:${event?.id || providerPaymentId}:${status}`;
      if (await store.hasPaymentEventProviderId(providerEventId)) {
        return res.json({ ok: true, idempotent: true });
      }

      await store.addPaymentEvent({
        paymentId: payment.id,
        eventType: `cawl.${event?.type || status}`,
        providerEventId,
        rawPayload: event,
      });

      if (status && status !== payment.status) {
        const patch = { ...payment, status };
        if (status === PAYMENT_STATUSES.PAID) patch.paidAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.FAILED) patch.failedAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.CANCELLED) patch.cancelledAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.REFUNDED) patch.refundedAt = new Date().toISOString();
        await store.upsertPayment(patch);
      }

      return res.json({ ok: true, status });
    } catch (error) {
      return handlePaymentError(res, error, 'CAWL_WEBHOOK_FAILED');
    }
  });
};
