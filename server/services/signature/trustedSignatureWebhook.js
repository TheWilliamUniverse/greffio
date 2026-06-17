import {
  completeTrustedSignatureDocument,
  isTrustedSignatureConfigured,
} from './trustedSignatureOrchestrator.js';
import {
  isSignwellConfigured,
  resolveSignwellCallbackUrl,
  verifySignwellEventHash,
} from './signwell.service.js';
import {
  isYousignConfigured,
  resolveYousignCallbackUrl,
  verifyYousignWebhookSignature,
} from './yousign.service.js';
import { resolveSignatureProvider } from './signatureProvider.js';

const SIGNWELL_COMPLETION_EVENTS = new Set([
  'document_completed',
  'document_signed',
]);

const YOUSIGN_COMPLETION_EVENTS = new Set([
  'signature_request.done',
  'signature_request.completed',
]);

export const createSignwellWebhookHandler = (deps) => async (req, res) => {
  if (!isSignwellConfigured()) {
    return res.status(503).json({ ok: false, error: 'SIGNWELL_NOT_CONFIGURED' });
  }

  if (process.env.NODE_ENV === 'production' && !process.env.SIGNWELL_WEBHOOK_ID) {
    console.error('[signwell] SIGNWELL_WEBHOOK_ID manquant en production');
    return res.status(503).json({ ok: false, error: 'SIGNWELL_WEBHOOK_ID_REQUIRED' });
  }

  const payload = req.body || {};
  const event = payload.event || {};
  const eventType = String(event.type || '').trim();
  const documentObject = payload.data?.object || payload.document || payload.data || {};
  const signwellDocumentId = documentObject?.id || payload.data?.id || null;

  if (process.env.SIGNWELL_WEBHOOK_ID && !verifySignwellEventHash({ event, webhookId: process.env.SIGNWELL_WEBHOOK_ID })) {
    console.warn('[signwell] webhook hash verification failed', eventType);
    return res.status(401).json({ ok: false, error: 'INVALID_SIGNWELL_WEBHOOK_HASH' });
  }

  if (!SIGNWELL_COMPLETION_EVENTS.has(eventType)) {
    return res.json({ ok: true, ignored: true, eventType });
  }

  if (!signwellDocumentId) {
    return res.status(400).json({ ok: false, error: 'SIGNWELL_DOCUMENT_ID_MISSING' });
  }

  try {
    const result = await completeTrustedSignatureDocument({
      signwellDocumentId,
      ...deps,
    });
    return res.json({ ok: true, ...result, eventType });
  } catch (error) {
    console.error('[signwell] webhook completion failed', error);
    return res.status(500).json({
      ok: false,
      error: error?.code || 'SIGNWELL_WEBHOOK_FAILED',
      message: error?.message || 'SIGNWELL_WEBHOOK_FAILED',
    });
  }
};

export const createYousignWebhookHandler = (deps) => async (req, res) => {
  if (!isYousignConfigured()) {
    return res.status(503).json({ ok: false, error: 'YOUSIGN_NOT_CONFIGURED' });
  }

  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const signatureHeader = req.headers['x-yousign-signature-256']
    || req.headers['x-yousign-signature']
    || null;

  if (process.env.YOUSIGN_WEBHOOK_SECRET
    && !verifyYousignWebhookSignature({ rawBody, signatureHeader })) {
    console.warn('[yousign] webhook signature verification failed');
    return res.status(401).json({ ok: false, error: 'INVALID_YOUSIGN_WEBHOOK_SIGNATURE' });
  }

  const payload = req.body || {};
  const eventType = String(payload?.event_name || payload?.event || payload?.type || '').trim();
  const signatureRequestId = payload?.data?.signature_request?.id
    || payload?.data?.id
    || payload?.signature_request?.id
    || null;

  if (!YOUSIGN_COMPLETION_EVENTS.has(eventType)) {
    return res.json({ ok: true, ignored: true, eventType });
  }

  if (!signatureRequestId) {
    return res.status(400).json({ ok: false, error: 'YOUSIGN_SIGNATURE_REQUEST_ID_MISSING' });
  }

  try {
    const result = await completeTrustedSignatureDocument({
      signwellDocumentId: signatureRequestId,
      yousignSignatureRequestId: signatureRequestId,
      ...deps,
    });
    return res.json({ ok: true, ...result, eventType });
  } catch (error) {
    console.error('[yousign] webhook completion failed', error);
    return res.status(500).json({
      ok: false,
      error: error?.code || 'YOUSIGN_WEBHOOK_FAILED',
      message: error?.message || 'YOUSIGN_WEBHOOK_FAILED',
    });
  }
};

export const describeTrustedSignatureIntegration = () => {
  const provider = resolveSignatureProvider();
  return {
    activeProvider: provider,
    trustedConfigured: isTrustedSignatureConfigured(),
    signwell: {
      enabled: process.env.SIGNWELL_ENABLED === 'true',
      configured: isSignwellConfigured(),
      callbackUrl: resolveSignwellCallbackUrl(),
    },
    yousign: {
      enabled: process.env.YOUSIGN_ENABLED === 'true',
      configured: isYousignConfigured(),
      webhookUrl: resolveYousignCallbackUrl(),
      sandbox: process.env.YOUSIGN_SANDBOX === 'true',
    },
  };
};
