import { logStructured } from '../utils/structuredLog.js';

let sentryReady = false;

export const isSentryConfigured = () => Boolean(String(process.env.SENTRY_DSN || '').trim());

export const initSentry = async () => {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) return false;

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
      beforeSend(event) {
        if (event?.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
    });
    sentryReady = true;
    logStructured.info('SENTRY_INITIALIZED');
    return true;
  } catch (error) {
    logStructured.warn('SENTRY_INIT_FAILED', { reason: error?.message || 'IMPORT_FAILED' });
    return false;
  }
};

export const captureSecurityException = async (error, context = {}) => {
  if (!sentryReady) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(error, { extra: context });
  } catch (_error) {
    // ignore optional telemetry failures
  }
};
