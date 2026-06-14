import {
  CUSTOMER_TYPES,
  PAYMENT_PROVIDERS,
  PaymentError,
} from './types.js';

/**
 * Décision centralisée du PSP en fonction du type de client.
 *
 * Règles métier (référence : PAYMENTS_ARCHITECTURE.md) :
 *  - B2C  → CAWL (obligatoire)
 *  - B2B  → GoCardless par défaut, fallback manual_bank_transfer
 *  - GoCardless est INTERDIT en B2C
 *  - CAWL est INTERDIT pour les flux non-retail (B2B prélèvements abonnement)
 *
 * Ne dispersez jamais ces règles dans les routes ou l'UI ; passez par ce service.
 */
export class PaymentProviderResolver {
  /**
   * @param {Object} [options]
   * @param {Set<string>} [options.configuredProviders] Liste des providers
   *   actuellement configurés (clés env présentes). Sert au fallback B2B.
   */
  constructor(options = {}) {
    this.configuredProviders = options.configuredProviders || new Set();
  }

  /**
   * @param {'b2c'|'b2b'} customerType
   * @param {{ providerHint?: string }} [opts]
   * @returns {'cawl'|'gocardless'|'manual_bank_transfer'}
   */
  resolve(customerType, opts = {}) {
    if (customerType === CUSTOMER_TYPES.B2C) {
      return PAYMENT_PROVIDERS.CAWL;
    }

    if (customerType === CUSTOMER_TYPES.B2B) {
      const hint = opts.providerHint;
      if (hint && this.isProviderAllowedForCustomerType(hint, customerType)) {
        return hint;
      }
      if (this.configuredProviders.has(PAYMENT_PROVIDERS.GOCARDLESS)) {
        return PAYMENT_PROVIDERS.GOCARDLESS;
      }
      if (this.configuredProviders.has(PAYMENT_PROVIDERS.MOLLIE)) {
        return PAYMENT_PROVIDERS.MOLLIE;
      }
      return PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
    }

    throw new PaymentError(
      'UNSUPPORTED_CUSTOMER_TYPE',
      `Type de client non supporté : ${customerType}`,
      400,
    );
  }

  /**
   * Vérifie qu'un provider est compatible avec un type de client.
   * Lève une PaymentError sinon (utilisable comme assertion).
   */
  assertProviderAllowedForCustomerType(provider, customerType) {
    if (customerType === CUSTOMER_TYPES.B2C && provider === PAYMENT_PROVIDERS.GOCARDLESS) {
      throw new PaymentError(
        'GOCARDLESS_FORBIDDEN_FOR_B2C',
        'GoCardless n\'est pas autorisé pour les paiements B2C. Utiliser CAWL.',
        409,
      );
    }
    if (customerType === CUSTOMER_TYPES.B2C && provider !== PAYMENT_PROVIDERS.CAWL) {
      throw new PaymentError(
        'B2C_REQUIRES_CAWL',
        'Les paiements B2C doivent être traités via CAWL.',
        409,
      );
    }
    if (
      customerType === CUSTOMER_TYPES.B2B
      && provider === PAYMENT_PROVIDERS.CAWL
    ) {
      throw new PaymentError(
        'CAWL_NOT_CONFIGURED_FOR_B2B',
        'CAWL n\'est pas configuré pour les paiements B2B. Utiliser GoCardless, Mollie ou virement manuel.',
        409,
      );
    }
    if (
      customerType === CUSTOMER_TYPES.B2C
      && provider === PAYMENT_PROVIDERS.MOLLIE
    ) {
      throw new PaymentError(
        'MOLLIE_FORBIDDEN_FOR_B2C',
        'Mollie est réservé aux paiements B2B et factures. Utiliser CAWL pour le B2C.',
        409,
      );
    }
    return true;
  }

  /**
   * Variante non-bloquante (booléenne) — utile en UI/route pour suggérer.
   */
  isProviderAllowedForCustomerType(provider, customerType) {
    try {
      return this.assertProviderAllowedForCustomerType(provider, customerType);
    } catch (_error) {
      return false;
    }
  }
}
