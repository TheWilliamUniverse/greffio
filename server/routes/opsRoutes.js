import { buildOpsCockpitPayload, enrichDossierForOps } from '../services/opsCockpitService.js';
import { isEphemeralPlaceholderDossier } from '../utils/placeholderDossier.js';
import { computeDossierRisk, sortAntiRejectionQueue } from '../services/opsRisk.js';
import { buildCanonicalDocumentFilename } from '../documentNaming.js';
import { downloadDocumentBufferFromConfiguredStorage } from '../services/objectStorage.js';
import { issueQontoInvoiceWithMolliePayment } from '../services/qonto/qontoInvoiceService.js';
import { notifyInvoiceAvailable } from '../services/invoicePaymentNotifications.js';

const OPS_TEAM_DIRECTORY = Object.freeze([
  { id: 'william', email: 'william@willentreprises.com', name: 'William ABDOU', role: 'ADMIN', initials: 'WA', title: 'Direction & pilotage ops' },
  { id: 'nobatene', email: 'nobatene@willentreprises.com', name: 'Nobatène ABDOU', role: 'OPS', initials: 'NA', title: 'Coordination formalités' },
  { id: 'ibtissam', email: 'ibtissam@willentreprises.com', name: 'Ibtissam ABDOU', role: 'FORMALISTE', initials: 'IA', title: 'Revue documentaire' },
]);

export const registerOpsRoutes = (app, deps) => {
  const {
    requireAuth,
    requireRole,
    listEmailEvents,
    getAllDossiers,
    listDossierDocuments,
    getAllPayments,
    getStorageFailureSnapshot,
    getDossier,
    getUserById,
    getUserByEmail,
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
      getStorageFailures: getStorageFailureSnapshot || (() => ({ total: 0, recent: [] })),
      countPlaceholderDossiers: async () => {
        const all = await getAllDossiers();
        return all.filter((entry) => isEphemeralPlaceholderDossier(entry)).length;
      },
    });
    return res.json({ ok: true, ...payload });
  });

  app.get('/api/ops/team-workload', requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), async (_req, res) => {
    const dossiers = await getAllDossiers();
    const members = await Promise.all(OPS_TEAM_DIRECTORY.map(async (member) => {
      const user = getUserByEmail ? await getUserByEmail(member.email) : null;
      const assigned = dossiers.filter((dossier) => dossier.assignedToUserId && user?.id && dossier.assignedToUserId === user.id);
      const pendingReview = assigned.filter((dossier) => {
        const queue = String(dossier.opsQueue || '').toLowerCase();
        return queue !== 'ready_to_file';
      }).length;
      return {
        ...member,
        userId: user?.id || null,
        assignedCount: assigned.length,
        pendingReview,
        readyToFile: assigned.filter((dossier) => String(dossier.opsQueue || '').toLowerCase() === 'ready_to_file').length,
        recentDossiers: assigned.slice(0, 5).map((dossier) => ({
          id: dossier.id,
          companyName: dossier.companyName || dossier.denomination,
          reference: dossier.reference,
          opsQueue: dossier.opsQueue,
        })),
      };
    }));
    const unassignedCount = dossiers.filter((dossier) => !dossier.assignedToUserId).length;
    return res.json({
      ok: true,
      members,
      unassignedCount,
      totalDossiers: dossiers.length,
    });
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

  app.post('/api/ops/invoices/issue', requireAuth, requireRole(['ADMIN', 'OPS']), async (req, res) => {
    try {
      const {
        customerEmail,
        customerName,
        amountTotalCents,
        currency = 'EUR',
        description,
        dossierId = null,
        userId = null,
        dueDays = 14,
        mollieMethod = null,
      } = req.body || {};

      const result = await issueQontoInvoiceWithMolliePayment({
        customerEmail,
        customerName,
        amountTotalCents: Number(amountTotalCents),
        currency,
        description,
        dossierId,
        userId,
        dueDays: Number(dueDays),
        mollieMethod,
      });

      await notifyInvoiceAvailable({
        payment: result.payment,
        invoice: result.invoice,
      });

      return res.status(201).json({
        ok: true,
        invoice: result.invoice,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
      });
    } catch (error) {
      console.error('[ops/invoices/issue]', error);
      return res.status(502).json({
        ok: false,
        error: 'INVOICE_ISSUE_FAILED',
        message: error?.message || 'Échec émission facture',
      });
    }
  });
};
