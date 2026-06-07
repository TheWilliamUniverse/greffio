const PRESET_LIBERATION = {
  '100%': 100,
  '100 %': 100,
  '50%': 50,
  '50 %': 50,
  '20%': 20,
  '20 %': 20,
};

/**
 * Parse un pourcentage de libération (0–100). Retourne null si invalide.
 */
export const parseLiberationPercent = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 && value <= 100 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const preset = PRESET_LIBERATION[trimmed];
  if (preset != null) return preset;

  const normalized = trimmed.replace('%', '').replace(',', '.').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
};

/**
 * Résout le taux global de libération à partir du questionnaire / données statuts.
 * L'option « Autre » exige une valeur numérique explicite (pas de fallback 50 %).
 */
export const resolveGlobalLiberationPercent = ({
  liberationCapital,
  liberationRate,
  liberationCapitalAutre,
  liberationCapitalCustom,
  liberationCapitalDetail,
} = {}) => {
  const raw = liberationCapital ?? liberationRate;
  const customCandidates = [
    liberationCapitalAutre,
    liberationCapitalCustom,
    liberationCapitalDetail,
  ].filter((value) => value !== undefined && value !== null && String(value).trim());

  if (String(raw || '').trim().toLowerCase() === 'autre') {
    for (const candidate of customCandidates) {
      const parsed = parseLiberationPercent(candidate);
      if (parsed != null) return parsed;
    }
    const error = new Error('La valeur de libération personnalisée doit être un pourcentage numérique compris entre 0 et 100.');
    error.code = 'LIBERATION_CUSTOM_PERCENT_INVALID';
    throw error;
  }

  const parsedRaw = parseLiberationPercent(raw);
  if (parsedRaw != null) return parsedRaw;

  for (const candidate of customCandidates) {
    const parsed = parseLiberationPercent(candidate);
    if (parsed != null) return parsed;
  }

  if (!String(raw || '').trim()) {
    return 50;
  }

  const error = new Error('Pourcentage de libération du capital manquant ou invalide.');
  error.code = 'LIBERATION_PERCENT_INVALID';
  throw error;
};

export const formatLiberationRateLabel = (percent) => `${Math.round(percent * 10) / 10} %`.replace('.0 %', ' %');
