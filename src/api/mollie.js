import { apiGet } from '@/api/client.js';

export const fetchMollieMethods = async ({ amountCents, currency = 'EUR', locale = 'fr_FR' } = {}) => {
  const params = new URLSearchParams();
  if (amountCents) params.set('amount', String(amountCents));
  if (currency) params.set('currency', currency);
  if (locale) params.set('locale', locale);
  const query = params.toString();
  return apiGet(query ? `/api/mollie/methods?${query}` : '/api/mollie/methods');
};

export const fetchPaymentTerminalConfig = async (customerType = 'b2c') => {
  const params = new URLSearchParams({ customerType });
  return apiGet(`/api/payments/terminal-config?${params}`);
};
