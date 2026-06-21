import { randomUUID } from 'node:crypto';
import { getCatalogItemById } from './config/resourceServices.js';
import { submitResourceOrder } from './resourcesApi.js';
import { getPaymentService } from './payments/paymentServiceFactory.js';
import { CUSTOMER_TYPES, PAYMENT_FLOWS, PaymentError } from './payments/types.js';
import { computeResourcePaymentAmounts } from './pricing.js';
import {
  getResourceOrderById,
  updateResourceOrder,
} from './resourceOrderStore.js';
import { upsertPayment } from './store.js';
import { makeResourceOrderPublicReference } from './utils/resourceOrderReference.js';

const rethrowPaymentError = (error) => {
  if (error instanceof PaymentError) {
    const wrapped = new Error(error.code);
    wrapped.status = error.httpStatus || 503;
    wrapped.paymentCode = error.code;
    throw wrapped;
  }
  throw error;
};

const expandCartItems = (items = []) => {
  const expanded = [];
  for (const line of items) {
    const serviceId = String(line?.serviceId || '').trim();
    const catalog = getCatalogItemById(serviceId);
    if (!catalog) {
      const error = new Error('SERVICE_NOT_FOUND');
      error.status = 404;
      throw error;
    }
    const qty = Math.max(1, Math.min(99, Number(line?.quantity) || 1));
    for (let index = 0; index < qty; index += 1) {
      expanded.push({
        serviceId,
        catalog,
        companyName: line?.companyName?.trim() || null,
        siren: line?.siren?.replace(/\s/g, '') || null,
        dossierId: line?.dossierId || null,
        notes: line?.notes?.trim() || null,
      });
    }
  }
  return expanded;
};

/**
 * Crée les commandes boutique à partir d'un panier multi-articles.
 */
export const prepareCartOrders = async ({
  userId,
  items,
  appUrl,
  customerName,
  customerEmail,
}) => {
  const expanded = expandCartItems(items);
  if (!expanded.length) {
    const error = new Error('CART_EMPTY');
    error.status = 400;
    throw error;
  }

  const cartGroupId = randomUUID();
  const cartPublicReference = makeResourceOrderPublicReference();
  const orders = [];

  for (const line of expanded) {
    const order = await submitResourceOrder({
      userId,
      body: {
        serviceId: line.serviceId,
        companyName: line.companyName,
        siren: line.siren,
        dossierId: line.dossierId,
        notes: line.notes,
      },
      appUrl,
      customerName,
      customerEmail,
    });
    await updateResourceOrder(order.id, {
      metadata: {
        ...(order.metadata || {}),
        cartGroupId,
        cartPublicReference,
        cartLineCount: expanded.length,
      },
    });
    orders.push(await getResourceOrderById(order.id));
  }

  const totalCents = orders.reduce(
    (sum, order) => sum + Number(order.priceTtcCents || 0),
    0,
  );

  return {
    cartGroupId,
    publicReference: cartPublicReference,
    orders,
    totalCents,
    orderIds: orders.map((order) => order.id),
  };
};

/**
 * Un seul paiement Mollie pour plusieurs commandes boutique (panier groupé).
 */
export const createCartPayment = async ({
  userId,
  orderIds,
  appUrl,
  mollieMethod = null,
  cardToken = null,
}) => {
  const ids = Array.isArray(orderIds)
    ? orderIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  if (!ids.length) {
    const error = new Error('CART_ORDER_IDS_REQUIRED');
    error.status = 400;
    throw error;
  }

  const orders = [];
  for (const orderId of ids) {
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
    orders.push(order);
  }

  const totalCents = orders.reduce(
    (sum, order) => sum + Number(order.priceTtcCents || 0),
    0,
  );
  if (totalCents <= 0) {
    const error = new Error('CART_FREE_NO_CHECKOUT');
    error.status = 400;
    throw error;
  }

  const amounts = computeResourcePaymentAmounts(totalCents);
  const publicRef = orders[0]?.metadata?.cartPublicReference
    || orders[0]?.publicReference
    || null;
  const lineItems = orders.map((order) => ({
    orderId: order.id,
    serviceId: order.serviceId,
    title: order.serviceTitle,
    amountCents: order.priceTtcCents,
    publicReference: order.publicReference,
  }));
  const description = publicRef
    ? `Greffio – Panier boutique (${publicRef}, ${orders.length} article${orders.length > 1 ? 's' : ''})`
    : `Greffio – Panier boutique (${orders.length} article${orders.length > 1 ? 's' : ''})`;

  const primaryOrderId = orders[0].id;
  const redirectUrl = `${appUrl}/paiement/verification?resourceOrderId=${primaryOrderId}&cartOrders=${ids.join(',')}`;

  const service = getPaymentService({ upsertPayment });
  let result;
  try {
    result = await service.createPayment({
      customerId: userId,
      customerType: CUSTOMER_TYPES.B2C,
      amount: amounts.amountTotalCents,
      currency: amounts.currency,
      orderId: primaryOrderId,
      description,
      returnUrl: redirectUrl,
      cancelUrl: `${appUrl}/paiement?cartOrders=${ids.join(',')}`,
      userId,
      offerCode: 'resource:cart',
      flow: PAYMENT_FLOWS.RESOURCE,
      mollieMethod,
      cardToken,
      metadata: {
        resourceOrderId: primaryOrderId,
        resourceOrderIds: ids,
        cartGroupId: orders[0]?.metadata?.cartGroupId || null,
        publicReference: publicRef,
        lineItems,
        paymentMethod: mollieMethod || 'creditcard',
        mollieMethod: mollieMethod || null,
        cardToken: cardToken || null,
        paymentFlow: PAYMENT_FLOWS.RESOURCE,
      },
    });
  } catch (error) {
    rethrowPaymentError(error);
  }

  let checkoutUrl = result.checkoutUrl;
  if (!checkoutUrl) {
    if (process.env.NODE_ENV !== 'production') {
      checkoutUrl = `${redirectUrl}&mock=cart`;
    } else {
      const error = new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
      error.status = 503;
      throw error;
    }
  }

  const payment = await upsertPayment({
    ...result.payment,
    dossierId: orders[0]?.dossierId || null,
    amountServiceCents: amounts.amountServiceCents,
    amountLegalFeesCents: amounts.amountLegalFeesCents,
    providerCheckoutUrl: checkoutUrl,
    metadata: {
      ...(result.payment?.metadata || {}),
      resourceOrderIds: ids,
      lineItems,
    },
  });

  await Promise.all(ids.map((orderId) => updateResourceOrder(orderId, {
    status: 'pending_payment',
    paymentId: payment.id,
  })));

  return {
    orders: await Promise.all(ids.map((id) => getResourceOrderById(id))),
    payment,
    checkoutUrl,
    checkoutMode: result.checkoutMode || 'hosted',
    publicReference: publicRef,
  };
};
