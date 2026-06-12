import crypto, { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import { getDossier, upsertPayment } from '../store.js';
import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';

const AMAZON_PAY_DEFAULT_RETURN_PATH = '/paiement/amazon-pay/retour';

const boolFromEnv = (value, fallback = false) => {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toMoneyString = (amountCents) => (Math.max(0, amountCents) / 100).toFixed(2);

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

const signPayload = (payloadJSON) => {
  const privateKey = resolvePrivateKey();
  if (!privateKey) {
    const error = new Error('AMAZON_PAY_PRIVATE_KEY_MISSING');
    error.status = 503;
    throw error;
  }
  return crypto
    .createSign('sha256')
    .update(payloadJSON)
    .end()
    .sign({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 20,
    }, 'base64');
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
      publicKeyId: config.publicKeyId,
    },
  };
};
