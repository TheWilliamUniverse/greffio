import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

export const lookupCompanyBySiren = async (identifier) => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/company-search?siren=${encodeURIComponent(identifier)}`, {
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

export const lookupPublicCompanyBySiren = async (identifier) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/public/company-search?siren=${encodeURIComponent(identifier)}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'COMPANY_LOOKUP_FAILED');
  }
  return response.json();
};

export const getCompanyLookupObservability = async () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/observability/company-lookup`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'COMPANY_LOOKUP_OBSERVABILITY_FAILED');
  }
  return response.json();
};
