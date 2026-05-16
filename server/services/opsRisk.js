import { DOCUMENT_STATUSES } from '../store.js';

const dayMs = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const scoreIdentityRisk = (documents = []) => {
  const identityDoc = documents.find((doc) => doc.docKey === 'identity_proof');
  if (!identityDoc) {
    return {
      score: 35,
      blocked: true,
      reason: 'identity_document_missing',
    };
  }
  const analysis = identityDoc.metadata?.analysis || {};
  const confidence = Number(analysis.confidence || 0);
  const requiresManualReview = Boolean(analysis.requiresManualReview);
  const isValidStatus = String(identityDoc.status || '').toLowerCase() === DOCUMENT_STATUSES.VALID;

  if (requiresManualReview || !isValidStatus) {
    return {
      score: confidence < 40 ? 40 : 25,
      blocked: true,
      reason: 'identity_verification_required',
      confidence,
    };
  }
  return {
    score: confidence >= 80 ? 0 : 8,
    blocked: false,
    reason: null,
    confidence,
  };
};

const scoreMissingRequiredDocs = (documents = []) => {
  const required = documents.filter((doc) => Boolean(doc.required));
  if (!required.length) return { score: 0, missingCount: 0 };
  const missing = required.filter((doc) => String(doc.status || '').toLowerCase() !== DOCUMENT_STATUSES.VALID);
  return {
    score: Math.min(35, missing.length * 8),
    missingCount: missing.length,
  };
};

const scoreDelayRisk = (dossier) => {
  const createdAt = toDate(dossier.createdAt);
  if (!createdAt) return { score: 0, ageDays: 0 };
  const ageDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / dayMs));
  if (ageDays < 2) return { score: 0, ageDays };
  if (ageDays < 5) return { score: 6, ageDays };
  if (ageDays < 10) return { score: 14, ageDays };
  return { score: 22, ageDays };
};

const scoreQueueRisk = (dossier) => {
  const queue = String(dossier.opsQueue || '').toLowerCase();
  if (queue === 'blocked') return 15;
  if (queue === 'waiting_client') return 8;
  return 0;
};

const scoreStatusRisk = (dossier) => {
  const status = String(dossier.status || '').toLowerCase();
  if (status.includes('rejected') || status.includes('regularization_requested')) return 20;
  if (status.includes('documents_missing') || status.includes('manual_review_required')) return 14;
  return 0;
};

export const computeDossierRisk = ({ dossier, documents = [] }) => {
  const identity = scoreIdentityRisk(documents);
  const missing = scoreMissingRequiredDocs(documents);
  const delay = scoreDelayRisk(dossier);
  const queueRisk = scoreQueueRisk(dossier);
  const statusRisk = scoreStatusRisk(dossier);

  const riskScore = Math.min(
    100,
    identity.score + missing.score + delay.score + queueRisk + statusRisk,
  );

  const blockers = [];
  if (identity.blocked) blockers.push(identity.reason);
  if (missing.missingCount > 0) blockers.push('required_documents_incomplete');

  const recommendation = riskScore >= 70
    ? 'Escalade Ops immédiate et recontact client.'
    : riskScore >= 45
      ? 'Revue prioritaire + relance documentaire.'
      : 'Suivi normal.';

  return {
    riskScore,
    identityVerificationBlocked: identity.blocked,
    identityConfidence: identity.confidence ?? null,
    requiredMissingCount: missing.missingCount,
    dossierAgeDays: delay.ageDays,
    blockers,
    recommendation,
  };
};

export const sortAntiRejectionQueue = (items = []) => (
  [...items].sort((a, b) => {
    if (b.risk.riskScore !== a.risk.riskScore) return b.risk.riskScore - a.risk.riskScore;
    if (b.risk.requiredMissingCount !== a.risk.requiredMissingCount) return b.risk.requiredMissingCount - a.risk.requiredMissingCount;
    return b.risk.dossierAgeDays - a.risk.dossierAgeDays;
  })
);
