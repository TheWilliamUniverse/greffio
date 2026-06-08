const PLACEHOLDER_NAMES = new Set([
  'projet greffio',
  'greffio demo company',
  'nouveau dossier',
  'brouillon',
  'brouillon en cours',
  'mon espace greffio',
]);

const EPHEMERAL_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
  'questionnaire_started',
  'questionnaire_completed',
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

export const hasRealDossierName = (dossier = {}) => {
  const companyName = dossier.companyName || dossier.company_name;
  const denomination = dossier.denomination;
  return [companyName, denomination].some(
    (value) => value && !isPlaceholderDossierName(value),
  );
};

/** Brouillon fantôme supprimable (ex. « Projet Greffio » auto-rempli, parcours non finalisé). */
export const isEphemeralPlaceholderDossier = (dossier = {}) => {
  if (hasRealDossierName(dossier)) return false;
  const status = normalizePlaceholderKey(dossier.status);
  if (!EPHEMERAL_STATUSES.has(status)) return false;
  const progress = Number(dossier.progressPercent || 0);
  return progress < 90;
};

export const resolveCreateCompanyName = (companyName, reference) => {
  const trimmed = String(companyName || '').trim();
  const ref = String(reference || '').trim();
  if (isPlaceholderDossierName(trimmed)) {
    return ref ? `Brouillon · ${ref}` : 'Brouillon en cours';
  }
  return trimmed || (ref ? `Brouillon · ${ref}` : 'Brouillon en cours');
};
