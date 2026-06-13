const envBool = (key, fallback = true) => {
  const raw = String(process.env[key] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return !['0', 'false', 'no', 'off'].includes(raw);
};

const envNumber = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

export const documentCompletionConfig = {
  maxFileSizeMb: envNumber('DOCUMENT_COMPLETION_MAX_FILE_SIZE_MB', 25),
  maxFileSizeBytes: envNumber('DOCUMENT_COMPLETION_MAX_FILE_SIZE_MB', 25) * 1024 * 1024,
  maxPages: envNumber('DOCUMENT_COMPLETION_MAX_PAGES', 60),
  enableOcr: envBool('DOCUMENT_COMPLETION_ENABLE_OCR', true),
  enableAi: envBool('DOCUMENT_COMPLETION_ENABLE_AI', true),
  minConfidence: envNumber('DOCUMENT_COMPLETION_MIN_CONFIDENCE', 0.55),
  overlapThreshold: envNumber('DOCUMENT_COMPLETION_OVERLAP_THRESHOLD', 0.45),
  storagePrefix: String(process.env.DOCUMENT_COMPLETION_STORAGE_PREFIX || 'document-completion'),
  storageDocKey: 'document_completion',
  pollIntervalMs: 1500,
  analysisTimeoutMs: envNumber('DOCUMENT_COMPLETION_ANALYSIS_TIMEOUT_MS', 120000),
};

export const GREFFIO_BLUE = {
  fill: { r: 0.86, g: 0.93, b: 1.0 },
  border: { r: 0.12, g: 0.45, b: 0.92 },
  text: { r: 0.15, g: 0.35, b: 0.62 },
};
