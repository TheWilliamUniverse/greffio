import {
  createGoCardlessCheckout,
  isGoCardlessPaidStatus,
  retrieveGoCardlessBillingRequest,
  verifyGoCardlessWebhook,
  parseGoCardlessWebhookEvents,
} from '../../gocardless.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';
import { CUSTOMER_TYPES } from '../types.js';

/**
 * Adapter GoCardless – RÉSERVÉ aux paiements B2B (SEPA / virement).
 *
 * Toute tentative d'utilisation pour un client B2C doit être rejetée avant
 * d'arriver ici (PaymentProviderResolver), mais on rajoute une garde
 * défensive en interne pour éviter toute fuite de logique.
 */
export class GoCardlessAdapter {
  constructor() {
    this.provider = PAYMENT_PROVIDERS.GOCARDLESS;
  }

  isConfigured() {
    return Boolean(process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY);
  }

  /**
   * @param {import('../types.js').CreatePaymentInput & { internalPaymentId: string }} input
   */
  async createPayment(input) {
    if (input.customerType === CUSTOMER_TYPES.B2C) {
      throw new PaymentError(
        'GOCARDLESS_FORBIDDEN_FOR_B2C',
        'GoCardless ne peut pas créer un paiement B2C.',
        409,
      );
    }
    if (!this.isConfigured()) {
      throw new PaymentError(
        'GOCARDLESS_NOT_CONFIGURED',
        'GOCARDLESS_ACCESS_TOKEN manquant.',
        503,
      );
    }
    const created = await createGoCardlessCheckout({
      amountTotalCents: input.amount,
      currency: input.currency || 'EUR',
      metadata: {
        ...input.metadata,
        internal_payment_id: input.internalPaymentId,
        customer_type: input.customerType,
        customer_id: input.customerId,
      },
      redirectUrl: input.returnUrl,
      exitUrl: input.cancelUrl || input.returnUrl,
      description: input.description || 'Paiement Greffio B2B',
    });

    return {
      internalPaymentId: input.internalPaymentId,
      provider: this.provider,
      providerPaymentId: created.providerPaymentId,
      checkoutUrl: created.checkoutUrl,
      status: this.mapStatus(created.status),
      raw: created.raw,
    };
  }

  async getPaymentStatus(providerPaymentId) {
    if (!this.isConfigured()) return PAYMENT_STATUSES.PENDING;
    const state = await retrieveGoCardlessBillingRequest({ providerPaymentId });
    if (isGoCardlessPaidStatus(state.status)) return PAYMENT_STATUSES.PAID;
    return this.mapStatus(state.status);
  }

  async handleWebhook(payload, headers = {}, rawBody = '') {
    const signature = headers['webhook-signature'] || headers['Webhook-Signature'];
    const verification = verifyGoCardlessWebhook({
      rawBody,
      signatureHeader: signature,
      secret: process.env.GOCARDLESS_WEBHOOK_SECRET || '',
    });
    if (!verification.ok && process.env.NODE_ENV === 'production') {
      return { ok: false, error: verification.error || 'GOCARDLESS_WEBHOOK_UNAUTHORIZED' };
    }
    const events = parseGoCardlessWebhookEvents(typeof payload === 'string' ? JSON.parse(payload) : payload);
    return { ok: true, events };
  }

  mapStatus(status) {
    const value = String(status || '').toLowerCase();
    if (isGoCardlessPaidStatus(value)) return PAYMENT_STATUSES.PAID;
    if (['cancelled', 'canceled', 'expired'].includes(value)) return PAYMENT_STATUSES.CANCELLED;
    if (['failed', 'rejected'].includes(value)) return PAYMENT_STATUSES.FAILED;
    if (['submitted', 'processing', 'pending_submission'].includes(value)) return PAYMENT_STATUSES.PROCESSING;
    return PAYMENT_STATUSES.PENDING;
  }
}
