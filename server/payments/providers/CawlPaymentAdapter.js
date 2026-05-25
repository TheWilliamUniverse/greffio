import crypto from 'node:crypto';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';

/**
 * Adapter CAWL — paiements B2C (carte, wallet, paiement ponctuel e-commerce).
 *
 * État actuel : la documentation publique CAWL n'est pas embarquée dans le
 * projet. On garde donc une intégration **abstraite et isolée** : toute la
 * surface réseau passe par `this.request()` ; pour brancher la vraie API
 * il suffira de remplir la base URL et les paths des trois endpoints
 * marqués `TODO[CAWL-API]` ci-dessous.
 *
 * Variables d'environnement attendues :
 *   CAWL_API_BASE_URL    Base REST (ex. https://api.cawl.io/v1)
 *   CAWL_API_KEY         Clé secrète serveur (CL2 API CAWL SECRETE)
 *   CAWL_API_KEY_ID      Identifiant clé API (optionnel, requis selon doc CAWL)
 *   CAWL_MERCHANT_ID     Identifiant marchand côté CAWL
 *   CAWL_WEBHOOK_SECRET  Secret HMAC pour la vérification webhook
 *   CAWL_RETURN_URL      URL de succès par défaut
 *   CAWL_CANCEL_URL      URL d'annulation par défaut
 */
export class CawlPaymentAdapter {
  constructor(options = {}) {
    this.provider = PAYMENT_PROVIDERS.CAWL;
    this.baseUrl = options.baseUrl || process.env.CAWL_API_BASE_URL || '';
    this.apiKey = options.apiKey || process.env.CAWL_API_KEY || '';
    this.apiKeyId = options.apiKeyId || process.env.CAWL_API_KEY_ID || '';
    this.merchantId = options.merchantId || process.env.CAWL_MERCHANT_ID || '';
    this.webhookSecret = options.webhookSecret || process.env.CAWL_WEBHOOK_SECRET || '';
    this.defaultReturnUrl = options.returnUrl || process.env.CAWL_RETURN_URL || '';
    this.defaultCancelUrl = options.cancelUrl || process.env.CAWL_CANCEL_URL || '';
    this.fetchImpl = options.fetch || globalThis.fetch;
    this.allowStub = options.allowStub ?? process.env.NODE_ENV !== 'production';
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  /**
   * Appel HTTP générique. Centralise les headers d'auth et le timeout pour
   * que la migration vers la vraie API CAWL ne touche qu'à ce point.
   */
  async request({ path, method = 'POST', body = null, headers = {} }) {
    if (!this.isConfigured()) {
      throw new PaymentError(
        'CAWL_NOT_CONFIGURED',
        'CAWL_API_BASE_URL ou CAWL_API_KEY manquant.',
        503,
      );
    }
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await this.fetchImpl(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(this.apiKeyId ? { 'X-Cawl-Key-Id': this.apiKeyId } : {}),
        ...(this.merchantId ? { 'X-Cawl-Merchant-Id': this.merchantId } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new PaymentError(
        'CAWL_API_ERROR',
        payload?.message || `CAWL request failed: ${response.status}`,
        502,
      );
    }
    return payload;
  }

  /**
   * Crée une intention de paiement CAWL et renvoie l'URL de hosted page.
   *
   * @param {import('../types.js').CreatePaymentInput & { internalPaymentId: string }} input
   * @returns {Promise<import('../types.js').CreatePaymentResult>}
   */
  async createPayment(input) {
    const returnUrl = input.returnUrl || this.defaultReturnUrl;
    const cancelUrl = input.cancelUrl || this.defaultCancelUrl;

    if (!this.isConfigured()) {
      if (!this.allowStub) {
        throw new PaymentError('CAWL_NOT_CONFIGURED', 'CAWL non configuré.', 503);
      }
      const stubId = `cawl_stub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      return {
        internalPaymentId: input.internalPaymentId,
        provider: this.provider,
        providerPaymentId: stubId,
        checkoutUrl: `${returnUrl || '/paiement/verification'}?cawl_stub=${stubId}`,
        status: PAYMENT_STATUSES.PENDING,
        raw: { mode: 'stub', reason: 'CAWL credentials missing (allowed in non-production)' },
      };
    }

    // TODO[CAWL-API]: brancher l'endpoint réel "checkout sessions" ou
    // "payment intent" selon la documentation CAWL. La forme ci-dessous est
    // un placeholder propre — adapter `path` et `body` quand la doc sera
    // disponible. Ne PAS inventer un endpoint qui n'existe pas.
    const payload = await this.request({
      path: '/checkout/sessions',
      method: 'POST',
      body: {
        merchant_id: this.merchantId || undefined,
        amount: input.amount,
        currency: input.currency || 'EUR',
        customer: { id: input.customerId },
        order_reference: input.orderId || input.invoiceId || input.internalPaymentId,
        description: input.description || 'Paiement Greffio',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        metadata: {
          ...input.metadata,
          internal_payment_id: input.internalPaymentId,
          customer_type: 'b2c',
        },
      },
    });

    return {
      internalPaymentId: input.internalPaymentId,
      provider: this.provider,
      providerPaymentId: payload.id || payload.session_id,
      checkoutUrl: payload.checkout_url || payload.redirect_url || payload.url,
      status: this.mapCawlStatus(payload.status),
      raw: payload,
    };
  }

  /**
   * @param {string} providerPaymentId
   * @returns {Promise<import('../types.js').PaymentStatusName>}
   */
  async getPaymentStatus(providerPaymentId) {
    if (!this.isConfigured()) return PAYMENT_STATUSES.PENDING;
    // TODO[CAWL-API]: endpoint de récupération paiement / session.
    const payload = await this.request({
      path: `/checkout/sessions/${encodeURIComponent(providerPaymentId)}`,
      method: 'GET',
    });
    return this.mapCawlStatus(payload?.status);
  }

  /**
   * @param {string} providerPaymentId
   * @param {number} [amountCents]
   */
  async refundPayment(providerPaymentId, amountCents) {
    if (!this.isConfigured()) {
      throw new PaymentError('CAWL_NOT_CONFIGURED', 'CAWL non configuré.', 503);
    }
    // TODO[CAWL-API]: endpoint de remboursement.
    await this.request({
      path: '/refunds',
      method: 'POST',
      body: {
        payment_id: providerPaymentId,
        amount: typeof amountCents === 'number' ? amountCents : undefined,
      },
    });
  }

  /**
   * Vérifie la signature HMAC-SHA256 du webhook CAWL.
   * Convention placeholder : header `X-Cawl-Signature: t=<unix>,v1=<hex>`.
   * À ajuster si CAWL utilise un autre schéma (JWT, X-Signature, etc.).
   */
  verifyWebhookSignature({ rawBody, signatureHeader }) {
    if (!this.webhookSecret) {
      return { ok: process.env.NODE_ENV !== 'production', reason: 'CAWL_WEBHOOK_SECRET_MISSING' };
    }
    if (!signatureHeader || !rawBody) {
      return { ok: false, reason: 'CAWL_SIGNATURE_MISSING' };
    }
    const parts = String(signatureHeader).split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) {
      return { ok: false, reason: 'CAWL_SIGNATURE_INVALID' };
    }
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(signedPayload)
      .digest('hex');
    let valid;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch (_error) {
      valid = false;
    }
    return valid ? { ok: true } : { ok: false, reason: 'CAWL_SIGNATURE_MISMATCH' };
  }

  /**
   * Lit le payload webhook et renvoie l'état normalisé.
   */
  async handleWebhook(payload, headers = {}, rawBody = '') {
    const verification = this.verifyWebhookSignature({
      rawBody,
      signatureHeader: headers['x-cawl-signature'] || headers['X-Cawl-Signature'],
    });
    if (!verification.ok) {
      return { ok: false, error: verification.reason };
    }
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const providerPaymentId = event?.data?.id || event?.session_id || event?.id || null;
    const status = this.mapCawlStatus(event?.data?.status || event?.status);
    return { ok: true, providerPaymentId, status, event };
  }

  /**
   * Mapping conservateur des statuts CAWL → statuts internes Greffio.
   * Compléter au fur et à mesure que la doc CAWL sera connue.
   */
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
      case 'pending':
      case 'created':
      case 'open':
      default:
        return PAYMENT_STATUSES.PENDING;
    }
  }
}
