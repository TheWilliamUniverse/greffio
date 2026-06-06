const API_BASE = 'https://api-adresse.data.gouv.fr/search/';

export const normalizeAddress = async ({ address, postcode, city } = {}) => {
  const q = [address, postcode, city].filter(Boolean).join(' ').trim();
  if (!q) return { ok: false, error: 'ADDRESS_REQUIRED', normalized: null };

  const params = new URLSearchParams({ q, limit: '1' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) return { ok: false, error: 'ADDRESS_LOOKUP_FAILED', normalized: null };
    const payload = await response.json();
    const feature = payload?.features?.[0];
    if (!feature) {
      return { ok: false, error: 'ADDRESS_NOT_FOUND', normalized: null };
    }
    const props = feature.properties || {};
    return {
      ok: true,
      normalized: {
        label: props.label || q,
        postcode: props.postcode || postcode || null,
        city: props.city || city || null,
        score: props.score || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError' ? 'ADDRESS_LOOKUP_TIMEOUT' : 'ADDRESS_LOOKUP_UNAVAILABLE',
      normalized: null,
    };
  } finally {
    clearTimeout(timeout);
  }
};
