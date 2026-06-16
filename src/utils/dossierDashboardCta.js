const QUESTIONNAIRE_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
]);

const buildDocumentsUrl = (dossierId) => (
  dossierId
    ? `/documents?dossierId=${encodeURIComponent(dossierId)}`
    : '/documents'
);

/** CTA principal dashboard / accueil mobile (complète action-state API). */
export const resolveDossierDashboardCta = (dossier = {}, actionState = null) => {
  const dossierId = dossier?.id || null;
  const progress = Number(dossier?.progressPercent || 0);
  const status = String(dossier?.status || '').toLowerCase();
  const pastQuestionnairePhase = progress > 90;

  if (actionState?.kind === 'documents' && actionState?.url) {
    return {
      url: actionState.url,
      label: actionState.label || 'Compléter le dossier',
    };
  }

  if (
    pastQuestionnairePhase
    && (QUESTIONNAIRE_STATUSES.has(status) || actionState?.kind === 'questionnaire')
  ) {
    return {
      url: buildDocumentsUrl(dossierId),
      label: 'Compléter le dossier',
    };
  }

  if (actionState?.url || actionState?.label) {
    return {
      url: actionState.url || (dossierId ? `/dossier/${dossierId}` : '/dashboard'),
      label: actionState.label || 'Continuer le dossier',
    };
  }

  return {
    url: dossierId ? `/dossier/${dossierId}` : '/dashboard',
    label: 'Continuer le dossier',
  };
};
