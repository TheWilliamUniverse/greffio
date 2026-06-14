import { sendTransactionalEmail } from './emailService.js';
import { isEmailFeatureEnabled } from '../config/emailFeatureFlags.js';

export const notifyResourceOrderConfirmed = async ({
  appUrl,
  order,
  customerName,
}) => {
  const supportInbox = process.env.OPS_RESOURCE_EMAIL
    || process.env.SALES_EMAIL
    || process.env.SUPPORT_EMAIL
    || 'contact@willentreprises.com';

  const priceLabel = `${(order.priceTtcCents / 100).toFixed(2).replace('.', ',')} € TTC`;
  const opsUrl = `${appUrl}/ops?tab=resource-orders`;

  let internalResult = { ok: true, skipped: true };
  if (isEmailFeatureEnabled('resourceOrderInternal')) {
    internalResult = await sendTransactionalEmail({
      templateKey: 'resource_order_internal',
      to: { email: supportInbox, name: 'Greffio OPS' },
      variables: {
        order_id: order.id,
        service_title: order.serviceTitle,
        company_name: order.companyName || '–',
        siren: order.siren || '–',
        contact_email: order.contactEmail,
        price_label: priceLabel,
        status: order.status,
        fulfillment_mode: order.fulfillmentMode,
        notes: order.notes || '–',
        ops_url: opsUrl,
      },
      tags: ['ops', 'resource_order'],
    });
  }

  const customerResult = await sendTransactionalEmail({
    templateKey: 'resource_order_received',
    to: { email: order.contactEmail, name: customerName || 'Client' },
    variables: {
      prenom: customerName?.split?.(' ')?.[0] || 'Client',
      firstName: customerName?.split?.(' ')?.[0] || 'Client',
      service_title: order.serviceTitle,
      order_id: order.id,
      price_label: priceLabel,
      estimated_delay: order.metadata?.estimatedDelay || 'selon service',
      resources_url: `${appUrl}/ressources`,
      payment_url: `${appUrl}/paiement?resourceOrder=${order.id}&service=${order.serviceId}`,
    },
    tags: ['resource_order', 'customer'],
  });

  return { internalResult, customerResult };
};

/** @deprecated Utiliser notifyResourceOrderConfirmed */
export const notifyResourceOrderCreated = notifyResourceOrderConfirmed;
