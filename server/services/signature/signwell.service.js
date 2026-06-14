import crypto from 'node:crypto';

const DEFAULT_BASE = 'https://www.signwell.com/api/v1';

export const SIGNWELL_PROVIDER = 'signwell';

/** Dormant par défaut — activer uniquement pour legacy explicite (SIGNWELL_ENABLED=true). */
export const isSignwellEnabled = () => process.env.SIGNWELL_ENABLED === 'true';

export const isSignwellConfigured = () => Boolean(
  isSignwellEnabled()
  && process.env.SIGNWELL_API_KEY
  && String(process.env.SIGNWELL_API_KEY).trim(),
);

const resolveBaseUrl = () => String(process.env.SIGNWELL_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');

const resolveTestMode = () => {
  if (process.env.SIGNWELL_TEST_MODE === 'true') return true;
  if (process.env.SIGNWELL_TEST_MODE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
};

export const signwellFetch = async (path, { method = 'GET', body } = {}) => {
  if (!isSignwellConfigured()) {
    const error = new Error('SIGNWELL_NOT_CONFIGURED');
    error.code = 'SIGNWELL_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': String(process.env.SIGNWELL_API_KEY).trim(),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage = payload?.message || payload?.meta?.message || 'SIGNWELL_API_ERROR';
    const error = new Error(apiMessage);
    error.code = 'SIGNWELL_API_ERROR';
    error.signwellCode = payload?.meta?.error || payload?.error || null;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const createSignwellDocument = async ({
  name,
  pdfBuffer,
  recipients,
  metadata = {},
  redirectUrl,
  embeddedSigning = false,
  testMode,
  message,
  subject,
}) => {
  const safeName = String(name || 'Document Greffio').slice(0, 120);
  const normalizedRecipients = (recipients || []).map((recipient, index) => ({
    id: String(recipient.id || index + 1),
    email: String(recipient.email || '').trim().toLowerCase(),
    name: String(recipient.name || recipient.email || 'Signataire').trim(),
    send_email: false,
  })).filter((recipient) => recipient.email.includes('@'));

  if (!normalizedRecipients.length) {
    const error = new Error('SIGNER_EMAIL_REQUIRED');
    error.code = 'SIGNER_EMAIL_REQUIRED';
    throw error;
  }

  return signwellFetch('/documents', {
    method: 'POST',
    body: {
      test_mode: testMode ?? resolveTestMode(),
      name: safeName,
      draft: false,
      with_signature_page: true,
      embedded_signing: embeddedSigning,
      ...(embeddedSigning ? { embedded_signing_notifications: false } : {}),
      redirect_url: redirectUrl,
      message: message || '<p>Veuillez signer ce document Greffio.</p>',
      subject: subject || `Signature – ${safeName}`,
      files: [{
        name: `${safeName.replace(/[^\w.-]+/g, '_')}.pdf`,
        file_base64: Buffer.from(pdfBuffer).toString('base64'),
      }],
      recipients: normalizedRecipients,
      metadata: {
        provider: SIGNWELL_PROVIDER,
        ...metadata,
      },
      ...(process.env.SIGNWELL_API_APPLICATION_ID
        ? { api_application_id: process.env.SIGNWELL_API_APPLICATION_ID }
        : {}),
    },
  });
};

export const getSignwellDocument = async (documentId) => (
  signwellFetch(`/documents/${encodeURIComponent(documentId)}`)
);

export const getSignwellCompletedPdfBuffer = async (documentId) => {
  if (!isSignwellConfigured()) {
    const error = new Error('SIGNWELL_NOT_CONFIGURED');
    error.code = 'SIGNWELL_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(
    `${resolveBaseUrl()}/documents/${encodeURIComponent(documentId)}/completed_pdf`,
    {
      headers: {
        'X-Api-Key': String(process.env.SIGNWELL_API_KEY).trim(),
      },
    },
  );

  if (!response.ok) {
    const error = new Error('SIGNWELL_PDF_DOWNLOAD_FAILED');
    error.code = 'SIGNWELL_PDF_DOWNLOAD_FAILED';
    error.status = response.status;
    throw error;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
};

export const listSignwellWebhooks = async () => {
  const payload = await signwellFetch('/hooks');
  return payload?.hooks || payload || [];
};

export const createSignwellWebhook = async (callbackUrl) => signwellFetch('/hooks', {
  method: 'POST',
  body: {
    callback_url: callbackUrl,
    ...(process.env.SIGNWELL_API_APPLICATION_ID
      ? { api_application_id: process.env.SIGNWELL_API_APPLICATION_ID }
      : {}),
  },
});

export const verifySignwellEventHash = ({ event, webhookId }) => {
  const key = String(webhookId || process.env.SIGNWELL_WEBHOOK_ID || '').trim();
  if (!key || !event?.hash || !event?.type || !event?.time) return false;

  const data = `${event.type}@${event.time}`;
  const calculated = crypto.createHmac('sha256', key).update(data).digest('hex');
  const expected = String(event.hash);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch (_error) {
    return calculated === expected;
  }
};

export const resolveSignwellCallbackUrl = () => {
  if (process.env.SIGNWELL_CALLBACK_URL) {
    return String(process.env.SIGNWELL_CALLBACK_URL).trim();
  }
  const apiBase = String(
    process.env.API_PUBLIC_URL
    || process.env.API_URL
    || 'https://api.greffio.willentreprises.com',
  ).replace(/\/$/, '');
  return `${apiBase}/callback`;
};

export const resolveSignwellRedirectUrl = (appUrl) => {
  const base = String(appUrl || process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');
  return `${base}/callback?provider=signwell`;
};
