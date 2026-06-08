import { logStructured } from '../utils/structuredLog.js';
import { getSecurityMetricsSnapshot } from './metrics.js';

const alertCooldownMs = Number(process.env.SECURITY_ALERT_COOLDOWN_MS || 5 * 60 * 1000);
const lastAlertAt = new Map();

export const sendSecurityAlert = async ({ type, details = {} }) => {
  const webhookUrl = String(process.env.SECURITY_ALERT_WEBHOOK_URL || '').trim();
  if (!webhookUrl) return { sent: false, reason: 'WEBHOOK_NOT_CONFIGURED' };

  const now = Date.now();
  const previous = lastAlertAt.get(type) || 0;
  if (now - previous < alertCooldownMs) {
    return { sent: false, reason: 'COOLDOWN' };
  }
  lastAlertAt.set(type, now);

  const payload = {
    event: type,
    service: 'greffio-api',
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    metrics: getSecurityMetricsSnapshot(),
    details,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      logStructured.warn('SECURITY_ALERT_WEBHOOK_FAILED', { type, status: response.status });
      return { sent: false, reason: 'WEBHOOK_HTTP_ERROR' };
    }
    logStructured.info('SECURITY_ALERT_SENT', { type });
    return { sent: true };
  } catch (error) {
    logStructured.warn('SECURITY_ALERT_WEBHOOK_FAILED', {
      type,
      reason: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK',
    });
    return { sent: false, reason: 'WEBHOOK_NETWORK_ERROR' };
  }
};

export const __testOnlyResetSecurityAlerts = () => {
  lastAlertAt.clear();
};
