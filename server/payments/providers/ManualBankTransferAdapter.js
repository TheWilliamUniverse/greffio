import crypto from 'node:crypto';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES } from '../types.js';

/**
 * Adapter "virement bancaire manuel".
 *
 * Aucune intégration PSP : on enregistre simplement l'intention de paiement
 * et on renvoie les coordonnées bancaires. Le rapprochement effectif passe
 * par Qonto (`QontoReconciliationAdapter`) côté ops.
 */
export class ManualBankTransferAdapter {
  constructor(options = {}) {
    this.provider = PAYMENT_PROVIDERS.MANUAL_BANK_TRANSFER;
    this.iban = options.iban || process.env.WILLIAM_ESTABLISHMENTS_IBAN || '';
    this.bic = options.bic || process.env.WILLIAM_ESTABLISHMENTS_BIC || '';
    this.beneficiary = options.beneficiary || 'WILLIAM ESTABLISHMENTS';
  }

  isConfigured() {
    return true;
  }

  async createPayment(input) {
    const reference = `WB-${input.internalPaymentId.slice(0, 8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    return {
      internalPaymentId: input.internalPaymentId,
      provider: this.provider,
      providerPaymentId: reference,
      checkoutUrl: null,
      status: PAYMENT_STATUSES.PENDING,
      raw: {
        mode: 'manual_bank_transfer',
        instructions: {
          beneficiary: this.beneficiary,
          iban: this.iban || 'IBAN à fournir aux ops',
          bic: this.bic || 'BIC à fournir aux ops',
          reference,
          amount: input.amount,
          currency: input.currency || 'EUR',
        },
      },
    };
  }

  async getPaymentStatus() {
    // Aucun statut automatique ; mis à jour manuellement par les ops via Qonto.
    return PAYMENT_STATUSES.PENDING;
  }
}
