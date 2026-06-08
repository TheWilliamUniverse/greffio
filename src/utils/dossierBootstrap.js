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
  'quote_generated',
]);

export const isPlaceholderDossierName = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_DOSSIER_NAMES.has(normalized)) return true;
  if (normalized.startsWith('brouillon ·') || normalized.startsWith('brouillon ')) return true;
  return false;
};

export const isEphemeralPlaceholderDossier = (dossier = {}) => {
  const progress = Number(dossier.progressPercent || 0);
  if (progress > 5) return false;
  const status = String(dossier.status || '').toLowerCase();
  if (!IN_PROGRESS_STATUSES.has(status)) return false;
  return isPlaceholderDossierName(dossier.companyName || dossier.denomination);
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

  const hasNamedDossier = sorted.some((entry) => (
    !isPlaceholderDossierName(entry.companyName || entry.denomination)
  ));

  const namedInProgress = sorted.find((entry) => (
    !isPlaceholderDossierName(entry.companyName || entry.denomination)
    && IN_PROGRESS_STATUSES.has(String(entry.status || '').toLowerCase())
    && Number(entry.progressPercent || 0) < 90
  ));
  if (namedInProgress) return namedInProgress;

  if (hasNamedDossier) return null;

  return sorted.find((entry) => (
    isPlaceholderDossierName(entry.companyName || entry.denomination)
    && IN_PROGRESS_STATUSES.has(String(entry.status || '').toLowerCase())
    && Number(entry.progressPercent || 0) < 90
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
