import crypto from 'node:crypto';
import { computePaymentAmounts, computeResourcePaymentAmounts } from '../pricing.js';
import { upsertPayment, transitionDossierStatus } from '../store.js';
import { getResourceOrderById, updateResourceOrder } from '../resourceOrderStore.js';
import { DOSSIER_STATUSES, ROLE } from '../stateMachine.js';
import { handleResourceOrderPaymentPaid } from './resourcePaymentWebhook.js';
import { isCawlPaymentEnabled } from '../payments/types.js';

export const getGooglePayPublicConfig = () => {
  const environment = process.env.GOOGLE_PAY_ENVIRONMENT === 'PRODUCTION' ? 'PRODUCTION' : 'TEST';
  const merchantId = process.env.GOOGLE_PAY_MERCHANT_ID || '';
  const gatewayMerchantId = process.env.GOOGLE_PAY_GATEWAY_MERCHANT_ID || process.env.CAWL_MERCHANT_ID || '';
  const gateway = String(process.env.GOOGLE_PAY_GATEWAY || 'cawl').toLowerCase();
  const cawlReady = isCawlPaymentEnabled() && Boolean(
    (process.env.CAWL_PBX_SITE || process.env.CAWL_MERCHANT_ID)
    && process.env.CAWL_PBX_RANG
    && (process.env.CAWL_PBX_IDENTIFIANT || process.env.CAWL_API_KEY_ID)
    && (process.env.CAWL_HMAC_KEY || process.env.CAWL_API_KEY),
  );
  const productionReady = environment === 'PRODUCTION' && Boolean(merchantId && gatewayMerchantId && cawlReady);
  const testReady = environment === 'TEST';

  return {
    enabled: productionReady || testReady,
    readyForPayment: productionReady || testReady,
    environment,
    merchantId,
    merchantName: process.env.GOOGLE_PAY_MERCHANT_NAME || 'Greffio',
    gateway,
    gatewayMerchantId,
    countryCode: 'FR',
    currencyCode: 'EUR',
    mode: productionReady ? 'live' : testReady ? 'test' : 'unavailable',
  };
};

const extractPaymentToken = (paymentData) => {
  const tokenization = paymentData?.paymentMethodData?.tokenizationData;
  if (!tokenization?.token) return null;
  try {
    return typeof tokenization.token === 'string'
      ? JSON.parse(tokenization.token)
      : tokenization.token;
  } catch {
    return { raw: tokenization.token };
  }
};

/**
 * Traite un paiement Google Pay. Le token sera transmis à CAWL lorsque l'API sera branchée.
 */
export const processGooglePayCharge = async ({
  userId,
  dossierId,
  resourceOrderId,
  offerCode,
  paymentData,
  appUrl,
}) => {
  if (!paymentData?.paymentMethodData) {
    const error = new Error('GOOGLE_PAY_PAYLOAD_INVALID');
    error.status = 400;
    throw error;
  }

  let amountTotalCents;
  let normalizedOffer = offerCode || null;
  let order = null;

  if (resourceOrderId) {
    order = await getResourceOrderById(resourceOrderId);
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
    amountTotalCents = amounts.amountTotalCents;
    normalizedOffer = `resource:${order.serviceId}`;
  } else if (dossierId) {
    const amounts = computePaymentAmounts(offerCode);
    amountTotalCents = amounts.amountTotalCents;
    normalizedOffer = amounts.normalizedOffer;
  } else {
    const error = new Error('PAYMENT_TARGET_REQUIRED');
    error.status = 400;
    throw error;
  }

  const token = extractPaymentToken(paymentData);
  const providerPaymentId = `gpay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // TODO[CAWL-API]: transmettre `token` à CAWL pour capture réelle.
  const cawlReady = isCawlPaymentEnabled() && Boolean(
    (process.env.CAWL_PBX_SITE || process.env.CAWL_MERCHANT_ID)
    && process.env.CAWL_PBX_RANG
    && (process.env.CAWL_PBX_IDENTIFIANT || process.env.CAWL_API_KEY_ID)
    && (process.env.CAWL_HMAC_KEY || process.env.CAWL_API_KEY),
  );
  const isTestEnvironment = process.env.GOOGLE_PAY_ENVIRONMENT !== 'PRODUCTION';
  const markPaid = !cawlReady && (process.env.NODE_ENV !== 'production' || isTestEnvironment);

  const payment = await upsertPayment({
    dossierId: dossierId || order?.dossierId || null,
    resourceOrderId: resourceOrderId || null,
    userId,
    offerCode: normalizedOffer,
    amountTotalCents,
    amountServiceCents: amountTotalCents,
    amountLegalFeesCents: 0,
    currency: 'EUR',
    status: markPaid ? 'paid' : 'pending',
    provider: 'cawl',
    providerPaymentId,
    providerPayload: {
      method: 'google_pay',
      token,
      cawlPending: !cawlReady,
      googlePay: {
        email: paymentData.email,
        cardNetwork: paymentData.paymentMethodData?.info?.cardNetwork,
        cardDetails: paymentData.paymentMethodData?.info?.cardDetails,
      },
    },
    paidAt: markPaid ? new Date().toISOString() : null,
  });

  if (order && markPaid) {
    await updateResourceOrder(order.id, { status: 'paid', paymentId: payment.id });
    await handleResourceOrderPaymentPaid(payment);
  }

  if (dossierId && markPaid) {
    await transitionDossierStatus({
      dossierId,
      nextStatus: DOSSIER_STATUSES.PAYMENT_CONFIRMED,
      actorType: 'api',
      actorRole: ROLE.CLIENT,
      reason: 'google_pay_confirmed',
      metadata: { providerPaymentId, paymentMethod: 'google_pay' },
    });
  }

  const redirectUrl = resourceOrderId
    ? `${appUrl}/paiement/verification?resourceOrderId=${resourceOrderId}&status=${markPaid ? 'paid' : 'pending'}`
    : `${appUrl}/paiement/verification?dossierId=${dossierId}&status=${markPaid ? 'paid' : 'pending'}`;

  return { payment, redirectUrl, status: payment.status };
};
