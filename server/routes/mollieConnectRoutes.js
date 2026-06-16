import { randomBytes } from 'node:crypto';
import {
  buildMollieConnectAuthorizeUrl,
  describeMollieConnectStatus,
  exchangeMollieConnectCode,
  isMollieConnectConfigured,
} from '../services/mollie/mollieConnectService.js';

/**
 * Routes OAuth Mollie Connect (onboarding partenaires / sous-comptes).
 * Greffio agit comme plateforme ; les tokens ne doivent jamais être exposés au frontend.
 */
export const registerMollieConnectRoutes = (app, { requireAuth, requireRole }) => {
  app.get('/api/mollie/connect/status', requireAuth, requireRole(['ADMIN', 'OPS']), (_req, res) => {
    return res.json({ ok: true, ...describeMollieConnectStatus() });
  });

  app.get('/api/mollie/connect/authorize', requireAuth, requireRole(['ADMIN', 'OPS']), (req, res) => {
    if (!isMollieConnectConfigured()) {
      return res.status(503).json({ ok: false, error: 'MOLLIE_CONNECT_NOT_CONFIGURED' });
    }
    const state = randomBytes(16).toString('hex');
    // TODO: persister state en session/Redis pour validation CSRF au callback
    const authorizeUrl = buildMollieConnectAuthorizeUrl({ state });
    return res.json({ ok: true, authorizeUrl, state });
  });

  app.get('/api/mollie/connect/callback', async (req, res) => {
    const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';
    const code = String(req.query.code || '').trim();
    const error = String(req.query.error || '').trim();
    if (error) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=missing_code`);
    }
    if (!isMollieConnectConfigured()) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=not_configured`);
    }
    try {
      const tokens = await exchangeMollieConnectCode({ code });
      // TODO: chiffrer et persister tokens.refresh_token / access_token pour le sous-compte
      console.log('[mollie-connect] OAuth tokens received', {
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
      });
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=success`);
    } catch (tokenError) {
      console.error('[mollie-connect] token exchange failed', tokenError);
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=token_failed`);
    }
  });
};
