const PLACEHOLDER_NAMES = new Set([
  'projet greffio',
  'greffio demo company',
  'nouveau dossier',
  'brouillon',
  'brouillon en cours',
  'mon espace greffio',
]);

const DRAFT_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
  'questionnaire_started',
  'quote_generated',
]);

export const normalizePlaceholderKey = (value) => String(value || '').trim().toLowerCase();

export const isPlaceholderDossierName = (value) => {
  const normalized = normalizePlaceholderKey(value);
  if (!normalized) return true;
  if (PLACEHOLDER_NAMES.has(normalized)) return true;
  if (normalized.startsWith('brouillon ·') || normalized.startsWith('brouillon ')) return true;
  return false;
};

export const isEphemeralPlaceholderDossier = (dossier = {}) => {
  const status = normalizePlaceholderKey(dossier.status);
  const progress = Number(dossier.progressPercent || 0);
  const companyName = dossier.companyName || dossier.company_name;
  const denomination = dossier.denomination;
  const named = !isPlaceholderDossierName(companyName) || !isPlaceholderDossierName(denomination);
  if (named && denomination && !isPlaceholderDossierName(denomination)) return false;
  if (named && companyName && !isPlaceholderDossierName(companyName)) return false;
  if (progress > 5) return false;
  if (!DRAFT_STATUSES.has(status)) return false;
  return isPlaceholderDossierName(companyName) && isPlaceholderDossierName(denomination);
};

export const resolveCreateCompanyName = (companyName, reference) => {
  const trimmed = String(companyName || '').trim();
  const ref = String(reference || '').trim();
  if (isPlaceholderDossierName(trimmed)) {
    return ref ? `Brouillon · ${ref}` : 'Brouillon en cours';
  }
  return trimmed || (ref ? `Brouillon · ${ref}` : 'Brouillon en cours');
};
