const WORKFLOW_LABELS = Object.freeze({
  draft: 'Brouillon',
  pending_client_review: 'Revue client',
  pending_ops_review: 'Validation Greffio',
  validated: 'Validé – prêt à signer',
  signed: 'Signé',
});

export const getStatutesWorkflowStatusClient = (document = null) => {
  const metadata = document?.metadata && typeof document.metadata === 'object'
    ? document.metadata
    : {};
  const raw = String(metadata.statutesWorkflowStatus || '').trim().toLowerCase();
  if (raw) return raw;
  if (metadata.signedAt) return 'signed';
  return 'pending_client_review';
};

export const getStatutesWorkflowLabelClient = (document = null) => (
  WORKFLOW_LABELS[getStatutesWorkflowStatusClient(document)] || 'Statuts générés'
);

export const resolveStatutesClientDisplayStatus = (document = null) => {
  const workflow = getStatutesWorkflowStatusClient(document);
  if (workflow === 'signed') return 'SIGNED';
  if (workflow === 'validated') return 'A_SIGNER';
  if (workflow === 'pending_ops_review') return 'PENDING_REVIEW';
  return 'GENERATED';
};
