const LEGACY_CURRENT_DOSSIER_KEY = 'greffio_current_dossier_id';

let activeUserId = null;

const migrateLegacyDossierId = (userId) => {
  if (!userId) return;
  try {
    const scoped = `greffio_current_dossier_${userId}`;
    const legacy = window.localStorage.getItem(LEGACY_CURRENT_DOSSIER_KEY);
    if (legacy && !window.localStorage.getItem(scoped)) {
      window.localStorage.setItem(scoped, legacy);
    }
    window.localStorage.removeItem(LEGACY_CURRENT_DOSSIER_KEY);
  } catch (_error) {
    // ignore storage failure
  }
};

export const setActiveSessionUserId = (userId) => {
  const next = userId ? String(userId) : null;
  if (next) migrateLegacyDossierId(next);
  activeUserId = next;
};

const scopedKey = (userId = activeUserId) => (
  userId ? `greffio_current_dossier_${userId}` : null
);

export const saveCurrentDossierId = (dossierId, userId = activeUserId) => {
  const key = scopedKey(userId);
  if (!key) return;
  try {
    if (!dossierId) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, dossierId);
    window.localStorage.removeItem(LEGACY_CURRENT_DOSSIER_KEY);
  } catch (_error) {
    // ignore storage failure
  }
};

export const getCurrentDossierId = (userId = activeUserId) => {
  const key = scopedKey(userId);
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
};

export const clearCurrentDossierId = (userId = activeUserId) => {
  const key = scopedKey(userId);
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // ignore storage failure
  }
};
