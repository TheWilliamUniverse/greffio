/** Deep link vers la prochaine action métier (pas seulement la fiche dossier). */
export const resolveDossierContinueUrl = (dossier = {}) => {
  const id = dossier?.id;
  if (!id) return '/simulateur';

  const status = String(dossier?.status || '').toLowerCase();
  const progress = Number(dossier?.progressPercent || 0);

  if (['draft', 'contact_started', 'contact_completed', 'legal_form_selected', 'questionnaire_in_progress'].includes(status)) {
    if (progress > 90) {
      return `/documents?dossierId=${encodeURIComponent(id)}`;
    }
    return `/questionnaire?dossierId=${encodeURIComponent(id)}`;
  }
  if (['questionnaire_completed', 'payment_pending', 'payment_confirmed', 'dossier_preparation'].includes(status)) {
    return progress < 40 ? `/questionnaire?dossierId=${encodeURIComponent(id)}` : '/tarifs';
  }
  if (['documents_requested', 'documents_missing_or_invalid', 'documents_uploaded', 'documents_under_review'].includes(status)) {
    return `/documents?dossierId=${encodeURIComponent(id)}`;
  }
  if (['mandate_required', 'mandate_pending_signature'].includes(status)) {
    return `/documents?dossierId=${encodeURIComponent(id)}`;
  }
  if (['statutes_generated', 'statutes_under_review', 'client_validation_required'].includes(status)) {
    return `/statuts?dossierId=${encodeURIComponent(id)}`;
  }
  if (['accepted', 'official_documents_available', 'completed'].includes(status)) {
    return `/documents?dossierId=${encodeURIComponent(id)}`;
  }
  return `/dossier/${id}?tab=progress`;
};
