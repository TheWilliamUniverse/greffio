import { apiDelete, apiGet, apiPost, parseApiResponse } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';

const publicGet = async (path) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, { cache: 'no-store' });
  return parseApiResponse(response);
};

export const fetchResourceServices = async () => publicGet('/api/resources/services');

export const searchResourceServices = async (query) => {
  const params = new URLSearchParams({ q: query });
  return publicGet(`/api/resources/search?${params}`);
};

export const fetchResourceConfig = async () => publicGet('/api/resources/config');

export const listResourceOrders = async () => apiGet('/api/resources/orders');

export const getResourceOrder = async (orderId) => apiGet(`/api/resources/orders/${orderId}`);

export const deleteResourceOrder = async (orderId) => apiDelete(`/api/resources/orders/${encodeURIComponent(orderId)}`);

export const checkoutResourceOrder = async (orderId, { mollieMethod, cardToken } = {}) => apiPost(
  `/api/resources/orders/${orderId}/checkout`,
  { mollieMethod, cardToken },
);

export const prepareCartOrders = async (items) => apiPost('/api/resources/cart/prepare', { items });

export const checkoutCartPayment = async ({ orderIds, mollieMethod, cardToken }) => apiPost(
  '/api/resources/cart/pay',
  { orderIds, mollieMethod, cardToken },
);

export const createResourceOrder = async (payload) => apiPost('/api/resources/orders', payload);
