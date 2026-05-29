import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, 'tribunalCommerceCatalog.json');

let cachedCatalog = null;

const loadCatalog = () => {
  if (!cachedCatalog) {
    cachedCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  }
  return cachedCatalog;
};

export const normalizeCommuneKey = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
);

const normalizeDisplayCity = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.replace(/^(de|du|d')\s+/i, '').trim();
};

export const resolveDepartmentCode = (postalCode) => {
  const pc = String(postalCode || '').trim();
  if (!pc || pc.length < 2) return null;
  if (/^97[1-8]/.test(pc)) return pc.slice(0, 3);
  if (/^20/.test(pc)) {
    const num = Number(pc.slice(0, 5));
    if (Number.isFinite(num) && num >= 20200) return '2B';
    return '2A';
  }
  if (/^75/.test(pc)) return '75';
  return pc.slice(0, 2);
};

const buildSeatIndex = (catalog) => {
  const index = new Map();
  (catalog.seats || []).forEach((seat) => {
    index.set(normalizeCommuneKey(seat), normalizeDisplayCity(seat));
  });
  return index;
};

const buildAttachmentIndex = (catalog) => {
  const index = new Map();
  Object.entries(catalog.attachments || {}).forEach(([commune, tribunal]) => {
    index.set(normalizeCommuneKey(commune), normalizeDisplayCity(tribunal));
  });
  return index;
};

/**
 * Résout la ville du tribunal de commerce compétent pour une commune / un siège.
 * 1. Greffe explicite si renseigné
 * 2. Siège disposant de son propre TC
 * 3. Rattachement commune → TC (catalogue)
 * 4. Département → TC siège départemental
 */
export const resolveTribunalCommerceCity = ({ greffe, seat, postalCode } = {}) => {
  const catalog = loadCatalog();
  const seatIndex = buildSeatIndex(catalog);
  const attachmentIndex = buildAttachmentIndex(catalog);
  const explicitGreffe = normalizeDisplayCity(greffe);
  const seatCity = normalizeDisplayCity(seat?.city);
  const seatKey = normalizeCommuneKey(seatCity);
  const postal = String(postalCode || seat?.postalCode || '').trim();

  if (explicitGreffe && !/greffe compétent|à compléter/i.test(explicitGreffe)) {
    const explicitKey = normalizeCommuneKey(explicitGreffe);
    if (seatIndex.has(explicitKey)) {
      return { city: seatIndex.get(explicitKey), source: 'explicit_greffe' };
    }
    if (attachmentIndex.has(explicitKey)) {
      return { city: attachmentIndex.get(explicitKey), source: 'explicit_greffe_attachment' };
    }
    return { city: explicitGreffe, source: 'explicit_greffe' };
  }

  if (seatKey && seatIndex.has(seatKey)) {
    return { city: seatIndex.get(seatKey), source: 'seat_has_tribunal' };
  }

  if (seatKey && attachmentIndex.has(seatKey)) {
    return { city: attachmentIndex.get(seatKey), source: 'commune_attachment' };
  }

  const department = resolveDepartmentCode(postal);
  const departmentTribunal = department ? catalog.departments?.[department] : null;
  if (departmentTribunal) {
    return { city: normalizeDisplayCity(departmentTribunal), source: 'department' };
  }

  if (seatCity) {
    return { city: seatCity, source: 'seat_fallback' };
  }

  return { city: null, source: 'unknown' };
};

export const hasOwnTribunalCommerce = (city) => {
  const catalog = loadCatalog();
  const seatIndex = buildSeatIndex(catalog);
  return seatIndex.has(normalizeCommuneKey(city));
};

export const listTribunalCommerceSeats = () => {
  const catalog = loadCatalog();
  return [...(catalog.seats || [])];
};
