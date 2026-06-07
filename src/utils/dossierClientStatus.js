/** Mapping statuts techniques → libellés client (StatusBadge). */
export const DOSSIER_STATUS_BADGE = Object.freeze({
  draft: 'BROUILLON',
  contact_started: 'EN_COURS',
  contact_completed: 'EN_COURS',
  legal_form_selected: 'EN_COURS',
  questionnaire_in_progress: 'EN_COURS',
  questionnaire_completed: 'EN_COURS',
  documents_requested: 'ATTENTE_DOCS',
  documents_uploaded: 'EN_ANALYSE',
  documents_validated: 'VALIDE',
  documents_under_review: 'EN_ANALYSE',
  documents_missing_or_invalid: 'URGENT',
  mandate_pending_signature: 'A_SIGNER',
  mandate_required: 'A_SIGNER',
  mandate_signed: 'VALIDE',
  statutes_generated: 'A_SIGNER',
  statutes_under_review: 'EN_ANALYSE',
  statutes_signed: 'VALIDE',
  payment_pending: 'ATTENTE_DOCS',
  payment_confirmed: 'EN_COURS',
  dossier_preparation: 'EN_COURS',
  client_validation_required: 'A_SIGNER',
  client_validated: 'EN_COURS',
  ready_for_filing: 'PLANIFIE',
  filed_to_guichet_unique: 'EN_ANALYSE',
  under_administration_review: 'EN_ANALYSE',
  regularization_requested: 'URGENT',
  regularization_submitted: 'EN_ANALYSE',
  accepted: 'VALIDE',
  official_documents_available: 'VALIDE',
  completed: 'TERMINE',
  rejected: 'REJETE',
  abandoned: 'TERMINE',
  cancelled_by_client: 'TERMINE',
  payment_failed: 'URGENT',
  manual_review_required: 'EN_ANALYSE',
});

export const DOSSIER_NEXT_ACTIONS = Object.freeze({
  draft: 'Initialiser le dossier et compléter les premières informations.',
  questionnaire_in_progress: 'Continuer le questionnaire.',
  questionnaire_completed: 'Vérifier les réponses et choisir l’offre adaptée.',
  documents_requested: 'Déposer les pièces justificatives demandées.',
  documents_missing_or_invalid: 'Corriger les documents signalés par l’équipe Greffio.',
  mandate_required: 'Lire et signer la procuration Greffio.',
  mandate_pending_signature: 'Signer la procuration Greffio.',
  statutes_generated: 'Relire les statuts générés avant signature.',
  client_validation_required: 'Valider le dossier avant dépôt.',
  payment_pending: 'Régler les frais requis pour poursuivre la formalité.',
  filed_to_guichet_unique: 'Le dossier est déposé et suivi par Greffio.',
  under_administration_review: 'Aucune action requise, instruction en cours.',
  regularization_requested: 'Répondre à la demande de complément.',
  accepted: 'Télécharger les documents officiels disponibles.',
  completed: 'Dossier clôturé, documents conservés dans votre coffre.',
  rejected: 'Lire le retour administratif et préparer une régularisation.',
});

export const mapDossierStatusForBadge = (status) => (
  DOSSIER_STATUS_BADGE[String(status || '').toLowerCase()]
  || 'EN_COURS'
);

export const mapDossierClientAction = (status, progressPercent = 0) => {
  const key = String(status || '').toLowerCase();
  if (DOSSIER_NEXT_ACTIONS[key]) return DOSSIER_NEXT_ACTIONS[key];
  const progress = Number(progressPercent || 0);
  if (progress > 0 && progress < 100) return `Progression ${progress} % — poursuivez votre dossier.`;
  return 'Poursuivez votre dossier Greffio.';
};
