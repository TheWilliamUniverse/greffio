const PLACEHOLDER_DOSSIER_NAMES = new Set([
  'projet greffio',
  'greffio demo company',
  'nouveau dossier',
  'brouillon',
  'brouillon en cours',
  'mon espace greffio',
]);

const IN_PROGRESS_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
  'questionnaire_started',
  'questionnaire_completed',
  'quote_generated',
]);

export const isPlaceholderDossierName = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_DOSSIER_NAMES.has(normalized)) return true;
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

export const isEphemeralPlaceholderDossier = (dossier = {}) => {
  if (hasRealDossierName(dossier)) return false;
  const status = String(dossier.status || '').toLowerCase();
  if (!IN_PROGRESS_STATUSES.has(status)) return false;
  const progress = Number(dossier.progressPercent || 0);
  return progress < 90;
};

/** Dossier nommé encore éditable dans le questionnaire (évite reprise à la validation finale). */
export const isDossierQuestionnaireResumable = (dossier = {}) => {
  if (isEphemeralPlaceholderDossier(dossier)) return true;
  if (!hasRealDossierName(dossier)) return false;
  const status = String(dossier.status || '').toLowerCase();
  if (!IN_PROGRESS_STATUSES.has(status)) return false;
  return Number(dossier.progressPercent || 0) < 40;
};

export const resolveBootstrapCompanyName = (formData = {}) => {
  const candidates = [
    formData.denomination,
    formData.companyName,
    formData.existingBusinessName,
    [formData.firstName, formData.lastName].filter(Boolean).join(' '),
  ].map((entry) => String(entry || '').trim()).filter(Boolean);

  const match = candidates.find((entry) => !isPlaceholderDossierName(entry));
  return match || null;
};

export const buildDossierBootstrap = (formData = {}, userId = null, reference = '') => {
  const legalForm = formData.formeJuridique
    || formData.legalForm
    || 'SASU';
  const service = formData.service || 'creation-sasu';
  const resolvedName = resolveBootstrapCompanyName(formData);
  const safeReference = String(reference || '').trim();
  const companyName = resolvedName || (safeReference ? `Brouillon · ${safeReference}` : 'Brouillon en cours');

  return {
    userId,
    companyName,
    legalForm,
    service,
  };
};

export const pickResumableDraftDossier = (dossiers = []) => {
  const active = (dossiers || []).filter((entry) => entry && !entry.deletedAt);
  if (!active.length) return null;

  const sorted = [...active].sort(
    (left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime()
      - new Date(left.updatedAt || left.createdAt || 0).getTime(),
  );

  const hasNamedDossier = sorted.some((entry) => hasRealDossierName(entry));

  const namedInProgress = sorted.find((entry) => isDossierQuestionnaireResumable(entry));
  if (namedInProgress) return namedInProgress;

  if (hasNamedDossier) return null;

  return sorted.find((entry) => (
    isEphemeralPlaceholderDossier(entry)
  )) || null;
};

export const resolveDossierDisplayName = (dossier = {}) => {
  const companyName = String(dossier.companyName || '').trim();
  const denomination = String(dossier.denomination || '').trim();
  const reference = String(dossier.reference || '').trim();

  if (denomination && !isPlaceholderDossierName(denomination)) return denomination;
  if (companyName && !isPlaceholderDossierName(companyName)) return companyName;
  if (reference) return reference;
  return 'Dossier en cours';
};
