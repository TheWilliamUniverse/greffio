const API_BASE = String(process.env.PAPPERS_API_BASE_URL || 'https://api.pappers.fr/v2').replace(/\/+$/, '');
const API_TOKEN = String(process.env.PAPPERS_API_TOKEN || '');

export const isPappersAvailable = () => Boolean(API_TOKEN);

export const getCompanyBySiren = async (siren) => {
  if (!isPappersAvailable()) {
    return { available: false, ok: false, error: 'PAPPERS_NOT_CONFIGURED', company: null };
  }
  const digits = String(siren || '').replace(/\D/g, '').slice(0, 9);
  if (digits.length !== 9) return { available: true, ok: false, error: 'SIREN_INVALID', company: null };

  const params = new URLSearchParams({ api_token: API_TOKEN, siren: digits });
  const response = await fetch(`${API_BASE}/entreprise?${params.toString()}`);
  if (!response.ok) {
    return { available: true, ok: false, error: 'PAPPERS_LOOKUP_FAILED', company: null };
  }
  const payload = await response.json();
  return {
    available: true,
    ok: true,
    company: {
      provider: 'pappers',
      siren: payload.siren,
      siret: payload.siege?.siret || null,
      name: payload.nom_entreprise || payload.denomination || null,
      legalForm: payload.forme_juridique || null,
      nafCode: payload.code_naf || null,
      address: payload.siege?.adresse_ligne_1 || null,
      city: payload.siege?.ville || null,
      postalCode: payload.siege?.code_postal || null,
      raw: { siren: payload.siren, etat_administratif: payload.etat_administratif },
    },
  };
};

export const runComplianceCheck = async ({ siren, name } = {}) => {
  if (!isPappersAvailable()) {
    return { available: false, ok: false, error: 'PAPPERS_NOT_CONFIGURED' };
  }
  const params = new URLSearchParams({ api_token: API_TOKEN });
  if (siren) params.set('siren', String(siren).replace(/\D/g, '').slice(0, 9));
  if (name) params.set('nom', String(name).trim());
  const response = await fetch(`${API_BASE}/conformite?${params.toString()}`);
  if (!response.ok) return { available: true, ok: false, error: 'PAPPERS_COMPLIANCE_FAILED' };
  const payload = await response.json();
  return {
    available: true,
    ok: true,
    sanctionsMatch: Boolean(payload?.sanctions?.length),
    pepMatch: Boolean(payload?.pep?.length),
    summary: {
      sanctionsCount: payload?.sanctions?.length || 0,
      pepCount: payload?.pep?.length || 0,
    },
  };
};
