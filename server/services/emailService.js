import { addEmailEvent, updateEmailEventByProviderMessageId } from '../emailStore.js';
import { getTemplate, resolveTemplateKey } from '../emails/templates.js';
import { normalizeEmailVariables } from '../emails/templateBuilder.js';
import { renderTemplate, validateTemplateVariables } from '../emails/renderTemplate.js';
import { sendWithProvider } from '../emails/provider.js';
import { isEmailTemplateEnabled } from '../config/emailFeatureFlags.js';

const sanitizeForLog = ({ templateKey, to, status, provider, errorCode }) => ({
  templateKey,
  toDomain: String(to?.email || to || '').split('@')[1] || 'unknown',
  status,
  provider,
  errorCode: errorCode || null,
});

const sendTransactionalEmail = async ({
  to,
  templateKey,
  variables = {},
  userId = null,
  dossierId = null,
  tags = [],
}) => {
  const resolvedKey = resolveTemplateKey(templateKey);
  const template = getTemplate(resolvedKey);
  if (!template) {
    return { ok: false, error: 'EMAIL_TEMPLATE_NOT_FOUND', templateKey: resolvedKey };
  }

  if (!isEmailTemplateEnabled(resolvedKey)) {
    return { ok: true, skipped: true, reason: 'EMAIL_TEMPLATE_DISABLED', templateKey: resolvedKey };
  }

  const recipientEmail = String(typeof to === 'string' ? to : to?.email || '').trim().toLowerCase();
  const recipientName = typeof to === 'object' ? (to?.name || '') : '';
  if (!recipientEmail) {
    return { ok: false, error: 'RECIPIENT_EMAIL_REQUIRED' };
  }

  const mergedVariables = normalizeEmailVariables(variables);
  const validation = validateTemplateVariables(template, mergedVariables);
  if (!validation.ok) {
    await addEmailEvent({
      dossierId,
      userId,
      templateId: resolvedKey,
      recipientEmail,
      subject: template.subject,
      status: 'failed',
      provider: process.env.EMAIL_PROVIDER || 'brevo',
      errorCode: 'MISSING_TEMPLATE_VARIABLES',
      errorMessage: validation.missing.join(','),
      tags: [...(template.tags || []), ...tags],
      payload: { missing: validation.missing },
    });
    return {
      ok: false,
      error: 'MISSING_TEMPLATE_VARIABLES',
      missing: validation.missing,
    };
  }

  const rendered = renderTemplate(template, mergedVariables);
  const mergedTags = [...new Set([...(template.tags || []), ...tags, resolvedKey])];

  let providerResult;
  try {
    providerResult = await sendWithProvider({
      to: recipientEmail,
      toName: recipientName,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: mergedTags,
    });
  } catch (error) {
    providerResult = {
      ok: false,
      mode: 'provider_exception',
      provider: process.env.EMAIL_PROVIDER || 'unknown',
      errorCode: 'PROVIDER_EXCEPTION',
      errorMessage: error?.message || 'EMAIL_PROVIDER_EXCEPTION',
    };
  }

  await addEmailEvent({
    dossierId,
    userId,
    templateId: resolvedKey,
    recipientEmail,
    subject: rendered.subject,
    status: providerResult.ok ? 'sent' : 'failed',
    provider: providerResult.provider || providerResult.mode || process.env.EMAIL_PROVIDER || 'unknown',
    providerMessageId: providerResult.providerMessageId || null,
    errorCode: providerResult.errorCode || null,
    errorMessage: providerResult.errorMessage || null,
    tags: mergedTags,
    payload: {
      mode: providerResult.mode,
      tags: mergedTags,
    },
    sentAt: providerResult.ok ? new Date().toISOString() : null,
  });

  if (!providerResult.ok) {
    console.warn('EMAIL_SEND_FAILED', sanitizeForLog({
      templateKey: resolvedKey,
      to: recipientEmail,
      status: 'failed',
      provider: providerResult.provider || providerResult.mode,
      errorCode: providerResult.errorCode,
    }));
  }

  return {
    ok: providerResult.ok,
    templateKey: resolvedKey,
    providerMessageId: providerResult.providerMessageId || null,
    error: providerResult.errorMessage || null,
    errorCode: providerResult.errorCode || null,
  };
};

const handleBrevoWebhookEvent = async (event) => {
  const eventType = String(event?.event || '').toLowerCase();
  const messageId = event?.['message-id'] || event?.messageId || event?.message_id || null;
  if (!messageId) {
    return { ok: false, error: 'MESSAGE_ID_MISSING' };
  }

  const statusMap = {
    delivered: 'delivered',
    opened: 'opened',
    unique_opened: 'opened',
    click: 'clicked',
    clicked: 'clicked',
    soft_bounce: 'soft_bounce',
    hard_bounce: 'hard_bounce',
    blocked: 'blocked',
    spam: 'spam',
    unsubscribed: 'unsubscribed',
    invalid_email: 'failed',
    deferred: 'deferred',
  };

  const status = statusMap[eventType] || 'received';
  const timestamp = event?.date || event?.ts_event || new Date().toISOString();

  await updateEmailEventByProviderMessageId({
    providerMessageId: messageId,
    status,
    openedAt: status === 'opened' ? timestamp : null,
    clickedAt: status === 'clicked' ? timestamp : null,
    payloadPatch: {
      brevoEvent: eventType,
      email: event?.email || null,
    },
  });

  return { ok: true, status, messageId };
};

export {
  sendTransactionalEmail,
  handleBrevoWebhookEvent,
};
