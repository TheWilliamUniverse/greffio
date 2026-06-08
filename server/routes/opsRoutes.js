import { buildOpsCockpitPayload, enrichDossierForOps } from '../services/opsCockpitService.js';
import { computeDossierRisk, sortAntiRejectionQueue } from '../services/opsRisk.js';
import { buildCanonicalDocumentFilename } from '../documentNaming.js';
import { downloadDocumentBufferFromConfiguredStorage } from '../services/objectStorage.js';

export const registerOpsRoutes = (app, deps) => {
  const {
    requireAuth,
    requireRole,
    listEmailEvents,
    getAllDossiers,
    listDossierDocuments,
    getAllPayments,
    getDossier,
    getUserById,
    listDossierEvents,
    listOpsNotesByDossier,
    updateDossierOpsFields,
    addOpsNote,
    updateDossierDocument,
    DOCUMENT_STATUSES,
  } = deps;

  app.get('/api/ops/email-events', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const events = await listEmailEvents({
      limit: req.query?.limit ? Number(req.query.limit) : 100,
      templateId: req.query?.templateId ? String(req.query.templateId) : null,
      recipientEmail: req.query?.recipientEmail ? String(req.query.recipientEmail) : null,
    });
    return res.json({ ok: true, events });
  });

  app.get('/api/ops/cockpit', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
    const payload = await buildOpsCockpitPayload({
      getAllDossiers,
      listDossierDocuments,
      getAllPayments,
    });
    return res.json({ ok: true, ...payload });
  });

  app.get('/api/ops/dossiers', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
    res.json({ ok: true, dossiers: await getAllDossiers() });
  });

  app.get('/api/ops/dossiers-risk', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
    const dossiers = await getAllDossiers();
    const enriched = await Promise.all(
      dossiers.map(async (dossier) => {
        const documents = await listDossierDocuments(dossier.id);
        const risk = computeDossierRisk({ dossier, documents });
        return { dossier, documents, risk };
      }),
    );
    return res.json({ ok: true, queue: sortAntiRejectionQueue(enriched) });
  });

  app.get('/api/ops/payments', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
    res.json({ ok: true, payments: await getAllPayments() });
  });

  app.get('/api/ops/dossiers/:dossierId/documents', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    return res.json({ ok: true, documents: await listDossierDocuments(dossier.id) });
  });

  app.get('/api/ops/dossiers/:dossierId/detail', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    const documents = await listDossierDocuments(dossier.id);
    const enriched = enrichDossierForOps({ dossier, documents });
    const owner = dossier.userId ? await getUserById(dossier.userId) : null;
    return res.json({
      ok: true,
      dossier,
      documents,
      events: await listDossierEvents(dossier.id),
      notes: await listOpsNotesByDossier(dossier.id),
      ownerEmail: owner?.email || null,
      risk: enriched.risk,
      completionScore: enriched.completionScore,
      sla: enriched.sla,
      nextBestAction: enriched.nextBestAction,
      checklist: enriched.checklist,
      readyForDeposit: enriched.readyForDeposit,
    });
  });

  app.patch('/api/ops/dossiers/:dossierId/assignment', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    const { assignedToUserId = null, opsQueue, opsPriority } = req.body || {};
    const updated = await updateDossierOpsFields({
      dossierId: dossier.id,
      assignedToUserId,
      opsQueue,
      opsPriority,
    });
    return res.json({ ok: true, dossier: updated });
  });

  app.get('/api/ops/dossiers/:dossierId/notes', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    return res.json({ ok: true, notes: await listOpsNotesByDossier(dossier.id) });
  });

  app.post('/api/ops/dossiers/:dossierId/notes', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    const { note } = req.body || {};
    if (!note || !String(note).trim()) {
      return res.status(400).json({ ok: false, error: 'NOTE_REQUIRED' });
    }
    await addOpsNote({
      dossierId: dossier.id,
      authorId: req.auth.sub,
      note: String(note).trim(),
    });
    return res.status(201).json({ ok: true, notes: await listOpsNotesByDossier(dossier.id) });
  });

  app.get('/api/ops/dossiers/:dossierId/documents/:docKey/download', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    const docKey = decodeURIComponent(req.params.docKey || '');
    const documents = await listDossierDocuments(dossier.id);
    const requested = documents.find((item) => item.docKey === docKey);
    if (!requested || !requested.storageUrl) {
      return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
    }

    const downloadName = requested.filename || `${requested.docKey}.pdf`;
    const inline = String(req.query.inline || req.query.disposition || '').toLowerCase() === '1'
      || String(req.query.inline || req.query.disposition || '').toLowerCase() === 'inline';
    const disposition = inline ? 'inline' : 'attachment';

    try {
      const buffer = await downloadDocumentBufferFromConfiguredStorage(requested.storageUrl);
      res.setHeader('Content-Type', requested.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    } catch (error) {
      console.error('OPS_DOCUMENT_DOWNLOAD_FAILED', error);
      return res.status(404).json({ ok: false, error: 'DOCUMENT_FILE_NOT_FOUND' });
    }
  });

  app.post('/api/ops/dossiers/:dossierId/documents/:docKey/status', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    const docKey = decodeURIComponent(req.params.docKey || '');
    const {
      status,
      filename,
      fileSizeBytes,
      mimeType,
      storageUrl,
      rejectedReason,
      ownerFirstName,
      ownerLastName,
    } = req.body || {};
    const allowed = new Set(Object.values(DOCUMENT_STATUSES));
    if (!allowed.has(status)) {
      return res.status(400).json({ ok: false, error: 'INVALID_DOCUMENT_STATUS' });
    }

    const canonicalFilename = buildCanonicalDocumentFilename({
      docKey,
      dossierCompanyName: dossier.companyName,
      ownerFirstName,
      ownerLastName,
    });

    const updated = await updateDossierDocument({
      dossierId: dossier.id,
      docKey,
      status,
      filename: canonicalFilename || filename,
      fileSizeBytes,
      mimeType,
      storageUrl,
      rejectedReason: rejectedReason || null,
      reviewerId: req.auth.sub,
    });

    if (!updated) {
      return res.status(404).json({ ok: false, error: 'DOCUMENT_SLOT_NOT_FOUND', docKey });
    }

    return res.json({
      ok: true,
      document: updated,
      documents: await listDossierDocuments(dossier.id),
    });
  });
};
