const MOLLIE_API_BASE = 'https://api.mollie.com/v2';

const formatAmount = (amountCents) => (amountCents / 100).toFixed(2);

const getMollieApiKey = () => {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    throw new Error('MOLLIE_API_KEY_MISSING');
  }
  return key;
};

const createMolliePayment = async ({
  amountTotalCents,
  currency,
  metadata,
  redirectUrl,
  webhookUrl,
  description,
}) => {
  const apiKey = getMollieApiKey();
  const response = await fetch(`${MOLLIE_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: {
        currency,
        value: formatAmount(amountTotalCents),
      },
      description,
      redirectUrl,
      webhookUrl,
      metadata,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`MOLLIE_CREATE_PAYMENT_FAILED:${payload}`);
  }

  const payment = await response.json();
  return {
    providerPaymentId: payment.id,
    status: payment.status,
    checkoutUrl: payment?._links?.checkout?.href || null,
    raw: payment,
  };
};

const retrieveMolliePayment = async ({ providerPaymentId }) => {
  const apiKey = getMollieApiKey();
  const response = await fetch(`${MOLLIE_API_BASE}/payments/${providerPaymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`MOLLIE_RETRIEVE_PAYMENT_FAILED:${payload}`);
  }

  const payment = await response.json();
  return {
    providerPaymentId: payment.id,
    status: payment.status,
    paidAt: payment.paidAt || null,
    raw: payment,
  };
};

const isMolliePaidStatus = (status) => status === 'paid';

export {
  createMolliePayment,
  retrieveMolliePayment,
  isMolliePaidStatus,
};
