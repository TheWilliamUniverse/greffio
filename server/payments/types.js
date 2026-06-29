/**
 * Types et constantes communs à l'architecture de paiement multi-prestataires.
 *
 * Le projet est en JavaScript ESM ; on documente les types via JSDoc pour
 * conserver la rigueur attendue par le prompt sans introduire de toolchain TS.
 */

export const CUSTOMER_TYPES = Object.freeze({
  B2C: 'b2c',
  B2B: 'b2b',
});

/**
 * Providers supportés ou réservés (stubs futurs).
 * - mollie              : PSP principal (B2C carte, B2B, factures)
 * - cawl                : legacy dormant (CAWL_ENABLED=true)
 * - gocardless          : SEPA / virement, autorisé uniquement en B2B
 * - qonto               : rapprochement bancaire, jamais PSP B2C
 * - manual_bank_transfer: virement manuel B2B
 * - amazon_pay          : valeur historique en base uniquement (intégration retirée)
 * - stripe / payplug    : providers futurs (non actifs)
 */
export const PAYMENT_PROVIDERS = Object.freeze({
  CAWL: 'cawl',
  GOCARDLESS: 'gocardless',
  MOLLIE: 'mollie',
  QONTO: 'qonto',
  MANUAL_BANK_TRANSFER: 'manual_bank_transfer',
  STRIPE: 'stripe',
  PAYPLUG: 'payplug',
});

export const PAYMENT_PROVIDER_LIST = Object.freeze(Object.values(PAYMENT_PROVIDERS));

/**
 * Flux métier Greffio – source unique pour le routing PSP (voir PaymentProviderResolver).
 */
export const PAYMENT_FLOWS = Object.freeze({
  B2C_CARD: 'b2c_card',
  B2C_WALLET: 'b2c_wallet',
  B2B_SEPA: 'b2b_sepa',
  INVOICE: 'invoice',
  RESOURCE: 'resource',
  DOSSIER: 'dossier',
  FORMALITY: 'formality',
});

export const PAYMENT_FLOW_LIST = Object.freeze(Object.values(PAYMENT_FLOWS));

/** Statuts internes normalisés. Ne jamais exposer les statuts bruts des PSP. */
export const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

export const PAYMENT_STATUS_LIST = Object.freeze(Object.values(PAYMENT_STATUSES));

export const TERMINAL_STATUSES = new Set([
  PAYMENT_STATUSES.PAID,
  PAYMENT_STATUSES.FAILED,
  PAYMENT_STATUSES.CANCELLED,
  PAYMENT_STATUSES.REFUNDED,
]);

/**
 * @typedef {'b2c'|'b2b'} CustomerType
 *
 * @typedef {'cawl'|'gocardless'|'mollie'|'qonto'|'manual_bank_transfer'|'amazon_pay'|'stripe'|'payplug'} PaymentProviderName
 *
 * @typedef {'pending'|'requires_action'|'processing'|'paid'|'failed'|'cancelled'|'refunded'|'partially_refunded'} PaymentStatusName
 *
 * @typedef {Object} CreatePaymentInput
 * @property {string} customerId
 * @property {CustomerType} customerType
 * @property {number} amount               Montant en centimes (entier).
 * @property {'EUR'} [currency]
 * @property {string} [orderId]
 * @property {string} [invoiceId]
 * @property {string} [description]
 * @property {Record<string, unknown>} [metadata]
 * @property {string} [returnUrl]
 * @property {string} [cancelUrl]
 * @property {string} [dossierId]
 * @property {string} [userId]
 * @property {string} [offerCode]
 * @property {PaymentProviderName} [providerOverride] Force un provider – vérifié par le resolver.
 *
 * @typedef {Object} CreatePaymentResult
 * @property {string} internalPaymentId
 * @property {PaymentProviderName} provider
 * @property {string} [providerPaymentId]
 * @property {string} [checkoutUrl]
 * @property {PaymentStatusName} status
 * @property {Record<string, unknown>} [raw]
 *
 * @typedef {Object} PaymentProviderAdapter
 * @property {PaymentProviderName} provider
 * @property {(input: CreatePaymentInput) => Promise<CreatePaymentResult>} createPayment
 * @property {(providerPaymentId: string) => Promise<PaymentStatusName>} getPaymentStatus
 * @property {(providerPaymentId: string, amount?: number) => Promise<void>} [refundPayment]
 * @property {(payload: unknown, headers: Record<string,string>, rawBody: string|Buffer) => Promise<{ok: boolean, status?: PaymentStatusName, providerPaymentId?: string}>} [handleWebhook]
 * @property {() => boolean} isConfigured
 */

/**
 * Erreur métier paiement – toujours rejeter via cette classe pour que les
 * routes API renvoient un code HTTP propre.
 */
export class PaymentError extends Error {
  /**
   * @param {string} code Code court machine readable.
   * @param {string} [message] Message lisible (FR).
   * @param {number} [httpStatus] Code HTTP suggéré.
   */
  constructor(code, message, httpStatus = 400) {
    super(message || code);
    this.name = 'PaymentError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** CAWL / e-Transactions : actif uniquement si explicitement activé (recette). */
export const isCawlPaymentEnabled = () => String(process.env.CAWL_ENABLED || '').trim().toLowerCase() === 'true';
