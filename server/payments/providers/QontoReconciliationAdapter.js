import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PaymentError } from '../types.js';

/**
 * Adapter Qonto – rapprochement bancaire et suivi financier.
 *
 * Qonto N'EST PAS un PSP B2C : `createPayment` lève toujours une erreur.
 * Le rôle de cet adapter est d'exposer les hooks futurs pour la
 * réconciliation (lookup transaction, attachment justificatif).
 *
 * Variables d'environnement attendues :
 *   QONTO_CLIENT_ID
 *   QONTO_CLIENT_SECRET
 *   QONTO_ORGANIZATION_ID
 */
export class QontoReconciliationAdapter {
  constructor() {
    this.provider = PAYMENT_PROVIDERS.QONTO;
    this.clientId = process.env.QONTO_CLIENT_ID || '';
    this.clientSecret = process.env.QONTO_CLIENT_SECRET || '';
    this.organizationId = process.env.QONTO_ORGANIZATION_ID || '';
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.organizationId);
  }

  async createPayment() {
    throw new PaymentError(
      'QONTO_NOT_A_PSP',
      'Qonto ne sert qu\'au rapprochement bancaire, pas à encaisser des paiements B2C.',
      409,
    );
  }

  async getPaymentStatus() {
    return PAYMENT_STATUSES.PENDING;
  }

  /**
   * Stub : retournera l'ID d'une transaction Qonto rapprochée à un paiement
   * interne. À brancher quand l'OAuth Qonto sera configuré.
   *
   * @param {string} _internalPaymentId
   * @returns {Promise<string|null>}
   */
  async findReconciledTransactionId(_internalPaymentId) {
    // TODO[QONTO-API]: appeler /transactions filtré par référence/montant.
    return null;
  }
}
