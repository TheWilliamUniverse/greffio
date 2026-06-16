const MISTRAL_API_BASE = process.env.MISTRAL_API_BASE_URL || 'https://api.mistral.ai';
const DEFAULT_OCR_MODEL = process.env.MISTRAL_OCR_MODEL || 'mistral-ocr-latest';
const MAX_OCR_BYTES = 12 * 1024 * 1024;

const truthy = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

export const isMistralOcrEnabled = () => truthy(process.env.MISTRAL_OCR_ENABLED, false);

export const isMistralOcrConfigured = () => (
  isMistralOcrEnabled() && Boolean(process.env.MISTRAL_API_KEY)
);

const resolveMimeType = (mimeType, filename) => {
  if (mimeType) return mimeType;
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/pdf';
};

const buildDocumentPayload = ({ buffer, mimeType, filename }) => {
  const resolvedMime = resolveMimeType(mimeType, filename);
  const base64 = buffer.toString('base64');
  if (resolvedMime.startsWith('image/')) {
    return {
      type: 'image_url',
      image_url: `data:${resolvedMime};base64,${base64}`,
    };
  }
  return {
    type: 'document_url',
    document_url: `data:${resolvedMime};base64,${base64}`,
    document_name: filename || 'document.pdf',
  };
};

const mistralFetch = async (path, { method = 'GET', body } = {}) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY_MISSING');
  const response = await fetch(`${MISTRAL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.message || payload?.detail || response.statusText;
    throw new Error(`MISTRAL_OCR_FAILED:${detail}`);
  }
  return payload;
};

export const health = async () => {
  if (!isMistralOcrConfigured()) {
    return { ok: false, configured: false, enabled: isMistralOcrEnabled() };
  }
  return { ok: true, configured: true, enabled: true, model: DEFAULT_OCR_MODEL };
};

export const extractText = async ({ buffer, mimeType, filename }) => {
  if (!isMistralOcrConfigured()) {
    return { ok: false, skipped: true, reason: 'MISTRAL_OCR_DISABLED' };
  }
  if (!buffer?.length) {
    return { ok: false, error: 'EMPTY_BUFFER' };
  }
  if (buffer.length > MAX_OCR_BYTES) {
    return { ok: false, error: 'FILE_TOO_LARGE_FOR_OCR', maxBytes: MAX_OCR_BYTES };
  }

  const payload = await mistralFetch('/v1/ocr', {
    method: 'POST',
    body: {
      model: DEFAULT_OCR_MODEL,
      document: buildDocumentPayload({ buffer, mimeType, filename }),
    },
  });

  const pages = Array.isArray(payload?.pages) ? payload.pages : [];
  const markdown = pages.map((page) => String(page?.markdown || '').trim()).filter(Boolean).join('\n\n');
  const pageCount = pages.length;
  const confidenceScores = pages
    .flatMap((page) => (Array.isArray(page?.confidence_scores?.words) ? page.confidence_scores.words : []))
    .map((entry) => Number(entry?.confidence))
    .filter((value) => Number.isFinite(value));
  const averageConfidence = confidenceScores.length
    ? Math.round((confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length) * 100)
    : (markdown.length > 200 ? 72 : 45);

  return {
    ok: true,
    provider: 'mistral',
    model: payload?.model || DEFAULT_OCR_MODEL,
    text: markdown.slice(0, 40000),
    pageCount,
    confidenceScore: averageConfidence,
    requiresManualReview: averageConfidence < 60 || markdown.length <= 120,
    usage: payload?.usage_info || null,
  };
};

export const extractStructuredFields = async ({ buffer, mimeType, filename, schema }) => {
  const base = await extractText({ buffer, mimeType, filename });
  if (!base.ok) return base;
  if (!schema || typeof schema !== 'object') {
    return { ...base, structured: null };
  }
  return {
    ...base,
    structured: {
      schema,
      note: 'Structured extraction via document_annotation_format – à brancher si besoin métier.',
    },
  };
};
