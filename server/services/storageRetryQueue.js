const MAX_RECENT_FAILURES = 200;
const FAILURE_ALERT_THRESHOLD = 5;
const WINDOW_MS = 5 * 60 * 1000;

const queue = [];
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

export const enqueueStorageRetry = ({
  dossierId,
  docKey,
  localFilePath,
  filename,
  reason = 'storage_upload_failed',
}) => {
  const item = {
    id: `${dossierId || 'unknown'}:${docKey || 'unknown'}:${Date.now()}`,
    dossierId: dossierId || null,
    docKey: docKey || null,
    localFilePath: localFilePath || null,
    filename: filename || null,
    reason,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastAttemptAt: null,
    status: 'queued',
  };
  queue.push(item);
  return item;
};

export const markStorageRetryAttempt = (itemId, status, error = null) => {
  const item = queue.find((entry) => entry.id === itemId);
  if (!item) return null;
  item.attempts += 1;
  item.lastAttemptAt = new Date().toISOString();
  item.status = status;
  if (error) item.lastError = String(error);
  return item;
};

export const getStorageRetryQueueSnapshot = () => ({
  queuedCount: queue.filter((item) => item.status === 'queued').length,
  processingCount: queue.filter((item) => item.status === 'processing').length,
  failedCount: queue.filter((item) => item.status === 'failed').length,
  items: queue.slice(-25),
});

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
  return {
    shouldAlert,
    failureCountWindow5m: failureCount,
    threshold: FAILURE_ALERT_THRESHOLD,
  };
};
