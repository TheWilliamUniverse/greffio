import { getPaymentService } from './paymentServiceFactory.js';
import { CUSTOMER_TYPES, PAYMENT_FLOWS, PaymentError } from './types.js';
import { computePaymentAmounts } from '../pricing.js';
import { upsertPayment } from '../store.js';

const rethrowPaymentError = (error) => {
  if (error instanceof PaymentError) {
    const wrapped = new Error(error.code);
    wrapped.status = error.httpStatus || 503;
    wrapped.paymentCode = error.code;
    throw wrapped;
  }
  throw error;
};

/** Checkout dossier Greffio via PaymentService (Mollie). */
export const createDossierCheckout = async ({
  dossier,
  offerCode,
  userId,
  customerType,
  appUrl,
}) => {
  const normalizedType = String(customerType || '').toLowerCase();
  if (normalizedType === CUSTOMER_TYPES.B2C) {
    const error = new Error('GOCARDLESS_FORBIDDEN_FOR_B2C');
    error.status = 409;
    throw error;
  }

  const amounts = computePaymentAmounts(offerCode || dossier.offerCode);
  const redirectUrl = `${appUrl}/paiement/verification?dossierId=${dossier.id}`;
  const service = getPaymentService({ upsertPayment });

  let result;
  try {
    result = await service.createPayment({
      customerId: userId,
      customerType: CUSTOMER_TYPES.B2B,
      amount: amounts.amountTotalCents,
      currency: amounts.currency,
      description: `Greffio ${amounts.normalizedOffer} ${dossier.companyName || ''}`.trim(),
      returnUrl: redirectUrl,
      cancelUrl: `${appUrl}/paiement?offer=${encodeURIComponent(amounts.normalizedOffer)}`,
      dossierId: dossier.id,
      userId,
      offerCode: amounts.normalizedOffer,
      flow: PAYMENT_FLOWS.DOSSIER,
      metadata: {
        dossierId: dossier.id,
        offerCode: amounts.normalizedOffer,
        companyName: dossier.companyName || null,
      },
    });
  } catch (error) {
    rethrowPaymentError(error);
  }

  let checkoutUrl = result.checkoutUrl;
  if (!checkoutUrl) {
    if (process.env.NODE_ENV !== 'production') {
      checkoutUrl = `${redirectUrl}&mock=dossier`;
    } else {
      const error = new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
      error.status = 503;
      throw error;
    }
  }

  const payment = await upsertPayment({
    ...result.payment,
    dossierId: dossier.id,
    userId,
    offerCode: amounts.normalizedOffer,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    providerCheckoutUrl: checkoutUrl,
  });

  return {
    payment,
    checkoutUrl,
    provider: result.provider,
    amounts,
  };
};
