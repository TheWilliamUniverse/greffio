import express from 'express';
import {
  createSignwellWebhookHandler,
  createYousignWebhookHandler,
  describeTrustedSignatureIntegration,
} from '../services/signature/trustedSignatureWebhook.js';
import { ensureSignwellWebhookRegistered } from '../services/signature/signwellWebhook.js';
import { isSignwellConfigured, resolveSignwellCallbackUrl } from '../services/signature/signwell.service.js';
import { isYousignConfigured, resolveYousignCallbackUrl } from '../services/signature/yousign.service.js';

export const registerSignwellRoutes = (app, deps) => {
  const signwellHandler = createSignwellWebhookHandler(deps);
  const yousignHandler = createYousignWebhookHandler(deps);
  const jsonParser = express.json({ limit: '2mb' });

  app.get('/callback', (_req, res) => {
    res.json({
      ok: true,
      service: 'greffio-signature-callback',
      signwell: {
        webhookUrl: resolveSignwellCallbackUrl(),
        configured: isSignwellConfigured(),
      },
      yousign: {
        webhookUrl: resolveYousignCallbackUrl(),
        configured: isYousignConfigured(),
      },
      integration: describeTrustedSignatureIntegration(),
    });
  });

  app.post('/callback', jsonParser, signwellHandler);
  app.post('/api/webhooks/signwell', jsonParser, signwellHandler);
  app.post('/api/webhooks/yousign', jsonParser, yousignHandler);
};

export { ensureSignwellWebhookRegistered };
