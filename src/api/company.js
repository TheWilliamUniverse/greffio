import { runtimeConfig } from '@/config/runtime.js';
import { getToken } from '@/utils/localStorage.js';

const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '');

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

const lookupCompanyDirectFallback = async (identifier) => {
  const digits = normalizeDigits(identifier);
  if (digits.length !== 9 && digits.length !== 14) {
    throw new Error('INVALID_SIREN_OR_SIRET');
  }
  const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(digits)}&per_page=1`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error('COMPANY_LOOKUP_FAILED');
  }
  const payload = await response.json().catch(() => null);
  const entry = payload?.results?.[0];
  if (!entry) {
    throw new Error('COMPANY_NOT_FOUND');
  }
  return {
    ok: true,
    company: mapApiGouvResult(entry, digits),
    cached: false,
    source: 'recherche-entreprises.api.gouv.fr (direct)',
  };
};

export const lookupCompanyBySiren = async (identifier) => {
  const token = getToken();
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/company-search?siren=${encodeURIComponent(identifier)}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 502 || response.status === 404) {
      return lookupCompanyDirectFallback(identifier);
    }
    throw new Error(payload?.error || 'COMPANY_LOOKUP_FAILED');
  }
  return response.json();
};

export const lookupPublicCompanyBySiren = async (identifier) => {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/public/company-search?siren=${encodeURIComponent(identifier)}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 404 || response.status >= 500) {
      return lookupCompanyDirectFallback(identifier);
    }
    throw new Error(payload?.error || 'COMPANY_LOOKUP_FAILED');
  }
  return response.json();
};

export const getCompanyLookupObservability = async () => {
  const token = getToken();
  if (!token) {
    const error = new Error('AUTH_TOKEN_MISSING');
    error.status = 401;
    throw error;
  }
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/observability/company-lookup`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'COMPANY_LOOKUP_OBSERVABILITY_FAILED');
  }
  return response.json();
};
