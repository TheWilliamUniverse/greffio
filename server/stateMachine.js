const DOSSIER_STATUSES = Object.freeze({
  DRAFT: 'draft',
  CONTACT_STARTED: 'contact_started',
  CONTACT_COMPLETED: 'contact_completed',
  LEGAL_FORM_SELECTED: 'legal_form_selected',
  QUESTIONNAIRE_IN_PROGRESS: 'questionnaire_in_progress',
  QUESTIONNAIRE_COMPLETED: 'questionnaire_completed',
  DOCUMENTS_REQUESTED: 'documents_requested',
  DOCUMENTS_UPLOADED: 'documents_uploaded',
  DOCUMENTS_VALIDATED: 'documents_validated',
  DOCUMENTS_UNDER_REVIEW: 'documents_under_review',
  DOCUMENTS_MISSING_OR_INVALID: 'documents_missing_or_invalid',
  MANDATE_PENDING_SIGNATURE: 'mandate_pending_signature',
  MANDATE_REQUIRED: 'mandate_required',
  MANDATE_SIGNED: 'mandate_signed',
  STATUTES_GENERATED: 'statutes_generated',
  STATUTES_UNDER_REVIEW: 'statutes_under_review',
  STATUTES_SIGNED: 'statutes_signed',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  DOSSIER_PREPARATION: 'dossier_preparation',
  CLIENT_VALIDATION_REQUIRED: 'client_validation_required',
  CLIENT_VALIDATED: 'client_validated',
  READY_FOR_FILING: 'ready_for_filing',
  FILED_TO_GUICHET_UNIQUE: 'filed_to_guichet_unique',
  UNDER_ADMINISTRATION_REVIEW: 'under_administration_review',
  REGULARIZATION_REQUESTED: 'regularization_requested',
  REGULARIZATION_SUBMITTED: 'regularization_submitted',
  ACCEPTED: 'accepted',
  OFFICIAL_DOCUMENTS_AVAILABLE: 'official_documents_available',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  ABANDONED: 'abandoned',
  CANCELLED_BY_CLIENT: 'cancelled_by_client',
  PAYMENT_FAILED: 'payment_failed',
  MANUAL_REVIEW_REQUIRED: 'manual_review_required',
  REFUNDED: 'refunded',

  // Backward compatibility aliases
  QUESTIONNAIRE_STARTED: 'questionnaire_in_progress',
  QUOTE_GENERATED: 'questionnaire_completed',
  PAID: 'payment_confirmed',
  DOCUMENTS_GENERATING: 'dossier_preparation',
  DOCUMENTS_READY: 'client_validation_required',
  FORMALIST_REVIEW_PENDING: 'documents_under_review',
  FORMALIST_REVIEWED: 'documents_uploaded',
  SIGNATURE_PENDING: 'mandate_required',
  SIGNED: 'mandate_signed',
  LEGAL_NOTICE_PENDING: 'ready_for_filing',
  LEGAL_NOTICE_PUBLISHED: 'filed_to_guichet_unique',
  INPI_READY: 'ready_for_filing',
  INPI_SUBMITTED: 'filed_to_guichet_unique',
  INPI_UNDER_REVIEW: 'under_administration_review',
  REGULARIZATION_ANSWERED: 'regularization_submitted',
  KBIS_RECEIVED: 'official_documents_available',
  CLOSED: 'completed',
  CANCELLED: 'cancelled_by_client',
});

const ROLE = Object.freeze({
  CLIENT: 'CLIENT',
  OPS: 'OPS',
  FORMALISTE: 'FORMALISTE',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
  WEBHOOK: 'WEBHOOK',
});

const OPS_ROLES = Object.freeze([ROLE.ADMIN, ROLE.OPS, ROLE.FORMALISTE]);

const TRANSITIONS = Object.freeze([
  { from: DOSSIER_STATUSES.DRAFT, to: DOSSIER_STATUSES.CONTACT_STARTED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.CONTACT_STARTED, to: DOSSIER_STATUSES.CONTACT_COMPLETED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'contact_confirmed' },
  { from: DOSSIER_STATUSES.CONTACT_COMPLETED, to: DOSSIER_STATUSES.LEGAL_FORM_SELECTED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.LEGAL_FORM_SELECTED, to: DOSSIER_STATUSES.QUESTIONNAIRE_IN_PROGRESS, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_IN_PROGRESS, to: DOSSIER_STATUSES.QUESTIONNAIRE_COMPLETED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_COMPLETED, to: DOSSIER_STATUSES.DOCUMENTS_REQUESTED, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'documents_requested' },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_COMPLETED, to: DOSSIER_STATUSES.PAYMENT_PENDING, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'payment_required' },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_COMPLETED, to: DOSSIER_STATUSES.MANUAL_REVIEW_REQUIRED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.DOCUMENTS_REQUESTED, to: DOSSIER_STATUSES.DOCUMENTS_UPLOADED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, sideEffects: ['refresh_document_checklist'] },
  { from: DOSSIER_STATUSES.DOCUMENTS_REQUESTED, to: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'document_invalid' },
  { from: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, to: DOSSIER_STATUSES.DOCUMENTS_UPLOADED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.DOCUMENTS_UPLOADED, to: DOSSIER_STATUSES.DOCUMENTS_UNDER_REVIEW, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.DOCUMENTS_UNDER_REVIEW, to: DOSSIER_STATUSES.DOCUMENTS_VALIDATED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.DOCUMENTS_VALIDATED, to: DOSSIER_STATUSES.MANDATE_PENDING_SIGNATURE, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'mandate_required' },
  { from: DOSSIER_STATUSES.MANDATE_PENDING_SIGNATURE, to: DOSSIER_STATUSES.MANDATE_REQUIRED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.MANDATE_REQUIRED, to: DOSSIER_STATUSES.MANDATE_PENDING_SIGNATURE, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'mandate_required' },
  { from: DOSSIER_STATUSES.DOCUMENTS_UNDER_REVIEW, to: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'document_invalid' },
  { from: DOSSIER_STATUSES.MANDATE_REQUIRED, to: DOSSIER_STATUSES.MANDATE_SIGNED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'mandate_signed' },
  { from: DOSSIER_STATUSES.MANDATE_PENDING_SIGNATURE, to: DOSSIER_STATUSES.MANDATE_SIGNED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'mandate_signed' },
  { from: DOSSIER_STATUSES.LEGAL_FORM_SELECTED, to: DOSSIER_STATUSES.STATUTES_GENERATED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'statutes_ready' },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_IN_PROGRESS, to: DOSSIER_STATUSES.STATUTES_GENERATED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'statutes_ready' },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_COMPLETED, to: DOSSIER_STATUSES.STATUTES_GENERATED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'statutes_ready' },
  { from: DOSSIER_STATUSES.MANDATE_SIGNED, to: DOSSIER_STATUSES.STATUTES_GENERATED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'statutes_ready' },
  { from: DOSSIER_STATUSES.STATUTES_GENERATED, to: DOSSIER_STATUSES.STATUTES_UNDER_REVIEW, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.STATUTES_UNDER_REVIEW, to: DOSSIER_STATUSES.STATUTES_SIGNED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'statutes_signed' },
  { from: DOSSIER_STATUSES.STATUTES_UNDER_REVIEW, to: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.STATUTES_SIGNED, to: DOSSIER_STATUSES.PAYMENT_PENDING, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'payment_required' },
  { from: DOSSIER_STATUSES.PAYMENT_PENDING, to: DOSSIER_STATUSES.PAYMENT_FAILED, allowedRoles: [ROLE.WEBHOOK, ...OPS_ROLES], automatic: true },
  { from: DOSSIER_STATUSES.PAYMENT_PENDING, to: DOSSIER_STATUSES.PAYMENT_CONFIRMED, allowedRoles: [ROLE.WEBHOOK, ROLE.SYSTEM], automatic: true },
  { from: DOSSIER_STATUSES.PAYMENT_PENDING, to: DOSSIER_STATUSES.CANCELLED_BY_CLIENT, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.PAYMENT_FAILED, to: DOSSIER_STATUSES.PAYMENT_PENDING, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.PAYMENT_FAILED, to: DOSSIER_STATUSES.CANCELLED_BY_CLIENT, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.PAYMENT_CONFIRMED, to: DOSSIER_STATUSES.DOSSIER_PREPARATION, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.DOSSIER_PREPARATION, to: DOSSIER_STATUSES.CLIENT_VALIDATION_REQUIRED, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'client_validation_required' },
  { from: DOSSIER_STATUSES.CLIENT_VALIDATION_REQUIRED, to: DOSSIER_STATUSES.CLIENT_VALIDATED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.CLIENT_VALIDATION_REQUIRED, to: DOSSIER_STATUSES.DOCUMENTS_MISSING_OR_INVALID, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.CLIENT_VALIDATED, to: DOSSIER_STATUSES.READY_FOR_FILING, allowedRoles: OPS_ROLES, automatic: false, requiredDocuments: ['required_docs_valid', 'mandate_if_required'] },
  { from: DOSSIER_STATUSES.READY_FOR_FILING, to: DOSSIER_STATUSES.FILED_TO_GUICHET_UNIQUE, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'filed' },
  { from: DOSSIER_STATUSES.FILED_TO_GUICHET_UNIQUE, to: DOSSIER_STATUSES.UNDER_ADMINISTRATION_REVIEW, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'under_review' },
  { from: DOSSIER_STATUSES.UNDER_ADMINISTRATION_REVIEW, to: DOSSIER_STATUSES.REGULARIZATION_REQUESTED, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'regularization_requested' },
  { from: DOSSIER_STATUSES.UNDER_ADMINISTRATION_REVIEW, to: DOSSIER_STATUSES.ACCEPTED, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'accepted' },
  { from: DOSSIER_STATUSES.UNDER_ADMINISTRATION_REVIEW, to: DOSSIER_STATUSES.REJECTED, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'rejected' },
  { from: DOSSIER_STATUSES.REGULARIZATION_REQUESTED, to: DOSSIER_STATUSES.REGULARIZATION_SUBMITTED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false, emailTemplate: 'regularization_submitted' },
  { from: DOSSIER_STATUSES.REGULARIZATION_REQUESTED, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.REGULARIZATION_SUBMITTED, to: DOSSIER_STATUSES.UNDER_ADMINISTRATION_REVIEW, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.ACCEPTED, to: DOSSIER_STATUSES.OFFICIAL_DOCUMENTS_AVAILABLE, allowedRoles: OPS_ROLES, automatic: false, emailTemplate: 'official_documents_available' },
  { from: DOSSIER_STATUSES.OFFICIAL_DOCUMENTS_AVAILABLE, to: DOSSIER_STATUSES.COMPLETED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.CANCELLED_BY_CLIENT, to: DOSSIER_STATUSES.REFUNDED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.MANUAL_REVIEW_REQUIRED, to: DOSSIER_STATUSES.DOCUMENTS_UNDER_REVIEW, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.MANUAL_REVIEW_REQUIRED, to: DOSSIER_STATUSES.CLIENT_VALIDATION_REQUIRED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.MANUAL_REVIEW_REQUIRED, to: DOSSIER_STATUSES.READY_FOR_FILING, allowedRoles: OPS_ROLES, automatic: false, requiredDocuments: ['required_docs_valid', 'mandate_if_required'] },
  { from: DOSSIER_STATUSES.DRAFT, to: DOSSIER_STATUSES.CANCELLED_BY_CLIENT, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.DRAFT, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: OPS_ROLES, automatic: false },
  { from: DOSSIER_STATUSES.CONTACT_STARTED, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.CONTACT_COMPLETED, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
  { from: DOSSIER_STATUSES.QUESTIONNAIRE_IN_PROGRESS, to: DOSSIER_STATUSES.ABANDONED, allowedRoles: [ROLE.CLIENT, ...OPS_ROLES], automatic: false },
]);

const ALLOWED_TRANSITIONS = Object.freeze(
  TRANSITIONS.reduce((acc, rule) => {
    if (!acc[rule.from]) acc[rule.from] = [];
    acc[rule.from].push(rule.to);
    return acc;
  }, {}),
);

const getTransitionRule = (from, to) => TRANSITIONS.find((item) => item.from === from && item.to === to) || null;

const isRoleAllowed = (rule, actorRole) => {
  if (!rule || !actorRole) return false;
  if (actorRole === ROLE.SYSTEM || actorRole === ROLE.WEBHOOK) {
    return rule.allowedRoles.includes(actorRole);
  }
  return rule.allowedRoles.includes(actorRole);
};

const canTransition = (from, to) => {
  if (from === to) return true;
  return Boolean(ALLOWED_TRANSITIONS[from]?.includes(to));
};

const evaluateTransition = ({
  from,
  to,
  actorRole,
  hasConfirmedPayment = false,
  hasAllRequiredDocuments = false,
  requiresMandate = true,
  isMandateSigned = false,
}) => {
  if (from === to) {
    return { ok: true, code: 'NOOP', rule: null };
  }
  const rule = getTransitionRule(from, to);
  if (!rule) return { ok: false, code: 'INVALID_TRANSITION' };
  if (!isRoleAllowed(rule, actorRole)) return { ok: false, code: 'ROLE_FORBIDDEN' };

  if (to === DOSSIER_STATUSES.PAYMENT_CONFIRMED && !hasConfirmedPayment) {
    return { ok: false, code: 'PAYMENT_NOT_CONFIRMED' };
  }
  if (to === DOSSIER_STATUSES.READY_FOR_FILING && !hasAllRequiredDocuments) {
    return { ok: false, code: 'REQUIRED_DOCUMENTS_MISSING' };
  }
  if (to === DOSSIER_STATUSES.READY_FOR_FILING && requiresMandate && !isMandateSigned) {
    return { ok: false, code: 'MANDATE_NOT_SIGNED' };
  }

  return { ok: true, code: 'ALLOWED', rule };
};

export {
  ALLOWED_TRANSITIONS,
  DOSSIER_STATUSES,
  OPS_ROLES,
  ROLE,
  canTransition,
  evaluateTransition,
  getTransitionRule,
};
