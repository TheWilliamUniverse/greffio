const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const isTransientHttpStatus = (status) => {
  const code = Number(status);
  return !Number.isFinite(code) || code === 0 || TRANSIENT_HTTP_STATUSES.has(code);
};

export const isTransientFetchError = (error) => {
  if (!error) return false;
  if (error.name === 'AbortError') return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('load failed')
    || message.includes('networkerror');
};

export const isAuthSessionInvalidError = (error) => {
  const code = error?.payload?.error || error?.code || error?.message;
  return ['REFRESH_TOKEN_INVALID', 'INVALID_REFRESH_TOKEN', 'AUTH_REFRESH_MISSING', 'AUTH_SESSION_EXPIRED'].includes(code);
};

export const isTransientApiError = (error) => {
  if (!error) return false;
  if (error.code === 'API_INVALID_RESPONSE' || error.code === 'API_TRANSIENT_UNAVAILABLE') return true;
  if (isTransientHttpStatus(error.status)) return true;
  return isTransientFetchError(error);
};

export const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export const withTransientRetry = async (fn, { retries = 2, delays = [400, 1200] } = {}) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientApiError(error) || attempt >= retries) throw error;
      await sleep(delays[attempt] ?? delays[delays.length - 1] ?? 1200);
    }
  }
  throw lastError;
};

export const mapLoginPayloadError = (payload) => {
  if (!payload || typeof payload !== 'object' || typeof payload.json === 'function') {
    return 'Réponse serveur incomplète (mise à jour en cours). Réessayez dans quelques instants.';
  }
  if (payload.mfaRequired) return null;
  if (!payload.accessToken || !payload.refreshToken) {
    return 'Réponse serveur incomplète (mise à jour en cours). Réessayez dans quelques instants.';
  }
  return null;
};
