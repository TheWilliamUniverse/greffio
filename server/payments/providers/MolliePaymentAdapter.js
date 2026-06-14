import {
  createMolliePayment,
  isMollieConfigured,
  isMolliePaidStatus,
  retrieveMolliePayment,
} from '../../mollie.js';
import { resolveMolliePaymentRedirectUrl, resolveMollieWebhookUrl } from '../../config/mollieUrls.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';
import { CUSTOMER_TYPES } from '../types.js';

/**
 * Adapter Mollie — paiements B2B (iDEAL, carte pro) et factures.
 * Interdit en B2C : les particuliers passent par CAWL.
 */
export class MolliePaymentAdapter {
  constructor() {
    this.provider = PAYMENT_PROVIDERS.MOLLIE;
  }

  isConfigured() {
    return isMollieConfigured();
  }

  /**
   * @param {import('../types.js').CreatePaymentInput & { internalPaymentId: string }} input
   */
  async createPayment(input) {
    if (input.customerType === CUSTOMER_TYPES.B2C && !input.invoiceId) {
      throw new PaymentError(
        'MOLLIE_FORBIDDEN_FOR_B2C',
        'Mollie est réservé aux paiements B2B et factures. Utiliser CAWL pour le B2C.',
        409,
      );
    }
    if (!this.isConfigured()) {
      throw new PaymentError('MOLLIE_NOT_CONFIGURED', 'MOLLIE_API_KEY manquant.', 503);
    }

    const metadata = {
      ...(input.metadata && typeof input.metadata === 'object' ? input.metadata : {}),
      internal_payment_id: input.internalPaymentId,
      customer_type: input.customerType,
      customer_id: input.customerId,
      dossier_id: input.dossierId || null,
      invoice_id: input.invoiceId || null,
    };

    const redirectUrl = input.returnUrl
      || resolveMolliePaymentRedirectUrl({
        dossierId: input.dossierId,
        resourceOrderId: input.orderId,
        invoiceId: input.invoiceId,
      });

    const method = input.metadata?.mollieMethod || input.metadata?.paymentMethod || null;

    const created = await createMolliePayment({
      amountTotalCents: input.amount,
      currency: input.currency || 'EUR',
      description: input.description || 'Paiement Greffio',
      metadata,
      redirectUrl,
      webhookUrl: resolveMollieWebhookUrl(),
      method: typeof method === 'string' && method !== 'card' ? method : null,
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
    const state = await retrieveMolliePayment({ providerPaymentId });
    if (isMolliePaidStatus(state.status)) return PAYMENT_STATUSES.PAID;
    return this.mapStatus(state.status);
  }

  mapStatus(providerStatus) {
    const status = String(providerStatus || '').toLowerCase();
    if (isMolliePaidStatus(status)) return PAYMENT_STATUSES.PAID;
    if (status === 'failed' || status === 'expired') return PAYMENT_STATUSES.FAILED;
    if (status === 'cancelled') return PAYMENT_STATUSES.CANCELLED;
    if (status === 'authorized') return PAYMENT_STATUSES.REQUIRES_ACTION;
    if (status === 'pending' || status === 'open') return PAYMENT_STATUSES.PENDING;
    return PAYMENT_STATUSES.PROCESSING;
  }
}
