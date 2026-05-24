import { sendWithBrevo, isBrevoConfigured } from './brevoProvider.js';
import { Resend } from 'resend';

const emailProvider = String(process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();
const hasResend = Boolean(process.env.RESEND_API_KEY);
const resend = hasResend ? new Resend(process.env.RESEND_API_KEY) : null;

const sendWithResend = async ({ to, subject, html, text }) => {
  if (!hasResend || !resend) {
    return {
      ok: false,
      mode: 'resend',
      provider: 'resend',
      errorCode: 'RESEND_NOT_CONFIGURED',
      errorMessage: 'RESEND_API_KEY missing',
    };
  }

  const senderName = process.env.BREVO_SENDER_NAME || 'Greffio Team';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || 'contact@willentreprises.com';
  const from = process.env.FROM_EMAIL || `${senderName} <${senderEmail}>`;
  const replyTo = process.env.BREVO_REPLY_TO || 'greffio@willentreprises.com';
  const response = await resend.emails.send({
    from,
    replyTo,
    to: [to],
    subject,
    html,
    text,
  });

  if (response.error) {
    return {
      ok: false,
      mode: 'resend',
      provider: 'resend',
      errorCode: 'RESEND_SEND_FAILED',
      errorMessage: response.error.message || 'RESEND_SEND_FAILED',
    };
  }

  return {
    ok: true,
    mode: 'resend',
    provider: 'resend',
    providerMessageId: response.data?.id || null,
  };
};

const sendWithConsoleFallback = ({ to, subject, tags = [] }) => {
  console.info('EMAIL_CONSOLE_FALLBACK', {
    toDomain: String(to || '').split('@')[1] || 'unknown',
    subject,
    tags,
  });
  return {
    ok: true,
    mode: 'console_fallback',
    provider: 'console',
    providerMessageId: `dev_${Date.now()}`,
  };
};

const sendWithProvider = async ({
  to,
  toName = '',
  subject,
  html,
  text,
  tags = [],
}) => {
  const preferBrevo = emailProvider === 'brevo' || isBrevoConfigured();

  if (preferBrevo && isBrevoConfigured()) {
    const brevoResult = await sendWithBrevo({ to, toName, subject, html, text, tags });
    if (brevoResult.ok) return brevoResult;
    if (emailProvider === 'brevo' && hasResend) {
      const resendResult = await sendWithResend({ to, subject, html, text });
      if (resendResult.ok) {
        return { ...resendResult, mode: 'resend_fallback' };
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      return sendWithConsoleFallback({ to, subject, tags });
    }
    return brevoResult;
  }

  if (hasResend) {
    return sendWithResend({ to, subject, html, text });
  }

  if (process.env.NODE_ENV !== 'production') {
    return sendWithConsoleFallback({ to, subject, tags });
  }

  return {
    ok: false,
    mode: 'unconfigured',
    provider: 'none',
    errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    errorMessage: 'Configure BREVO_API_KEY or RESEND_API_KEY',
  };
};

const parseResendWebhook = async ({ payload, signature }) => {
  if (!hasResend || !resend) {
    return { ok: false, error: 'RESEND_NOT_CONFIGURED' };
  }
  const expectedSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET || '';
  if (!expectedSecret) {
    return { ok: false, error: 'RESEND_WEBHOOK_SECRET_MISSING' };
  }
  try {
    const event = await resend.webhooks.verify({
      payload,
      signature,
      secret: expectedSecret,
    });
    return { ok: true, event };
  } catch (error) {
    return { ok: false, error: error?.message || 'RESEND_WEBHOOK_INVALID' };
  }
};

export {
  sendWithProvider,
  parseResendWebhook,
};
