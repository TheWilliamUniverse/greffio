import { randomUUID } from 'node:crypto';

const buildFakeCheckoutUrl = (providerPaymentId) => (
  `https://greffio.willentreprises.com/paiement/verification?provider_payment_id=${providerPaymentId}`
);

const createPayPlugPayment = async ({
  amountTotalCents,
  currency,
  metadata,
}) => {
  const providerPaymentId = `pp_${randomUUID()}`;
  return {
    providerPaymentId,
    status: 'pending',
    amountTotalCents,
    currency,
    checkoutUrl: buildFakeCheckoutUrl(providerPaymentId),
    metadata,
    raw: {
      provider: 'payplug',
      providerPaymentId,
      status: 'pending',
      amount: amountTotalCents,
      currency,
      metadata,
    },
  };
};

const retrievePayPlugPayment = async ({ providerPaymentId, fallbackStatus = 'paid' }) => ({
  providerPaymentId,
  status: fallbackStatus,
  raw: {
    provider: 'payplug',
    providerPaymentId,
    status: fallbackStatus,
  },
});

export {
  createPayPlugPayment,
  retrievePayPlugPayment,
};
