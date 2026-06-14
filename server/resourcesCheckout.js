import { getPaymentService } from './payments/paymentServiceFactory.js';
import { CUSTOMER_TYPES, PAYMENT_FLOWS, PaymentError } from './payments/types.js';
import { computeResourcePaymentAmounts } from './pricing.js';
import { getResourceOrderById, updateResourceOrder } from './resourceOrderStore.js';
import { upsertPayment } from './store.js';

const rethrowPaymentError = (error) => {
  if (error instanceof PaymentError) {
    const wrapped = new Error(error.code);
    wrapped.status = error.httpStatus || 503;
    wrapped.paymentCode = error.code;
    throw wrapped;
  }
  throw error;
};

export const createResourceOrderCheckout = async ({
  orderId,
  userId,
  appUrl,
  mollieMethod = null,
  cardToken = null,
}) => {
  const order = await getResourceOrderById(orderId);
  if (!order) {
    const error = new Error('ORDER_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (order.userId !== userId) {
    const error = new Error('ORDER_FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (!['draft', 'pending_payment'].includes(order.status)) {
    const error = new Error('ORDER_NOT_PAYABLE');
    error.status = 409;
    throw error;
  }
  if (order.priceTtcCents <= 0) {
    const error = new Error('ORDER_FREE_NO_CHECKOUT');
    error.status = 400;
    throw error;
  }

  const amounts = computeResourcePaymentAmounts(order.priceTtcCents);
  const publicRef = order.metadata?.publicReference || order.publicReference;
  const description = publicRef
    ? `Greffio – ${order.serviceTitle} (${publicRef})`
    : `Greffio – ${order.serviceTitle}`;
  const redirectUrl = `${appUrl}/paiement/verification?resourceOrderId=${order.id}`;

  const service = getPaymentService({ upsertPayment });
  let result;
  try {
    result = await service.createPayment({
      customerId: userId,
      customerType: CUSTOMER_TYPES.B2C,
      amount: amounts.amountTotalCents,
      currency: amounts.currency,
      orderId: order.id,
      description,
      returnUrl: redirectUrl,
      cancelUrl: `${appUrl}/paiement?resourceOrder=${order.id}&service=${order.serviceId}`,
      userId,
      offerCode: `resource:${order.serviceId}`,
      flow: PAYMENT_FLOWS.RESOURCE,
      mollieMethod,
      cardToken,
      metadata: {
        resourceOrderId: order.id,
        publicReference: publicRef || null,
        paymentMethod: mollieMethod || 'creditcard',
        mollieMethod: mollieMethod || null,
        paymentFlow: PAYMENT_FLOWS.RESOURCE,
      },
    });
  } catch (error) {
    rethrowPaymentError(error);
  }

  let checkoutUrl = result.checkoutUrl;
  if (!checkoutUrl) {
    if (process.env.NODE_ENV !== 'production') {
      checkoutUrl = `${redirectUrl}&mock=resource`;
    } else {
      const error = new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
      error.status = 503;
      throw error;
    }
  }

  const payment = await upsertPayment({
    ...result.payment,
    dossierId: order.dossierId || null,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    providerCheckoutUrl: checkoutUrl,
  });

  await updateResourceOrder(order.id, {
    status: 'pending_payment',
    paymentId: payment.id,
  });

  return {
    order: await getResourceOrderById(order.id),
    payment,
    checkoutUrl,
    checkoutMode: result.checkoutMode || 'hosted',
  };
};
