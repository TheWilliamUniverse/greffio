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
  client_validation_required: 'Confirmer le dossier avant dépôt.',
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
  if (progress > 0 && progress < 100) return `Progression ${progress} % – poursuivez votre dossier.`;
  return 'Poursuivez votre dossier Greffio.';
};

const TIMELINE_STEP_ORDER = ['info', 'statuts', 'documents', 'depot', 'kbis'];

const TIMELINE_LABELS = {
  info: 'Informations société',
  statuts: 'Statuts',
  documents: 'Documents',
  depot: 'Dépôt du dossier',
  kbis: 'Kbis / retour',
};

const resolveActiveTimelineStep = (status, progressPercent = 0) => {
  const key = String(status || '').toLowerCase();
  const progress = Number(progressPercent || 0);

  if (['accepted', 'official_documents_available', 'completed'].includes(key)) return 'kbis';
  if ([
    'ready_for_filing',
    'filed_to_guichet_unique',
    'under_administration_review',
    'regularization_requested',
    'regularization_submitted',
    'dossier_preparation',
    'client_validation_required',
    'client_validated',
  ].includes(key)) return 'depot';
  if ([
    'documents_requested',
    'documents_uploaded',
    'documents_validated',
    'documents_under_review',
    'documents_missing_or_invalid',
    'mandate_pending_signature',
    'mandate_required',
    'mandate_signed',
    'statutes_generated',
    'statutes_under_review',
    'statutes_signed',
    'payment_pending',
    'payment_confirmed',
  ].includes(key)) return 'documents';
  if (['statutes_generated', 'statutes_under_review', 'statutes_signed'].includes(key)) return 'statuts';
  if (progress >= 50) return 'documents';
  if (progress >= 25) return 'statuts';
  return 'info';
};

/** Timeline verticale compacte pour détail dossier mobile. */
export const buildDossierTimelineSteps = (dossier = {}) => {
  const activeStep = resolveActiveTimelineStep(dossier.status, dossier.progressPercent);
  const activeIndex = TIMELINE_STEP_ORDER.indexOf(activeStep);

  return TIMELINE_STEP_ORDER.map((id, index) => {
    let state = 'upcoming';
    if (index < activeIndex) state = 'done';
    else if (index === activeIndex) state = 'active';
    return { id, label: TIMELINE_LABELS[id], state };
  });
};

/** Résumé cockpit – étape, action, prochaine étape. */
export const resolveDossierStatusSummary = (dossier = {}, documents = []) => {
  const status = String(dossier.status || '').toLowerCase();
  const progress = Number(dossier.progressPercent || 0);
  const timeline = buildDossierTimelineSteps(dossier);
  const activeStep = timeline.find((step) => step.state === 'active') || timeline[0];
  const nextStep = timeline.find((step) => step.state === 'upcoming');

  const pendingDocs = (documents || []).filter((doc) => {
    const normalized = String(doc.status || '').toUpperCase();
    return ['ATTENTE_DOCS', 'BROUILLON', 'URGENT', 'A_SIGNER', 'REQUESTED', 'INVALID', 'REJECTED'].includes(normalized);
  });

  let actionRequired = mapDossierClientAction(status, progress);
  let blocking = 'Aucun blocage';

  if (pendingDocs.length) {
    blocking = `${pendingDocs.length} document${pendingDocs.length > 1 ? 's' : ''} en attente`;
  } else if (['under_administration_review', 'filed_to_guichet_unique'].includes(status)) {
    blocking = 'Aucun blocage – instruction en cours';
  } else if (['rejected', 'regularization_requested', 'documents_missing_or_invalid'].includes(status)) {
    blocking = 'Action requise de votre part';
  }

  const estimatedDelay = ['under_administration_review', 'filed_to_guichet_unique'].includes(status)
    ? 'Délai variable selon l’organisme'
    : progress >= 80
      ? 'Prochaine étape sous 48 h ouvrées'
      : 'Selon complétude de votre dossier';

  return {
    currentStep: activeStep?.label || 'Informations société',
    actionRequired,
    nextStep: nextStep?.label || 'Dépôt du dossier',
    blocking,
    estimatedDelay,
    lastUpdate: dossier.updatedAt || dossier.createdAt,
  };
};
