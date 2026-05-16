const LOOKUP_TIMEOUT_MS = Number(process.env.COMPANY_LOOKUP_TIMEOUT_MS || 6500);
const CACHE_TTL_MS = Number(process.env.COMPANY_LOOKUP_CACHE_TTL_MS || 5 * 60 * 1000);
const ENABLE_SECONDARY_PROVIDER = String(process.env.COMPANY_LOOKUP_ENABLE_SECONDARY || 'false').toLowerCase() === 'true';
const SECONDARY_PROVIDER = String(process.env.COMPANY_LOOKUP_SECONDARY_PROVIDER || 'entreprise_data_gouv').toLowerCase();
const INSEE_API_BASE_URL = String(process.env.INSEE_API_BASE_URL || 'https://api.insee.fr/entreprises/sirene/V3.11');
const INSEE_API_TOKEN = String(process.env.INSEE_API_TOKEN || '').trim();
const ENABLE_INSEE_PROVIDER = String(process.env.COMPANY_LOOKUP_ENABLE_INSEE || 'false').toLowerCase() === 'true';
const PAPPERS_API_BASE_URL = String(process.env.PAPPERS_API_BASE_URL || 'https://api.pappers.fr/v2');
const PAPPERS_API_TOKEN = String(process.env.PAPPERS_API_TOKEN || '').trim();
const ENABLE_PAPPERS_PROVIDER = String(process.env.COMPANY_LOOKUP_ENABLE_PAPPERS || 'false').toLowerCase() === 'true';

const cache = new Map();
const metrics = {
  total: 0,
  cacheHits: 0,
  cacheMisses: 0,
  success: 0,
  notFound: 0,
  errors: 0,
  providers: {},
};

const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '');
const isSiren = (value = '') => /^\d{9}$/.test(value);
const isSiret = (value = '') => /^\d{14}$/.test(value);

const buildCacheKey = (identifier) => `company_lookup:${identifier}`;

const getCacheValue = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCacheValue = (key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const initProviderMetrics = (provider) => {
  if (!metrics.providers[provider]) {
    metrics.providers[provider] = {
      attempts: 0,
      success: 0,
      failures: 0,
      totalLatencyMs: 0,
      avgLatencyMs: 0,
      lastLatencyMs: 0,
      lastError: null,
      lastSuccessAt: null,
    };
  }
  return metrics.providers[provider];
};

const recordProviderMetric = ({
  provider,
  ok,
  latencyMs,
  error = null,
}) => {
  const bucket = initProviderMetrics(provider);
  bucket.attempts += 1;
  bucket.totalLatencyMs += latencyMs;
  bucket.lastLatencyMs = latencyMs;
  bucket.avgLatencyMs = Math.round(bucket.totalLatencyMs / Math.max(bucket.attempts, 1));
  if (ok) {
    bucket.success += 1;
    bucket.lastSuccessAt = new Date().toISOString();
  } else {
    bucket.failures += 1;
    bucket.lastError = error || 'UNKNOWN_ERROR';
  }
};

const fetchJsonWithTimeout = async (url, timeoutMs = LOOKUP_TIMEOUT_MS, headers = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const mapApiGouvResult = ({ result, fallbackSiren, preferredSiret = null }) => {
  if (!result) return null;
  const matching = Array.isArray(result.matching_etablissements) ? result.matching_etablissements[0] : null;
  const normalizedSiren = result.siren || fallbackSiren;
  const siege = result.siege || {};
  const normalizedSiret = preferredSiret
    || matching?.siret
    || siege?.siret
    || null;
  const city = matching?.libelle_commune || siege?.libelle_commune || '';
  const addressChunks = [
    matching?.numero_voie || siege?.numero_voie || '',
    matching?.type_voie || siege?.type_voie || '',
    matching?.libelle_voie || siege?.libelle_voie || '',
    matching?.code_postal || siege?.code_postal || '',
    city,
  ].filter(Boolean);
  const addressSiege = addressChunks.join(' ').replace(/\s+/g, ' ').trim();
  const apeCode = matching?.activite_principale || siege?.activite_principale || result?.activite_principale || null;
  const creationDate = result?.date_creation || null;
  const administrativeStatus = result?.etat_administratif || result?.statut_diffusion || null;
  const rcsGreffe = city && normalizedSiren ? `RCS ${city} ${normalizedSiren}` : null;
  return {
    siren: normalizedSiren,
    siretSiege: normalizedSiret,
    denomination: result.nom_complet || result.nom_raison_sociale || '',
    legalForm: result.nature_juridique || '',
    city,
    addressSiege: addressSiege || null,
    apeCode,
    creationDate,
    administrativeStatus,
    rcsGreffe,
    country: 'France',
    source: 'recherche-entreprises.api.gouv.fr',
  };
};

const mapEntrepriseDataGouvResult = ({ payload, siren, siret = null }) => {
  if (payload?.unite_legale) {
    const unit = payload.unite_legale;
    const city = unit.geo_adresse || '';
    return {
      siren: unit.siren || siren,
      siretSiege: siret || null,
      denomination: unit.denomination || unit.denomination_usuelle_1 || unit.nom || '',
      legalForm: unit.categorie_juridique || '',
      city,
      addressSiege: city || null,
      apeCode: unit.activite_principale || null,
      creationDate: unit.date_creation || null,
      administrativeStatus: unit.etat_administratif || null,
      rcsGreffe: city && (unit.siren || siren) ? `RCS ${city} ${unit.siren || siren}` : null,
      country: 'France',
      source: 'entreprise.data.gouv.fr',
    };
  }
  if (payload?.etablissement) {
    const etab = payload.etablissement;
    const city = etab.libelle_commune || '';
    const addressChunks = [
      etab.numero_voie || '',
      etab.type_voie || '',
      etab.libelle_voie || '',
      etab.code_postal || '',
      city,
    ].filter(Boolean);
    const normalizedSiren = etab.siren || siren;
    return {
      siren: normalizedSiren,
      siretSiege: etab.siret || siret || null,
      denomination: etab.unite_legale?.denomination || etab.unite_legale?.denomination_usuelle_1 || '',
      legalForm: etab.unite_legale?.categorie_juridique || '',
      city,
      addressSiege: addressChunks.join(' ').replace(/\s+/g, ' ').trim() || null,
      apeCode: etab.activite_principale || etab.unite_legale?.activite_principale || null,
      creationDate: etab.unite_legale?.date_creation || null,
      administrativeStatus: etab.unite_legale?.etat_administratif || null,
      rcsGreffe: city && normalizedSiren ? `RCS ${city} ${normalizedSiren}` : null,
      country: 'France',
      source: 'entreprise.data.gouv.fr',
    };
  }
  return null;
};

const queryApiGouv = async ({ siren, siret }) => {
  const attempts = [
    siret ? `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}&per_page=1` : null,
    `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&per_page=1`,
  ].filter(Boolean);

  for (const url of attempts) {
    const startedAt = Date.now();
    try {
      const payload = await fetchJsonWithTimeout(url);
      const first = payload?.results?.[0] || null;
      const latencyMs = Date.now() - startedAt;
      if (first) {
        recordProviderMetric({ provider: 'api_gouv', ok: true, latencyMs });
        return mapApiGouvResult({ result: first, fallbackSiren: siren, preferredSiret: siret || null });
      }
      recordProviderMetric({ provider: 'api_gouv', ok: false, latencyMs, error: 'NOT_FOUND' });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      recordProviderMetric({ provider: 'api_gouv', ok: false, latencyMs, error: error?.name || 'REQUEST_FAILED' });
    }
  }
  return null;
};

const queryEntrepriseDataGouv = async ({ siren, siret }) => {
  const attempts = [
    siret ? `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${encodeURIComponent(siret)}` : null,
    `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/${encodeURIComponent(siren)}`,
  ].filter(Boolean);
  for (const url of attempts) {
    const startedAt = Date.now();
    try {
      const payload = await fetchJsonWithTimeout(url);
      const latencyMs = Date.now() - startedAt;
      const mapped = mapEntrepriseDataGouvResult({ payload, siren, siret });
      if (mapped) {
        recordProviderMetric({ provider: 'entreprise_data_gouv', ok: true, latencyMs });
        return mapped;
      }
      recordProviderMetric({ provider: 'entreprise_data_gouv', ok: false, latencyMs, error: 'NOT_FOUND' });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      recordProviderMetric({ provider: 'entreprise_data_gouv', ok: false, latencyMs, error: error?.name || 'REQUEST_FAILED' });
    }
  }
  return null;
};

const mapInseeSirenResult = ({ payload, siren, siret = null }) => {
  const unit = payload?.uniteLegale || payload?.unite_legale;
  if (!unit) return null;
  const period = Array.isArray(unit.periodesUniteLegale) ? unit.periodesUniteLegale[0] : null;
  const city = period?.libelleCommuneEtablissement || period?.libelleCommune || '';
  const denomination = period?.denominationUniteLegale
    || period?.nomUniteLegale
    || period?.nomUsageUniteLegale
    || '';
  return {
    siren: unit.siren || siren,
    siretSiege: siret || null,
    denomination,
    legalForm: period?.categorieJuridiqueUniteLegale || '',
    city,
    addressSiege: city || null,
    apeCode: period?.activitePrincipaleUniteLegale || null,
    creationDate: unit.dateCreationUniteLegale || null,
    administrativeStatus: period?.etatAdministratifUniteLegale || null,
    rcsGreffe: city && (unit.siren || siren) ? `RCS ${city} ${unit.siren || siren}` : null,
    country: 'France',
    source: 'api.insee.fr',
  };
};

const queryInseeSirene = async ({ siren, siret }) => {
  if (!ENABLE_INSEE_PROVIDER || !INSEE_API_TOKEN) return null;
  const headers = {
    Authorization: `Bearer ${INSEE_API_TOKEN}`,
    Accept: 'application/json',
  };
  const attempts = [
    siret ? `${INSEE_API_BASE_URL}/siret/${encodeURIComponent(siret)}` : null,
    `${INSEE_API_BASE_URL}/siren/${encodeURIComponent(siren)}`,
  ].filter(Boolean);
  for (const url of attempts) {
    const startedAt = Date.now();
    try {
      const payload = await fetchJsonWithTimeout(url, LOOKUP_TIMEOUT_MS, headers);
      const latencyMs = Date.now() - startedAt;
      const mapped = mapInseeSirenResult({ payload, siren, siret });
      if (mapped) {
        recordProviderMetric({ provider: 'insee_sirene', ok: true, latencyMs });
        return mapped;
      }
      recordProviderMetric({ provider: 'insee_sirene', ok: false, latencyMs, error: 'NOT_FOUND' });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      recordProviderMetric({ provider: 'insee_sirene', ok: false, latencyMs, error: error?.name || 'REQUEST_FAILED' });
    }
  }
  return null;
};

const mapPappersResult = ({ payload, siren, siret = null }) => {
  const company = payload?.entreprise || payload;
  if (!company) return null;
  const city = company.ville || company.ville_siege || '';
  const denomination = company.nom_entreprise || company.denomination || '';
  const addressSiege = company.siege?.adresse_ligne_1 || company.adresse_ligne_1 || null;
  return {
    siren: company.siren || siren,
    siretSiege: company.siege?.siret || company.siret || siret || null,
    denomination,
    legalForm: company.forme_juridique || '',
    city,
    addressSiege,
    apeCode: company.code_naf || company.ape || null,
    creationDate: company.date_creation || null,
    administrativeStatus: company.cessation ? 'C' : 'A',
    rcsGreffe: company.numero_rcs || null,
    country: 'France',
    source: 'api.pappers.fr',
  };
};

const queryPappers = async ({ siren, siret }) => {
  if (!ENABLE_PAPPERS_PROVIDER || !PAPPERS_API_TOKEN) return null;
  const attempts = [
    `${PAPPERS_API_BASE_URL}/entreprise?api_token=${encodeURIComponent(PAPPERS_API_TOKEN)}&siren=${encodeURIComponent(siren)}`,
    siret ? `${PAPPERS_API_BASE_URL}/entreprise?api_token=${encodeURIComponent(PAPPERS_API_TOKEN)}&siret=${encodeURIComponent(siret)}` : null,
  ].filter(Boolean);
  for (const url of attempts) {
    const startedAt = Date.now();
    try {
      const payload = await fetchJsonWithTimeout(url);
      const latencyMs = Date.now() - startedAt;
      const mapped = mapPappersResult({ payload, siren, siret });
      if (mapped) {
        recordProviderMetric({ provider: 'pappers', ok: true, latencyMs });
        return mapped;
      }
      recordProviderMetric({ provider: 'pappers', ok: false, latencyMs, error: 'NOT_FOUND' });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      recordProviderMetric({ provider: 'pappers', ok: false, latencyMs, error: error?.name || 'REQUEST_FAILED' });
    }
  }
  return null;
};

export const lookupCompany = async (rawIdentifier) => {
  metrics.total += 1;
  const digits = normalizeDigits(rawIdentifier);
  if (!isSiren(digits) && !isSiret(digits)) {
    metrics.errors += 1;
    return { ok: false, error: 'INVALID_SIREN_OR_SIRET' };
  }

  const cacheKey = buildCacheKey(digits);
  const cached = getCacheValue(cacheKey);
  if (cached) {
    metrics.cacheHits += 1;
    metrics.success += 1;
    return { ok: true, company: cached, cached: true };
  }
  metrics.cacheMisses += 1;

  const siren = digits.slice(0, 9);
  const siret = digits.length === 14 ? digits : null;

  try {
    let company = await queryApiGouv({ siren, siret });
    if (!company && ENABLE_SECONDARY_PROVIDER && SECONDARY_PROVIDER === 'entreprise_data_gouv') {
      company = await queryEntrepriseDataGouv({ siren, siret });
    }
    if (!company) {
      company = await queryInseeSirene({ siren, siret });
    }
    if (!company) {
      company = await queryPappers({ siren, siret });
    }
    if (!company) {
      metrics.notFound += 1;
      return { ok: false, error: 'COMPANY_NOT_FOUND' };
    }
    setCacheValue(cacheKey, company);
    if (siret) {
      setCacheValue(buildCacheKey(siren), company);
    }
    metrics.success += 1;
    return { ok: true, company, cached: false };
  } catch (_error) {
    metrics.errors += 1;
    return { ok: false, error: 'ANNUAIRE_LOOKUP_FAILED' };
  }
};

export const getCompanyLookupMetrics = () => ({
  ...metrics,
  cacheSize: cache.size,
  config: {
    timeoutMs: LOOKUP_TIMEOUT_MS,
    cacheTtlMs: CACHE_TTL_MS,
    secondaryProviderEnabled: ENABLE_SECONDARY_PROVIDER,
    secondaryProvider: SECONDARY_PROVIDER,
    inseeProviderEnabled: ENABLE_INSEE_PROVIDER,
    inseeTokenConfigured: Boolean(INSEE_API_TOKEN),
    pappersProviderEnabled: ENABLE_PAPPERS_PROVIDER,
    pappersTokenConfigured: Boolean(PAPPERS_API_TOKEN),
  },
});
