/**
 * Route publique de configuration de mise à jour mobile.
 *
 * Exposée sans authentification car elle ne contient aucune donnée sensible
 * et doit être atteignable même avant que l'utilisateur ne soit connecté.
 * Le cache est volontairement court côté serveur pour permettre une
 * propagation rapide d'une mise à jour obligatoire.
 */

import { getAppVersionConfig } from '../config/appVersion.js';

export const registerAppVersionRoutes = (app) => {
  app.get('/api/app-version', (_req, res) => {
    const config = getAppVersionConfig();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      ok: true,
      ...config,
      checkedAt: new Date().toISOString(),
    });
  });
};
