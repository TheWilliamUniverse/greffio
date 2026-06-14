import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import { getPaymentService } from '../payments/paymentServiceFactory.js';
import { isCawlETransactionsConfigured, isCawlEnabled } from '../payments/providers/cawlETransactions.js';
import {
  handleWorldlineEndpointVerification,
  isCawlWorldlineConfigured,
  parseWorldlineWebhookEvent,
  resolveCawlWorldlineConfig,
  verifyWorldlineWebhookSignature,
} from '../payments/providers/cawlWorldlineConnect.js';
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
        },
        returnUrl,
        cancelUrl,
        dossierId: dossier?.id,
        userId: req.auth?.sub,
        offerCode: normalizedOffer,
        flow: inferredFlow,
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
   * Page intermédiaire hosted checkout CAWL (POST auto-submit vers e-Transactions).
   * Le frontend redirige ici via checkoutUrl ; PBX_HMAC est recalculé à la volée.
   */
  app.get('/api/payments/:id/cawl/checkout', async (req, res) => {
    if (!isCawlEnabled()) {
      return res.status(410).send('CAWL est désactivé. Utilisez Mollie pour payer.');
    }
    try {
      const payment = await store.getPaymentById(req.params.id);
      if (!payment) return res.status(404).send('Paiement introuvable.');
      if (payment.provider !== PAYMENT_PROVIDERS.CAWL) {
        return res.status(409).send('Prestataire incompatible.');
      }
      if (payment.status !== PAYMENT_STATUSES.PENDING
        && payment.status !== PAYMENT_STATUSES.REQUIRES_ACTION) {
        return res.status(409).send('Ce paiement n\'est plus initialisable.');
      }

      const adapter = service.providers[PAYMENT_PROVIDERS.CAWL];
      if (!adapter?.buildHostedCheckoutPage) {
        return res.status(503).send('CAWL indisponible.');
      }

      const html = await adapter.buildHostedCheckoutPage(payment);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      // Page intermédiaire : autoriser les scripts inline (auto-POST) et la cible e-Transactions.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action https:",
      );
      return res.send(html);
    } catch (error) {
      console.error('[payments/cawl/checkout]', error);
      return res.status(502).send('Impossible d\'initialiser le paiement CAWL.');
    }
  });

  const handleCawlWebhook = async (req, res) => {
    if (!isCawlEnabled()) {
      return res.status(410).json({ ok: false, error: 'CAWL_DISABLED', message: 'CAWL est désactivé.' });
    }
    if (!isCawlETransactionsConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ ok: false, error: 'CAWL_NOT_CONFIGURED' });
    }
    try {
      const adapter = service.providers[PAYMENT_PROVIDERS.CAWL];
      if (!adapter) {
        return res.status(503).json({ ok: false, error: 'CAWL_NOT_AVAILABLE' });
      }

      const payload = {
        ...(req.query || {}),
        ...(req.body && typeof req.body === 'object' ? req.body : {}),
      };
      const rawBody = req.rawBody
        || (typeof req.body === 'string' ? req.body : new URLSearchParams(payload).toString());

      const result = await adapter.handleWebhook(payload, req.headers, rawBody);
      if (!result.ok) {
        return res.status(401).json({ ok: false, error: result.error || 'CAWL_WEBHOOK_INVALID' });
      }

      const { providerPaymentId, status, event } = result;
      if (!providerPaymentId) {
        return res.status(400).json({ ok: false, error: 'CAWL_WEBHOOK_NO_PAYMENT_ID' });
      }

      let payment = await store.getPaymentByProviderId(providerPaymentId);
      if (!payment && store.getPaymentById) {
        payment = await store.getPaymentById(providerPaymentId);
      }
      if (!payment) {
        return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
      }

      const providerEventId = `cawl:ipn:${providerPaymentId}:${event?.errorCode || status}:${event?.authNumber || 'na'}`;
      if (await store.hasPaymentEventProviderId(providerEventId)) {
        return res.send('OK');
      }

      await store.addPaymentEvent({
        paymentId: payment.id,
        eventType: `cawl.${event?.type || 'ipn'}`,
        providerEventId,
        rawPayload: event,
      });

      if (status && status !== payment.status) {
        const patch = { ...payment, status };
        if (status === PAYMENT_STATUSES.PAID) patch.paidAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.FAILED) patch.failedAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.CANCELLED) patch.cancelledAt = new Date().toISOString();
        if (status === PAYMENT_STATUSES.REFUNDED) patch.refundedAt = new Date().toISOString();
        const updated = await store.upsertPayment(patch);

        if (status === PAYMENT_STATUSES.PAID) {
          if (typeof handleResourceOrderPaymentPaid === 'function') {
            await handleResourceOrderPaymentPaid(updated);
          }
          if (updated.dossierId && typeof transitionDossierStatus === 'function') {
            await transitionDossierStatus({
              dossierId: updated.dossierId,
              nextStatus: DOSSIER_STATUSES?.PAYMENT_CONFIRMED || 'payment_confirmed',
              actorType: 'webhook',
              actorRole: ROLE?.WEBHOOK || 'webhook',
              reason: 'cawl_paid',
              metadata: { providerPaymentId, paymentConfirmed: true },
            });
          }
        }
      }

      return res.send('OK');
    } catch (error) {
      return handlePaymentError(res, error, 'CAWL_WEBHOOK_FAILED');
    }
  };

  /**
   * IPN CAWL e-Transactions (PBX_REPONDRE_A). Répond "OK" comme attendu par Up2pay.
   */
  app.post('/api/webhooks/cawl', handleCawlWebhook);
  app.get('/api/webhooks/cawl', handleCawlWebhook);

  const handleCawlWorldlineWebhook = async (req, res) => {
    if (!isCawlEnabled()) {
      return res.status(410).json({ ok: false, error: 'CAWL_DISABLED', message: 'CAWL est désactivé.' });
    }
    const endpointCheck = handleWorldlineEndpointVerification(req.headers);
    if (endpointCheck) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(endpointCheck.body);
    }

    if (!isCawlWorldlineConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ ok: false, error: 'CAWL_WORLDLINE_NOT_CONFIGURED' });
      }
      return res.status(401).json({ ok: false, error: 'CAWL_WORLDLINE_NOT_CONFIGURED' });
    }

    try {
      const cfg = resolveCawlWorldlineConfig();
      const rawBody = req.rawBody
        || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

      const verification = verifyWorldlineWebhookSignature({
        rawBody,
        headers: req.headers,
        webhookSecret: cfg.webhookSecret,
        expectedKeyId: cfg.webhookId,
      });
      if (!verification.ok) {
        return res.status(401).json({ ok: false, error: verification.reason || 'CAWL_WORLDLINE_WEBHOOK_INVALID' });
      }

      const parsed = parseWorldlineWebhookEvent(
        typeof req.body === 'object' && req.body !== null ? req.body : rawBody,
      );

      if (!parsed.providerPaymentId) {
        return res.status(200).json({ ok: true, received: true, unmatched: true });
      }

      let payment = await store.getPaymentByProviderId(parsed.providerPaymentId);
      if (!payment && store.getPaymentById) {
        payment = await store.getPaymentById(parsed.providerPaymentId);
      }
      if (!payment) {
        return res.status(200).json({ ok: true, received: true, unmatched: true });
      }

      const providerEventId = `cawl:worldline:${parsed.providerPaymentId}:${parsed.eventType}:${parsed.status}`;
      if (await store.hasPaymentEventProviderId(providerEventId)) {
        return res.status(200).json({ ok: true, duplicate: true });
      }

      await store.addPaymentEvent({
        paymentId: payment.id,
        eventType: `cawl.${parsed.eventType}`,
        providerEventId,
        rawPayload: parsed.raw,
      });

      if (parsed.status && parsed.status !== payment.status) {
        const patch = { ...payment, status: parsed.status };
        if (parsed.status === PAYMENT_STATUSES.PAID) patch.paidAt = new Date().toISOString();
        if (parsed.status === PAYMENT_STATUSES.FAILED) patch.failedAt = new Date().toISOString();
        if (parsed.status === PAYMENT_STATUSES.CANCELLED) patch.cancelledAt = new Date().toISOString();
        if (parsed.status === PAYMENT_STATUSES.REFUNDED) patch.refundedAt = new Date().toISOString();
        const updated = await store.upsertPayment(patch);

        if (parsed.status === PAYMENT_STATUSES.PAID) {
          if (typeof handleResourceOrderPaymentPaid === 'function') {
            await handleResourceOrderPaymentPaid(updated);
          }
          if (updated.dossierId && typeof transitionDossierStatus === 'function') {
            await transitionDossierStatus({
              dossierId: updated.dossierId,
              nextStatus: DOSSIER_STATUSES?.PAYMENT_CONFIRMED || 'payment_confirmed',
              actorType: 'webhook',
              actorRole: ROLE?.WEBHOOK || 'webhook',
              reason: 'cawl_worldline_paid',
              metadata: { providerPaymentId: parsed.providerPaymentId, paymentConfirmed: true },
            });
          }
        }
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return handlePaymentError(res, error, 'CAWL_WORLDLINE_WEBHOOK_FAILED');
    }
  };

  /**
   * Webhooks Worldline Connect (Payment API). Signature X-GCS-Signature / X-GCS-KeyId.
   * GET : vérification endpoint (header X-GCS-Webhooks-Endpoint-Verification).
   */
  app.post('/api/webhooks/cawl/worldline', handleCawlWorldlineWebhook);
  app.get('/api/webhooks/cawl/worldline', handleCawlWorldlineWebhook);
};
