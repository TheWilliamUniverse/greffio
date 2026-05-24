import { createGoCardlessCheckout, retrieveGoCardlessBillingRequest, isGoCardlessPaidStatus } from './gocardless.js';
import { createMolliePayment, retrieveMolliePayment, isMolliePaidStatus } from './mollie.js';
import { computeResourcePaymentAmounts } from './pricing.js';
import { getResourceOrderById, updateResourceOrder } from './resourceOrderStore.js';
import { upsertPayment } from './store.js';

export const createResourceOrderCheckout = async ({
  orderId,
  userId,
  appUrl,
  mollieWebhookUrl,
  gocardlessWebhookUrl,
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
  const redirectUrl = `${appUrl}/paiement/verification?resourceOrderId=${order.id}`;
  const hasGoCardless = Boolean(process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY);
  const hasMollieKey = Boolean(process.env.MOLLIE_API_KEY);

  let created;
  if (hasGoCardless) {
    created = await createGoCardlessCheckout({
      amountTotalCents: amounts.amountTotalCents,
      currency: amounts.currency,
      metadata: {
        resource_order_id: order.id,
        service_id: order.serviceId,
        company_name: order.companyName || '',
      },
      redirectUrl,
      exitUrl: `${appUrl}/paiement?resourceOrder=${order.id}&service=${order.serviceId}`,
      description: `Greffio ${order.serviceTitle}`,
    });
  } else if (hasMollieKey) {
    created = await createMolliePayment({
      amountTotalCents: amounts.amountTotalCents,
      currency: amounts.currency,
      metadata: {
        resourceOrderId: order.id,
        serviceId: order.serviceId,
      },
      redirectUrl,
      webhookUrl: mollieWebhookUrl,
      description: `Greffio ${order.serviceTitle}`,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    created = {
      providerPaymentId: `resource_demo_${Date.now()}`,
      status: 'open',
      checkoutUrl: `${redirectUrl}&mock=resource`,
      raw: { provider: 'demo', mode: 'mock_fallback' },
    };
  } else {
    const error = new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }

  const paymentProvider = hasGoCardless ? 'gocardless' : 'mollie';
  const payment = await upsertPayment({
    dossierId: order.dossierId || null,
    resourceOrderId: order.id,
    userId,
    offerCode: `resource:${order.serviceId}`,
    amountTotalCents: amounts.amountTotalCents,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    currency: amounts.currency,
    status: created.status || 'open',
    provider: paymentProvider,
    providerPaymentId: created.providerPaymentId,
    providerPayload: created.raw,
  });

  await updateResourceOrder(order.id, {
    status: 'pending_payment',
    paymentId: payment.id,
  });

  return {
    order: await getResourceOrderById(order.id),
    payment,
    checkoutUrl: created.checkoutUrl,
  };
};

export {
  isGoCardlessPaidStatus,
  isMolliePaidStatus,
  retrieveGoCardlessBillingRequest,
  retrieveMolliePayment,
};
