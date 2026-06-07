import {
  completeSignwellDocument,
} from './signwellOrchestrator.js';
import {
  createSignwellWebhook,
  isSignwellConfigured,
  listSignwellWebhooks,
  resolveSignwellCallbackUrl,
  verifySignwellEventHash,
} from './signwell.service.js';

const COMPLETION_EVENTS = new Set([
  'document_completed',
  'document_signed',
]);

export const createSignwellWebhookHandler = (deps) => async (req, res) => {
  if (!isSignwellConfigured()) {
    return res.status(503).json({ ok: false, error: 'SIGNWELL_NOT_CONFIGURED' });
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

  if (!COMPLETION_EVENTS.has(eventType)) {
    return res.json({ ok: true, ignored: true, eventType });
  }

  if (!signwellDocumentId) {
    return res.status(400).json({ ok: false, error: 'SIGNWELL_DOCUMENT_ID_MISSING' });
  }

  try {
    const result = await completeSignwellDocument({
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

export const ensureSignwellWebhookRegistered = async () => {
  if (!isSignwellConfigured()) return null;
  if (process.env.SIGNWELL_SKIP_WEBHOOK_REGISTER === 'true') return null;

  const callbackUrl = resolveSignwellCallbackUrl();
  try {
    const hooks = await listSignwellWebhooks();
    const normalizedHooks = Array.isArray(hooks) ? hooks : [];
    const existing = normalizedHooks.find((hook) => String(hook.callback_url || '').trim() === callbackUrl);
    if (existing?.id) {
      // eslint-disable-next-line no-console
      console.log(`[signwell] webhook actif : ${existing.id} → ${callbackUrl}`);
      return existing.id;
    }

    const created = await createSignwellWebhook(callbackUrl);
    const webhookId = created?.id || created?.hook?.id;
    // eslint-disable-next-line no-console
    console.log(`[signwell] webhook créé : ${webhookId} → ${callbackUrl}`);
    if (webhookId && !process.env.SIGNWELL_WEBHOOK_ID) {
      // eslint-disable-next-line no-console
      console.log(`[signwell] définissez SIGNWELL_WEBHOOK_ID=${webhookId} pour vérifier les événements`);
    }
    return webhookId || null;
  } catch (error) {
    console.error('[signwell] webhook registration failed', error);
    return null;
  }
};
