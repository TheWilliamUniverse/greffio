import {
  CUSTOMER_TYPES,
  PAYMENT_FLOWS,
  PAYMENT_PROVIDERS,
  PaymentError,
} from './types.js';
import { getMollieProfileId, isMollieTestMode } from '../mollie.js';

const B2B_PROVIDER_PRIORITY = Object.freeze([
  PAYMENT_PROVIDERS.GOCARDLESS,
  PAYMENT_PROVIDERS.MOLLIE,
  PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER,
]);

const normalizeB2bDefault = (env = process.env) => {
  const raw = String(env.PAYMENT_B2B_DEFAULT_PROVIDER || '').trim().toLowerCase();
  if (raw && Object.values(PAYMENT_PROVIDERS).includes(raw)) return raw;
  return null;
};

/**
 * Décision centralisée du PSP en fonction du type de client et du flux métier.
 *
 * Règles métier (référence : docs/PAYMENT_SYSTEM_ARCHITECTURE_2026-06-14.md) :
 *  - B2C carte / wallet / ressources → Mollie (checkout hosted)
 *  - B2B SEPA / dossier pro → GoCardless par défaut, Mollie ou virement manuel en fallback
 *  - Factures → Mollie si configuré, sinon virement manuel
 *  - GoCardless est INTERDIT en B2C
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
    this.b2bDefaultProvider = normalizeB2bDefault();
  }

  /**
   * @param {'b2c'|'b2b'} customerType
   * @param {{ providerHint?: string }} [opts]
   * @returns {string}
   */
  resolve(customerType, opts = {}) {
    if (customerType === CUSTOMER_TYPES.B2C) {
      return this._resolveB2cProvider(opts);
    }

    if (customerType === CUSTOMER_TYPES.B2B) {
      return this._resolveB2bProvider(opts);
    }

    throw new PaymentError(
      'UNSUPPORTED_CUSTOMER_TYPE',
      `Type de client non supporté : ${customerType}`,
      400,
    );
  }

  /**
   * Résout le PSP pour un flux métier explicite.
   * @param {string} flow Valeur de PAYMENT_FLOWS
   * @param {'b2c'|'b2b'} customerType
   * @param {{ providerHint?: string, invoiceId?: string }} [opts]
   */
  resolveForFlow(flow, customerType, opts = {}) {
    const normalizedFlow = String(flow || '').trim().toLowerCase();

    if (normalizedFlow === PAYMENT_FLOWS.INVOICE || opts.invoiceId) {
      if (this.configuredProviders.has(PAYMENT_PROVIDERS.MOLLIE)) {
        return PAYMENT_PROVIDERS.MOLLIE;
      }
      return PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
    }

    if (
      normalizedFlow === PAYMENT_FLOWS.B2C_CARD
      || normalizedFlow === PAYMENT_FLOWS.B2C_WALLET
      || normalizedFlow === PAYMENT_FLOWS.RESOURCE
    ) {
      return this._resolveB2cProvider(opts);
    }

    if (
      normalizedFlow === PAYMENT_FLOWS.B2B_SEPA
      || normalizedFlow === PAYMENT_FLOWS.DOSSIER
      || normalizedFlow === PAYMENT_FLOWS.FORMALITY
    ) {
      if (customerType === CUSTOMER_TYPES.B2C) {
        return this._resolveB2cProvider(opts);
      }
      return this._resolveB2bProvider(opts);
    }

    return this.resolve(customerType, opts);
  }

  /**
   * Configuration terminal frontend (méthodes affichables, sans secrets).
   * @param {'b2c'|'b2b'} customerType
   */
  describeTerminalConfig(customerType) {
    const isB2c = customerType === CUSTOMER_TYPES.B2C;
    const mollieConfigured = this.configuredProviders.has(PAYMENT_PROVIDERS.MOLLIE);
    const cardEnabled = isB2c && mollieConfigured;
    const gocardlessEnabled = !isB2c && this.configuredProviders.has(PAYMENT_PROVIDERS.GOCARDLESS);
    const mollieEnabled = mollieConfigured;
    const manualTransferEnabled = !isB2c;

    return {
      customerType,
      methods: {
        googlePay: false,
        card: cardEnabled,
        gocardless: gocardlessEnabled,
        mollie: mollieEnabled,
        manualTransfer: manualTransferEnabled,
      },
      mollie: mollieConfigured ? {
        profileId: getMollieProfileId(),
        testmode: isMollieTestMode(),
        componentsEnabled: isB2c,
        methodsApi: '/api/mollie/methods',
      } : null,
      defaultProvider: this.resolve(customerType),
      flows: {
        b2cCard: PAYMENT_FLOWS.B2C_CARD,
        b2cWallet: PAYMENT_FLOWS.B2C_WALLET,
        resource: PAYMENT_FLOWS.RESOURCE,
        dossier: isB2c ? PAYMENT_FLOWS.B2C_CARD : PAYMENT_FLOWS.DOSSIER,
        invoice: PAYMENT_FLOWS.INVOICE,
      },
    };
  }

  _resolveB2cProvider(_opts = {}) {
    if (this.configuredProviders.has(PAYMENT_PROVIDERS.MOLLIE)) {
      return PAYMENT_PROVIDERS.MOLLIE;
    }
    return PAYMENT_PROVIDERS.MOLLIE;
  }

  _resolveB2bProvider(opts = {}) {
    const hint = opts.providerHint;
    if (hint && this.isProviderAllowedForCustomerType(hint, CUSTOMER_TYPES.B2B)) {
      if (hint === PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER) return hint;
      if (this.configuredProviders.has(hint)) return hint;
    }

    if (
      this.b2bDefaultProvider
      && this.isProviderAllowedForCustomerType(this.b2bDefaultProvider, CUSTOMER_TYPES.B2B)
    ) {
      if (this.b2bDefaultProvider === PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER) {
        return PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
      }
      if (this.configuredProviders.has(this.b2bDefaultProvider)) {
        return this.b2bDefaultProvider;
      }
    }

    for (const provider of B2B_PROVIDER_PRIORITY) {
      if (provider === PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER) {
        return PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
      }
      if (this.configuredProviders.has(provider)) return provider;
    }

    return PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
  }

  /**
   * Vérifie qu'un provider est compatible avec un type de client.
   * Lève une PaymentError sinon (utilisable comme assertion).
   */
  assertProviderAllowedForCustomerType(provider, customerType) {
    if (customerType === CUSTOMER_TYPES.B2C && provider === PAYMENT_PROVIDERS.GOCARDLESS) {
      throw new PaymentError(
        'GOCARDLESS_FORBIDDEN_FOR_B2C',
        'GoCardless n\'est pas autorisé pour les paiements B2C. Utiliser Mollie.',
        409,
      );
    }
    if (customerType === CUSTOMER_TYPES.B2C && provider !== PAYMENT_PROVIDERS.MOLLIE) {
      throw new PaymentError(
        'B2C_REQUIRES_MOLLIE',
        'Les paiements B2C doivent être traités via Mollie.',
        409,
      );
    }
    return true;
  }

  /**
   * Variante non-bloquante (booléenne) – utile en UI/route pour suggérer.
   */
  isProviderAllowedForCustomerType(provider, customerType) {
    try {
      return this.assertProviderAllowedForCustomerType(provider, customerType);
    } catch (_error) {
      return false;
    }
  }
}
