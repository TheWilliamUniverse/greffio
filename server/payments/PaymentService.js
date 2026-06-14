import { randomUUID } from 'node:crypto';
import { PaymentProviderResolver } from './PaymentProviderResolver.js';
import { buildProviderRegistry, getConfiguredProviders } from './providers/index.js';
import {
  CUSTOMER_TYPES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PaymentError,
} from './types.js';

/**
 * Service haut-niveau de création/lecture de paiements.
 *
 * Responsabilités :
 *  - Résoudre le bon PSP via {@link PaymentProviderResolver}.
 *  - Recalculer/valider le montant côté serveur (l'appelant doit fournir un
 *    montant déjà calculé via `server/pricing.js`).
 *  - Persister le paiement (table `payments`).
 *  - Déléguer à l'adapter pour l'appel réseau et la création de la session.
 *
 * Aucun statut "paid" ne peut être positionné depuis le frontend : seuls les
 * webhooks signés (vérifiés par chaque adapter) ou un job ops manuel le font.
 */
export class PaymentService {
  /**
   * @param {Object} deps
   * @param {(input: Object) => Promise<Object>} deps.upsertPayment Persister (server/store.js#upsertPayment)
   * @param {(providerPaymentId: string) => Promise<Object|null>} [deps.getPaymentByProviderId]
   * @param {(id: string) => Promise<Object|null>} [deps.getPaymentById]
   * @param {PaymentProviderResolver} [deps.resolver]
   * @param {Record<string, import('./types.js').PaymentProviderAdapter>} [deps.providers]
   */
  constructor({ upsertPayment, getPaymentByProviderId, getPaymentById, resolver, providers } = {}) {
    if (!upsertPayment) throw new Error('PaymentService requires upsertPayment dependency');
    this.upsertPayment = upsertPayment;
    this.getPaymentByProviderId = getPaymentByProviderId;
    this.getPaymentById = getPaymentById;
    this.providers = providers || buildProviderRegistry();
    this.resolver = resolver || new PaymentProviderResolver({
      configuredProviders: getConfiguredProviders(this.providers),
    });
  }

  /**
   * @param {import('./types.js').CreatePaymentInput} input
   */
  async createPayment(input) {
    const normalizedInput = {
      ...input,
      customerId: input.customerId || input.userId || null,
    };
    this._validateInput(normalizedInput);

    const internalPaymentId = randomUUID();
    const flow = normalizedInput.flow || normalizedInput.metadata?.paymentFlow || null;
    const providerName = normalizedInput.providerOverride
      ? normalizedInput.providerOverride
      : flow
        ? this.resolver.resolveForFlow(flow, normalizedInput.customerType, {
          providerHint: normalizedInput.providerHint,
          invoiceId: normalizedInput.invoiceId,
        })
        : (normalizedInput.invoiceId && this.providers[PAYMENT_PROVIDERS.MOLLIE]?.isConfigured?.())
          ? PAYMENT_PROVIDERS.MOLLIE
          : this.resolver.resolve(normalizedInput.customerType, {
            providerHint: normalizedInput.providerHint,
          });

    this.resolver.assertProviderAllowedForCustomerType(providerName, normalizedInput.customerType);

    const adapter = this.providers[providerName];
    if (!adapter) {
      throw new PaymentError(
        'PROVIDER_NOT_AVAILABLE',
        `Provider non configuré: ${providerName}`,
        503,
      );
    }

    let creationResult;
    try {
      creationResult = await adapter.createPayment({
        ...normalizedInput,
        internalPaymentId,
      });
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        'PROVIDER_CREATE_FAILED',
        `Échec création paiement ${providerName}: ${error?.message || error}`,
        502,
      );
    }

    const persisted = await this.upsertPayment({
      id: internalPaymentId,
      customerId: normalizedInput.customerId,
      customerType: normalizedInput.customerType,
      dossierId: normalizedInput.dossierId || null,
      resourceOrderId: normalizedInput.orderId || null,
      invoiceId: normalizedInput.invoiceId || null,
      userId: normalizedInput.userId || null,
      offerCode: normalizedInput.offerCode || normalizedInput.description || null,
      amountTotalCents: normalizedInput.amount,
      amountServiceCents: normalizedInput.amount,
      amountLegalFeesCents: 0,
      currency: normalizedInput.currency || 'EUR',
      status: creationResult.status || PAYMENT_STATUSES.PENDING,
      provider: providerName,
      providerPaymentId: creationResult.providerPaymentId || null,
      providerCheckoutUrl: creationResult.checkoutUrl || null,
      providerPayload: creationResult.raw || {},
      paymentMethod: normalizedInput.mollieMethod
        || normalizedInput.metadata?.mollieMethod
        || normalizedInput.metadata?.paymentMethod
        || null,
      metadata: normalizedInput.metadata || null,
    });

    return {
      internalPaymentId,
      provider: providerName,
      providerPaymentId: creationResult.providerPaymentId || null,
      checkoutUrl: creationResult.checkoutUrl || null,
      checkoutMode: creationResult.checkoutMode || null,
      status: creationResult.status || PAYMENT_STATUSES.PENDING,
      payment: persisted,
    };
  }

  /** Renvoie un statut interne normalisé après lookup distant. */
  async getPaymentStatus({ provider, providerPaymentId }) {
    const adapter = this.providers[provider];
    if (!adapter) {
      throw new PaymentError('PROVIDER_NOT_AVAILABLE', `Provider non configuré: ${provider}`, 503);
    }
    return adapter.getPaymentStatus(providerPaymentId);
  }

  /** Liste lisible des providers et leur statut de configuration. */
  describeProviders() {
    return Object.entries(this.providers).map(([name, adapter]) => ({
      provider: name,
      configured: Boolean(adapter?.isConfigured?.()),
    }));
  }

  _validateInput(input) {
    if (!input || typeof input !== 'object') {
      throw new PaymentError('INVALID_INPUT', 'Payload paiement manquant.', 400);
    }
    if (!input.customerId) {
      throw new PaymentError('CUSTOMER_ID_REQUIRED', 'customerId requis.', 400);
    }
    if (!Object.values(CUSTOMER_TYPES).includes(input.customerType)) {
      throw new PaymentError(
        'INVALID_CUSTOMER_TYPE',
        'customerType doit valoir "b2c" ou "b2b".',
        400,
      );
    }
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new PaymentError(
        'INVALID_AMOUNT',
        'amount doit être un entier strictement positif en centimes.',
        400,
      );
    }
    if (input.currency && input.currency !== 'EUR') {
      throw new PaymentError('UNSUPPORTED_CURRENCY', 'Seul EUR est supporté.', 400);
    }
    if (input.providerOverride
      && !Object.values(PAYMENT_PROVIDERS).includes(input.providerOverride)) {
      throw new PaymentError('UNKNOWN_PROVIDER', 'Provider inconnu.', 400);
    }
  }
}
