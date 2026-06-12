import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';

/**
 * Adapters "stubs" pour providers prévus mais non actifs aujourd'hui.
 *
 * Permet d'enregistrer les providers dans le registre principal pour que
 * `PaymentService` puisse rejeter proprement leur utilisation tant qu'ils
 * ne sont pas configurés, plutôt que de renvoyer un crash générique.
 */
class StubProviderAdapter {
  /**
   * @param {string} providerName
   * @param {string} envName
   */
  constructor(providerName, envName) {
    this.provider = providerName;
    this.envName = envName;
  }

  isConfigured() {
    return false;
  }

  async createPayment() {
    throw new PaymentError(
      `${this.provider.toUpperCase()}_NOT_ACTIVE`,
      `Le provider ${this.provider} n'est pas activé. Variable ${this.envName} attendue.`,
      503,
    );
  }

  async getPaymentStatus() {
    return PAYMENT_STATUSES.PENDING;
  }
}

export class StripeStubAdapter extends StubProviderAdapter {
  constructor() {
    super(PAYMENT_PROVIDERS.STRIPE, 'STRIPE_SECRET_KEY');
  }
}

export class PayPlugStubAdapter extends StubProviderAdapter {
  constructor() {
    super(PAYMENT_PROVIDERS.PAYPLUG, 'PAYPLUG_SECRET_KEY');
  }
}
