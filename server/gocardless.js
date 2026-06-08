import crypto from 'node:crypto';

const GOCARDLESS_API_BASE = process.env.GOCARDLESS_ENV === 'sandbox'
  ? 'https://api-sandbox.gocardless.com'
  : 'https://api.gocardless.com';

const GOCARDLESS_VERSION = '2015-07-06';

const getGoCardlessToken = () => {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GOCARDLESS_API_KEY;
  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN_MISSING');
  }
  return token;
};

const gocardlessRequest = async ({ path, method = 'GET', body = null }) => {
  const response = await fetch(`${GOCARDLESS_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getGoCardlessToken()}`,
      'GoCardless-Version': GOCARDLESS_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || JSON.stringify(payload);
    throw new Error(`GOCARDLESS_${method}_${path}_FAILED:${detail}`);
  }
  return payload;
};

const createGoCardlessCheckout = async ({
  amountTotalCents,
  currency = 'EUR',
  metadata = {},
  redirectUrl,
  exitUrl,
  description,
}) => {
  const billingRequestPayload = await gocardlessRequest({
    path: '/billing_requests',
    method: 'POST',
    body: {
      billing_requests: {
        payment_request: {
          description: description || 'Paiement Greffio',
          amount: amountTotalCents,
          currency,
        },
        metadata,
      },
    },
  });

  const billingRequest = billingRequestPayload.billing_requests;
  const billingRequestId = billingRequest.id;

  const flowPayload = await gocardlessRequest({
    path: '/billing_request_flows',
    method: 'POST',
    body: {
      billing_request_flows: {
        redirect_uri: redirectUrl,
        exit_uri: exitUrl || redirectUrl,
        links: {
          billing_request: billingRequestId,
        },
      },
    },
  });

  const flow = flowPayload.billing_request_flows;
  return {
    providerPaymentId: billingRequestId,
    status: billingRequest.status || 'pending',
    checkoutUrl: flow.authorisation_url || null,
    raw: {
      billingRequest,
      flow,
    },
  };
};

const retrieveGoCardlessBillingRequest = async ({ providerPaymentId }) => {
  const payload = await gocardlessRequest({
    path: `/billing_requests/${providerPaymentId}`,
    method: 'GET',
  });
  const billingRequest = payload.billing_requests;
  const paymentStatus = billingRequest?.payment_request?.status || billingRequest?.status;
  const paymentId = billingRequest?.links?.payment || null;
  const paid = billingRequest?.status === 'fulfilled'
    || paymentStatus === 'fulfilled'
    || paymentStatus === 'confirmed';

  return {
    providerPaymentId,
    status: paid ? 'paid' : (paymentStatus || billingRequest?.status || 'pending'),
    paymentId,
    paidAt: paid ? new Date().toISOString() : null,
    raw: billingRequest,
  };
};

const isGoCardlessPaidStatus = (status) => ['paid', 'fulfilled', 'confirmed'].includes(String(status || '').toLowerCase());

const verifyGoCardlessWebhook = ({ rawBody, signatureHeader, secret }) => {
  if (!secret) {
    return { ok: process.env.NODE_ENV !== 'production', error: 'GOCARDLESS_WEBHOOK_SECRET_MISSING' };
  }
  if (!signatureHeader || !rawBody) {
    return { ok: false, error: 'GOCARDLESS_SIGNATURE_MISSING' };
  }

  const parts = String(signatureHeader).split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    return { ok: false, error: 'GOCARDLESS_SIGNATURE_INVALID' };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { ok: false, error: 'GOCARDLESS_SIGNATURE_MISMATCH' };
  }
  const valid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  return valid ? { ok: true } : { ok: false, error: 'GOCARDLESS_SIGNATURE_MISMATCH' };
};

const parseGoCardlessWebhookEvents = (body) => {
  const events = body?.events || [];
  return events.map((event) => ({
    id: event.id,
    action: event.action,
    resourceType: event.resource_type,
    paymentId: event.links?.payment || null,
    billingRequestId: event.links?.billing_request || null,
    raw: event,
  }));
};

export {
  createGoCardlessCheckout,
  retrieveGoCardlessBillingRequest,
  isGoCardlessPaidStatus,
  verifyGoCardlessWebhook,
  parseGoCardlessWebhookEvents,
};
