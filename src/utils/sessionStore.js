const LEGACY_CURRENT_DOSSIER_KEY = 'greffio_current_dossier_id';

let activeUserId = null;

export const setActiveSessionUserId = (userId) => {
  activeUserId = userId ? String(userId) : null;
};

const scopedKey = (userId = activeUserId) => (
  userId ? `greffio_current_dossier_${userId}` : LEGACY_CURRENT_DOSSIER_KEY
);

export const saveCurrentDossierId = (dossierId, userId = activeUserId) => {
  const key = scopedKey(userId);
  if (!dossierId) {
    try {
      window.localStorage.removeItem(key);
      if (userId) window.localStorage.removeItem(LEGACY_CURRENT_DOSSIER_KEY);
    } catch (_error) {
      // ignore storage failure
    }
    return;
  }
  try {
    window.localStorage.setItem(key, dossierId);
    if (userId) window.localStorage.removeItem(LEGACY_CURRENT_DOSSIER_KEY);
  } catch (_error) {
    // ignore storage failure
  }
};

export const getCurrentDossierId = (userId = activeUserId) => {
  try {
    const key = scopedKey(userId);
    const scoped = window.localStorage.getItem(key);
    if (scoped) return scoped;
    if (userId) return null;
    return window.localStorage.getItem(LEGACY_CURRENT_DOSSIER_KEY);
  } catch (_error) {
    return null;
  }
};

export const clearCurrentDossierId = (userId = activeUserId) => {
  try {
    window.localStorage.removeItem(scopedKey(userId));
    if (!userId || userId === activeUserId) {
      window.localStorage.removeItem(LEGACY_CURRENT_DOSSIER_KEY);
    }
  } catch (_error) {
    // ignore storage failure
  }
};
