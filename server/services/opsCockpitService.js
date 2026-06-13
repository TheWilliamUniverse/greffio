import { DOCUMENT_STATUSES } from '../store.js';
import { computeDossierRisk, sortAntiRejectionQueue } from './opsRisk.js';
import { getFormalityRule } from '../domain/formalities.js';

const isEiLikeFormality = ({ dossier, questionnaire = {} }) => {
  const rule = getFormalityRule({ dossier, questionnaire });
  return rule.requiresStatutes === false;
};

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const parseQuestionnaire = (dataJson) => {
  if (!dataJson) return {};
  if (typeof dataJson === 'object') return dataJson;
  try {
    return JSON.parse(dataJson);
  } catch (_error) {
    return {};
  }
};

const toDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const hoursSince = (value) => {
  const d = toDate(value);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / hourMs);
};

export const computeCompletionScore = ({ dossier, documents = [] }) => {
  const questionnaire = parseQuestionnaire(dossier.dataJson);
  const eiLike = isEiLikeFormality({
    legalForm: dossier.legalForm,
    formeJuridique: questionnaire.formeJuridique,
    typeFormalite: questionnaire.typeFormalite,
    service: dossier.service,
  });
  const required = documents.filter((doc) => Boolean(doc.required));
  if (!required.length) {
    const status = String(dossier.status || '').toLowerCase();
    if (status.includes('completed') || status.includes('accepted')) return 100;
    if (status.includes('questionnaire_completed')) return 55;
    return 25;
  }
  const valid = required.filter((doc) => String(doc.status || '').toLowerCase() === DOCUMENT_STATUSES.VALID);
  let score = Math.round((valid.length / required.length) * 70);
  if (!eiLike && String(dossier.status || '').includes('statutes')) score += 15;
  if (String(dossier.status || '').includes('mandate_signed')) score += 10;
  if (String(dossier.status || '').includes('payment_confirmed')) score += 5;
  return Math.min(100, score);
};

export const computeSlaStatus = ({ dossier, documents = [] }) => {
  const ageHours = hoursSince(dossier.updatedAt || dossier.createdAt) ?? 0;
  const pendingReview = documents.filter((doc) => {
    const status = String(doc.status || '').toLowerCase();
    return status === DOCUMENT_STATUSES.UPLOADED || status === DOCUMENT_STATUSES.UNDER_REVIEW;
  }).length;
  const queue = String(dossier.opsQueue || '').toLowerCase();
  if (queue === 'blocked' || ageHours >= 120) {
    return { status: 'critical', label: 'Critique', deadlineHours: 0, overdueHours: Math.max(0, ageHours - 48) };
  }
  if (pendingReview > 0 && ageHours >= 12) {
    return { status: 'late', label: 'En retard', deadlineHours: 12, overdueHours: ageHours - 12 };
  }
  if (ageHours >= 48) {
    return { status: 'late', label: 'En retard', deadlineHours: 48, overdueHours: ageHours - 48 };
  }
  if (ageHours >= 24 || pendingReview > 0) {
    return { status: 'watch', label: 'À surveiller', deadlineHours: 24, overdueHours: 0 };
  }
  return { status: 'ok', label: 'Dans les temps', deadlineHours: 24, overdueHours: 0 };
};

export const computeNextBestAction = ({ dossier, documents = [], risk = {} }) => {
  const invalid = documents.find((doc) => String(doc.status || '').toLowerCase() === DOCUMENT_STATUSES.INVALID);
  if (invalid) {
    return {
      label: `Demander correction : ${invalid.label || invalid.docKey}`,
      type: 'document_correction',
      priority: 'high',
    };
  }
  const pendingReview = documents.filter((doc) => {
    const s = String(doc.status || '').toLowerCase();
    return s === DOCUMENT_STATUSES.UPLOADED || s === DOCUMENT_STATUSES.UNDER_REVIEW;
  });
  if (pendingReview.length) {
    return {
      label: `Valider ${pendingReview.length} document(s) en attente`,
      type: 'document_review',
      priority: 'high',
    };
  }
  if (risk.identityVerificationBlocked) {
    return {
      label: 'Vérifier l’identité du client avant de poursuivre',
      type: 'identity',
      priority: 'high',
    };
  }
  if (String(dossier.opsQueue || '') === 'ready_to_file') {
    return {
      label: 'Préparer le dépôt guichet unique',
      type: 'filing',
      priority: 'medium',
    };
  }
  if (String(dossier.opsQueue || '') === 'waiting_client') {
    return {
      label: 'Relancer le client pour pièces ou validation',
      type: 'reminder',
      priority: 'medium',
    };
  }
  if (risk.requiredMissingCount > 0) {
    return {
      label: 'Relancer pour pièces manquantes',
      type: 'missing_docs',
      priority: 'medium',
    };
  }
  return {
    label: 'Revue de routine – aucun blocage critique',
    type: 'routine',
    priority: 'low',
  };
};

export const buildOpsChecklist = ({ dossier, documents = [] }) => {
  const questionnaire = parseQuestionnaire(dossier.dataJson);
  const eiLike = isEiLikeFormality({
    legalForm: dossier.legalForm,
    formeJuridique: questionnaire.formeJuridique,
    typeFormalite: questionnaire.typeFormalite,
    service: dossier.service,
  });
  const docStatus = (key) => {
    const doc = documents.find((item) => item.docKey === key);
    if (!doc) return 'todo';
    const s = String(doc.status || '').toLowerCase();
    if (s === DOCUMENT_STATUSES.VALID) return 'done';
    if (s === DOCUMENT_STATUSES.INVALID) return 'blocked';
    if (s === DOCUMENT_STATUSES.UPLOADED || s === DOCUMENT_STATUSES.UNDER_REVIEW) return 'in_progress';
    return 'todo';
  };
  const items = [
    { id: 'identity', label: 'Identité du dirigeant vérifiée', status: docStatus('identity_proof'), applicable: true },
    { id: 'address', label: 'Adresse / siège cohérents', status: docStatus('registered_office_proof') !== 'todo' ? docStatus('registered_office_proof') : docStatus('home_proof'), applicable: true },
    { id: 'mandate', label: 'Mandat signé', status: docStatus('signed_mandate'), applicable: true },
    { id: 'non_conviction', label: 'Déclaration de non-condamnation signée', status: docStatus('manager_non_conviction'), applicable: !eiLike },
    { id: 'statutes_gen', label: 'Statuts générés', status: docStatus('signed_statutes') !== 'todo' ? 'done' : (String(dossier.status || '').includes('statutes') ? 'in_progress' : 'todo'), applicable: !eiLike },
    { id: 'statutes_signed', label: 'Statuts signés', status: docStatus('signed_statutes'), applicable: !eiLike },
    { id: 'subscribers_list', label: 'Liste des souscripteurs signée', status: docStatus('subscribers_list'), applicable: !eiLike },
    { id: 'formality_powers', label: 'Pouvoirs pour formalités signés', status: docStatus('formality_powers'), applicable: !eiLike },
    { id: 'payment', label: 'Paiement confirmé', status: String(dossier.status || '').includes('payment_confirmed') ? 'done' : 'todo', applicable: true },
    { id: 'ready', label: 'Dossier prêt au dépôt', status: String(dossier.opsQueue || '') === 'ready_to_file' ? 'done' : 'todo', applicable: true },
  ];
  return items.filter((item) => item.applicable);
};

export const enrichDossierForOps = ({ dossier, documents = [] }) => {
  const risk = computeDossierRisk({ dossier, documents });
  const completionScore = computeCompletionScore({ dossier, documents });
  const sla = computeSlaStatus({ dossier, documents });
  const nextBestAction = computeNextBestAction({ dossier, documents, risk });
  const pendingDocuments = documents.filter((doc) => {
    const s = String(doc.status || '').toLowerCase();
    return s === DOCUMENT_STATUSES.UPLOADED || s === DOCUMENT_STATUSES.UNDER_REVIEW;
  }).length;
  const invalidDocuments = documents.filter((doc) => String(doc.status || '').toLowerCase() === DOCUMENT_STATUSES.INVALID).length;
  const readyForDeposit = String(dossier.opsQueue || '') === 'ready_to_file'
    && risk.riskScore < 45
    && pendingDocuments === 0
    && invalidDocuments === 0;

  return {
    dossier,
    documents,
    risk,
    completionScore,
    sla,
    nextBestAction,
    pendingDocuments,
    invalidDocuments,
    readyForDeposit,
    lastActivityAt: dossier.updatedAt || dossier.createdAt,
    checklist: buildOpsChecklist({ dossier, documents }),
  };
};

export const buildOpsCockpitPayload = async ({
  getAllDossiers,
  listDossierDocuments,
  getAllPayments,
  getStorageFailures = () => ({ total: 0, recent: [] }),
  countPlaceholderDossiers = () => 0,
}) => {
  const dossiers = await getAllDossiers();
  const payments = await getAllPayments();

  const enriched = await Promise.all(
    dossiers.map(async (dossier) => {
      const documents = await listDossierDocuments(dossier.id);
      return enrichDossierForOps({ dossier, documents });
    }),
  );

  const queue = sortAntiRejectionQueue(enriched);
  const actionNow = queue
    .filter((item) => item.sla.status === 'critical' || item.sla.status === 'late' || item.risk.riskScore >= 45 || item.pendingDocuments > 0)
    .slice(0, 12);

  const storageFailures = getStorageFailures();
  const blockedOver48h = enriched.filter((item) => (item.sla.overdueHours || 0) > 0 || (hoursSince(item.dossier.updatedAt || item.dossier.createdAt) ?? 0) >= 48).length;
  const placeholderDossiers = await Promise.resolve(countPlaceholderDossiers());

  const kpis = {
    activeDossiers: dossiers.filter((d) => !['completed', 'abandoned', 'rejected'].includes(String(d.status || ''))).length,
    documentsToValidate: enriched.reduce((sum, item) => sum + item.pendingDocuments, 0),
    lateDossiers: enriched.filter((item) => item.sla.status === 'late' || item.sla.status === 'critical').length,
    blockedOver48h,
    highRisk: enriched.filter((item) => item.risk.riskScore >= 70).length,
    readyForDeposit: enriched.filter((item) => item.readyForDeposit).length,
    paymentsPending: payments.filter((p) => String(p.status || '').toLowerCase() !== 'paid').length,
    remindersSuggested: enriched.filter((item) => item.nextBestAction.type === 'reminder' || item.nextBestAction.type === 'missing_docs').length,
    storageUploadFailures: Number(storageFailures?.total || 0),
    placeholderDossiers,
    averageCompletion: enriched.length
      ? Math.round(enriched.reduce((sum, item) => sum + item.completionScore, 0) / enriched.length)
      : 0,
  };

  const priorityCards = [
    { id: 'late', label: 'En retard', count: kpis.lateDossiers, filter: 'sla:late' },
    { id: 'blocked48', label: 'Bloqués > 48 h', count: kpis.blockedOver48h, filter: 'sla:late' },
    { id: 'storage', label: 'Uploads S3 échoués', count: kpis.storageUploadFailures, filter: 'storage:failed' },
    { id: 'ghost', label: 'Brouillons fantômes', count: kpis.placeholderDossiers, filter: 'placeholder:ghost' },
    { id: 'remind', label: 'À relancer', count: kpis.remindersSuggested, filter: 'action:reminder' },
    { id: 'blocked_client', label: 'Bloqués client', count: enriched.filter((i) => i.dossier.opsQueue === 'waiting_client').length, filter: 'queue:waiting_client' },
    { id: 'blocked_ops', label: 'Bloqués ops', count: enriched.filter((i) => i.dossier.opsQueue === 'blocked').length, filter: 'queue:blocked' },
    { id: 'ready', label: 'Prêts au dépôt', count: kpis.readyForDeposit, filter: 'ready:deposit' },
    { id: 'risk', label: 'Risque élevé', count: kpis.highRisk, filter: 'risk:high' },
  ];

  return {
    kpis,
    headerSummary: {
      toProcessToday: actionNow.length,
      late: kpis.lateDossiers,
      documentsToValidate: kpis.documentsToValidate,
      readyForDeposit: kpis.readyForDeposit,
    },
    actionNow,
    priorityCards,
    dossiers: enriched.map(({ dossier, risk, completionScore, sla, nextBestAction, pendingDocuments, readyForDeposit, lastActivityAt }) => ({
      ...dossier,
      riskScore: risk.riskScore,
      riskRecommendation: risk.recommendation,
      completionScore,
      slaStatus: sla.status,
      slaLabel: sla.label,
      nextBestAction,
      pendingDocuments,
      readyForDeposit,
      lastActivityAt,
    })),
    antiRejectQueue: queue.slice(0, 30),
  };
};
