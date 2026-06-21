import {
  createMolliePayment,
  isMollieConfigured,
  isMolliePaidStatus,
  isMollieRefundedStatus,
  listMollieMethods,
  normalizeMollieMethod,
  resolveMollieRefundState,
  retrieveMolliePayment,
} from '../../mollie.js';
import { resolveMolliePaymentRedirectUrl, resolveMollieWebhookUrl } from '../../config/mollieUrls.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';

/**
 * Adapter Mollie – PSP principal Greffio (B2C carte, B2B, factures).
 * Checkout avancé : Methods API + Components (carte) + hosted (Apple Pay, virement).
 */
export class MolliePaymentAdapter {
  constructor() {
    this.provider = PAYMENT_PROVIDERS.MOLLIE;
  }

  isConfigured() {
    return isMollieConfigured();
  }

  async listMethods({ amount, currency = 'EUR', locale = 'fr_FR' } = {}) {
    if (!this.isConfigured()) {
      throw new PaymentError('MOLLIE_NOT_CONFIGURED', 'MOLLIE_API_KEY manquant.', 503);
    }
    return listMollieMethods({
      amountTotalCents: amount,
      currency,
      locale,
    });
  }

  /**
   * @param {import('../types.js').CreatePaymentInput & { internalPaymentId: string }} input
   */
  async createPayment(input) {
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

    const methodHint = input.mollieMethod
      || input.metadata?.mollieMethod
      || input.metadata?.paymentMethod
      || null;
    const cardToken = input.cardToken || input.metadata?.cardToken || null;
    const method = methodHint ? normalizeMollieMethod(methodHint) : null;

    if (method === 'creditcard' && !cardToken) {
      // Pré-sélection carte sans token : hosted Mollie (fallback).
    }

    const created = await createMolliePayment({
      amountTotalCents: input.amount,
      currency: input.currency || 'EUR',
      description: input.description || 'Paiement Greffio',
      metadata,
      redirectUrl,
      webhookUrl: resolveMollieWebhookUrl(),
      method,
      cardToken,
    });

    return {
      internalPaymentId: input.internalPaymentId,
      provider: this.provider,
      providerPaymentId: created.providerPaymentId,
      checkoutUrl: created.checkoutUrl,
      checkoutMode: created.checkoutMode,
      status: this.mapStatus(created.status),
      raw: created.raw,
    };
  }

  async getPaymentStatus(providerPaymentId) {
    if (!this.isConfigured()) return PAYMENT_STATUSES.PENDING;
    const state = await retrieveMolliePayment({ providerPaymentId });
    const refundState = resolveMollieRefundState(state.raw || state);
    if (refundState.internalStatus) return refundState.internalStatus;
    if (isMolliePaidStatus(state.status)) return PAYMENT_STATUSES.PAID;
    return this.mapStatus(state.status);
  }

  mapStatus(providerStatus) {
    const status = String(providerStatus || '').toLowerCase();
    if (isMollieRefundedStatus(status)) return PAYMENT_STATUSES.REFUNDED;
    if (status === 'partially_refunded') return PAYMENT_STATUSES.PARTIALLY_REFUNDED;
    if (isMolliePaidStatus(status)) return PAYMENT_STATUSES.PAID;
    if (status === 'failed' || status === 'expired') return PAYMENT_STATUSES.FAILED;
    if (status === 'cancelled') return PAYMENT_STATUSES.CANCELLED;
    if (status === 'authorized') return PAYMENT_STATUSES.REQUIRES_ACTION;
    if (status === 'pending' || status === 'open') return PAYMENT_STATUSES.PENDING;
    return PAYMENT_STATUSES.PROCESSING;
  }
}
