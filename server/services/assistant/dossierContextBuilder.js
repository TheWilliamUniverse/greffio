import { getDossier, listDossierDocuments, listDossiersForUser } from '../../store.js';

const PENDING_STATUSES = new Set(['requested', 'invalid', 'rejected', 'generated']);

export const buildUserDossierContext = async ({ userId, dossierId = null } = {}) => {
  if (!userId) return { hasDossier: false };

  let dossier = null;
  if (dossierId) {
    const candidate = await getDossier(dossierId);
    if (candidate?.userId === userId) dossier = candidate;
  }
  if (!dossier) {
    const dossiers = await listDossiersForUser({ userId });
    dossier = dossiers[0] || null;
  }
  if (!dossier) return { hasDossier: false };

  const documents = await listDossierDocuments(dossier.id);
  const pendingDocuments = documents
    .filter((doc) => PENDING_STATUSES.has(String(doc.status || '').toLowerCase()) || !doc.storageUrl)
    .map((doc) => doc.docKey);

  return {
    hasDossier: true,
    dossierId: dossier.id,
    reference: dossier.reference || dossier.id,
    companyName: dossier.companyName || dossier.denomination || null,
    legalForm: dossier.legalForm || dossier.formeJuridique || null,
    status: dossier.status || null,
    progressPercent: dossier.progressPercent ?? null,
    documents: documents.map((doc) => ({
      docKey: doc.docKey,
      status: doc.status,
      hasFile: Boolean(doc.storageUrl),
    })),
    pendingDocuments,
    pendingCount: pendingDocuments.length,
  };
};
