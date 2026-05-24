export const parseJsonField = (value, fallback = {}) => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch (_error) {
    return fallback;
  }
};
