import crypto, { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import {
  getDossier,
  getPaymentById,
  getPaymentByProviderId,
  hasPaymentEventProviderId,
  addPaymentEvent,
  transitionDossierStatus,
  upsertPayment,
} from '../store.js';
import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';
import { DOSSIER_STATUSES, ROLE } from '../stateMachine.js';
import { handleResourceOrderPaymentPaid } from './resourcePaymentWebhook.js';

const AMAZON_PAY_DEFAULT_RETURN_PATH = '/paiement/amazon-pay/retour';
const AMAZON_PAY_ALGORITHM = 'AMZN-PAY-RSASSA-PSS-V2';

const boolFromEnv = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toMoneyString = (amountCents) => (Math.max(0, amountCents) / 100).toFixed(2);

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

const formatAmazonPayDate = (date = new Date()) => (
  date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
);

const getAmazonPayRegion = () => String(process.env.AMAZON_PAY_REGION || 'eu').toLowerCase();

const getAmazonPayHost = () => {
  const region = getAmazonPayRegion();
  if (region === 'jp') return 'pay-api.amazon.jp';
  if (region === 'na' || region === 'us') return 'pay-api.amazon.com';
  return 'pay-api.amazon.eu';
};

const getAmazonPayEnvironmentSegment = () => (
  boolFromEnv(process.env.AMAZON_PAY_SANDBOX, false) ? 'sandbox' : 'live'
);

const resolvePrivateKey = () => {
  if (process.env.AMAZON_PAY_PRIVATE_KEY) return process.env.AMAZON_PAY_PRIVATE_KEY;
  const privateKeyPath = process.env.AMAZON_PAY_PRIVATE_KEY_PATH;
  if (!privateKeyPath) return '';
  return fs.readFileSync(privateKeyPath, 'utf8');
};

export const getAmazonPayPublicConfig = () => {
  const sandbox = boolFromEnv(process.env.AMAZON_PAY_SANDBOX, false);
  const merchantId = process.env.AMAZON_PAY_MERCHANT_ID || '';
  const clientId = process.env.AMAZON_PAY_CLIENT_ID || '';
  const publicKeyId = process.env.AMAZON_PAY_PUBLIC_KEY_ID || '';
  return {
    enabled: Boolean(merchantId && clientId && publicKeyId && (process.env.AMAZON_PAY_PRIVATE_KEY || process.env.AMAZON_PAY_PRIVATE_KEY_PATH)),
    sandbox,
    merchantId,
    publicKeyId,
    ledgerCurrency: process.env.AMAZON_PAY_LEDGER_CURRENCY || 'EUR',
    checkoutLanguage: process.env.AMAZON_PAY_CHECKOUT_LANGUAGE || 'fr_FR',
    merchantStoreName: process.env.AMAZON_PAY_STORE_NAME || 'Greffio',
    scriptUrl: process.env.AMAZON_PAY_SCRIPT_URL || 'https://static-eu.payments-amazon.com/checkout.js',
  };
};

const signAmazonPayString = (stringToSign, saltLength = 32) => {
  const privateKey = resolvePrivateKey();
  if (!privateKey) {
    const error = new Error('AMAZON_PAY_PRIVATE_KEY_MISSING');
    error.status = 503;
    throw error;
  }
  return crypto
    .createSign('RSA-SHA256')
    .update(stringToSign)
    .sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength,
    }, 'base64');
};

const signPayload = (payloadJSON) => {
  const stringToSign = `${AMAZON_PAY_ALGORITHM}\n${sha256Hex(payloadJSON)}`;
  return signAmazonPayString(stringToSign, 32);
};

const signApiRequest = ({
  method,
  path,
  body,
  idempotencyKey = '',
}) => {
  const host = getAmazonPayHost();
  const region = getAmazonPayRegion();
  const date = formatAmazonPayDate();
  const payload = body ? JSON.stringify(body) : '';
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-amz-pay-date': date,
    'x-amz-pay-host': host,
    'x-amz-pay-region': region,
    ...(idempotencyKey ? { 'x-amz-pay-idempotency-key': idempotencyKey } : {}),
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key}:${String(headers[key]).trim().replace(/\s+/g, ' ')}`)
    .join('\n');
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    sha256Hex(payload),
  ].join('\n');
  const stringToSign = `${AMAZON_PAY_ALGORITHM}\n${sha256Hex(canonicalRequest)}`;
  const signature = signAmazonPayString(stringToSign, 32);
  return {
    url: `https://${host}${path}`,
    payload,
    headers: {
      Accept: headers.accept,
      'Content-Type': headers['content-type'],
      'x-amz-pay-date': headers['x-amz-pay-date'],
      'x-amz-pay-host': headers['x-amz-pay-host'],
      'x-amz-pay-region': headers['x-amz-pay-region'],
      ...(idempotencyKey ? { 'x-amz-pay-idempotency-key': idempotencyKey } : {}),
      Authorization: `${AMAZON_PAY_ALGORITHM} PublicKeyId=${process.env.AMAZON_PAY_PUBLIC_KEY_ID}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
};

const resolveAmazonPayTarget = async ({ userId, dossierId, resourceOrderId, offerCode }) => {
  if (resourceOrderId) {
    const order = await getResourceOrderById(resourceOrderId);
    if (!order) {
      const error = new Error('ORDER_NOT_FOUND');
      error.status = 404;
      throw error;
    }
    if (order.userId !== userId) {
      const error = new Error('ORDER_FORBIDDEN');
      error.status = 403;
      throw error;
    }
    const amounts = computeResourcePaymentAmounts(order.priceTtcCents);
    return {
      amountTotalCents: amounts.amountTotalCents,
      normalizedOffer: `resource:${order.serviceId}`,
      description: `Greffio ${order.serviceTitle}`,
      dossierId: order.dossierId || null,
      resourceOrder: order,
    };
  }

  if (dossierId) {
    const dossier = await getDossier(dossierId);
    if (!dossier) {
      const error = new Error('DOSSIER_NOT_FOUND');
      error.status = 404;
      throw error;
    }
    if (dossier.userId && dossier.userId !== userId) {
      const error = new Error('DOSSIER_FORBIDDEN');
      error.status = 403;
      throw error;
    }
    const amounts = computePaymentAmounts(offerCode || dossier.offerCode);
    return {
      amountTotalCents: amounts.amountTotalCents,
      normalizedOffer: amounts.normalizedOffer,
      description: `Paiement Greffio ${amounts.normalizedOffer}`,
      dossierId,
      resourceOrder: null,
    };
  }

  const error = new Error('PAYMENT_TARGET_REQUIRED');
  error.status = 400;
  throw error;
};

export const createAmazonPayCheckoutSession = async ({
  userId,
  dossierId,
  resourceOrderId,
  offerCode,
  appUrl,
}) => {
  const config = getAmazonPayPublicConfig();
  if (!config.enabled) {
    const error = new Error('AMAZON_PAY_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }

  const target = await resolveAmazonPayTarget({ userId, dossierId, resourceOrderId, offerCode });
  const paymentId = randomUUID();
  const returnUrl = new URL(AMAZON_PAY_DEFAULT_RETURN_PATH, appUrl);
  returnUrl.searchParams.set('provider', 'Amazon Pay');
  returnUrl.searchParams.set('paymentId', paymentId);
  if (target.dossierId) returnUrl.searchParams.set('dossierId', target.dossierId);
  if (resourceOrderId) returnUrl.searchParams.set('resourceOrderId', resourceOrderId);

  const payload = {
    webCheckoutDetails: {
      checkoutReviewReturnUrl: returnUrl.toString(),
      checkoutResultReturnUrl: returnUrl.toString(),
      checkoutCancelUrl: returnUrl.toString(),
    },
    storeId: process.env.AMAZON_PAY_STORE_ID || process.env.AMAZON_PAY_CLIENT_ID,
    paymentDetails: {
      paymentIntent: 'AuthorizeWithCapture',
      canHandlePendingAuthorization: false,
      chargeAmount: {
        amount: toMoneyString(target.amountTotalCents),
        currencyCode: config.ledgerCurrency,
      },
    },
    merchantMetadata: {
      merchantReferenceId: paymentId,
      merchantStoreName: config.merchantStoreName,
      noteToBuyer: target.description,
    },
  };
  const payloadJSON = JSON.stringify(payload);
  const signature = signPayload(payloadJSON);

  const payment = await upsertPayment({
    id: paymentId,
    dossierId: target.dossierId,
    resourceOrderId: resourceOrderId || null,
    userId,
    offerCode: target.normalizedOffer,
    amountTotalCents: target.amountTotalCents,
    amountServiceCents: target.amountTotalCents,
    amountLegalFeesCents: 0,
    currency: config.ledgerCurrency,
    status: 'pending',
    provider: 'amazon_pay',
    providerPaymentId: paymentId,
    providerPayload: {
      amazonPay: {
        sandbox: config.sandbox,
        returnUrl: returnUrl.toString(),
        publicKeyId: config.publicKeyId,
      },
    },
  });

  if (target.resourceOrder) {
    await updateResourceOrder(target.resourceOrder.id, {
      status: 'pending_payment',
      paymentId,
    });
  }

  return {
    payment,
    config,
    createCheckoutSessionConfig: {
      payloadJSON,
      signature,
      algorithm: AMAZON_PAY_ALGORITHM,
      publicKeyId: config.publicKeyId,
    },
  };
};

export const completeAmazonPayCheckoutSession = async ({
  userId,
  paymentId,
  amazonCheckoutSessionId,
}) => {
  if (!paymentId || !amazonCheckoutSessionId) {
    const error = new Error('AMAZON_PAY_RETURN_PAYLOAD_REQUIRED');
    error.status = 400;
    throw error;
  }
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    const error = new Error('PAYMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (payment.userId && payment.userId !== userId) {
    const error = new Error('PAYMENT_FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (payment.status === 'paid') {
    return {
      payment,
      amazonPay: payment.providerPayload?.amazonPayComplete || null,
      status: 'paid',
    };
  }

  const amountCents = Number(payment.amountTotalCents || payment.amount_total_cents || 0);
  const currency = payment.currency || 'EUR';
  const requestBody = {
    chargeAmount: {
      amount: toMoneyString(amountCents),
      currencyCode: currency,
    },
  };
  const path = `/${getAmazonPayEnvironmentSegment()}/v2/checkoutSessions/${encodeURIComponent(amazonCheckoutSessionId)}/complete`;
  const signed = signApiRequest({
    method: 'POST',
    path,
    body: requestBody,
    idempotencyKey: `greffio-${payment.id}`.replace(/[^a-zA-Z0-9_-]/g, ''),
  });
  const response = await fetch(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.payload,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok && response.status !== 202) {
    const error = new Error(payload?.reasonCode || payload?.message || 'AMAZON_PAY_COMPLETE_FAILED');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const completed = payload?.statusDetails?.state === 'Completed' || Boolean(payload?.chargeId);
  const nextStatus = completed ? 'paid' : 'processing';
  const updatedPayment = await upsertPayment({
    ...payment,
    status: nextStatus,
    providerPayload: {
      ...(payment.providerPayload || {}),
      amazonPayComplete: payload,
      amazonCheckoutSessionId,
    },
    paidAt: completed ? new Date().toISOString() : payment.paidAt || null,
  });

  if (completed && payment.resourceOrderId) {
    await handleResourceOrderPaymentPaid(updatedPayment);
  }
  if (completed && payment.dossierId) {
    await transitionDossierStatus({
      dossierId: payment.dossierId,
      nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
      actorType: 'api',
      actorRole: ROLE.SYSTEM,
      reason: 'amazon_pay_confirmed',
      metadata: {
        paymentConfirmed: true,
        providerPaymentId: payment.providerPaymentId,
        amazonCheckoutSessionId,
      },
    });
  }

  return {
    payment: updatedPayment,
    amazonPay: payload,
    status: nextStatus,
  };
};

const AMAZON_SNS_HOST_PATTERN = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i;

const buildAmazonSnsStringToSign = (message, signatureVersion = '1') => {
  if (signatureVersion !== '1') return '';
  const fields = ['Message', 'MessageId'];
  if (message.Subject) fields.push('Subject');
  fields.push('Timestamp', 'TopicArn', 'Type');
  return `${fields.map((field) => `${field}\n${message[field] || ''}\n`).join('')}`;
};

const verifyAmazonSnsMessage = async (message) => {
  if (!message?.Signature || !message?.SigningCertURL) {
    return { ok: false, error: 'AMAZON_PAY_IPN_SIGNATURE_MISSING' };
  }
  let certUrl;
  try {
    certUrl = new URL(String(message.SigningCertURL));
  } catch {
    return { ok: false, error: 'AMAZON_PAY_IPN_CERT_URL_INVALID' };
  }
  if (certUrl.protocol !== 'https:' || !AMAZON_SNS_HOST_PATTERN.test(certUrl.hostname)) {
    return { ok: false, error: 'AMAZON_PAY_IPN_CERT_URL_UNTRUSTED' };
  }
  const certResponse = await fetch(message.SigningCertURL);
  if (!certResponse.ok) {
    return { ok: false, error: 'AMAZON_PAY_IPN_CERT_FETCH_FAILED' };
  }
  const certificate = await certResponse.text();
  const stringToSign = buildAmazonSnsStringToSign(message, message.SignatureVersion || '1');
  const verified = crypto
    .createVerify('RSA-SHA1')
    .update(stringToSign)
    .verify(certificate, message.Signature, 'base64');
  return verified
    ? { ok: true }
    : { ok: false, error: 'AMAZON_PAY_IPN_SIGNATURE_INVALID' };
};

const fetchAmazonPayResource = async ({ method = 'GET', path, body = null, idempotencyKey = '' }) => {
  const signed = signApiRequest({ method, path, body, idempotencyKey });
  const response = await fetch(signed.url, {
    method,
    headers: signed.headers,
    ...(signed.payload ? { body: signed.payload } : {}),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(payload?.reasonCode || payload?.message || 'AMAZON_PAY_API_FAILED');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const isAmazonPayChargeCaptured = (charge = {}) => {
  const state = String(charge?.statusDetails?.state || '').toLowerCase();
  return state === 'captured' || state === 'completed' || Boolean(charge?.chargeId && state === 'authorized');
};

const finalizeAmazonPayPayment = async ({
  payment,
  amazonPayload,
  providerEventId,
  eventType,
}) => {
  if (!payment || payment.status === 'paid') {
    return { payment, status: payment?.status || 'ignored' };
  }
  if (providerEventId && await hasPaymentEventProviderId(providerEventId)) {
    return { payment, status: 'duplicate' };
  }
  if (providerEventId) {
    await addPaymentEvent({
      paymentId: payment.id,
      eventType,
      providerEventId,
      rawPayload: amazonPayload,
    });
  }
  const completed = isAmazonPayChargeCaptured(amazonPayload);
  const nextStatus = completed ? 'paid' : 'processing';
  const updatedPayment = await upsertPayment({
    ...payment,
    status: nextStatus,
    providerPayload: {
      ...(payment.providerPayload || {}),
      amazonPayIpn: amazonPayload,
    },
    paidAt: completed ? new Date().toISOString() : payment.paidAt || null,
  });
  if (completed && payment.resourceOrderId) {
    await handleResourceOrderPaymentPaid(updatedPayment);
  }
  if (completed && payment.dossierId) {
    await transitionDossierStatus({
      dossierId: payment.dossierId,
      nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
      actorType: 'webhook',
      actorRole: ROLE.WEBHOOK,
      reason: 'amazon_pay_ipn_confirmed',
      metadata: {
        paymentConfirmed: true,
        providerPaymentId: payment.providerPaymentId,
        chargeId: amazonPayload?.chargeId || amazonPayload?.ObjectId,
      },
    });
  }
  return { payment: updatedPayment, status: nextStatus };
};

const resolvePaymentFromAmazonCharge = async (charge = {}) => {
  const merchantReferenceId = charge?.merchantMetadata?.merchantReferenceId
    || charge?.merchantMetadata?.merchantReferenceID;
  if (merchantReferenceId) {
    const byId = await getPaymentById(String(merchantReferenceId));
    if (byId) return byId;
  }
  const chargeId = charge?.chargeId || charge?.ObjectId;
  if (chargeId) {
    const byProvider = await getPaymentByProviderId(String(chargeId));
    if (byProvider) return byProvider;
  }
  return null;
};

const processAmazonPayNotificationMessage = async (messagePayload = {}) => {
  const objectType = String(messagePayload.ObjectType || messagePayload.objectType || '').toUpperCase();
  const objectId = String(messagePayload.ObjectId || messagePayload.objectId || '').trim();
  const notificationId = String(messagePayload.NotificationId || messagePayload.notificationId || objectId).trim();
  if (!objectType || !objectId) {
    return { ok: true, handled: false, reason: 'AMAZON_PAY_IPN_IGNORED' };
  }
  if (objectType !== 'CHARGE') {
    return { ok: true, handled: false, reason: `AMAZON_PAY_IPN_${objectType}_IGNORED` };
  }
  const charge = await fetchAmazonPayResource({
    path: `/${getAmazonPayEnvironmentSegment()}/v2/charges/${encodeURIComponent(objectId)}`,
  });
  const payment = await resolvePaymentFromAmazonCharge(charge);
  if (!payment) {
    return { ok: true, handled: false, reason: 'AMAZON_PAY_PAYMENT_NOT_FOUND' };
  }
  const result = await finalizeAmazonPayPayment({
    payment,
    amazonPayload: charge,
    providerEventId: notificationId ? `amazon-pay:${notificationId}` : '',
    eventType: 'amazon_pay.charge.state_change',
  });
  return { ok: true, handled: true, status: result.status, paymentId: payment.id };
};

export const handleAmazonPayIpn = async ({ rawBody, headers = {} }) => {
  if (!getAmazonPayPublicConfig().enabled) {
    return { ok: false, status: 503, error: 'AMAZON_PAY_NOT_CONFIGURED' };
  }
  let envelope;
  try {
    envelope = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody;
  } catch {
    return { ok: false, status: 400, error: 'AMAZON_PAY_IPN_INVALID_JSON' };
  }
  const messageType = String(envelope?.Type || headers['x-amz-sns-message-type'] || '').trim();
  if (messageType === 'SubscriptionConfirmation' && envelope?.SubscribeURL) {
    await fetch(envelope.SubscribeURL, { method: 'GET' });
    return { ok: true, status: 200, confirmed: true };
  }
  if (messageType && messageType !== 'Notification') {
    return { ok: true, status: 200, ignored: true, type: messageType };
  }
  const verification = await verifyAmazonSnsMessage(envelope);
  if (!verification.ok && process.env.NODE_ENV === 'production') {
    return { ok: false, status: 401, error: verification.error || 'AMAZON_PAY_IPN_SIGNATURE_INVALID' };
  }
  let messagePayload = {};
  try {
    messagePayload = envelope?.Message ? JSON.parse(envelope.Message) : {};
  } catch {
    return { ok: false, status: 400, error: 'AMAZON_PAY_IPN_MESSAGE_INVALID' };
  }
  const result = await processAmazonPayNotificationMessage(messagePayload);
  return { ok: true, status: 200, ...result };
};
