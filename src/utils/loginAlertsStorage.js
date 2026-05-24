const storageKey = (userId) => `greffio_login_alerts_configured:${userId}`;

export const markLoginAlertsConfiguredLocal = (userId, updatedAt = new Date().toISOString()) => {
  if (!userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), updatedAt);
  } catch (_error) {
    // ignore quota errors
  }
};

export const isLoginAlertsConfiguredLocal = (userId) => {
  if (!userId) return false;
  try {
    return Boolean(window.localStorage.getItem(storageKey(userId)));
  } catch (_error) {
    return false;
  }
};

export const clearLoginAlertsConfiguredLocal = (userId) => {
  if (!userId) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch (_error) {
    // ignore
  }
};
