const INVALID_CITY_RE = /greffe compétent|ville à compléter|à compléter/i;

const normalizeCityLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw || INVALID_CITY_RE.test(raw)) return null;
  return raw.replace(/^(de|du|d')\s+/i, '').trim();
};

/** Ville du greffe / tribunal de commerce à partir du siège et du greffe saisi. */
export const resolveGreffeCity = ({ greffe, seat } = {}) => (
  normalizeCityLabel(greffe) || normalizeCityLabel(seat?.city) || null
);

/** Libellé statutaire : « Tribunal de commerce de Nice ». */
export const formatTribunalCommerceLabel = (city) => {
  const normalized = normalizeCityLabel(city);
  if (!normalized) return 'Tribunal de commerce du ressort du siège social';
  if (/^paris$/i.test(normalized)) return 'Tribunal de commerce de Paris';
  return `Tribunal de commerce de ${normalized}`;
};

export const resolveTribunalCommerceLabel = ({ greffe, seat } = {}) => (
  formatTribunalCommerceLabel(resolveGreffeCity({ greffe, seat }))
);

/** Remplace les mentions génériques du template William par le tribunal déterminé. */
export const personalizeTribunalMentions = (text, tribunalLabel) => {
  if (!text || !tribunalLabel) return text;
  return String(text)
    .replace(/Tribunal compétent du siège social/gi, tribunalLabel)
    .replace(/Tribunal de commerce du siège social/gi, tribunalLabel);
};
