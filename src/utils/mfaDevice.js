const MFA_DEVICE_TOKEN_KEY = 'greffio_mfa_device_token';
const MFA_DEVICE_EXPIRES_KEY = 'greffio_mfa_device_expires';

export const saveMfaDeviceToken = (deviceToken, expiresAt) => {
  if (!deviceToken) return;
  try {
    window.localStorage.setItem(MFA_DEVICE_TOKEN_KEY, String(deviceToken));
    if (expiresAt) {
      window.localStorage.setItem(MFA_DEVICE_EXPIRES_KEY, String(expiresAt));
    }
  } catch (_error) {
    // ignore quota errors
  }
};

export const getMfaDeviceToken = () => {
  try {
    const token = window.localStorage.getItem(MFA_DEVICE_TOKEN_KEY);
    const expiresAt = window.localStorage.getItem(MFA_DEVICE_EXPIRES_KEY);
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      clearMfaDeviceToken();
      return '';
    }
    return token || '';
  } catch (_error) {
    return '';
  }
};

export const clearMfaDeviceToken = () => {
  try {
    window.localStorage.removeItem(MFA_DEVICE_TOKEN_KEY);
    window.localStorage.removeItem(MFA_DEVICE_EXPIRES_KEY);
  } catch (_error) {
    // ignore
  }
};

export const mfaDeviceAuthHeaders = () => {
  const token = getMfaDeviceToken();
  return token ? { 'X-Greffio-Mfa-Device': token } : {};
};
