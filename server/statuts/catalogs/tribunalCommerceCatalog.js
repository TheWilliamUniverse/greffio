import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(__dirname, 'tribunalCommerceCatalog.json');

let cachedCatalog = null;
let cachedInseeIndex = null;
let cachedDeptNameIndex = null;
let cachedSeatIndex = null;

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

export const resolveDepartmentCode = (postalCode, codeDepartement) => {
  const dept = String(codeDepartement || '').trim();
  if (dept) return dept;
  const pc = String(postalCode || '').trim();
  if (!pc || pc.length < 2) return null;
  if (/^97[1-9]/.test(pc)) return pc.slice(0, 3);
  if (/^20/.test(pc)) {
    const num = Number(pc.slice(0, 5));
    if (Number.isFinite(num) && num >= 20200) return '2B';
    return '2A';
  }
  if (/^75/.test(pc)) return '75';
  return pc.slice(0, 2);
};

const buildSeatIndex = (catalog) => {
  if (cachedSeatIndex) return cachedSeatIndex;
  const index = new Map();
  (catalog.seats || []).forEach((seat) => {
    index.set(normalizeCommuneKey(seat), normalizeDisplayCity(seat));
  });
  cachedSeatIndex = index;
  return index;
};

const buildInseeIndex = (catalog) => {
  if (cachedInseeIndex) return cachedInseeIndex;
  cachedInseeIndex = new Map(Object.entries(catalog.communesByInsee || {}));
  return cachedInseeIndex;
};

const buildDeptNameIndex = (catalog) => {
  if (cachedDeptNameIndex) return cachedDeptNameIndex;
  const merged = {
    ...(catalog.attachmentsByDeptAndName || {}),
    ...(catalog.attachments || {}),
  };
  cachedDeptNameIndex = new Map(Object.entries(merged));
  return cachedDeptNameIndex;
};

const lookupCommuneTribunal = ({ insee, seat, postalCode } = {}) => {
  const catalog = loadCatalog();
  const inseeCode = String(insee || seat?.insee || '').trim();
  if (inseeCode) {
    const fromInsee = buildInseeIndex(catalog).get(inseeCode);
    if (fromInsee) return { city: fromInsee, source: 'commune_insee' };
  }

  const seatCity = normalizeDisplayCity(seat?.city);
  const seatKey = normalizeCommuneKey(seatCity);
  const department = resolveDepartmentCode(postalCode || seat?.postalCode, seat?.codeDepartement);
  if (department && seatKey) {
    const composite = buildDeptNameIndex(catalog).get(`${department}:${seatKey}`);
    if (composite) return { city: composite, source: 'commune_dept_name' };
  }

  if (seatKey) {
    const legacy = buildDeptNameIndex(catalog).get(seatKey);
    if (legacy) return { city: legacy, source: 'commune_attachment' };
  }

  return null;
};

/**
 * Résout la ville du tribunal de commerce compétent pour une commune / un siège.
 */
export const resolveTribunalCommerceCity = ({ greffe, seat, postalCode, insee } = {}) => {
  const catalog = loadCatalog();
  const seatIndex = buildSeatIndex(catalog);
  const explicitGreffe = normalizeDisplayCity(greffe);
  const seatCity = normalizeDisplayCity(seat?.city);
  const seatKey = normalizeCommuneKey(seatCity);
  const postal = String(postalCode || seat?.postalCode || '').trim();

  if (explicitGreffe && !/greffe compétent|à compléter/i.test(explicitGreffe)) {
    const explicitKey = normalizeCommuneKey(explicitGreffe);
    if (seatIndex.has(explicitKey)) {
      return { city: seatIndex.get(explicitKey), source: 'explicit_greffe' };
    }
    const fromCatalog = lookupCommuneTribunal({ seat: { city: explicitGreffe }, postalCode: postal, insee });
    if (fromCatalog) return { city: fromCatalog.city, source: 'explicit_greffe_resolved' };
    return { city: explicitGreffe, source: 'explicit_greffe' };
  }

  if (seatKey && seatIndex.has(seatKey)) {
    return { city: seatIndex.get(seatKey), source: 'seat_has_tribunal' };
  }

  const fromCatalog = lookupCommuneTribunal({ insee, seat, postalCode: postal });
  if (fromCatalog) return fromCatalog;

  const department = resolveDepartmentCode(postal, seat?.codeDepartement);
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

export const getTribunalCatalogStats = () => loadCatalog().stats || null;
