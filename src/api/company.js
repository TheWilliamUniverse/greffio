import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

export const lookupCompanyBySiren = async (siren) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/company-search?siren=${encodeURIComponent(siren)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'COMPANY_LOOKUP_FAILED');
  }
  return response.json();
};
