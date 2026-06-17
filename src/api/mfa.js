import { runtimeConfig } from '@/config/runtime.js';
import { apiGet, apiPost, parseApiResponse } from '@/api/client.js';
import { withTransientRetry } from '@/api/networkResilience.js';
import { mfaDeviceAuthHeaders } from '@/utils/mfaDevice.js';
import { nativeClientAuthHeaders } from '@/utils/nativeClient.js';

const mfaHeaders = () => ({
  ...nativeClientAuthHeaders(),
  ...mfaDeviceAuthHeaders(),
});

export const fetchMfaStatus = async () => apiGet('/api/auth/mfa/status', { headers: mfaHeaders() });

export const setupTotp = async () => apiPost('/api/auth/mfa/totp/setup', {}, { headers: mfaHeaders() });

export const enableTotp = async ({ code }) => apiPost('/api/auth/mfa/totp/enable', { code }, { headers: mfaHeaders() });

export const disableTotp = async ({ password, code }) => apiPost('/api/auth/mfa/totp/disable', { password, code }, { headers: mfaHeaders() });

export const regenerateRecoveryCodes = async ({ password, code }) => apiPost('/api/auth/mfa/recovery-codes/regenerate', { password, code }, { headers: mfaHeaders() });

export const sendMfaEmailCode = async ({ mfaToken }) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...mfaHeaders(),
    },
    body: JSON.stringify({ mfaToken }),
  });
  return parseApiResponse(response);
};

export const fetchMfaTrustedDeviceStatus = async () => apiGet('/api/auth/mfa/trusted-device/status', { headers: mfaHeaders() });

export const trustMfaDevice = async () => apiPost('/api/auth/mfa/trust-device', {}, { headers: mfaHeaders() });

export const verifyMfaLogin = async ({ mfaToken, code, recoveryCode, method = 'totp' }) => withTransientRetry(async () => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/auth/mfa/verify-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...mfaHeaders(),
    },
    body: JSON.stringify({ mfaToken, code, recoveryCode, method }),
  });
  return parseApiResponse(response);
}, { retries: 1, delays: [600] });
