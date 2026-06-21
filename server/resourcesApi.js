import {
  getAllCatalogItems,
  getCatalogItemById,
} from './config/resourceServices.js';
import { searchResources } from './resourceSearch.js';
import {
  createResourceOrder,
  deleteResourceOrderById,
  deleteResourceOrdersByIds,
  getResourceOrderById,
  listResourceOrdersByUser,
  listResourceOrdersForOps,
  updateResourceOrder,
} from './resourceOrderStore.js';
import { resolveFulfillmentMode } from './services/resourceFulfillment.js';
import { notifyResourceOrderConfirmed } from './services/resourceOrderNotifications.js';

export const listResourceServices = () => getAllCatalogItems().map((item) => ({
  id: item.id,
  title: item.title,
  category: item.category,
  kind: item.kind,
  description: item.description,
  priceTtc: item.priceTtc,
  estimatedDelay: item.estimatedDelay,
  requiresCompany: item.requiresCompany,
  requiresSiren: item.requiresSiren,
  available: item.available,
  actionLabel: item.actionLabel,
  processingMode: item.processingMode,
}));

export const searchResourceCatalog = (query) => searchResources(query);

export const getResourceConfig = () => {
  const hasMollie = Boolean(process.env.MOLLIE_API_KEY);
  return {
    paymentEnabled: hasMollie || process.env.NODE_ENV !== 'production',
    providers: {
      mollie: hasMollie,
    },
  };
};

export const submitResourceOrder = async ({ userId, body, appUrl, customerName, customerEmail }) => {
  const service = getCatalogItemById(body?.serviceId);
  if (!service) {
    const error = new Error('SERVICE_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const contactEmail = String(body?.email || customerEmail || '').trim();
  if (!contactEmail) {
    const error = new Error('CONTACT_EMAIL_REQUIRED');
    error.status = 400;
    throw error;
  }

  const priceTtcCents = Math.round(Number(service.priceTtc || 0) * 100);
  const fulfillmentMode = resolveFulfillmentMode(service.id);
  const needsPayment = priceTtcCents > 0;

  const order = await createResourceOrder({
    userId,
    serviceId: service.id,
    serviceTitle: service.title,
    companyName: body?.companyName,
    siren: body?.siren,
    dossierId: body?.dossierId,
    contactEmail,
    status: needsPayment ? 'pending_payment' : 'processing',
    fulfillmentMode,
    priceTtcCents,
    notes: body?.notes,
    metadata: {
      estimatedDelay: service.estimatedDelay,
      category: service.category,
    },
  });

  // Brouillon sans paiement : pas d'email. Gratuit (0 €) = confirmation immédiate.
  if (!needsPayment) {
    try {
      await notifyResourceOrderConfirmed({
        appUrl,
        order,
        customerName,
      });
    } catch (_error) {
      // Ne pas bloquer la commande si l'email échoue
    }
  }

  return order;
};

export const getResourceOrderForUser = async ({ orderId, userId, isOps = false }) => {
  const order = await getResourceOrderById(orderId);
  if (!order) {
    const error = new Error('ORDER_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (!isOps && order.userId !== userId) {
    const error = new Error('ORDER_FORBIDDEN');
    error.status = 403;
    throw error;
  }
  return order;
};

export const USER_CANCELLABLE_ORDER_STATUSES = ['draft', 'pending_payment'];

export const OPS_CANCELLABLE_ORDER_STATUSES = ['draft', 'pending_payment', 'cancelled'];

const assertOrderCancellable = (order, allowedStatuses) => {
  if (!allowedStatuses.includes(order.status)) {
    const error = new Error('ORDER_NOT_CANCELLABLE');
    error.status = 409;
    error.details = { status: order.status };
    throw error;
  }
};

export const listUserResourceOrders = (userId) => listResourceOrdersByUser(userId);

export const listOpsResourceOrders = (filters) => listResourceOrdersForOps(filters);

export const deleteResourceOrderForUser = async ({ orderId, userId }) => {
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
  assertOrderCancellable(order, USER_CANCELLABLE_ORDER_STATUSES);
  await deleteResourceOrderById(orderId);
  return { deleted: true, order };
};

export const deleteOpsResourceOrder = async ({ orderId }) => {
  const order = await getResourceOrderById(orderId);
  if (!order) {
    const error = new Error('ORDER_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  assertOrderCancellable(order, OPS_CANCELLABLE_ORDER_STATUSES);
  await deleteResourceOrderById(orderId);
  return { deleted: true, order };
};

export const bulkDeleteOpsResourceOrders = async ({ orderIds = [] }) => {
  const ids = [...new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) {
    return { deleted: 0, orders: [] };
  }

  const orders = (await Promise.all(ids.map((id) => getResourceOrderById(id))))
    .filter(Boolean);
  const deletable = orders.filter((order) => OPS_CANCELLABLE_ORDER_STATUSES.includes(order.status));
  const deleted = await deleteResourceOrdersByIds(deletable.map((order) => order.id));
  return {
    deleted,
    orders: deletable,
    skipped: orders.length - deletable.length,
  };
};

export const updateOpsResourceOrderStatus = async ({ orderId, status, actorId, notes }) => {
  const allowed = ['processing', 'completed', 'cancelled', 'pending_payment', 'paid'];
  if (!allowed.includes(status)) {
    const error = new Error('INVALID_STATUS');
    error.status = 400;
    throw error;
  }
  const patch = {
    status,
    metadata: { lastOpsActor: actorId, lastOpsUpdate: new Date().toISOString() },
  };
  if (notes) patch.notes = notes;
  if (status === 'completed') patch.completedAt = new Date().toISOString();
  return updateResourceOrder(orderId, patch);
};
