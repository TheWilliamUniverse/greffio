import crypto from 'node:crypto';
import { PAYMENT_STATUSES } from '../types.js';

/**
 * Worldline Connect webhooks (Payment API) – distinct de l'IPN e-Transactions Paybox.
 *
 * Doc : https://docs.connect.worldline-solutions.com/documentation/webhooks/
 * Headers : X-GCS-KeyId, X-GCS-Signature (base64 HMAC-SHA256 du corps brut UTF-8).
 *
 * Variables :
 *   CAWL_PSPID           Identifiant marchand Worldline (ex. WILLIAMESTABLISHMENTS)
 *   CAWL_WEBHOOK_ID      Identifiant clé webhook (X-GCS-KeyId attendu)
 *   CAWL_WEBHOOK_SECRET  Clé secrète webhook (UTF-8 bytes pour HMAC)
 *   CAWL_API_KEY_ID      Identifiant clé API Payment (référence back-office, pas utilisé en IPN)
 */

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveCawlWorldlineConfig(env = process.env) {
  return {
    pspid: String(env.CAWL_PSPID || '').trim(),
    webhookId: String(env.CAWL_WEBHOOK_ID || '').trim(),
    webhookSecret: String(env.CAWL_WEBHOOK_SECRET || '').trim(),
    apiKeyId: String(env.CAWL_API_KEY_ID || '').trim(),
  };
}

/** @param {NodeJS.ProcessEnv} [env] */
export function isCawlWorldlineConfigured(env = process.env) {
  const cfg = resolveCawlWorldlineConfig(env);
  return Boolean(cfg.webhookId && cfg.webhookSecret);
}

/**
 * @param {Record<string, string|string[]|undefined>} headers
 * @param {string} name
 */
function getHeader(headers, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === lower) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
}

/**
 * Vérifie X-GCS-Signature (HMAC-SHA256 base64) selon doc Worldline Connect.
 * @param {{ rawBody: string|Buffer, headers: Record<string, string|undefined>, webhookSecret: string, expectedKeyId?: string }}
 */
export function verifyWorldlineWebhookSignature({
  rawBody,
  headers,
  webhookSecret,
  expectedKeyId,
}) {
  if (!webhookSecret) {
    return { ok: false, reason: 'CAWL_WEBHOOK_SECRET_MISSING' };
  }

  const signature = getHeader(headers, 'X-GCS-Signature');
  const keyId = getHeader(headers, 'X-GCS-KeyId');

  if (!signature || !keyId) {
    return { ok: false, reason: 'CAWL_WORLDLINE_SIGNATURE_MISSING' };
  }

  if (expectedKeyId && keyId !== expectedKeyId) {
    return { ok: false, reason: 'CAWL_WORLDLINE_KEYID_MISMATCH' };
  }

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody || ''), 'utf8');

  const expected = crypto
    .createHmac('sha256', Buffer.from(webhookSecret, 'utf8'))
    .update(bodyBuffer)
    .digest('base64');

  let valid;
  try {
    valid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch (_error) {
    valid = false;
  }

  return valid
    ? { ok: true, keyId }
    : { ok: false, reason: 'CAWL_WORLDLINE_SIGNATURE_MISMATCH' };
}

/**
 * Réponse attendue lors de la vérification d'endpoint (GET).
 * @param {Record<string, string|undefined>} headers
 */
export function handleWorldlineEndpointVerification(headers) {
  const challenge = getHeader(headers, 'X-GCS-Webhooks-Endpoint-Verification');
  if (!challenge) return null;
  return { ok: true, body: challenge };
}

/**
 * Parse un événement Worldline Connect et extrait l'identifiant paiement.
 * @param {string|Record<string, unknown>} payload
 */
export function parseWorldlineWebhookEvent(payload) {
  const event = typeof payload === 'string'
    ? JSON.parse(payload)
    : payload;

  const payment = event?.payment
    || event?.data?.payment
    || event?.data
    || event;

  const providerPaymentId = payment?.id
    || payment?.paymentOutput?.references?.merchantReference
    || payment?.merchantReference
    || event?.id
    || null;

  const statusRaw = payment?.status
    || payment?.statusOutput?.statusCode
    || event?.type
    || null;

  return {
    providerPaymentId,
    status: mapWorldlineStatus(statusRaw),
    eventType: event?.type || event?.eventType || 'worldline.webhook',
    raw: event,
  };
}

/** @param {string|number|null|undefined} status */
export function mapWorldlineStatus(status) {
  const normalized = String(status || '').toLowerCase().replace(/[_\s-]+/g, '');
  switch (normalized) {
    case 'paid':
    case 'captured':
    case 'paymentcreated':
    case 'succeeded':
    case 'completed':
    case '900':
    case 'paidout':
      return PAYMENT_STATUSES.PAID;
    case 'pending':
    case 'created':
    case 'open':
    case 'inprogress':
    case '600':
      return PAYMENT_STATUSES.PENDING;
    case 'processing':
      return PAYMENT_STATUSES.PROCESSING;
    case 'cancelled':
    case 'canceled':
    case 'abandoned':
    case '99999':
      return PAYMENT_STATUSES.CANCELLED;
    case 'failed':
    case 'declined':
    case 'rejected':
    case 'expired':
      return PAYMENT_STATUSES.FAILED;
    case 'refunded':
      return PAYMENT_STATUSES.REFUNDED;
    default:
      return PAYMENT_STATUSES.PENDING;
  }
}
