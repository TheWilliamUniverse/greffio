import { randomUUID } from 'node:crypto';
import { isQontoConfigured } from './qontoClient.js';
import { createQontoClientInvoice } from './qontoInvoiceService.js';
import {
  getInvoiceById,
  getInvoiceByPaymentId,
  listInvoicesPendingOpsReview,
  upsertInvoice,
} from '../../invoiceStore.js';
import { upsertPayment } from '../../store.js';
import { notifyInvoiceAvailable } from '../invoicePaymentNotifications.js';
import { sendTransactionalEmail } from '../emailService.js';
import { isEmailFeatureEnabled } from '../../config/emailFeatureFlags.js';

const truthy = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

export const isInvoiceAutoGenerateOnPaymentEnabled = () => (
  truthy(process.env.INVOICE_AUTO_GENERATE_ON_PAYMENT, true)
);

export const isInvoiceOpsReviewRequired = () => (
  truthy(process.env.INVOICE_REQUIRE_OPS_REVIEW_BEFORE_SEND, true)
);

const resolveCustomerFromPayment = async ({ payment, dossier, getUserById }) => {
  const metadataEmail = payment.metadata?.customerEmail || payment.metadata?.contactEmail;
  if (metadataEmail) {
    return {
      email: String(metadataEmail).trim().toLowerCase(),
      name: payment.metadata?.customerName || null,
    };
  }
  if (payment.userId && getUserById) {
    const user = await getUserById(payment.userId);
    if (user?.email) {
      return {
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null,
      };
    }
  }
  if (dossier?.dataJson) {
    try {
      const data = typeof dossier.dataJson === 'string' ? JSON.parse(dossier.dataJson) : dossier.dataJson;
      if (data?.email) {
        return { email: String(data.email).trim().toLowerCase(), name: data.contactName || null };
      }
    } catch (_error) {
      // ignore malformed dossier json
    }
  }
  return null;
};

const notifyOpsInvoicePendingReview = async ({ invoice, dossier }) => {
  if (!isEmailFeatureEnabled('opsEmails')) return { ok: true, skipped: true };
  const opsEmail = process.env.OPS_INVOICE_REVIEW_EMAIL
    || process.env.SALES_EMAIL
    || 'contact@willentreprises.com';
  return sendTransactionalEmail({
    to: { email: opsEmail, name: 'Équipe Greffio' },
    templateKey: 'ops_invoice_pending_review',
    variables: {
      invoiceNumber: invoice.invoiceNumber || invoice.id,
      amountLabel: `${(invoice.amountTotalCents / 100).toFixed(2).replace('.', ',')} €`,
      dossierReference: dossier?.reference || dossier?.id || invoice.dossierId || '—',
      reviewUrl: `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/ops/invoices`,
    },
    dossierId: invoice.dossierId,
    tags: ['ops', 'invoice', 'pending_review'],
  });
};

/**
 * Génère une facture Qonto après paiement dossier réussi, en attente de validation ops
 * avant tout envoi client.
 */
export const queueInvoiceAfterPaymentSuccess = async ({
  payment,
  dossier = null,
  getUserById,
}) => {
  if (!isInvoiceAutoGenerateOnPaymentEnabled()) {
    return { ok: true, skipped: true, reason: 'AUTO_GENERATE_DISABLED' };
  }
  if (!payment?.id || payment.status !== 'paid') {
    return { ok: false, error: 'PAYMENT_NOT_PAID' };
  }
  if (payment.invoiceId) {
    return { ok: true, skipped: true, reason: 'INVOICE_PAYMENT_FLOW' };
  }
  if (payment.metadata?.flow === 'qonto_invoice') {
    return { ok: true, skipped: true, reason: 'QONTO_INVOICE_FLOW' };
  }
  if (!payment.dossierId) {
    return { ok: true, skipped: true, reason: 'NO_DOSSIER' };
  }

  const existing = await getInvoiceByPaymentId(payment.id);
  if (existing) {
    return { ok: true, skipped: true, reason: 'ALREADY_QUEUED', invoice: existing };
  }

  const customer = await resolveCustomerFromPayment({ payment, dossier, getUserById });
  if (!customer?.email) {
    return { ok: false, error: 'CUSTOMER_EMAIL_REQUIRED' };
  }

  const internalInvoiceId = randomUUID();
  const description = payment.offerCode
    ? `Prestation Greffio – ${payment.offerCode}`
    : 'Prestation Greffio';

  let qontoInvoice = null;
  if (isQontoConfigured()) {
    try {
      qontoInvoice = await createQontoClientInvoice({
        customerName: customer.name || customer.email,
        customerEmail: customer.email,
        amountTotalCents: payment.amountTotalCents,
        currency: payment.currency || 'EUR',
        description,
        invoiceNumber: `GF-${Date.now().toString(36).toUpperCase()}`,
      });
    } catch (error) {
      console.error('[invoiceOpsReview] Qonto create failed', error?.message || error);
    }
  }

  const invoice = await upsertInvoice({
    id: internalInvoiceId,
    dossierId: payment.dossierId,
    paymentId: payment.id,
    userId: payment.userId || null,
    invoiceKind: 'dossier_service',
    invoiceNumber: qontoInvoice?.number || null,
    qontoInvoiceId: qontoInvoice?.qontoInvoiceId || null,
    qontoStatus: qontoInvoice?.qontoStatus || 'draft_local',
    amountTotalCents: payment.amountTotalCents,
    currency: payment.currency || 'EUR',
    customerEmail: customer.email,
    customerName: customer.name,
    clientDeliveryStatus: isInvoiceOpsReviewRequired() ? 'pending_ops_review' : 'approved',
    metadata: {
      paymentProvider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      autoGenerated: true,
    },
  });

  await upsertPayment({
    ...payment,
    invoiceId: internalInvoiceId,
    metadata: {
      ...(payment.metadata || {}),
      invoiceNumber: invoice.invoiceNumber,
      qontoInvoiceId: invoice.qontoInvoiceId,
    },
  });

  if (isInvoiceOpsReviewRequired()) {
    await notifyOpsInvoicePendingReview({ invoice, dossier });
    return { ok: true, invoice, pendingOpsReview: true };
  }

  await approveAndSendInvoiceToClient({ invoiceId: invoice.id, opsUserId: 'system' });
  return { ok: true, invoice, pendingOpsReview: false };
};

export const approveAndSendInvoiceToClient = async ({ invoiceId, opsUserId }) => {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) return { ok: false, error: 'INVOICE_NOT_FOUND' };
  if (invoice.clientDeliveryStatus === 'sent') {
    return { ok: true, skipped: true, reason: 'ALREADY_SENT', invoice };
  }

  const now = new Date().toISOString();
  const updated = await upsertInvoice({
    ...invoice,
    clientDeliveryStatus: 'sent',
    opsReviewedBy: opsUserId || null,
    opsReviewedAt: now,
    clientSentAt: now,
  });

  await notifyInvoiceAvailable({
    payment: {
      invoiceId: updated.id,
      userId: updated.userId,
      dossierId: updated.dossierId,
      metadata: {
        invoiceNumber: updated.invoiceNumber,
        customerEmail: updated.customerEmail,
      },
    },
    invoice: {
      number: updated.invoiceNumber,
      issueDate: now.slice(0, 10),
    },
  });

  return { ok: true, invoice: updated };
};

export const listPendingInvoiceReviews = listInvoicesPendingOpsReview;
