import {
  getAllCatalogItems,
  getCatalogItemById,
} from './config/resourceServices.js';
import { searchResources } from './resourceSearch.js';
import {
  createResourceOrder,
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
  const hasGoCardless = Boolean(process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY);
  const hasCawl = Boolean(
    (process.env.CAWL_PBX_SITE || process.env.CAWL_MERCHANT_ID)
    && process.env.CAWL_PBX_RANG
    && (process.env.CAWL_PBX_IDENTIFIANT || process.env.CAWL_API_KEY_ID)
    && (process.env.CAWL_HMAC_KEY || process.env.CAWL_API_KEY),
  );
  const hasGooglePay = Boolean(process.env.GOOGLE_PAY_API_KEY || process.env.GOOGLE_PAY_MERCHANT_ID);
  return {
    paymentEnabled: hasGoCardless || hasCawl || hasGooglePay || process.env.NODE_ENV !== 'production',
    providers: {
      gocardless: hasGoCardless,
      cawl: hasCawl,
      googlePay: hasGooglePay,
    },
  };
};

export const submitResourceOrder = async ({ userId, body, appUrl, customerName }) => {
  const service = getCatalogItemById(body?.serviceId);
  if (!service) {
    const error = new Error('SERVICE_NOT_FOUND');
    error.status = 404;
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
    contactEmail: body?.email,
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

export const listUserResourceOrders = (userId) => listResourceOrdersByUser(userId);

export const listOpsResourceOrders = (filters) => listResourceOrdersForOps(filters);

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
