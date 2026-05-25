/**
 * Persistance locale du choix "Plus tard" pour les mises à jour optionnelles.
 *
 * On utilise `@capacitor/preferences` quand disponible (Android natif), avec
 * un fallback `localStorage` pour le web. Toute erreur de storage est avalée
 * silencieusement : l'app ne doit jamais planter à cause d'un quota plein
 * ou d'un storage indisponible.
 */

import { Preferences } from '@capacitor/preferences';

const SNOOZE_KEY = 'greffio.update.snoozeUntilByVersion';

const safeJsonParse = (raw) => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const readRaw = async () => {
  try {
    const { value } = await Preferences.get({ key: SNOOZE_KEY });
    if (value) return value;
  } catch (_error) {
    // ignore, fallback ci-dessous
  }
  try {
    return window?.localStorage?.getItem(SNOOZE_KEY) ?? null;
  } catch (_error) {
    return null;
  }
};

const writeRaw = async (value) => {
  try {
    await Preferences.set({ key: SNOOZE_KEY, value });
  } catch (_error) {
    // ignore
  }
  try {
    window?.localStorage?.setItem(SNOOZE_KEY, value);
  } catch (_error) {
    // ignore
  }
};

export const getSnoozeUntil = async (versionCode) => {
  const raw = await readRaw();
  const map = safeJsonParse(raw);
  const ts = Number(map[versionCode]);
  return Number.isFinite(ts) ? ts : 0;
};

export const setSnoozeUntil = async ({ versionCode, untilTs }) => {
  const raw = await readRaw();
  const map = safeJsonParse(raw);
  map[versionCode] = untilTs;
  await writeRaw(JSON.stringify(map));
};

export const clearSnooze = async () => {
  await writeRaw('{}');
};

export const __testHelpers = { SNOOZE_KEY };
