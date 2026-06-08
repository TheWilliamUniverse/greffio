import { apiGet } from '@/api/client.js';
import { runtimeConfig } from '@/config/runtime.js';

const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '');
const isValidCompanyIdentifier = (identifier = '') => identifier.length === 9 || identifier.length === 14;

const mapApiGouvResult = (entry, fallbackIdentifier) => {
  if (!entry) return null;
  const siege = entry.siege || {};
  const matching = Array.isArray(entry.matching_etablissements) ? entry.matching_etablissements[0] : null;
  const city = matching?.libelle_commune || siege?.libelle_commune || '';
  const addressParts = [
    matching?.numero_voie || siege?.numero_voie || '',
    matching?.type_voie || siege?.type_voie || '',
    matching?.libelle_voie || siege?.libelle_voie || '',
    matching?.code_postal || siege?.code_postal || '',
    city,
  ].filter(Boolean);
  const siren = entry.siren || normalizeDigits(fallbackIdentifier).slice(0, 9);
  return {
    siren,
    siretSiege: matching?.siret || siege?.siret || null,
    denomination: entry.nom_complet || entry.nom_raison_sociale || '',
    legalForm: entry.nature_juridique || '',
    city,
    addressSiege: addressParts.join(' ').replace(/\s+/g, ' ').trim() || null,
    apeCode: matching?.activite_principale || siege?.activite_principale || entry.activite_principale || null,
    creationDate: entry.date_creation || null,
    administrativeStatus: entry.etat_administratif || entry.statut_diffusion || null,
    rcsGreffe: city && siren ? `RCS ${city} ${siren}` : null,
    country: 'France',
    source: 'recherche-entreprises.api.gouv.fr (direct)',
  };
};

const toLookupError = (code, status = 500) => {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
};

const normalizeCompanyPayload = (payload, fallbackIdentifier = '') => {
  const company = payload?.company || payload?.data || payload || {};
  if (company?.nom_complet || company?.nom_raison_sociale || company?.matching_etablissements || company?.siege) {
    return mapApiGouvResult(company, fallbackIdentifier);
  }
  return {
    denomination: company.denomination || company.nom_complet || company.nom_raison_sociale || company.name || '',
    siren: company.siren || '',
    siret: company.siretSiege || company.siret_siege_social || company.siret || '',
    siretSiege: company.siretSiege || company.siret_siege_social || company.siret || '',
    legalForm: company.legalForm || company.nature_juridique || company.categorie_juridique || '',
    addressSiege: company.addressSiege || company.siege?.adresse || company.adresse || '',
    city: company.city || company.siege?.libelle_commune || '',
    apeCode: company.apeCode || company.activite_principale || company.code_naf || '',
    creationDate: company.creationDate || company.date_creation || company.date_creation_unite_legale || '',
    administrativeStatus: company.administrativeStatus || company.etat_administratif || company.etat_administratif_unite_legale || '',
    rcsGreffe: company.rcsGreffe || company.greffe || company.rcs || '',
    country: company.country || 'France',
    source: company.source || payload?.source || 'unknown',
  };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = payload?.code || payload?.error || `HTTP_${response.status}`;
    const error = toLookupError(code, response.status);
    throw error;
  }
  return response.json();
};

const lookupViaGreffioPublic = async (identifier) => {
  const payload = await fetchJson(`${runtimeConfig.apiBaseUrl}/api/public/company-search?identifier=${encodeURIComponent(identifier)}`);
  return normalizeCompanyPayload(payload, identifier);
};

const lookupViaGreffioLegacy = async (identifier) => {
  const param = identifier.length === 14 ? 'siret' : 'siren';
  const payload = await fetchJson(
    `${runtimeConfig.apiBaseUrl}/api/company-search?${param}=${encodeURIComponent(identifier)}`,
    {},
  );
  return normalizeCompanyPayload(payload, identifier);
};

const lookupViaApiGouvDirect = async (identifier) => {
  const payload = await fetchJson(
    `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(identifier)}&per_page=1&page=1`,
  );
  const item = payload?.results?.[0];
  if (!item) {
    throw toLookupError('COMPANY_NOT_FOUND', 404);
  }
  return normalizeCompanyPayload({ ...item, source: 'recherche-entreprises.api.gouv.fr-direct' }, identifier);
};

const lookupPublicWithFallbackChain = async (value) => {
  const identifier = normalizeDigits(value);
  if (!isValidCompanyIdentifier(identifier)) {
    throw toLookupError('INVALID_SIREN_OR_SIRET', 400);
  }
  const attempts = [
    () => lookupViaGreffioPublic(identifier),
    () => lookupViaGreffioLegacy(identifier),
    () => lookupViaApiGouvDirect(identifier),
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const company = await attempt();
      if (company?.siren || company?.siret || company?.siretSiege || company?.denomination) {
        return { ok: true, company, cached: false, source: company.source || 'unknown' };
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || toLookupError('COMPANY_LOOKUP_FAILED', 502);
};

export const lookupPublicCompanyBySiren = lookupPublicWithFallbackChain;
export const lookupCompanyBySiren = lookupPublicWithFallbackChain;

export const getCompanyLookupObservability = async () => apiGet('/api/observability/company-lookup');
