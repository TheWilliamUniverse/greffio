import { getAllDossiers, listDossierDocuments } from '../store.js';
import { isInternalRole } from '../authMiddleware.js';
import { resolveDossierActionState } from '../domain/dossierActionState.js';
import { filterClientVisibleDocuments } from '../domain/clientDocuments.js';

const DOC_LABELS = {
  manager_non_conviction: 'Déclaration non-condamnation et filiation',
  formality_powers: 'Pouvoirs pour formalités',
  proxy_mandate: 'Procuration',
  signed_statutes: 'Statuts',
  subscribers_list: 'Liste des souscripteurs',
};

const parseQuestionnaire = (dossier) => {
  try {
    return dossier?.dataJson ? JSON.parse(dossier.dataJson) : {};
  } catch {
    return {};
  }
};

const isActionableDocument = (doc = {}) => {
  const status = String(doc.status || '').trim().toUpperCase();
  const hasFile = Boolean(doc.filename || doc.storageUrl || doc.fileUrl);
  if (['VALIDATED', 'VALID', 'SIGNED'].includes(status)) return false;
  if (status === 'REQUESTED' && hasFile) return false;
  return ['REQUESTED', 'REJECTED', 'INVALID', 'GENERATED', 'A_SIGNER'].includes(status);
};

const resolveDocumentEditorPath = (dossierId, docKey) => {
  if (docKey === 'manager_non_conviction') return `/documents/${dossierId}/non-conviction`;
  if (docKey === 'formality_powers') return `/documents/${dossierId}/formality-powers`;
  if (docKey === 'signed_statutes') return `/statuts?dossierId=${encodeURIComponent(dossierId)}`;
  return `/documents?dossierId=${encodeURIComponent(dossierId)}`;
};

export const buildMobileNotifications = async ({ userId, role }) => {
  const all = await getAllDossiers();
  const dossiers = (isInternalRole(role)
    ? all
    : all.filter((dossier) => dossier.userId && dossier.userId === userId))
    .filter((d) => !['completed', 'archived', 'deleted'].includes(String(d.status || '').toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 6);

  const notifications = [];

  for (const dossier of dossiers) {
    const questionnaire = parseQuestionnaire(dossier);
    const rawDocuments = await listDossierDocuments(dossier.id);
    const documents = filterClientVisibleDocuments(rawDocuments);
    const action = resolveDossierActionState({ dossier, documents, questionnaire });
    const companyLabel = dossier.companyName || dossier.denomination || 'Votre dossier';

    if (action.kind !== 'follow_up' || action.priority === 'high') {
      notifications.push({
        id: `action-${dossier.id}`,
        title: action.label,
        body: `${companyLabel} – ${action.description}`,
        tone: action.priority === 'low' ? 'info' : 'action',
        path: action.url || `/dossier/${dossier.id}`,
        createdAt: dossier.updatedAt || dossier.createdAt || new Date().toISOString(),
      });
    }

    documents.filter(isActionableDocument).slice(0, 2).forEach((doc) => {
      const docLabel = DOC_LABELS[doc.docKey] || doc.label || 'Document';
      notifications.push({
        id: `doc-${doc.id || `${dossier.id}-${doc.docKey}`}`,
        title: docLabel,
        body: `${companyLabel} – pièce à compléter ou signer.`,
        tone: 'action',
        path: resolveDocumentEditorPath(dossier.id, doc.docKey),
        createdAt: doc.updatedAt || doc.createdAt || dossier.updatedAt || new Date().toISOString(),
      });
    });
  }

  if (!notifications.length) {
    notifications.push({
      id: 'welcome',
      title: 'Aucune action en attente',
      body: 'Vos dossiers sont à jour. Lancez une formalité ou consultez votre coffre documents.',
      tone: 'info',
      path: '/dashboard',
      createdAt: new Date().toISOString(),
    });
  }

  const deduped = [];
  const seen = new Set();
  notifications.forEach((item) => {
    const key = `${item.title}|${item.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return deduped
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
};
