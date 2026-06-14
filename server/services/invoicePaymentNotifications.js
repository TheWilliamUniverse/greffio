import { sendTransactionalEmail } from './emailService.js';
import { isEmailFeatureEnabled } from '../config/emailFeatureFlags.js';
import { getUserById } from '../authStore.js';

const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';

const resolveRecipient = async (payment) => {
  const metadataEmail = payment.metadata?.customerEmail || payment.metadata?.contactEmail;
  if (metadataEmail) return String(metadataEmail).trim().toLowerCase();
  if (payment.userId) {
    const user = await getUserById(payment.userId);
    if (user?.email) return user.email;
  }
  return null;
};

/**
 * Emails payment_confirmed / payment_failed : uniquement pour les paiements facture (Qonto + Mollie).
 */
export const notifyInvoicePaymentOutcome = async ({ payment, outcome }) => {
  if (!payment?.invoiceId) {
    return { ok: true, skipped: true, reason: 'NOT_INVOICE_PAYMENT' };
  }
  if (!isEmailFeatureEnabled('invoicePaymentEmails')) {
    return { ok: true, skipped: true, reason: 'INVOICE_PAYMENT_EMAILS_DISABLED' };
  }

  const recipientEmail = await resolveRecipient(payment);
  if (!recipientEmail) {
    return { ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' };
  }

  const invoiceNumber = payment.metadata?.invoiceNumber
    || payment.providerPayload?.qonto?.number
    || payment.invoiceId;
  const amountLabel = `${(payment.amountTotalCents / 100).toFixed(2).replace('.', ',')} €`;

  if (outcome === 'paid') {
    return sendTransactionalEmail({
      to: { email: recipientEmail },
      templateKey: 'payment_confirmed',
      variables: {
        firstName: 'Client',
        amountLabel,
        invoiceNumber,
        invoiceUrl: `${appUrl}/dashboard`,
        dashboardUrl: `${appUrl}/dashboard`,
      },
      userId: payment.userId || null,
      dossierId: payment.dossierId || null,
      tags: ['invoice', 'payment_confirmed'],
    });
  }

  if (outcome === 'failed') {
    return sendTransactionalEmail({
      to: { email: recipientEmail },
      templateKey: 'payment_failed',
      variables: {
        firstName: 'Client',
        amountLabel,
        invoiceNumber,
        retryUrl: `${appUrl}/paiement`,
        supportEmail: process.env.SALES_EMAIL || 'contact@willentreprises.com',
      },
      userId: payment.userId || null,
      dossierId: payment.dossierId || null,
      tags: ['invoice', 'payment_failed'],
    });
  }

  return { ok: true, skipped: true, reason: 'UNKNOWN_OUTCOME' };
};

export const notifyInvoiceAvailable = async ({ payment, invoice }) => {
  if (!payment?.invoiceId) {
    return { ok: true, skipped: true, reason: 'NOT_INVOICE_PAYMENT' };
  }
  if (!isEmailFeatureEnabled('invoicePaymentEmails')) {
    return { ok: true, skipped: true, reason: 'INVOICE_PAYMENT_EMAILS_DISABLED' };
  }

  const recipientEmail = await resolveRecipient(payment);
  if (!recipientEmail) {
    return { ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' };
  }

  return sendTransactionalEmail({
    to: { email: recipientEmail },
    templateKey: 'invoice_available',
    variables: {
      firstName: 'Client',
      invoiceNumber: invoice?.number || payment.metadata?.invoiceNumber || payment.invoiceId,
      invoiceUrl: payment.providerCheckoutUrl || `${appUrl}/dashboard`,
      billingDate: invoice?.issueDate || new Date().toISOString().slice(0, 10),
    },
    userId: payment.userId || null,
    dossierId: payment.dossierId || null,
    tags: ['invoice', 'invoice_available'],
  });
};
