const BREVO_SMS_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

const isBrevoSmsConfigured = () => Boolean(process.env.BREVO_API_KEY);

const normalizeFrenchPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('33') && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+33${digits.slice(1)}`;
  if (digits.length >= 9) return `+${digits}`;
  return null;
};

const maskFrenchPhone = (phone) => {
  const e164 = normalizeFrenchPhone(phone);
  if (!e164) return '****';
  const digits = e164.replace(/\D/g, '');
  return `****${digits.slice(-2)}`;
};

const sendTransactionalSms = async ({ to, content }) => {
  const recipient = normalizeFrenchPhone(to);
  if (!recipient) {
    return { ok: false, errorCode: 'SMS_RECIPIENT_INVALID', errorMessage: 'Invalid phone number' };
  }
  if (!isBrevoSmsConfigured()) {
    return { ok: false, errorCode: 'BREVO_NOT_CONFIGURED', errorMessage: 'BREVO_API_KEY missing' };
  }

  const payload = {
    sender: process.env.BREVO_SMS_SENDER || 'Greffio',
    recipient,
    content: String(content || '').trim(),
    type: 'transactional',
  };

  try {
    const response = await fetch(BREVO_SMS_URL, {
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
      return {
        ok: false,
        errorCode: String(body?.code || response.status),
        errorMessage: body?.message || `BREVO_SMS_HTTP_${response.status}`,
      };
    }
    return {
      ok: true,
      provider: 'brevo',
      recipient,
      messageId: body?.messageId || null,
    };
  } catch (error) {
    return {
      ok: false,
      errorCode: 'BREVO_SMS_NETWORK_ERROR',
      errorMessage: error?.message || 'BREVO_SMS_SEND_FAILED',
    };
  }
};

export {
  isBrevoSmsConfigured,
  maskFrenchPhone,
  normalizeFrenchPhone,
  sendTransactionalSms,
};
