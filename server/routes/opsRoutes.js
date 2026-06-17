import { buildOpsCockpitPayload, enrichDossierForOps } from '../services/opsCockpitService.js';
import { isEphemeralPlaceholderDossier } from '../utils/placeholderDossier.js';
import { computeDossierRisk, sortAntiRejectionQueue } from '../services/opsRisk.js';
import { buildCanonicalDocumentFilename } from '../documentNaming.js';
import { downloadDocumentBufferFromConfiguredStorage } from '../services/objectStorage.js';
import {
  buildDossierAuditZipBuffer,
  buildDossierAuditZipFilename,
} from '../services/dossierAuditExportService.js';
import { issueQontoInvoiceWithMolliePayment } from '../services/qonto/qontoInvoiceService.js';
import { notifyInvoiceAvailable } from '../services/invoicePaymentNotifications.js';
import {
  approveAndSendInvoiceToClient,
  isInvoiceOpsReviewRequired,
  listPendingInvoiceReviews,
} from '../services/qonto/invoiceOpsReviewService.js';
import { upsertInvoice } from '../invoiceStore.js';
import { requireOpsStepUp } from './opsStepUpRoutes.js';

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
    clearDossierDocumentAttachment,
    scheduleDossierDeletion,
    deleteDocumentFromConfiguredStorage,
    DOCUMENT_STATUSES,
  } = deps;

  const opsAccess = [requireAuth, requireRole(['ADMIN', 'OPS', 'FORMALISTE']), requireOpsStepUp];

  app.get('/api/ops/email-events', ...opsAccess, async (req, res) => {
    const events = await listEmailEvents({
      limit: req.query?.limit ? Number(req.query.limit) : 100,
      templateId: req.query?.templateId ? String(req.query.templateId) : null,
      recipientEmail: req.query?.recipientEmail ? String(req.query.recipientEmail) : null,
    });
    return res.json({ ok: true, events });
  });

  app.get('/api/ops/cockpit', ...opsAccess, async (_req, res) => {
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

  app.get('/api/ops/team-workload', ...opsAccess, async (_req, res) => {
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

  app.get('/api/ops/dossiers', ...opsAccess, async (_req, res) => {
    res.json({ ok: true, dossiers: await getAllDossiers() });
  });

  app.get('/api/ops/dossiers-risk', ...opsAccess, async (_req, res) => {
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

  app.get('/api/ops/payments', ...opsAccess, async (_req, res) => {
    res.json({ ok: true, payments: await getAllPayments() });
  });

  app.get('/api/ops/dossiers/:dossierId/documents', ...opsAccess, async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    return res.json({ ok: true, documents: await listDossierDocuments(dossier.id) });
  });

  app.get('/api/ops/dossiers/:dossierId/detail', ...opsAccess, async (req, res) => {
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

  app.patch('/api/ops/dossiers/:dossierId/assignment', ...opsAccess, async (req, res) => {
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

  app.get('/api/ops/dossiers/:dossierId/notes', ...opsAccess, async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });
    return res.json({ ok: true, notes: await listOpsNotesByDossier(dossier.id) });
  });

  app.post('/api/ops/dossiers/:dossierId/notes', ...opsAccess, async (req, res) => {
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

  app.get('/api/ops/dossiers/:dossierId/documents/:docKey/download', ...opsAccess, async (req, res) => {
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

  app.post('/api/ops/dossiers/:dossierId/documents/:docKey/status', ...opsAccess, async (req, res) => {
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

      await upsertInvoice({
        id: result.invoice.id,
        dossierId,
        paymentId: result.payment?.id || null,
        userId,
        invoiceKind: 'manual_issue',
        invoiceNumber: result.invoice.number,
        qontoInvoiceId: result.invoice.qontoInvoiceId,
        qontoStatus: result.invoice.qontoStatus,
        amountTotalCents: Number(amountTotalCents),
        currency,
        customerEmail,
        customerName,
        clientDeliveryStatus: isInvoiceOpsReviewRequired() ? 'pending_ops_review' : 'sent',
        metadata: { flow: 'manual_issue', checkoutUrl: result.checkoutUrl },
      });

      if (!isInvoiceOpsReviewRequired()) {
        await notifyInvoiceAvailable({
          payment: result.payment,
          invoice: result.invoice,
        });
      }

      return res.status(201).json({
        ok: true,
        invoice: result.invoice,
        payment: result.payment,
        checkoutUrl: result.checkoutUrl,
        pendingOpsReview: isInvoiceOpsReviewRequired(),
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

  app.get('/api/ops/invoices/pending-review', requireAuth, requireRole(['ADMIN', 'OPS']), async (_req, res) => {
    try {
      const invoices = await listPendingInvoiceReviews({ limit: 100 });
      return res.json({ ok: true, invoices });
    } catch (error) {
      console.error('[ops/invoices/pending-review]', error);
      return res.status(500).json({ ok: false, error: 'INVOICE_REVIEW_LIST_FAILED' });
    }
  });

  app.post('/api/ops/invoices/:invoiceId/approve-send', requireAuth, requireRole(['ADMIN', 'OPS']), async (req, res) => {
    try {
      const result = await approveAndSendInvoiceToClient({
        invoiceId: req.params.invoiceId,
        opsUserId: req.auth.sub,
      });
      if (!result.ok) {
        return res.status(result.error === 'INVOICE_NOT_FOUND' ? 404 : 409).json(result);
      }
      return res.json(result);
    } catch (error) {
      console.error('[ops/invoices/approve-send]', error);
      return res.status(500).json({ ok: false, error: 'INVOICE_APPROVE_SEND_FAILED' });
    }
  });

  app.delete('/api/ops/dossiers/:dossierId/documents/:docKey', ...opsAccess, async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    const docKey = decodeURIComponent(req.params.docKey || '').trim();
    if (!docKey) return res.status(400).json({ ok: false, error: 'DOC_KEY_REQUIRED' });

    const documents = await listDossierDocuments(dossier.id);
    const existing = documents.find((item) => item.docKey === docKey);
    if (!existing) return res.status(404).json({ ok: false, error: 'DOCUMENT_SLOT_NOT_FOUND' });

    const hasFile = Boolean(existing.filename || existing.storageUrl || existing.fileUrl);
    if (!hasFile) {
      return res.status(409).json({ ok: false, error: 'DOCUMENT_NOT_UPLOADED' });
    }

    const cleared = await clearDossierDocumentAttachment({
      dossierId: dossier.id,
      docKey,
      actorId: req.auth.sub,
      actorType: 'ops',
    });
    if (!cleared?.removed) {
      return res.status(409).json({ ok: false, error: 'DOCUMENT_NOT_UPLOADED' });
    }

    if (cleared.previousStorageUrl) {
      try {
        await deleteDocumentFromConfiguredStorage(cleared.previousStorageUrl);
      } catch (storageError) {
        console.error('OPS_DOCUMENT_STORAGE_DELETE_FAILED', storageError);
      }
    }

    return res.json({
      ok: true,
      documents: await listDossierDocuments(dossier.id),
    });
  });

  app.delete('/api/ops/dossiers/:dossierId', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    const scheduled = await scheduleDossierDeletion({
      dossierId: dossier.id,
      userId: req.auth.sub,
    });
    if (!scheduled) {
      return res.status(409).json({ ok: false, error: 'DOSSIER_ALREADY_TRASHED' });
    }

    return res.json({
      ok: true,
      message: 'Dossier placé en corbeille. Suppression définitive sous 72 h sauf restauration par le client.',
      purgeAfter: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });
  });

  app.get('/api/ops/dossiers/:dossierId/proofs-export', ...opsAccess, async (req, res) => {
    const dossier = await getDossier(req.params.dossierId);
    if (!dossier) return res.status(404).json({ ok: false, error: 'DOSSIER_NOT_FOUND' });

    try {
      const zipBuffer = await buildDossierAuditZipBuffer({
        dossier,
        listDossierDocuments,
      });
      const downloadName = buildDossierAuditZipFilename(dossier);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(zipBuffer);
    } catch (error) {
      console.error('OPS_PROOFS_EXPORT_FAILED', error);
      return res.status(500).json({ ok: false, error: 'OPS_PROOFS_EXPORT_FAILED' });
    }
  });
};
