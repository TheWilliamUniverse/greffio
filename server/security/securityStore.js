import { createHash } from 'node:crypto';
let dbModulePromise = null;

const loadDbModule = async () => {
  if (!dbModulePromise) {
    dbModulePromise = import('../dbClient.js');
  }
  return dbModulePromise;
};

const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

const memoryCounters = new Map();

const resolveStoreMode = () => {
  const requested = String(process.env.SECURITY_STORE || '').toLowerCase();
  if (requested === 'memory') return 'memory';
  if (requested === 'postgres' || process.env.DATABASE_URL) return 'postgres';
  return 'memory';
};

const hashScopeKey = (scope, rawKey) => {
  const pepper = process.env.SECURITY_LOCKOUT_PEPPER || process.env.JWT_SECRET || 'greffio-lockout';
  return createHash('sha256')
    .update(`${scope}:${pepper}:${String(rawKey || '').trim().toLowerCase()}`)
    .digest('hex');
};

const bumpMemoryCounter = (scope, rawKey) => {
  const key = `${scope}:${hashScopeKey(scope, rawKey)}`;
  const now = Date.now();
  const existing = memoryCounters.get(key);
  const reset = !existing || now - existing.windowStartedAt > LOGIN_FAILURE_WINDOW_MS;
  const next = reset
    ? { count: 1, windowStartedAt: now }
    : { count: existing.count + 1, windowStartedAt: existing.windowStartedAt };
  memoryCounters.set(key, next);
  return next.count;
};

const readMemoryCounter = (scope, rawKey) => {
  const key = `${scope}:${hashScopeKey(scope, rawKey)}`;
  const existing = memoryCounters.get(key);
  if (!existing) return 0;
  if (Date.now() - existing.windowStartedAt > LOGIN_FAILURE_WINDOW_MS) {
    memoryCounters.delete(key);
    return 0;
  }
  return existing.count;
};

const bumpPostgresCounter = async (scope, rawKey) => {
  const { query } = await loadDbModule();
  const keyHash = hashScopeKey(scope, rawKey);
  const result = await query(
    `
      INSERT INTO security_lockout_counters (scope, key_hash, count, window_started_at, updated_at)
      VALUES ($1, $2, 1, NOW(), NOW())
      ON CONFLICT (scope, key_hash) DO UPDATE SET
        count = CASE
          WHEN security_lockout_counters.window_started_at < NOW() - INTERVAL '15 minutes'
            THEN 1
          ELSE security_lockout_counters.count + 1
        END,
        window_started_at = CASE
          WHEN security_lockout_counters.window_started_at < NOW() - INTERVAL '15 minutes'
            THEN NOW()
          ELSE security_lockout_counters.window_started_at
        END,
        updated_at = NOW()
      RETURNING count
    `,
    [scope, keyHash],
  );
  return Number(result.rows[0]?.count || 0);
};

const readPostgresCounter = async (scope, rawKey) => {
  const { query } = await loadDbModule();
  const keyHash = hashScopeKey(scope, rawKey);
  const result = await query(
    `
      SELECT count
      FROM security_lockout_counters
      WHERE scope = $1
        AND key_hash = $2
        AND window_started_at >= NOW() - INTERVAL '15 minutes'
      LIMIT 1
    `,
    [scope, keyHash],
  );
  return Number(result.rows[0]?.count || 0);
};

const clearPostgresCounter = async (scope, rawKey) => {
  const { query } = await loadDbModule();
  const keyHash = hashScopeKey(scope, rawKey);
  await query(
    'DELETE FROM security_lockout_counters WHERE scope = $1 AND key_hash = $2',
    [scope, keyHash],
  );
};

export const getSecurityStoreMode = () => resolveStoreMode();

export const incrementSecurityCounter = async (scope, rawKey) => {
  if (!rawKey) return 0;
  if (resolveStoreMode() === 'postgres') {
    try {
      return await bumpPostgresCounter(scope, rawKey);
    } catch (_error) {
      return bumpMemoryCounter(scope, rawKey);
    }
  }
  return bumpMemoryCounter(scope, rawKey);
};

export const readSecurityCounter = async (scope, rawKey) => {
  if (!rawKey) return 0;
  if (resolveStoreMode() === 'postgres') {
    try {
      return await readPostgresCounter(scope, rawKey);
    } catch (_error) {
      return readMemoryCounter(scope, rawKey);
    }
  }
  return readMemoryCounter(scope, rawKey);
};

export const clearSecurityCounter = async (scope, rawKey) => {
  if (!rawKey) return;
  if (resolveStoreMode() === 'postgres') {
    try {
      await clearPostgresCounter(scope, rawKey);
      return;
    } catch (_error) {
      // fallback memory
    }
  }
  const key = `${scope}:${hashScopeKey(scope, rawKey)}`;
  memoryCounters.delete(key);
};

export const __testOnlyResetSecurityStore = () => {
  memoryCounters.clear();
};
