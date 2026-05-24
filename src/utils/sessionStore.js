const CURRENT_DOSSIER_KEY = 'greffio_current_dossier_id';

export const saveCurrentDossierId = (dossierId) => {
  if (!dossierId) {
    clearCurrentDossierId();
    return;
  }
  try {
    window.localStorage.setItem(CURRENT_DOSSIER_KEY, dossierId);
  } catch (_error) {
    // ignore storage failure
  }
};

export const getCurrentDossierId = () => {
  try {
    return window.localStorage.getItem(CURRENT_DOSSIER_KEY);
  } catch (_error) {
    return null;
  }
};

export const clearCurrentDossierId = () => {
  try {
    window.localStorage.removeItem(CURRENT_DOSSIER_KEY);
  } catch (_error) {
    // ignore storage failure
  }
};
