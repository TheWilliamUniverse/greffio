import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';
import { getUserById } from '../authStore.js';
import { enqueueProviderFulfillment } from './resourceFulfillment.js';
import { notifyResourceOrderConfirmed } from './resourceOrderNotifications.js';

const nowIso = () => new Date().toISOString();
const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';

const resolvePaidOrderIds = (payment) => {
  const fromMetadata = payment?.metadata?.resourceOrderIds;
  if (Array.isArray(fromMetadata) && fromMetadata.length) {
    return fromMetadata.map((id) => String(id).trim()).filter(Boolean);
  }
  const single = payment.resourceOrderId || payment?.metadata?.resourceOrderId;
  return single ? [String(single)] : [];
};

const markOrderPaid = async (payment, orderId) => {
  const order = await getResourceOrderById(orderId);
  if (!order) return { handled: false, error: 'ORDER_NOT_FOUND' };

  if (order.status === 'paid' || order.status === 'processing' || order.status === 'completed') {
    return { handled: true, idempotent: true, orderId };
  }

  await updateResourceOrder(orderId, {
    status: 'paid',
    paidAt: payment.paidAt || nowIso(),
    paymentId: payment.id,
  });

  const refreshed = await getResourceOrderById(orderId);

  try {
    const user = refreshed.userId ? await getUserById(refreshed.userId) : null;
    await notifyResourceOrderConfirmed({
      appUrl,
      order: refreshed,
      customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
    });
  } catch (_error) {
    // Ne pas bloquer le fulfillment si l'email échoue
  }

  await enqueueProviderFulfillment({
    order: refreshed,
    updateResourceOrder,
  });

  return { handled: true, orderId };
};

export const handleResourceOrderPaymentPaid = async (payment) => {
  const orderIds = resolvePaidOrderIds(payment);
  if (!orderIds.length) return { handled: false };

  const results = [];
  for (const orderId of orderIds) {
    results.push(await markOrderPaid(payment, orderId));
  }

  const handled = results.some((item) => item.handled);
  return {
    handled,
    orderIds: results.filter((item) => item.handled).map((item) => item.orderId),
    results,
  };
};
