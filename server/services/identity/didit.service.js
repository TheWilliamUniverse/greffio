import crypto from 'node:crypto';

const API_BASE = String(process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me').replace(/\/+$/, '');
const API_KEY = String(process.env.DIDIT_API_KEY || '');
const WORKFLOW_ID = String(process.env.DIDIT_WORKFLOW_ID || process.env.DIDIT_APP_ID || '');

export const isDiditConfigured = () => Boolean(API_KEY && WORKFLOW_ID);

const headers = () => ({
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
});

export const mapDiditStatus = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('approved') || value.includes('completed')) return 'approved';
  if (value.includes('declined') || value.includes('rejected')) return 'declined';
  if (value.includes('expired')) return 'expired';
  if (value.includes('review')) return 'under_review';
  if (value.includes('progress') || value.includes('started')) return 'pending_user';
  if (value.includes('not started')) return 'session_created';
  return 'pending_user';
};

export const createDiditVerificationSession = async ({
  dossierId,
  userId,
  email,
  callbackUrl,
  metadata = {},
}) => {
  if (!isDiditConfigured()) {
    return { ok: false, error: 'DIDIT_NOT_CONFIGURED' };
  }

  const body = {
    workflow_id: WORKFLOW_ID,
    vendor_data: `${dossierId}:${userId || 'anonymous'}`,
    callback: callbackUrl || `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/documents?identity=done`,
    metadata: {
      dossierId,
      userId: userId || null,
      ...metadata,
    },
  };

  if (email) {
    body.contact_details = { email };
  }

  const response = await fetch(`${API_BASE}/v3/session/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      error: 'DIDIT_SESSION_FAILED',
      details: payload,
    };
  }

  return {
    ok: true,
    sessionId: payload.session_id,
    verificationUrl: payload.url,
    status: mapDiditStatus(payload.status),
    raw: payload,
  };
};

export const getDiditSessionDecision = async (sessionId) => {
  if (!isDiditConfigured() || !sessionId) {
    return { ok: false, error: 'DIDIT_NOT_CONFIGURED' };
  }
  const response = await fetch(`${API_BASE}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: headers(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: 'DIDIT_DECISION_FAILED', details: payload };
  }
  return {
    ok: true,
    status: mapDiditStatus(payload.status || payload.decision),
    raw: payload,
  };
};

export const verifyDiditWebhookSignature = (rawBody, signatureHeader) => {
  const secret = String(process.env.DIDIT_WEBHOOK_SECRET || '');
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signatureHeader || signatureHeader.includes(expected);
};
