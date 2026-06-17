const TOKEN_KEY = 'greffio_ops_step_up';
const EXPIRES_KEY = 'greffio_ops_step_up_expires';

export const OPS_STEP_UP_TTL_MS = 15 * 60 * 1000;

export const saveOpsStepUp = ({ token, expiresAt }) => {
  if (!token || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_KEY, String(expiresAt || Date.now() + OPS_STEP_UP_TTL_MS));
};

export const clearOpsStepUp = () => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
};

export const getOpsStepUpToken = () => {
  if (!isOpsStepUpValid()) {
    clearOpsStepUp();
    return null;
  }
  return sessionStorage.getItem(TOKEN_KEY);
};

export const isOpsStepUpValid = () => {
  if (typeof sessionStorage === 'undefined') return false;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
  return Boolean(token) && expiresAt > Date.now();
};

export const getOpsStepUpExpiresAt = () => {
  if (typeof sessionStorage === 'undefined') return null;
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_KEY) || 0);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null;
};
