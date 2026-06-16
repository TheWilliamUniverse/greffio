/** Prochaine action métier pour un dossier client (questionnaire, documents, paiement, signature). */

const QUESTIONNAIRE_STATUSES = new Set([
  'draft',
  'contact_started',
  'contact_completed',
  'legal_form_selected',
  'questionnaire_in_progress',
]);

const DOCUMENT_STATUSES = new Set([
  'questionnaire_completed',
  'documents_requested',
  'documents_missing_or_invalid',
  'documents_uploaded',
  'documents_under_review',
  'documents_validated',
  'dossier_preparation',
]);

const SIGNATURE_STATUSES = new Set([
  'mandate_required',
  'mandate_pending_signature',
  'statutes_generated',
  'statutes_under_review',
  'client_validation_required',
]);

const PAYMENT_STATUSES = new Set([
  'payment_pending',
  'payment_failed',
]);

const FOLLOW_UP_STATUSES = new Set([
  'payment_confirmed',
  'mandate_signed',
  'statutes_signed',
  'client_validated',
  'ready_for_filing',
  'filed_to_guichet_unique',
  'under_administration_review',
  'regularization_requested',
  'regularization_submitted',
  'accepted',
  'official_documents_available',
  'completed',
]);

const documentHasFile = (doc = {}) => Boolean(
  doc.filename || doc.storageUrl || doc.fileUrl,
);

const isClientDocumentActionRequired = (doc = {}) => {
  const status = String(doc.status || '').trim().toUpperCase();
  const hasFile = documentHasFile(doc);
  if (['VALIDATED', 'VALID', 'SIGNED'].includes(status)) return false;
  if (status === 'REQUESTED' && hasFile) return false;
  return status === 'REQUESTED' || status === 'REJECTED' || status === 'INVALID';
};

const buildUrl = (dossierId, path) => {
  if (!dossierId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}dossierId=${encodeURIComponent(dossierId)}`;
};

/**
 * @param {{ dossier: object, documents?: object[], questionnaire?: object }} input
 */
export const resolveDossierActionState = ({
  dossier = {},
  documents = [],
  questionnaire = {},
} = {}) => {
  const dossierId = dossier?.id || null;
  const status = String(dossier?.status || 'draft').toLowerCase();
  const progress = Number(dossier?.progressPercent || 0);
  const visibleDocuments = documents.filter((doc) => (
    doc.docKey !== 'filiation_declaration' && doc.docKey !== 'proxy_mandate'
  ));
  const pendingDocuments = visibleDocuments.filter(isClientDocumentActionRequired);
  const pendingSignatures = visibleDocuments.filter((doc) => {
    const docStatus = String(doc.status || '').toUpperCase();
    return ['GENERATED', 'A_SIGNER'].includes(docStatus)
      || (['formality_powers', 'proxy_mandate'].includes(doc.docKey) && docStatus === 'REQUESTED' && documentHasFile(doc));
  });

  const statutsGenerated = visibleDocuments.some((doc) => (
    doc.docKey === 'signed_statutes' && documentHasFile(doc)
  ));
  const pastQuestionnairePhase = progress > 90 || statutsGenerated;

  const base = {
    dossierId,
    status,
    progressPercent: progress,
    pendingDocumentCount: pendingDocuments.length,
    pendingSignatureCount: pendingSignatures.length,
  };

  if (QUESTIONNAIRE_STATUSES.has(status) && pastQuestionnairePhase) {
    return {
      ...base,
      kind: 'documents',
      label: 'Compléter le dossier',
      description: pendingDocuments.length
        ? `${pendingDocuments.length} pièce${pendingDocuments.length > 1 ? 's' : ''} à compléter ou corriger.`
        : 'Consultez et complétez votre coffre documentaire.',
      url: buildUrl(dossierId, '/documents'),
      priority: 'high',
      blocking: pendingDocuments.length ? `${pendingDocuments.length} document(s) en attente` : null,
    };
  }

  if (QUESTIONNAIRE_STATUSES.has(status) || (status === 'questionnaire_completed' && progress < 40)) {
    return {
      ...base,
      kind: 'questionnaire',
      label: 'Continuer le questionnaire',
      description: 'Complétez les informations de votre formalité.',
      url: buildUrl(dossierId, '/questionnaire'),
      priority: 'high',
      blocking: null,
    };
  }

  if (PAYMENT_STATUSES.has(status)) {
    return {
      ...base,
      kind: 'payment',
      label: status === 'payment_failed' ? 'Finaliser le paiement' : 'Régler les frais',
      description: 'Le règlement permet de lancer la préparation du dossier.',
      url: '/tarifs',
      priority: 'high',
      blocking: status === 'payment_failed' ? 'Paiement refusé ou incomplet' : null,
    };
  }

  if (SIGNATURE_STATUSES.has(status) || pendingSignatures.length > 0) {
    const mandatePending = visibleDocuments.some((doc) => (
      ['formality_powers', 'proxy_mandate'].includes(doc.docKey) && isClientDocumentActionRequired(doc)
    ));
    const statutesPending = visibleDocuments.some((doc) => (
      doc.docKey === 'signed_statutes' && isClientDocumentActionRequired(doc)
    ));
    let label = 'Signer un document';
    if (mandatePending) label = 'Signer la procuration';
    else if (statutesPending) label = 'Valider les statuts';
    else if (status === 'client_validation_required') label = 'Confirmer le dossier';

    return {
      ...base,
      kind: 'signature',
      label,
      description: 'Un document attend votre signature ou validation.',
      url: buildUrl(dossierId, statutesPending ? '/statuts' : '/documents'),
      priority: 'high',
      blocking: pendingSignatures.length ? `${pendingSignatures.length} signature(s) en attente` : null,
    };
  }

  if (DOCUMENT_STATUSES.has(status) || pendingDocuments.length > 0) {
    return {
      ...base,
      kind: 'documents',
      label: pendingDocuments.length ? 'Déposer les pièces manquantes' : 'Ouvrir le coffre documents',
      description: pendingDocuments.length
        ? `${pendingDocuments.length} pièce${pendingDocuments.length > 1 ? 's' : ''} à compléter ou corriger.`
        : 'Consultez et complétez votre coffre documentaire.',
      url: buildUrl(dossierId, '/documents'),
      priority: pendingDocuments.length ? 'high' : 'medium',
      blocking: pendingDocuments.length ? `${pendingDocuments.length} document(s) en attente` : null,
    };
  }

  if (FOLLOW_UP_STATUSES.has(status)) {
    const followLabel = ['accepted', 'official_documents_available'].includes(status)
      ? 'Consulter les documents officiels'
      : ['under_administration_review', 'filed_to_guichet_unique'].includes(status)
        ? 'Suivre l’instruction'
        : 'Voir l’avancement du dossier';

    return {
      ...base,
      kind: 'follow_up',
      label: followLabel,
      description: 'Aucune action urgente – suivez l’état de votre formalité.',
      url: dossierId ? `/dossier/${dossierId}` : '/dossiers',
      priority: 'low',
      blocking: null,
    };
  }

  return {
    ...base,
    kind: 'follow_up',
    label: 'Poursuivre le dossier',
    description: mapDossierClientActionFallback(status, progress),
    url: dossierId ? `/dossier/${dossierId}` : '/dashboard',
    priority: 'medium',
    blocking: null,
  };
};

const mapDossierClientActionFallback = (status, progress) => {
  if (progress > 0 && progress < 100) {
    return `Progression ${progress} % – poursuivez votre dossier.`;
  }
  return 'Poursuivez votre dossier Greffio.';
};
