import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';
import { enqueueProviderFulfillment } from './resourceFulfillment.js';

const nowIso = () => new Date().toISOString();

export const handleResourceOrderPaymentPaid = async (payment) => {
  const orderId = payment.resourceOrderId;
  if (!orderId) return { handled: false };

  const order = await getResourceOrderById(orderId);
  if (!order) return { handled: false, error: 'ORDER_NOT_FOUND' };

  if (order.status === 'paid' || order.status === 'processing' || order.status === 'completed') {
    return { handled: true, idempotent: true };
  }

  await updateResourceOrder(orderId, {
    status: 'paid',
    paidAt: payment.paidAt || nowIso(),
    paymentId: payment.id,
  });

  const refreshed = await getResourceOrderById(orderId);
  await enqueueProviderFulfillment({
    order: refreshed,
    updateResourceOrder,
  });

  return { handled: true, orderId };
};
