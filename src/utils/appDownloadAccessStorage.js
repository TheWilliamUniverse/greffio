const STORAGE_KEY = 'greffio.appDownload.access';

export const readAppDownloadAccess = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.expiresAt) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
};

export const saveAppDownloadAccess = ({ accessToken, expiresAt }) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, expiresAt }));
  } catch (_error) {
    // ignore
  }
};

export const clearAppDownloadAccess = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // ignore
  }
};
