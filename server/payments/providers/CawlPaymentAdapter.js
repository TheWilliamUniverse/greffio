import crypto from 'node:crypto';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';
import {
  buildHostedCheckoutFields,
  isCawlETransactionsConfigured,
  parseETransactionsIpn,
  pickETransactionsServer,
  renderHostedCheckoutHtml,
  resolveCawlETransactionsConfig,
  verifyETransactionsIpnSignature,
} from './cawlETransactions.js';

/**
 * Adapter CAWL — paiements B2C via Up2pay e-Transactions (hosted checkout HMAC).
 *
 * Intégration basée sur l'exemple PHP CAWL / Worldline / Ingenico :
 *   - Redirection POST vers recette-tpeweb.e-transactions.fr (mode TEST)
 *   - Signature HMAC-SHA512 (PBX_HMAC)
 *   - IPN serveur-à-serveur sur /api/webhooks/cawl
 *
 * Variables d'environnement (mode TEST par défaut — CAWL_ENV=test) :
 *   CAWL_ENV                 test | production
 *   CAWL_PBX_SITE            Numéro de site (alias CAWL_MERCHANT_ID)
 *   CAWL_PBX_RANG            Numéro de rang
 *   CAWL_PBX_IDENTIFIANT     Identifiant site (alias CAWL_API_KEY_ID)
 *   CAWL_HMAC_KEY            Clé HMAC hex Vision (alias CAWL_API_KEY)
 *   CAWL_IPN_URL             URL IPN (défaut : API_BASE_URL/api/webhooks/cawl)
 *   CAWL_RETURN_URL          PBX_EFFECTUE
 *   CAWL_CANCEL_URL          PBX_ANNULE
 *   CAWL_REFUSE_URL          PBX_REFUSE
 *   CAWL_ETRANS_PUBKEY_PATH  Clé publique RSA pour vérifier l'IPN (optionnel)
 *   CAWL_SIGN_KEYSIZE        2048 (défaut)
 *   API_BASE_URL             Base pour l'URL intermédiaire hosted checkout
 *
 * Carte de test recette : 1111222233334444 · CVV 123 · date 12/28
 */
export class CawlPaymentAdapter {
  constructor(options = {}) {
    this.provider = PAYMENT_PROVIDERS.CAWL;
    this.fetchImpl = options.fetch || globalThis.fetch;
    this.allowStub = options.allowStub ?? process.env.NODE_ENV !== 'production';
    this.config = options.config || resolveCawlETransactionsConfig();
    this.apiBaseUrl = String(
      options.apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:8787',
    ).replace(/\/$/, '');
  }

  refreshConfig() {
    this.config = resolveCawlETransactionsConfig();
  }

  isConfigured() {
    this.refreshConfig();
    return isCawlETransactionsConfigured();
  }

  buildCheckoutRedirectUrl(internalPaymentId) {
    return `${this.apiBaseUrl}/api/payments/${encodeURIComponent(internalPaymentId)}/cawl/checkout`;
  }

  /**
   * @param {import('../types.js').CreatePaymentInput & { internalPaymentId: string }} input
   * @returns {Promise<import('../types.js').CreatePaymentResult>}
   */
  async createPayment(input) {
    this.refreshConfig();
    const returnUrl = input.returnUrl || this.config.returnUrl;
    const cancelUrl = input.cancelUrl || this.config.cancelUrl;

    if (!this.isConfigured()) {
      if (!this.allowStub) {
        throw new PaymentError('CAWL_NOT_CONFIGURED', 'CAWL e-Transactions non configuré.', 503);
      }
      const stubId = `cawl_stub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      return {
        internalPaymentId: input.internalPaymentId,
        provider: this.provider,
        providerPaymentId: stubId,
        checkoutUrl: `${returnUrl || '/paiement/verification'}?cawl_stub=${stubId}`,
        status: PAYMENT_STATUSES.PENDING,
        raw: {
          mode: 'stub',
          reason: 'CAWL e-Transactions credentials missing (allowed in non-production)',
        },
      };
    }

    const serverHost = await pickETransactionsServer(this.config.servers, this.fetchImpl);
    if (!serverHost) {
      throw new PaymentError('CAWL_SERVER_UNAVAILABLE', 'Aucun serveur e-Transactions disponible.', 502);
    }

    const customerEmail = input.metadata?.email
      || input.metadata?.customerEmail
      || null;

    const hosted = buildHostedCheckoutFields({
      internalPaymentId: input.internalPaymentId,
      amountCents: input.amount,
      customerEmail,
      returnUrl,
      cancelUrl,
      refuseUrl: this.config.refuseUrl,
      billing: input.metadata?.billing,
      cartQuantity: input.metadata?.cartQuantity || 1,
    }, this.config, serverHost);

    return {
      internalPaymentId: input.internalPaymentId,
      provider: this.provider,
      providerPaymentId: input.internalPaymentId,
      checkoutUrl: this.buildCheckoutRedirectUrl(input.internalPaymentId),
      status: PAYMENT_STATUSES.PENDING,
      raw: {
        integration: 'e-transactions-hmac',
        mode: this.config.mode,
        serverHost,
        actionUrl: hosted.actionUrl,
        fieldsPreview: {
          PBX_CMD: hosted.fields.PBX_CMD,
          PBX_TOTAL: hosted.fields.PBX_TOTAL,
          PBX_SITE: hosted.fields.PBX_SITE,
        },
      },
    };
  }

  /**
   * Génère le HTML de redirection POST pour un paiement persisté.
   * @param {Object} payment
   * @param {Object} [overrides]
   */
  async buildHostedCheckoutPage(payment, overrides = {}) {
    this.refreshConfig();
    if (!this.isConfigured()) {
      throw new PaymentError('CAWL_NOT_CONFIGURED', 'CAWL e-Transactions non configuré.', 503);
    }

    const serverHost = await pickETransactionsServer(this.config.servers, this.fetchImpl);
    if (!serverHost) {
      throw new PaymentError('CAWL_SERVER_UNAVAILABLE', 'Aucun serveur e-Transactions disponible.', 502);
    }

    const hosted = buildHostedCheckoutFields({
      internalPaymentId: payment.id,
      amountCents: payment.amountTotalCents,
      customerEmail: overrides.customerEmail
        || payment.metadata?.email
        || payment.metadata?.customerEmail
        || null,
      returnUrl: overrides.returnUrl || payment.providerPayload?.returnUrl || this.config.returnUrl,
      cancelUrl: overrides.cancelUrl || this.config.cancelUrl,
      refuseUrl: this.config.refuseUrl,
      billing: payment.metadata?.billing,
      cartQuantity: payment.metadata?.cartQuantity || 1,
    }, this.config, serverHost);

    return renderHostedCheckoutHtml(hosted);
  }

  /** @param {string} providerPaymentId */
  async getPaymentStatus(providerPaymentId) {
    return PAYMENT_STATUSES.PENDING;
  }

  /** @param {string} providerPaymentId @param {number} [amountCents] */
  async refundPayment(_providerPaymentId, _amountCents) {
    throw new PaymentError(
      'CAWL_REFUND_NOT_IMPLEMENTED',
      'Remboursement CAWL e-Transactions : contacter le back-office Vision.',
      501,
    );
  }

  /**
   * Traite l'IPN e-Transactions (PBX_REPONDRE_A).
   * Accepte query string urlencoded ou objet plat (Mt, Ref, Auto, Erreur, Sign).
   */
  async handleWebhook(payload, headers = {}, rawBody = '') {
    this.refreshConfig();

    const rawString = typeof rawBody === 'string' && rawBody
      ? rawBody
      : (typeof payload === 'string' ? payload : '');

    if (this.config.pubkeyPath && rawString.includes('Sign=')) {
      const verification = verifyETransactionsIpnSignature(rawString, this.config.pubkeyPath);
      if (!verification.ok) {
        return { ok: false, error: verification.reason };
      }
    } else if (this.config.mode === 'production' && this.config.pubkeyPath) {
      return { ok: false, error: 'ETRANS_SIGN_MISSING' };
    }

    const ipn = parseETransactionsIpn(
      typeof payload === 'object' && payload !== null && !Array.isArray(payload)
        ? payload
        : rawString,
    );

    if (!ipn.providerPaymentId) {
      return { ok: false, error: 'CAWL_IPN_NO_REFERENCE' };
    }

    return {
      ok: true,
      providerPaymentId: ipn.providerPaymentId,
      status: ipn.status,
      event: {
        type: 'ipn',
        integration: 'e-transactions-hmac',
        ...ipn,
      },
    };
  }

  /** Conservé pour compatibilité — l'IPN e-Transactions utilise RSA, pas HMAC webhook. */
  verifyWebhookSignature() {
    return { ok: true, reason: 'ETRANS_USES_RSA_IPN' };
  }

  mapCawlStatus(status) {
    const normalized = String(status || '').toLowerCase();
    switch (normalized) {
      case 'paid':
      case 'succeeded':
      case 'completed':
      case 'captured':
        return PAYMENT_STATUSES.PAID;
      case 'processing':
      case 'in_progress':
        return PAYMENT_STATUSES.PROCESSING;
      case 'requires_action':
      case 'requires_authentication':
        return PAYMENT_STATUSES.REQUIRES_ACTION;
      case 'failed':
      case 'declined':
      case 'expired':
        return PAYMENT_STATUSES.FAILED;
      case 'cancelled':
      case 'canceled':
      case 'abandoned':
        return PAYMENT_STATUSES.CANCELLED;
      case 'refunded':
        return PAYMENT_STATUSES.REFUNDED;
      case 'partially_refunded':
        return PAYMENT_STATUSES.PARTIALLY_REFUNDED;
      default:
        return PAYMENT_STATUSES.PENDING;
    }
  }
}
