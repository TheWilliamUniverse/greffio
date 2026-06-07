import express from 'express';
import { createSignwellWebhookHandler, ensureSignwellWebhookRegistered } from '../services/signature/signwellWebhook.js';
import { isSignwellConfigured, resolveSignwellCallbackUrl } from '../services/signature/signwell.service.js';

export const registerSignwellRoutes = (app, deps) => {
  const webhookHandler = createSignwellWebhookHandler(deps);
  const jsonParser = express.json({ limit: '2mb' });

  app.get('/callback', (_req, res) => {
    res.json({
      ok: true,
      service: 'greffio-signwell-callback',
      webhookUrl: resolveSignwellCallbackUrl(),
      configured: isSignwellConfigured(),
    });
  });

  app.post('/callback', jsonParser, webhookHandler);
  app.post('/api/webhooks/signwell', jsonParser, webhookHandler);
};

export { ensureSignwellWebhookRegistered };
