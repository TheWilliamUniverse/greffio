import express from 'express';
import { rejectIfWebhookSecretMissing } from '../utils/webhookSecurity.js';
import { retrieveMolliePayment, isMolliePaidStatus, isMollieFailedStatus, resolveMollieRefundState, listMolliePaymentRefunds, hasMolliePendingRefund } from '../mollie.js';
import { notifyInvoicePaymentOutcome } from '../services/invoicePaymentNotifications.js';
import { queueInvoiceAfterPaymentSuccess } from '../services/qonto/invoiceOpsReviewService.js';

export const registerWebhookRoutes = (app, deps) => {
  const {
    parseResendWebhook,
    updateEmailEventByProviderMessageId,
    handleBrevoWebhookEvent,
    getPaymentByProviderId,
    hasPaymentEventProviderId,
    addPaymentEvent,
    upsertPayment,
    handleResourceOrderPaymentPaid,
    transitionDossierStatus,
    DOSSIER_STATUSES,
    ROLE,
    verifyGoCardlessWebhook,
    parseGoCardlessWebhookEvents,
    retrieveGoCardlessBillingRequest,
    isGoCardlessPaidStatus,
    getDossier,
    getUserById,
  } = deps;

  app.post('/api/webhooks/resend', express.text({ type: 'application/json' }), async (req, res) => {
    if (rejectIfWebhookSecretMissing(res, process.env.RESEND_WEBHOOK_SIGNING_SECRET, 'RESEND_WEBHOOK')) return;
    const signature = req.headers['resend-signature'];
    if (!signature) {
      return res.status(401).json({ ok: false, error: 'RESEND_SIGNATURE_MISSING' });
    }
    const verified = await parseResendWebhook({
      payload: req.body,
      signature: String(signature),
    });
    if (!verified.ok) {
      return res.status(401).json({ ok: false, error: 'RESEND_WEBHOOK_UNAUTHORIZED' });
    }
    const eventType = String(verified.event?.type || '');
    const normalizedStatus = eventType.includes('bounced')
      ? 'bounced'
      : eventType.includes('complained')
        ? 'complained'
        : eventType.includes('delivered')
          ? 'delivered'
          : eventType.includes('opened')
            ? 'opened'
            : eventType.includes('clicked')
              ? 'clicked'
              : 'received';
    const providerMessageId = verified.event?.data?.email_id || verified.event?.id || null;
    if (providerMessageId) {
      await updateEmailEventByProviderMessageId({
        providerMessageId,
        status: normalizedStatus,
        openedAt: normalizedStatus === 'opened' ? new Date().toISOString() : null,
        clickedAt: normalizedStatus === 'clicked' ? new Date().toISOString() : null,
        payloadPatch: { resendEvent: eventType },
      });
    }

    return res.json({
      ok: true,
      eventType: eventType || null,
      eventCreatedAt: verified.event?.created_at || null,
    });
  });

  app.post('/api/webhooks/brevo', express.json(), async (req, res) => {
    if (rejectIfWebhookSecretMissing(res, process.env.BREVO_WEBHOOK_SECRET, 'BREVO_WEBHOOK')) return;
    const token = req.query.token || req.headers['x-brevo-token'];
    const expectedSecret = process.env.BREVO_WEBHOOK_SECRET || '';
    if (String(token || '') !== expectedSecret) {
      return res.status(401).json({ ok: false, error: 'BREVO_WEBHOOK_UNAUTHORIZED' });
    }

    const events = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const event of events.filter(Boolean)) {
      results.push(await handleBrevoWebhookEvent(event));
    }

    return res.json({
      ok: true,
      processed: results.length,
      results,
    });
  });

  const handleMollieWebhook = async (req, res) => {
    const providerPaymentId = req.body?.id || req.query?.id;
    const eventType = 'payment.status_sync';

    if (!providerPaymentId) {
      return res.status(400).json({ ok: false, error: 'INVALID_WEBHOOK_PAYLOAD' });
    }

    const payment = await getPaymentByProviderId(providerPaymentId);
    if (!payment) {
      return res.status(404).json({ ok: false, error: 'PAYMENT_NOT_FOUND' });
    }

    let providerState;
    if (process.env.MOLLIE_API_KEY) {
      try {
        providerState = await retrieveMolliePayment({ providerPaymentId });
      } catch (error) {
        return res.status(502).json({
          ok: false,
          error: 'MOLLIE_PAYMENT_RETRIEVE_FAILED',
          message: error.message,
        });
      }
    } else {
      providerState = {
        providerPaymentId,
        status: 'paid',
        paidAt: new Date().toISOString(),
        raw: {
          provider: 'mollie',
          status: 'paid',
          mode: 'mock_fallback',
        },
      };
    }

    const providerEventId = `${providerPaymentId}:${providerState.status || 'status_sync'}`;
    if (await hasPaymentEventProviderId(providerEventId)) {
      return res.json({ ok: true, idempotent: true });
    }

    await addPaymentEvent({
      paymentId: payment.id,
      eventType,
      providerEventId,
      rawPayload: req.body || providerState.raw,
    });

    const previousStatus = payment.status;
    const refundState = resolveMollieRefundState(providerState);
    let refundPending = false;

    if (!refundState.internalStatus && process.env.MOLLIE_API_KEY) {
      try {
        const refunds = await listMolliePaymentRefunds({ providerPaymentId });
        refundPending = hasMolliePendingRefund(refunds);
      } catch (_error) {
        refundPending = false;
      }
    }

    if (refundState.internalStatus) {
      payment.status = refundState.internalStatus;
      payment.refundedAt = refundState.refundedAt || new Date().toISOString();
      payment.providerPayload = providerState.raw;
      payment.metadata = {
        ...(payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}),
        refundPending: false,
      };
      await upsertPayment(payment);
    } else if (refundPending) {
      payment.providerPayload = providerState.raw;
      payment.metadata = {
        ...(payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}),
        refundPending: true,
      };
      await upsertPayment(payment);
    } else if (
      isMolliePaidStatus(providerState.status) && payment.status !== 'paid'
    ) {
      payment.status = 'paid';
      payment.paidAt = providerState.paidAt || new Date().toISOString();
      payment.providerPayload = providerState.raw;
      const updated = await upsertPayment(payment);

      if (updated.invoiceId) {
        await notifyInvoicePaymentOutcome({ payment: updated, outcome: 'paid' });
      }

      const resourceHandled = await handleResourceOrderPaymentPaid(updated);
      if (!resourceHandled?.handled && updated.dossierId) {
        await transitionDossierStatus({
          dossierId: updated.dossierId,
          nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
          actorType: 'webhook',
          actorRole: ROLE.WEBHOOK,
          reason: 'mollie_paid',
          metadata: { providerPaymentId, paymentConfirmed: true },
        });
      }

      if (getDossier) {
        const dossier = updated.dossierId ? await getDossier(updated.dossierId) : null;
        void queueInvoiceAfterPaymentSuccess({
          payment: updated,
          dossier,
          getUserById,
        }).catch((invoiceError) => {
          console.error('[mollie-webhook] invoice queue failed', invoiceError?.message || invoiceError);
        });
      }
    } else if (
      isMollieFailedStatus(providerState.status)
      && previousStatus !== 'failed'
      && payment.invoiceId
    ) {
      payment.status = 'failed';
      payment.failedAt = new Date().toISOString();
      payment.providerPayload = providerState.raw;
      const updated = await upsertPayment(payment);
      await notifyInvoicePaymentOutcome({ payment: updated, outcome: 'failed' });
    }

    return res.json({ ok: true, paymentStatus: payment.status });
  };

  app.post('/webhooks/mollie', express.urlencoded({ extended: false }), handleMollieWebhook);
  app.post('/api/mollie/webhook', express.urlencoded({ extended: false }), handleMollieWebhook);
  app.post('/api/webhooks/mollie', express.urlencoded({ extended: false }), handleMollieWebhook);

  const handleGoCardlessWebhook = async (req, res) => {
    if (rejectIfWebhookSecretMissing(res, process.env.GOCARDLESS_WEBHOOK_SECRET, 'GOCARDLESS_WEBHOOK')) return;
    const rawBody = req.body;
    const signatureHeader = req.headers['webhook-signature'];
    const secret = process.env.GOCARDLESS_WEBHOOK_SECRET || '';

    const verified = verifyGoCardlessWebhook({
      rawBody,
      signatureHeader,
      secret,
    });
    if (!verified.ok && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ ok: false, error: verified.error || 'GOCARDLESS_WEBHOOK_UNAUTHORIZED' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (_error) {
      return res.status(400).json({ ok: false, error: 'INVALID_WEBHOOK_PAYLOAD' });
    }

    const events = parseGoCardlessWebhookEvents(payload);
    for (const event of events) {
      const providerPaymentId = event.billingRequestId || event.paymentId;
      if (!providerPaymentId) continue;

      const payment = await getPaymentByProviderId(providerPaymentId)
        || (event.paymentId ? await getPaymentByProviderId(event.paymentId) : null);
      if (!payment) continue;

      let providerState;
      if (payment.provider === 'gocardless' && event.billingRequestId) {
        try {
          providerState = await retrieveGoCardlessBillingRequest({ providerPaymentId: event.billingRequestId });
        } catch (_error) {
          providerState = { status: event.action, providerPaymentId: event.billingRequestId };
        }
      } else {
        providerState = {
          status: ['confirmed', 'paid_out', 'fulfilled'].includes(event.action) ? 'paid' : event.action,
          providerPaymentId,
        };
      }

      const providerEventId = event.id || `${providerPaymentId}:${event.action}`;
      if (await hasPaymentEventProviderId(providerEventId)) {
        continue;
      }

      await addPaymentEvent({
        paymentId: payment.id,
        eventType: `gocardless.${event.resourceType}.${event.action}`,
        providerEventId,
        rawPayload: event.raw,
      });

      if (isGoCardlessPaidStatus(providerState.status) && payment.status !== 'paid') {
        payment.status = 'paid';
        payment.paidAt = providerState.paidAt || new Date().toISOString();
        payment.providerPayload = providerState.raw || event.raw;
        await upsertPayment(payment);

        const resourceHandled = await handleResourceOrderPaymentPaid(payment);
        if (!resourceHandled?.handled && payment.dossierId) {
          await transitionDossierStatus({
            dossierId: payment.dossierId,
            nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
            actorType: 'webhook',
            actorRole: ROLE.WEBHOOK,
            reason: 'gocardless_paid',
            metadata: { providerPaymentId, paymentConfirmed: true },
          });
        }
      }
    }

    return res.json({ ok: true, processed: events.length });
  };

  app.post('/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);
  app.post('/api/webhooks/gocardless', express.text({ type: '*/*' }), handleGoCardlessWebhook);
};
