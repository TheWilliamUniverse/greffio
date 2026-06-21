import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import { getPaymentService } from '../payments/paymentServiceFactory.js';
import {
  CUSTOMER_TYPES,
  PAYMENT_FLOWS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PaymentError,
} from '../payments/types.js';

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
  const {
    requireAuth,
    requireRole,
    store,
    getUserById,
    handleResourceOrderPaymentPaid,
    transitionDossierStatus,
    DOSSIER_STATUSES,
    ROLE,
  } = deps;
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

  app.get('/api/payments/terminal-config', async (req, res) => {
    try {
      const hint = String(req.query.customerType || CUSTOMER_TYPES.B2C).toLowerCase();
      const customerType = hint === CUSTOMER_TYPES.B2B ? CUSTOMER_TYPES.B2B : CUSTOMER_TYPES.B2C;
      const terminal = service.resolver.describeTerminalConfig(customerType);
      return res.json({
        ok: true,
        terminal,
        providers: service.describeProviders(),
      });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_TERMINAL_CONFIG_FAILED');
    }
  });

  /**
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
        orderId: orderIdRaw,
        resourceOrderId,
        invoiceId,
        offerCode,
        amount: clientAmount,
        currency = 'EUR',
        description,
        customerType: customerTypeHint,
        flow: flowHint,
        returnUrl,
        cancelUrl,
        metadata,
        mollieMethod,
        cardToken,
      } = req.body || {};

      const orderId = orderIdRaw || resourceOrderId || null;
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

      const inferredFlow = flowHint
        || (orderId ? PAYMENT_FLOWS.RESOURCE : null)
        || (dossierId && customerType === CUSTOMER_TYPES.B2C ? PAYMENT_FLOWS.B2C_CARD : null)
        || (dossierId ? PAYMENT_FLOWS.DOSSIER : null)
        || (invoiceId ? PAYMENT_FLOWS.INVOICE : null);

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
          paymentFlow: inferredFlow,
          mollieMethod: mollieMethod || metadata?.mollieMethod || null,
        },
        returnUrl,
        cancelUrl,
        dossierId: dossier?.id,
        userId: req.auth?.sub,
        offerCode: normalizedOffer,
        flow: inferredFlow,
        mollieMethod,
        cardToken,
      });

      return res.json({
        ok: true,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        checkoutMode: result.checkoutMode || null,
        provider: result.provider,
        status: result.status,
      });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_CREATE_FAILED');
    }
  });

  app.get('/api/payments/verification/status', requireAuth, async (req, res) => {
    try {
      const molliePaymentId = String(req.query.molliePaymentId || '').trim();
      const dossierId = String(req.query.dossierId || '').trim();
      const isOps = req.auth?.role && ['ADMIN', 'OPS', 'FORMALISTE', 'admin', 'ops', 'super_admin'].includes(String(req.auth.role));

      if (molliePaymentId) {
        const payment = await store.getPaymentByProviderId(molliePaymentId);
        if (!payment) {
          return res.json({ ok: true, status: 'pending', resolved: false });
        }
        const isOwner = payment.userId === req.auth?.sub || payment.customerId === req.auth?.sub;
        if (!isOwner && !isOps) {
          return res.status(403).json({ ok: false, error: 'PAYMENT_FORBIDDEN' });
        }
        return res.json({
          ok: true,
          resolved: true,
          status: payment.status,
          refundPending: payment.metadata?.refundPending === true,
          paymentId: payment.id,
          dossierId: payment.dossierId || null,
          resourceOrderId: payment.resourceOrderId || null,
        });
      }

      if (dossierId) {
        const dossier = await store.getDossier(dossierId);
        if (!dossier) {
          return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
        }
        const isOwner = dossier.userId && dossier.userId === req.auth?.sub;
        if (!isOwner && !isOps) {
          return res.status(403).json({ ok: false, error: 'DOSSIER_FORBIDDEN' });
        }
        return res.json({
          ok: true,
          resolved: true,
          dossierStatus: dossier.status,
          dossierId: dossier.id,
        });
      }

      return res.json({ ok: true, status: 'pending', resolved: false });
    } catch (error) {
      return handlePaymentError(res, error, 'PAYMENT_VERIFICATION_STATUS_FAILED');
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
};
