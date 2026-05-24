const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const DEFAULT_SENDER_NAME = 'Greffio Team';
const DEFAULT_REPLY_EMAIL = 'greffio@willentreprises.com';

const getSender = () => ({
  email: process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL || 'contact@willentreprises.com',
  name: process.env.BREVO_SENDER_NAME || DEFAULT_SENDER_NAME,
});

const getReplyTo = () => {
  const email = process.env.BREVO_REPLY_TO || DEFAULT_REPLY_EMAIL;
  const name = process.env.BREVO_REPLY_TO_NAME || process.env.BREVO_SENDER_NAME || DEFAULT_SENDER_NAME;
  return { email, name };
};

const isBrevoConfigured = () => Boolean(process.env.BREVO_API_KEY);

const sendWithBrevo = async ({
  to,
  toName = '',
  subject,
  html,
  text,
  tags = [],
}) => {
  if (!isBrevoConfigured()) {
    return {
      ok: false,
      mode: 'brevo',
      errorCode: 'BREVO_NOT_CONFIGURED',
      errorMessage: 'BREVO_API_KEY missing',
    };
  }

  const payload = {
    sender: getSender(),
    replyTo: getReplyTo(),
    to: [{ email: to, name: toName || undefined }],
    subject,
    htmlContent: html,
    textContent: text,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = body?.message || body?.code || `BREVO_HTTP_${response.status}`;
      return {
        ok: false,
        mode: 'brevo',
        errorCode: String(body?.code || response.status),
        errorMessage,
      };
    }

    return {
      ok: true,
      mode: 'brevo',
      provider: 'brevo',
      providerMessageId: body?.messageId || null,
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'brevo',
      errorCode: 'BREVO_NETWORK_ERROR',
      errorMessage: error?.message || 'BREVO_SEND_FAILED',
    };
  }
};

export {
  isBrevoConfigured,
  sendWithBrevo,
};
