/**
 * Logique pure de décision de mise à jour.
 *
 * Aucune dépendance à React, fetch, Capacitor ou storage : la fonction
 * `resolveUpdateState` est entièrement testable en isolation (cf.
 * `server/tests/appUpdateLogic.test.js`).
 */

import {
  buildNoUpdate,
  buildOptionalUpdate,
  buildRequiredUpdate,
} from './appUpdateTypes.js';

const safeInt = (value) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
};

const normalizeConfig = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const latestVersionCode = safeInt(raw.latestVersionCode);
  if (latestVersionCode <= 0) return null;
  const minimumRequiredVersionCode = Math.max(0, safeInt(raw.minimumRequiredVersionCode));
  return {
    latestVersionCode,
    minimumRequiredVersionCode,
    latestVersionName: raw.latestVersionName || `build ${latestVersionCode}`,
    title: raw.title || 'Nouvelle version disponible',
    message:
      raw.message
      || "Une nouvelle version de l'application est disponible avec des corrections et améliorations.",
    changelog: Array.isArray(raw.changelog) ? raw.changelog.filter(Boolean) : [],
    playStoreUrl: raw.playStoreUrl || null,
    updateUrl: raw.updateUrl || null,
    optionalReminderHours: Number.isFinite(raw.optionalReminderHours)
      ? raw.optionalReminderHours
      : 24,
  };
};

export const resolveUpdateState = ({ currentVersionCode, remoteConfig }) => {
  const current = safeInt(currentVersionCode);
  const config = normalizeConfig(remoteConfig);

  if (!config) {
    return buildNoUpdate(current);
  }

  if (current > 0 && current < config.minimumRequiredVersionCode) {
    return buildRequiredUpdate({ current, config });
  }

  if (current > 0 && current < config.latestVersionCode) {
    return buildOptionalUpdate({ current, config });
  }

  return buildNoUpdate(current);
};

export const __forTests = { normalizeConfig, safeInt };
