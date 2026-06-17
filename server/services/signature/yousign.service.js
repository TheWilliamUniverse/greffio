import crypto from 'node:crypto';

const DEFAULT_BASE = 'https://api.yousign.app/v3';
const SANDBOX_BASE = 'https://api-sandbox.yousign.app/v3';

export const YOUSIGN_PROVIDER = 'yousign';

export const isYousignEnabled = () => process.env.YOUSIGN_ENABLED === 'true';

export const isYousignConfigured = () => Boolean(
  isYousignEnabled()
  && process.env.YOUSIGN_API_KEY
  && String(process.env.YOUSIGN_API_KEY).trim(),
);

const resolveBaseUrl = () => {
  if (process.env.YOUSIGN_API_BASE_URL) {
    return String(process.env.YOUSIGN_API_BASE_URL).replace(/\/$/, '');
  }
  if (process.env.YOUSIGN_SANDBOX === 'true') return SANDBOX_BASE;
  return DEFAULT_BASE;
};

const resolveTestMode = () => {
  if (process.env.YOUSIGN_SANDBOX === 'true') return true;
  if (process.env.YOUSIGN_SANDBOX === 'false') return false;
  return process.env.NODE_ENV !== 'production';
};

export const yousignFetch = async (path, { method = 'GET', body, headers = {} } = {}) => {
  if (!isYousignConfigured()) {
    const error = new Error('YOUSIGN_NOT_CONFIGURED');
    error.code = 'YOUSIGN_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${String(process.env.YOUSIGN_API_KEY).trim()}`,
      Accept: 'application/json',
      ...headers,
    },
    ...(body !== undefined ? { body } : {}),
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const apiMessage = payload?.detail || payload?.title || payload?.message || 'YOUSIGN_API_ERROR';
    const error = new Error(Array.isArray(apiMessage) ? apiMessage.join(', ') : String(apiMessage));
    error.code = 'YOUSIGN_API_ERROR';
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const getYousignSignatureRequest = async (signatureRequestId) => (
  yousignFetch(`/signature_requests/${encodeURIComponent(signatureRequestId)}`)
);

export const downloadYousignDocument = async (signatureRequestId, documentId) => {
  if (!isYousignConfigured()) {
    const error = new Error('YOUSIGN_NOT_CONFIGURED');
    error.code = 'YOUSIGN_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(
    `${resolveBaseUrl()}/signature_requests/${encodeURIComponent(signatureRequestId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      headers: {
        Authorization: `Bearer ${String(process.env.YOUSIGN_API_KEY).trim()}`,
      },
    },
  );

  if (!response.ok) {
    const error = new Error('YOUSIGN_PDF_DOWNLOAD_FAILED');
    error.code = 'YOUSIGN_PDF_DOWNLOAD_FAILED';
    error.status = response.status;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
};

/**
 * Flux Yousign v3 : create → upload document → signer + field → activate.
 */
export const createYousignSignatureFlow = async ({
  name,
  pdfBuffer,
  signerEmail,
  signerFullName,
  metadata = {},
}) => {
  const safeName = String(name || 'Document Greffio').slice(0, 120);
  const email = String(signerEmail || '').trim().toLowerCase();
  if (!email.includes('@')) {
    const error = new Error('SIGNER_EMAIL_REQUIRED');
    error.code = 'SIGNER_EMAIL_REQUIRED';
    throw error;
  }

  const nameParts = String(signerFullName || email).trim().split(/\s+/);
  const firstName = nameParts[0] || 'Signataire';
  const lastName = nameParts.slice(1).join(' ') || 'Greffio';

  const signatureRequest = await yousignFetch('/signature_requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: safeName,
      delivery_mode: 'none',
      timezone: 'Europe/Paris',
      external_id: metadata?.signatureRequestId || metadata?.dossierId || undefined,
      custom_experience: {
        redirect_urls: metadata?.redirectUrl ? { success: metadata.redirectUrl } : undefined,
      },
    }),
  });

  const signatureRequestId = signatureRequest?.id;
  if (!signatureRequestId) {
    const error = new Error('YOUSIGN_SIGNATURE_REQUEST_ID_MISSING');
    error.code = 'YOUSIGN_SIGNATURE_REQUEST_ID_MISSING';
    throw error;
  }

  const form = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  form.append('file', blob, `${safeName.replace(/[^\w.-]+/g, '_')}.pdf`);
  form.append('nature', 'signable_document');
  form.append('parse_anchors', 'true');

  const document = await yousignFetch(
    `/signature_requests/${encodeURIComponent(signatureRequestId)}/documents`,
    {
      method: 'POST',
      body: form,
    },
  );

  const documentId = document?.id;
  if (!documentId) {
    const error = new Error('YOUSIGN_DOCUMENT_ID_MISSING');
    error.code = 'YOUSIGN_DOCUMENT_ID_MISSING';
    throw error;
  }

  const signer = await yousignFetch(
    `/signature_requests/${encodeURIComponent(signatureRequestId)}/signers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        info: {
          first_name: firstName,
          last_name: lastName,
          email,
          locale: 'fr',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'no_otp',
        fields: [{
          type: 'signature',
          document_id: documentId,
          page: 1,
          x: 72,
          y: 650,
          width: 200,
          height: 50,
        }],
      }),
    },
  );

  const activated = await yousignFetch(
    `/signature_requests/${encodeURIComponent(signatureRequestId)}/activate`,
    { method: 'POST' },
  );

  const signerId = signer?.id;
  const activatedSigner = (activated?.signers || []).find((row) => row?.id === signerId) || activated?.signers?.[0];
  let signingLink = activatedSigner?.signature_link || null;

  if (!signingLink && signerId) {
    const signerStatus = await yousignFetch(
      `/signature_requests/${encodeURIComponent(signatureRequestId)}/signers/${encodeURIComponent(signerId)}`,
    );
    signingLink = signerStatus?.signature_link || null;
  }

  return {
    signatureRequestId,
    documentId,
    signerId,
    signingLink,
    status: activated?.status || signatureRequest?.status || 'ongoing',
    testMode: resolveTestMode(),
    provider: YOUSIGN_PROVIDER,
  };
};

export const resolveYousignCallbackUrl = () => {
  if (process.env.YOUSIGN_WEBHOOK_URL) {
    return String(process.env.YOUSIGN_WEBHOOK_URL).trim();
  }
  const apiBase = String(
    process.env.API_PUBLIC_URL
    || process.env.API_URL
    || 'https://api.greffio.willentreprises.com',
  ).replace(/\/$/, '');
  return `${apiBase}/api/webhooks/yousign`;
};

export const resolveYousignRedirectUrl = (appUrl) => {
  const base = String(appUrl || process.env.APP_URL || 'https://greffio.willentreprises.com').replace(/\/$/, '');
  return `${base}/callback?provider=yousign`;
};

export const verifyYousignWebhookSignature = ({ rawBody, signatureHeader }) => {
  const secret = String(process.env.YOUSIGN_WEBHOOK_SECRET || '').trim();
  if (!secret || !signatureHeader || !rawBody) return !secret;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = String(signatureHeader).replace(/^sha256=/, '').trim();

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(received, 'utf8'),
    );
  } catch (_error) {
    return expected === received;
  }
};

export const formatYousignApiError = (error) => ({
  code: error?.code || 'YOUSIGN_API_ERROR',
  message: error?.message || 'YOUSIGN_API_ERROR',
});
