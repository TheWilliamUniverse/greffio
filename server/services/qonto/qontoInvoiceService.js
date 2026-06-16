import { randomUUID } from 'node:crypto';
import { createMolliePayment, isMollieConfigured } from '../../mollie.js';
import { resolveMolliePaymentRedirectUrl, resolveMollieWebhookUrl } from '../../config/mollieUrls.js';
import { upsertPayment } from '../../store.js';
import { CUSTOMER_TYPES, PAYMENT_STATUSES } from '../../payments/types.js';
import {
  getQontoOrganization,
  isQontoConfigured,
  listQontoBankAccounts,
  qontoRequest,
} from './qontoClient.js';

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const pickIbanBankAccount = async () => {
  const accounts = await listQontoBankAccounts();
  const withIban = accounts.find((item) => item.iban) || accounts[0];
  if (!withIban?.iban) throw new Error('QONTO_BANK_ACCOUNT_NOT_FOUND');
  return withIban;
};

/**
 * Crée une facture client dans Qonto (sans lien de paiement Mollie).
 */
export const createQontoClientInvoice = async ({
  customerName,
  customerEmail,
  amountTotalCents,
  currency = 'EUR',
  description,
  invoiceNumber = null,
  dueDays = 14,
}) => {
  if (!isQontoConfigured()) {
    throw new Error('QONTO_NOT_CONFIGURED');
  }
  if (!Number.isInteger(amountTotalCents) || amountTotalCents <= 0) {
    throw new Error('INVALID_INVOICE_AMOUNT');
  }
  if (!customerEmail) {
    throw new Error('CUSTOMER_EMAIL_REQUIRED');
  }

  const bankAccount = await pickIbanBankAccount();
  const issueDate = todayIsoDate();
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const resolvedNumber = invoiceNumber || `GF-${Date.now().toString(36).toUpperCase()}`;

  const invoicePayload = {
    client_invoice: {
      issue_date: issueDate,
      due_date: dueDate,
      status: 'unpaid',
      number: resolvedNumber,
      currency,
      iban: bankAccount.iban,
      client: {
        name: customerName || customerEmail,
        email: customerEmail,
        kind: 'company',
      },
      items: [
        {
          title: description || 'Prestation Greffio',
          quantity: '1',
          unit: 'piece',
          unit_price: {
            value: (amountTotalCents / 100).toFixed(2),
            currency,
          },
          vat_rate: '0',
        },
      ],
    },
  };

  const qontoResult = await qontoRequest('/client_invoices', {
    method: 'POST',
    body: invoicePayload,
  });
  const qontoInvoice = qontoResult.client_invoice || qontoResult;

  return {
    number: resolvedNumber,
    qontoInvoiceId: qontoInvoice.id || qontoInvoice.slug || resolvedNumber,
    qontoStatus: qontoInvoice.status || 'unpaid',
    issueDate,
    dueDate,
    raw: qontoInvoice,
  };
};

/**
 * Crée une facture client Qonto puis un lien de paiement Mollie (factures uniquement).
 */
export const issueQontoInvoiceWithMolliePayment = async ({
  customerName,
  customerEmail,
  amountTotalCents,
  currency = 'EUR',
  description,
  dossierId = null,
  userId = null,
  dueDays = 14,
  mollieMethod = null,
}) => {
  if (!isQontoConfigured()) {
    throw new Error('QONTO_NOT_CONFIGURED');
  }
  if (!isMollieConfigured()) {
    throw new Error('MOLLIE_NOT_CONFIGURED');
  }
  if (!Number.isInteger(amountTotalCents) || amountTotalCents <= 0) {
    throw new Error('INVALID_INVOICE_AMOUNT');
  }
  if (!customerEmail) {
    throw new Error('CUSTOMER_EMAIL_REQUIRED');
  }

  const organization = await getQontoOrganization();
  const internalInvoiceId = randomUUID();
  const invoiceNumber = `GF-${Date.now().toString(36).toUpperCase()}`;

  const qontoCreated = await createQontoClientInvoice({
    customerName,
    customerEmail,
    amountTotalCents,
    currency,
    description,
    invoiceNumber,
    dueDays,
  });
  const qontoInvoice = qontoCreated.raw;
  const qontoInvoiceId = qontoCreated.qontoInvoiceId;

  const mollieCreated = await createMolliePayment({
    amountTotalCents,
    currency,
    description: description || `Facture Greffio ${invoiceNumber}`,
    metadata: {
      invoice_id: internalInvoiceId,
      qonto_invoice_id: qontoInvoiceId,
      qonto_invoice_number: invoiceNumber,
      dossier_id: dossierId,
      organization_slug: organization?.slug || process.env.QONTO_ORGANIZATION_ID || null,
      flow: 'qonto_invoice',
    },
    redirectUrl: resolveMolliePaymentRedirectUrl({
      dossierId,
      invoiceId: internalInvoiceId,
    }),
    webhookUrl: resolveMollieWebhookUrl(),
    method: mollieMethod,
  });

  const payment = await upsertPayment({
    id: randomUUID(),
    customerId: userId,
    customerType: CUSTOMER_TYPES.B2B,
    dossierId,
    userId,
    invoiceId: internalInvoiceId,
    amountTotalCents,
    amountServiceCents: amountTotalCents,
    amountLegalFeesCents: 0,
    currency,
    status: PAYMENT_STATUSES.PENDING,
    provider: 'mollie',
    providerPaymentId: mollieCreated.providerPaymentId,
    providerCheckoutUrl: mollieCreated.checkoutUrl,
    providerPayload: {
      qonto: qontoInvoice,
      mollie: mollieCreated.raw,
    },
    metadata: {
      invoiceNumber,
      qontoInvoiceId,
      customerEmail,
      flow: 'qonto_invoice',
    },
  });

  return {
    invoice: {
      id: internalInvoiceId,
      number: invoiceNumber,
      qontoInvoiceId,
      issueDate: qontoCreated.issueDate,
      dueDate: qontoCreated.dueDate,
      amountTotalCents,
      currency,
      customerEmail,
      qontoStatus: qontoInvoice.status || 'unpaid',
    },
    payment,
    checkoutUrl: mollieCreated.checkoutUrl,
    molliePaymentId: mollieCreated.providerPaymentId,
  };
};
