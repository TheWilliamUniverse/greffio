import { createGoCardlessCheckout, retrieveGoCardlessBillingRequest, isGoCardlessPaidStatus } from './gocardless.js';
import { getPaymentService } from './payments/paymentServiceFactory.js';
import { CUSTOMER_TYPES } from './payments/types.js';
import { computeResourcePaymentAmounts } from './pricing.js';
import { getResourceOrderById, updateResourceOrder } from './resourceOrderStore.js';
import { upsertPayment } from './store.js';

export const createResourceOrderCheckout = async ({
  orderId,
  userId,
  appUrl,
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

  let created;
  let paymentProvider = 'cawl';

  if (hasGoCardless) {
    paymentProvider = 'gocardless';
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
  } else {
    const service = getPaymentService({ upsertPayment });
    const result = await service.createPayment({
      customerType: CUSTOMER_TYPES.B2C,
      amount: amounts.amountTotalCents,
      currency: amounts.currency,
      orderId: order.id,
      description: `Greffio ${order.serviceTitle}`,
      returnUrl: redirectUrl,
      cancelUrl: `${appUrl}/paiement?resourceOrder=${order.id}`,
      userId,
      offerCode: `resource:${order.serviceId}`,
      metadata: { resourceOrderId: order.id, paymentMethod: 'google_pay_preferred' },
    });
    created = {
      providerPaymentId: result.payment?.providerPaymentId,
      status: result.status,
      checkoutUrl: result.checkoutUrl,
      raw: result.payment?.providerPayload,
    };
    paymentProvider = result.provider || 'cawl';
  }

  if (!created?.checkoutUrl && process.env.NODE_ENV !== 'production') {
    created = {
      providerPaymentId: created?.providerPaymentId || `resource_demo_${Date.now()}`,
      status: created?.status || 'open',
      checkoutUrl: `${redirectUrl}&mock=resource`,
      raw: created?.raw || { provider: 'demo', mode: 'mock_fallback' },
    };
  } else if (!created?.checkoutUrl) {
    const error = new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }

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
  retrieveGoCardlessBillingRequest,
};
