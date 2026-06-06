const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search';

export const searchEnterprise = async ({ query, siren, page = 1, perPage = 5 } = {}) => {
  const params = new URLSearchParams();
  if (siren) params.set('q', String(siren).replace(/\D/g, '').slice(0, 9));
  else if (query) params.set('q', String(query).trim());
  else return { ok: false, error: 'QUERY_REQUIRED', results: [] };
  params.set('page', String(page));
  params.set('per_page', String(perPage));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.COMPANY_LOOKUP_TIMEOUT_MS || 6500));
  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: 'ENTERPRISE_SEARCH_FAILED', results: [] };
    }
    const payload = await response.json();
    const results = (payload?.results || []).map((item) => ({
      provider: 'api-recherche-entreprises',
      siren: item.siren || null,
      siret: item.siege?.siret || item.matching_etablissements?.[0]?.siret || null,
      name: item.nom_complet || item.nom_raison_sociale || null,
      legalForm: item.nature_juridique || null,
      nafCode: item.activite_principale || null,
      address: item.siege?.adresse || null,
      city: item.siege?.libelle_commune || null,
      postalCode: item.siege?.code_postal || null,
      administrativeStatus: item.etat_administratif || null,
      dirigeants: item.dirigeants || [],
      raw: {
        siren: item.siren,
        etat_administratif: item.etat_administratif,
      },
    }));
    return { ok: true, results };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError' ? 'ENTERPRISE_SEARCH_TIMEOUT' : 'ENTERPRISE_SEARCH_UNAVAILABLE',
      results: [],
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const getCompanyBySiren = async (siren) => {
  const search = await searchEnterprise({ siren });
  if (!search.ok || !search.results.length) {
    return { ok: false, error: search.error || 'COMPANY_NOT_FOUND', company: null };
  }
  return { ok: true, company: search.results[0] };
};
