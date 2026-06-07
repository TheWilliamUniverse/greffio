import { runtimeConfig } from '@/config/runtime.js';

const buildTags = () => ({
  route: window.location?.pathname || '/',
  chunkVersion: import.meta.env.VITE_APP_BUILD_ID || import.meta.env.MODE,
  appUrl: runtimeConfig.appUrl,
});

export const reportClientError = (error, context = {}) => {
  const payload = {
    message: String(error?.message || error),
    stack: error?.stack || null,
    ...buildTags(),
    ...context,
  };
  if (import.meta.env.DEV) {
    console.error('[greffio-error]', payload);
    return;
  }
  window.dispatchEvent(new CustomEvent('greffio:client-error', { detail: payload }));
  void fetch(`${runtimeConfig.apiBaseUrl}/api/observability/client-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
};

export const initClientErrorReporting = () => {
  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message, { source: 'window.error' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { source: 'unhandledrejection' });
  });
};
