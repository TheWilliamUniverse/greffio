/** Workflow statuts : production non signée → revue client → validation ops → signature. */

export const STATUTES_WORKFLOW_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_CLIENT_REVIEW: 'pending_client_review',
  PENDING_OPS_REVIEW: 'pending_ops_review',
  VALIDATED: 'validated',
  SIGNED: 'signed',
});

export const STATUTES_WORKFLOW_LABELS = Object.freeze({
  [STATUTES_WORKFLOW_STATUSES.DRAFT]: 'Brouillon',
  [STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW]: 'Revue client',
  [STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW]: 'Validation Greffio',
  [STATUTES_WORKFLOW_STATUSES.VALIDATED]: 'Validé – prêt à signer',
  [STATUTES_WORKFLOW_STATUSES.SIGNED]: 'Signé',
});

const parseMetadata = (document = null) => (
  document?.metadata && typeof document.metadata === 'object' ? document.metadata : {}
);

export const getStatutesWorkflowStatus = (document = null) => {
  const metadata = parseMetadata(document);
  const raw = String(metadata.statutesWorkflowStatus || '').trim().toLowerCase();
  if (Object.values(STATUTES_WORKFLOW_STATUSES).includes(raw)) return raw;
  if (metadata.signedAt || metadata.declarationStatus === 'signed') {
    return STATUTES_WORKFLOW_STATUSES.SIGNED;
  }
  if (document?.status === 'valid') return STATUTES_WORKFLOW_STATUSES.VALIDATED;
  return STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW;
};

export const getStatutesWorkflowLabel = (document = null) => (
  STATUTES_WORKFLOW_LABELS[getStatutesWorkflowStatus(document)] || 'En cours'
);

export const isStatutesSignedLocked = (document = null) => (
  getStatutesWorkflowStatus(document) === STATUTES_WORKFLOW_STATUSES.SIGNED
);

const STATUTES_ONLYOFFICE_EDITABLE_STATUSES = new Set([
  STATUTES_WORKFLOW_STATUSES.DRAFT,
  STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW,
  STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW,
]);

export const canEditStatutesInOnlyOffice = (document = null) => (
  STATUTES_ONLYOFFICE_EDITABLE_STATUSES.has(getStatutesWorkflowStatus(document))
);

/** Alias historique (tests + callers génériques). */
export const canEditStatutes = canEditStatutesInOnlyOffice;

export const canRequestStatutesSignature = (document = null) => (
  getStatutesWorkflowStatus(document) === STATUTES_WORKFLOW_STATUSES.VALIDATED
);

export const resolveStatutesClientDisplayStatus = (document = null) => {
  const workflow = getStatutesWorkflowStatus(document);
  if (workflow === STATUTES_WORKFLOW_STATUSES.SIGNED) return 'SIGNED';
  if (workflow === STATUTES_WORKFLOW_STATUSES.VALIDATED) return 'A_SIGNER';
  if (workflow === STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW) return 'PENDING_REVIEW';
  if (workflow === STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW) return 'GENERATED';
  return 'GENERATED';
};

export const transitionStatutesWorkflow = ({
  currentStatus,
  action,
  isOps = false,
}) => {
  const current = String(currentStatus || STATUTES_WORKFLOW_STATUSES.DRAFT).toLowerCase();
  const act = String(action || '').trim().toLowerCase();

  if (act === 'submit_client_review' && current === STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW) {
    return { ok: true, nextStatus: STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW };
  }
  if (act === 'validate' && isOps && current === STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW) {
    return { ok: true, nextStatus: STATUTES_WORKFLOW_STATUSES.VALIDATED };
  }
  if (act === 'reject' && isOps && current === STATUTES_WORKFLOW_STATUSES.PENDING_OPS_REVIEW) {
    return { ok: true, nextStatus: STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW };
  }
  if (act === 'mark_signed' && current === STATUTES_WORKFLOW_STATUSES.VALIDATED) {
    return { ok: true, nextStatus: STATUTES_WORKFLOW_STATUSES.SIGNED };
  }

  return { ok: false, error: 'STATUTES_WORKFLOW_TRANSITION_FORBIDDEN', currentStatus: current, action: act };
};

export const buildInitialStatutesWorkflowMetadata = ({ legalForm, filename, contentHash }) => ({
  source: 'greffio_generated',
  legalForm,
  generatedAt: new Date().toISOString(),
  unsigned: true,
  awaitingSignature: false,
  statutesWorkflowStatus: STATUTES_WORKFLOW_STATUSES.PENDING_CLIENT_REVIEW,
  filename,
  contentHash,
});
