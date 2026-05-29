import {
  resolveTribunalCommerceCity,
  normalizeCommuneKey,
} from '../catalogs/tribunalCommerceCatalog.js';

const INVALID_CITY_RE = /greffe compétent|ville à compléter|à compléter/i;

const normalizeCityLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw || INVALID_CITY_RE.test(raw)) return null;
  return raw.replace(/^(de|du|d')\s+/i, '').trim();
};

/** Ville du greffe / tribunal de commerce (siège propre ou rattachement catalogue). */
export const resolveGreffeCity = ({ greffe, seat } = {}) => {
  const resolved = resolveTribunalCommerceCity({ greffe, seat, postalCode: seat?.postalCode });
  return resolved.city || normalizeCityLabel(greffe) || normalizeCityLabel(seat?.city) || null;
};

/** Libellé statutaire : « Tribunal de commerce de Nice ». */
export const formatTribunalCommerceLabel = (city) => {
  const normalized = normalizeCityLabel(city);
  if (!normalized) return 'Tribunal de commerce du ressort du siège social';
  if (/^paris$/i.test(normalized)) return 'Tribunal de commerce de Paris';
  return `Tribunal de commerce de ${normalized}`;
};

export const resolveTribunalCommerce = ({ greffe, seat } = {}) => {
  const resolution = resolveTribunalCommerceCity({ greffe, seat, postalCode: seat?.postalCode });
  const city = resolution.city || resolveGreffeCity({ greffe, seat });
  return {
    city,
    label: formatTribunalCommerceLabel(city),
    source: resolution.source,
    seatCity: normalizeCityLabel(seat?.city),
    hasOwnTribunal: resolution.source === 'seat_has_tribunal',
    seatKey: normalizeCommuneKey(seat?.city),
  };
};

/** @deprecated Préférer resolveTribunalCommerce().label */
export const resolveTribunalCommerceLabel = ({ greffe, seat } = {}) => (
  resolveTribunalCommerce({ greffe, seat }).label
);

/** Remplace les mentions génériques du template William par le tribunal déterminé. */
export const personalizeTribunalMentions = (text, tribunalLabel) => {
  if (!text || !tribunalLabel) return text;
  return String(text)
    .replace(/Tribunal compétent du siège social/gi, tribunalLabel)
    .replace(/Tribunal de commerce du siège social/gi, tribunalLabel);
};

export { normalizeCommuneKey, resolveTribunalCommerceCity, resolveDepartmentCode, getTribunalCatalogStats } from '../catalogs/tribunalCommerceCatalog.js';
