import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';
import { getUserById } from '../authStore.js';
import { enqueueProviderFulfillment } from './resourceFulfillment.js';
import { notifyResourceOrderConfirmed } from './resourceOrderNotifications.js';

const nowIso = () => new Date().toISOString();
const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';

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
