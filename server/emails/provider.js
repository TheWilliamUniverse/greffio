import { Resend } from 'resend';

const hasResend = Boolean(process.env.RESEND_API_KEY);
const resend = hasResend ? new Resend(process.env.RESEND_API_KEY) : null;

const sendWithProvider = async ({ to, subject, html, text }) => {
  if (!hasResend || !resend) {
    return {
      ok: true,
      mode: 'console_fallback',
      providerMessageId: `dev_${Date.now()}`,
    };
  }

  const from = process.env.FROM_EMAIL || 'notifications@greffio.willentreprises.com';
  const payload = {
    from,
    to: [to],
    subject,
    html,
    text,
  };

  const response = await resend.emails.send(payload);
  if (response.error) {
    return {
      ok: false,
      mode: 'resend',
      errorMessage: response.error.message || 'RESEND_SEND_FAILED',
    };
  }

  return {
    ok: true,
    mode: 'resend',
    providerMessageId: response.data?.id || null,
  };
};

export {
  sendWithProvider,
};
