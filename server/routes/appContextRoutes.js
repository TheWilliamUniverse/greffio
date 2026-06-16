/**
 * Contexte produit public pour l'app remote (Capacitor) et le web.
 * Sans secrets – cache court pour propagation rapide après déploiement VPS.
 */

import { getGreffioAuditContext } from '../config/greffioAuditPriorities.js';
import { getAppVersionConfig } from '../config/appVersion.js';

export const registerAppContextRoutes = (app) => {
  app.get('/api/app-context', (_req, res) => {
    const audit = getGreffioAuditContext();
    const version = getAppVersionConfig();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      ok: true,
      audit,
      version: {
        latestVersionCode: version.latestVersionCode,
        latestVersionName: version.latestVersionName,
        minimumRequiredVersionCode: version.minimumRequiredVersionCode,
        changelog: version.changelog,
      },
      remote: {
        webOrigin: 'https://greffio.willentreprises.com',
        apiOrigin: 'https://api.greffio.willentreprises.com',
        mode: 'capacitor-remote',
      },
      checkedAt: new Date().toISOString(),
    });
  });
};
