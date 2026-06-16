const MAX_RECENT_FAILURES = 200;
const FAILURE_ALERT_THRESHOLD = 5;
const WINDOW_MS = 5 * 60 * 1000;

const recentFailures = [];

const now = () => Date.now();

const pushFailure = (entry) => {
  recentFailures.push(entry);
  if (recentFailures.length > MAX_RECENT_FAILURES) {
    recentFailures.splice(0, recentFailures.length - MAX_RECENT_FAILURES);
  }
};

const computeRecentFailureCount = () => {
  const minTimestamp = now() - WINDOW_MS;
  return recentFailures.filter((item) => item.timestamp >= minTimestamp).length;
};

export const getStorageFailureSnapshot = () => {
  const failureCount = computeRecentFailureCount();
  return {
    failureCountWindow5m: failureCount,
    threshold: FAILURE_ALERT_THRESHOLD,
    recent: recentFailures.slice(-25),
  };
};

/** @deprecated La file mémoire n'était jamais traitée – conservé pour compat observabilité. */
export const getStorageRetryQueueSnapshot = () => getStorageFailureSnapshot();

export const registerStorageFailureForOps = (payload = {}) => {
  const entry = {
    timestamp: now(),
    dossierId: payload.dossierId || null,
    docKey: payload.docKey || null,
    reason: payload.reason || 'storage_failure',
  };
  pushFailure(entry);
  const failureCount = computeRecentFailureCount();
  const shouldAlert = failureCount >= FAILURE_ALERT_THRESHOLD;
  if (shouldAlert) {
    console.error('OPS_STORAGE_ALERT', {
      message: 'Repeated storage failures in 5 minute window',
      failureCount,
      ...entry,
    });
  }
  return {
    shouldAlert,
    failureCountWindow5m: failureCount,
    threshold: FAILURE_ALERT_THRESHOLD,
  };
};
